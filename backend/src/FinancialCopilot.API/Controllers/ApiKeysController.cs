using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Domain.Entities;
using FinancialCopilot.API.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace FinancialCopilot.API.Controllers;

[Authorize]
[ApiController]
[Route("api/api-keys")]
public class ApiKeysController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public ApiKeysController(IApplicationDbContext context) => _context = context;

    // GET /api/api-keys
    [HttpGet]
    [RequirePlan("business")]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var keys = await _context.ApiKeys
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new
            {
                k.Id, k.Name, k.KeyPrefix, k.Scopes, k.IsActive,
                k.ExpiresAt, k.LastUsedAt, k.RequestCount, k.CreatedAt
            })
            .ToListAsync();

        return Ok(keys);
    }

    // POST /api/api-keys — crear nueva key
    [HttpPost]
    [RequirePlan("business")]
    public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var count = await _context.ApiKeys.CountAsync(k => k.UserId == userId && k.IsActive);
        if (count >= 5) return BadRequest(new { message = "Máximo 5 API keys activas" });

        // Generar key: fk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        var rawKey = $"fk_live_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(24)).Replace("+", "").Replace("/", "").Replace("=", "")[..32]}";
        var keyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawKey))).ToLower();
        var prefix = rawKey[..16]; // "fk_live_XXXXXXXX"

        var apiKey = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            Name = req.Name,
            KeyHash = keyHash,
            KeyPrefix = prefix,
            Scopes = req.Scopes ?? ["read:transactions", "read:dashboard"],
            IsActive = true,
            ExpiresAt = req.ExpiresAt,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync();

        // Devolver la key completa SOLO en la creación — nunca más
        return Ok(new
        {
            apiKey.Id, apiKey.Name, apiKey.KeyPrefix, apiKey.Scopes, apiKey.CreatedAt,
            key = rawKey, // ⚠️ solo se muestra una vez
            warning = "Guarda esta key ahora. No podrás verla de nuevo."
        });
    }

    // DELETE /api/api-keys/{id}
    [HttpDelete("{id}")]
    [RequirePlan("business")]
    public async Task<IActionResult> Revoke(Guid id)
    {
        var userId = GetUserId();
        var key = await _context.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);
        if (key == null) return NotFound();

        key.IsActive = false;
        key.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "API key revocada" });
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public record CreateApiKeyRequest(string Name, string[]? Scopes, DateTime? ExpiresAt);
