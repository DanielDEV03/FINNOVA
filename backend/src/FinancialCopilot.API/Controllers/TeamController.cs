using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Domain.Entities;
using FinancialCopilot.API.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FinancialCopilot.API.Controllers;

[Authorize]
[ApiController]
[Route("api/accounts/{accountId}/team")]
public class TeamController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _config;

    public TeamController(IApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // GET /api/accounts/{accountId}/team
    [HttpGet]
    [RequirePlan("business")]
    public async Task<IActionResult> GetMembers(Guid accountId)
    {
        var userId = GetUserId();
        var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == accountId && a.OwnerId == userId);
        if (account == null) return NotFound();

        var members = await _context.TeamMembers
            .Where(m => m.AccountId == accountId)
            .Include(m => m.User)
            .Select(m => new
            {
                m.Id, m.Role, m.Status, m.InviteEmail, m.InvitedAt, m.AcceptedAt,
                user = m.Status == "active" ? new { m.User.Id, m.User.Name, m.User.Email } : null
            })
            .ToListAsync();

        return Ok(members);
    }

    // POST /api/accounts/{accountId}/team/invite
    [HttpPost("invite")]
    [RequirePlan("business")]
    public async Task<IActionResult> Invite(Guid accountId, [FromBody] InviteRequest req)
    {
        var userId = GetUserId();
        var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == accountId && a.OwnerId == userId);
        if (account == null) return NotFound();

        var memberCount = await _context.TeamMembers.CountAsync(m => m.AccountId == accountId && m.Status != "revoked");
        if (memberCount >= 5) return BadRequest(new { message = "Máximo 5 miembros por cuenta" });

        // Buscar si el usuario ya existe
        var invitedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);

        var token = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

        var member = new TeamMember
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            UserId = invitedUser?.Id ?? userId.Value, // placeholder si no existe
            Role = "viewer",
            Status = invitedUser != null ? "active" : "pending",
            InviteEmail = req.Email,
            InviteToken = token,
            InvitedAt = DateTime.UtcNow,
            AcceptedAt = invitedUser != null ? DateTime.UtcNow : null,
            CreatedAt = DateTime.UtcNow,
        };

        _context.TeamMembers.Add(member);
        await _context.SaveChangesAsync();

        var frontendUrl = _config["MercadoPago:FrontendUrl"] ?? "https://finnova-frontend.onrender.com";
        var inviteUrl = $"{frontendUrl}/team/accept?token={token}";

        return Ok(new
        {
            message = invitedUser != null
                ? $"{req.Email} agregado al equipo"
                : $"Invitación enviada a {req.Email}",
            inviteUrl,
            status = member.Status
        });
    }

    // DELETE /api/accounts/{accountId}/team/{memberId}
    [HttpDelete("{memberId}")]
    [RequirePlan("business")]
    public async Task<IActionResult> Remove(Guid accountId, Guid memberId)
    {
        var userId = GetUserId();
        var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == accountId && a.OwnerId == userId);
        if (account == null) return NotFound();

        var member = await _context.TeamMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.AccountId == accountId);
        if (member == null) return NotFound();

        member.Status = "revoked";
        await _context.SaveChangesAsync();
        return Ok(new { message = "Miembro removido" });
    }

    // GET /api/accounts/team/accept?token=xxx — aceptar invitación
    [HttpGet("/api/accounts/team/accept")]
    [AllowAnonymous]
    public async Task<IActionResult> AcceptInvite([FromQuery] string token)
    {
        var member = await _context.TeamMembers.FirstOrDefaultAsync(m => m.InviteToken == token && m.Status == "pending");
        if (member == null) return BadRequest(new { message = "Invitación inválida o ya usada" });

        // Si el usuario está autenticado, asignarlo
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var uid))
        {
            member.UserId = uid;
            member.Status = "active";
            member.AcceptedAt = DateTime.UtcNow;
            member.InviteToken = null;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Invitación aceptada", accountId = member.AccountId });
        }

        return Ok(new { message = "Inicia sesión para aceptar la invitación", accountId = member.AccountId });
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public record InviteRequest(string Email);
