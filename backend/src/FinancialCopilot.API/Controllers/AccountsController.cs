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
[Route("api/accounts")]
public class AccountsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AccountsController(IApplicationDbContext context) => _context = context;

    // GET /api/accounts — listar mis cuentas
    [HttpGet]
    [RequirePlan("business")]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var owned = await _context.Accounts
            .Where(a => a.OwnerId == userId && !a.IsArchived)
            .OrderByDescending(a => a.IsDefault)
            .ThenBy(a => a.Name)
            .Select(a => MapAccount(a, "owner"))
            .ToListAsync();

        // Cuentas donde soy miembro del equipo
        var memberAccounts = await _context.TeamMembers
            .Where(m => m.UserId == userId && m.Status == "active")
            .Include(m => m.Account)
            .Where(m => !m.Account.IsArchived)
            .Select(m => MapAccount(m.Account, m.Role))
            .ToListAsync();

        return Ok(new { owned, shared = memberAccounts });
    }

    // POST /api/accounts — crear cuenta
    [HttpPost]
    [RequirePlan("business")]
    public async Task<IActionResult> Create([FromBody] CreateAccountRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var count = await _context.Accounts.CountAsync(a => a.OwnerId == userId && !a.IsArchived);
        if (count >= 10) return BadRequest(new { message = "Máximo 10 cuentas activas" });

        var account = new Account
        {
            Id = Guid.NewGuid(),
            OwnerId = userId.Value,
            Name = req.Name,
            Type = req.Type ?? "personal",
            Description = req.Description,
            Currency = req.Currency ?? "COP",
            Color = req.Color ?? "#10b981",
            Icon = req.Icon ?? "💼",
            IsDefault = count == 0, // primera cuenta es default
            CreatedAt = DateTime.UtcNow,
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();
        return Ok(MapAccount(account, "owner"));
    }

    // PUT /api/accounts/{id}
    [HttpPut("{id}")]
    [RequirePlan("business")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateAccountRequest req)
    {
        var userId = GetUserId();
        var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == id && a.OwnerId == userId);
        if (account == null) return NotFound();

        account.Name = req.Name;
        account.Type = req.Type ?? account.Type;
        account.Description = req.Description;
        account.Color = req.Color ?? account.Color;
        account.Icon = req.Icon ?? account.Icon;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapAccount(account, "owner"));
    }

    // DELETE /api/accounts/{id}
    [HttpDelete("{id}")]
    [RequirePlan("business")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var userId = GetUserId();
        var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == id && a.OwnerId == userId);
        if (account == null) return NotFound();
        if (account.IsDefault) return BadRequest(new { message = "No puedes archivar la cuenta principal" });

        account.IsArchived = true;
        account.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Cuenta archivada" });
    }

    // GET /api/accounts/{id}/summary — resumen financiero de la cuenta
    [HttpGet("{id}/summary")]
    [RequirePlan("business")]
    public async Task<IActionResult> Summary(Guid id)
    {
        var userId = GetUserId();

        // Verificar acceso (owner o miembro)
        var hasAccess = await _context.Accounts.AnyAsync(a => a.Id == id && a.OwnerId == userId)
            || await _context.TeamMembers.AnyAsync(m => m.AccountId == id && m.UserId == userId && m.Status == "active");

        if (!hasAccess) return Forbid();

        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return NotFound();

        // Para cuentas propias, usar las transacciones del owner filtradas por accountId
        // Por ahora devolvemos el resumen del owner (las transacciones no tienen AccountId aún)
        var ownerId = account.OwnerId;

        var totalIncome = await _context.Incomes.Where(i => i.UserId == ownerId).SumAsync(i => (decimal?)i.Amount) ?? 0;
        var totalExpenses = await _context.Expenses.Where(e => e.UserId == ownerId).SumAsync(e => (decimal?)e.Amount) ?? 0;

        return Ok(new
        {
            account = MapAccount(account, "owner"),
            totalIncome,
            totalExpenses,
            balance = totalIncome - totalExpenses,
            memberCount = await _context.TeamMembers.CountAsync(m => m.AccountId == id && m.Status == "active")
        });
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    private static object MapAccount(Account a, string role) => new
    {
        a.Id, a.Name, a.Type, a.Description, a.Currency, a.Color, a.Icon,
        a.IsDefault, a.IsArchived, a.CreatedAt, role
    };
}

public record CreateAccountRequest(string Name, string? Type, string? Description, string? Currency, string? Color, string? Icon);
