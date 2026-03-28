using FinancialCopilot.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace FinancialCopilot.API.Controllers;

/// <summary>
/// API pública de solo lectura — autenticación via header X-Api-Key
/// </summary>
[ApiController]
[Route("api/v1")]
public class PublicApiController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public PublicApiController(IApplicationDbContext context) => _context = context;

    // GET /api/v1/transactions
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions([FromQuery] int limit = 50, [FromQuery] string? type = null)
    {
        var (user, error) = await AuthenticateApiKey("read:transactions");
        if (user == null) return Unauthorized(new { error });

        limit = Math.Clamp(limit, 1, 200);

        var incomes = type == "expense" ? [] : await _context.Incomes
            .Where(i => i.UserId == user.Id)
            .OrderByDescending(i => i.Date)
            .Take(limit)
            .Select(i => new { i.Id, amount = i.Amount, date = i.Date, type = "income", category = i.Type, i.Description })
            .ToListAsync();

        var expenses = type == "income" ? [] : await _context.Expenses
            .Where(e => e.UserId == user.Id)
            .OrderByDescending(e => e.Date)
            .Take(limit)
            .Select(e => new { e.Id, amount = e.Amount, date = e.Date, type = "expense", category = e.Category, e.Description })
            .ToListAsync();

        var all = incomes.Cast<object>().Concat(expenses.Cast<object>())
            .OrderByDescending(t => ((dynamic)t).date)
            .Take(limit);

        return Ok(new { data = all, count = all.Count() });
    }

    // GET /api/v1/dashboard
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var (user, error) = await AuthenticateApiKey("read:dashboard");
        if (user == null) return Unauthorized(new { error });

        var totalIncome = await _context.Incomes.Where(i => i.UserId == user.Id).SumAsync(i => (decimal?)i.Amount) ?? 0;
        var totalExpenses = await _context.Expenses.Where(e => e.UserId == user.Id).SumAsync(e => (decimal?)e.Amount) ?? 0;
        var totalDebt = await _context.Debts.Where(d => d.UserId == user.Id).SumAsync(d => (decimal?)d.RemainingAmount) ?? 0;

        return Ok(new
        {
            totalIncome,
            totalExpenses,
            balance = totalIncome - totalExpenses,
            totalDebt,
            generatedAt = DateTime.UtcNow
        });
    }

    // GET /api/v1/me
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var (user, error) = await AuthenticateApiKey("read:dashboard");
        if (user == null) return Unauthorized(new { error });

        return Ok(new { user.Id, user.Name, user.Email, user.Plan, user.CreatedAt });
    }

    private async Task<(Domain.Entities.User? user, string? error)> AuthenticateApiKey(string requiredScope)
    {
        var rawKey = Request.Headers["X-Api-Key"].FirstOrDefault();
        if (string.IsNullOrEmpty(rawKey))
            return (null, "Missing X-Api-Key header");

        var keyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawKey))).ToLower();

        var apiKey = await _context.ApiKeys
            .Include(k => k.User)
            .FirstOrDefaultAsync(k => k.KeyHash == keyHash && k.IsActive);

        if (apiKey == null) return (null, "Invalid API key");
        if (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt < DateTime.UtcNow) return (null, "API key expired");
        if (!apiKey.Scopes.Contains(requiredScope)) return (null, $"Missing scope: {requiredScope}");
        if (!apiKey.User.IsBusiness) return (null, "Business plan required");

        // Actualizar stats
        apiKey.LastUsedAt = DateTime.UtcNow;
        apiKey.RequestCount++;
        await _context.SaveChangesAsync();

        return (apiKey.User, null);
    }
}
