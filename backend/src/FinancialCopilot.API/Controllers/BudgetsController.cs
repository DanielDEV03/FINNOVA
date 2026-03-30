using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FinancialCopilot.API.Controllers;

[Authorize]
[ApiController]
[Route("api/users/{userId}/budgets")]
public class BudgetsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IGamificationService _gamificationService;

    public BudgetsController(IApplicationDbContext context, IGamificationService gamificationService)
    {
        _context = context;
        _gamificationService = gamificationService;
    }

    // GET /api/users/{userId}/budgets?month=3&year=2026
    // Devuelve presupuestos + gasto real + % de uso
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid userId, [FromQuery] int? month, [FromQuery] int? year)
    {
        if (!OwnsResource(userId)) return Forbid();

        var now = DateTime.UtcNow;
        var m = month ?? now.Month;
        var y = year ?? now.Year;

        var budgets = await _context.Budgets
            .Where(b => b.UserId == userId && b.Month == m && b.Year == y)
            .ToListAsync();

        // Calcular gasto real por categoría en el mes
        var startOfMonth = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var endOfMonth = startOfMonth.AddMonths(1);

        var spentByCategory = await _context.Expenses
            .Where(e => e.UserId == userId && e.Date >= startOfMonth && e.Date < endOfMonth)
            .GroupBy(e => e.Category)
            .Select(g => new { category = g.Key, spent = g.Sum(e => e.Amount) })
            .ToListAsync();

        var spentMap = spentByCategory.ToDictionary(x => x.category, x => x.spent);

        var result = budgets.Select(b =>
        {
            var spent = spentMap.TryGetValue(b.Category, out var s) ? s : 0;
            var pct = b.LimitAmount > 0 ? (double)(spent / b.LimitAmount) * 100 : 0;
            return new
            {
                b.Id, b.Category, b.LimitAmount, b.Month, b.Year, b.AlertAt80, b.AlertAt100,
                spent,
                remaining = Math.Max(0, b.LimitAmount - spent),
                percentage = Math.Round(pct, 1),
                status = pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok"
            };
        }).OrderByDescending(b => b.percentage).ToList();

        // Categorías con gasto pero sin presupuesto
        var unbudgeted = spentMap
            .Where(kv => !budgets.Any(b => b.Category == kv.Key))
            .Select(kv => new { category = kv.Key, spent = kv.Value, limitAmount = (decimal?)null, percentage = (double?)null, status = "unbudgeted" })
            .ToList();

        return Ok(new { budgets = result, unbudgeted, month = m, year = y });
    }

    // POST /api/users/{userId}/budgets — crear o actualizar presupuesto
    [HttpPost]
    public async Task<IActionResult> Upsert(Guid userId, [FromBody] UpsertBudgetRequest req)
    {
        if (!OwnsResource(userId)) return Forbid();

        var now = DateTime.UtcNow;
        var m = req.Month ?? now.Month;
        var y = req.Year ?? now.Year;

        var existing = await _context.Budgets
            .FirstOrDefaultAsync(b => b.UserId == userId && b.Category == req.Category && b.Month == m && b.Year == y);

        if (existing != null)
        {
            existing.LimitAmount = req.LimitAmount;
            existing.AlertAt80 = req.AlertAt80 ?? existing.AlertAt80;
            existing.AlertAt100 = req.AlertAt100 ?? existing.AlertAt100;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.Budgets.Add(new Budget
            {
                Id = Guid.NewGuid(), UserId = userId,
                Category = req.Category, LimitAmount = req.LimitAmount,
                Month = m, Year = y,
                AlertAt80 = req.AlertAt80 ?? true,
                AlertAt100 = req.AlertAt100 ?? true,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        await _gamificationService.AddPointsAsync(userId, 20, "budget_created", $"Presupuesto de {req.Category} creado 🎯");
        return Ok(new { message = $"Presupuesto de {req.Category} guardado" });
    }

    // DELETE /api/users/{userId}/budgets/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid userId, Guid id)
    {
        if (!OwnsResource(userId)) return Forbid();
        var b = await _context.Budgets.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (b == null) return NotFound();
        _context.Budgets.Remove(b);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Presupuesto eliminado" });
    }

    // GET /api/users/{userId}/budgets/summary — resumen para dashboard
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(Guid userId)
    {
        if (!OwnsResource(userId)) return Forbid();

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endOfMonth = startOfMonth.AddMonths(1);

        var budgets = await _context.Budgets
            .Where(b => b.UserId == userId && b.Month == now.Month && b.Year == now.Year)
            .ToListAsync();

        var spentByCategory = await _context.Expenses
            .Where(e => e.UserId == userId && e.Date >= startOfMonth && e.Date < endOfMonth)
            .GroupBy(e => e.Category)
            .Select(g => new { category = g.Key, spent = g.Sum(e => e.Amount) })
            .ToListAsync();

        var spentMap = spentByCategory.ToDictionary(x => x.category, x => x.spent);

        var exceeded = budgets.Where(b => spentMap.TryGetValue(b.Category, out var s) && s >= b.LimitAmount).Count();
        var warning = budgets.Where(b => spentMap.TryGetValue(b.Category, out var s) && s >= b.LimitAmount * 0.8m && s < b.LimitAmount).Count();
        var totalBudgeted = budgets.Sum(b => b.LimitAmount);
        var totalSpent = budgets.Sum(b => spentMap.TryGetValue(b.Category, out var s) ? s : 0);

        return Ok(new
        {
            totalBudgets = budgets.Count,
            exceeded, warning,
            totalBudgeted, totalSpent,
            overallPercentage = totalBudgeted > 0 ? Math.Round((double)(totalSpent / totalBudgeted) * 100, 1) : 0
        });
    }

    private bool OwnsResource(Guid userId)
    {
        var tokenId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        return role == "admin" || tokenId == userId.ToString();
    }
}

public record UpsertBudgetRequest(string Category, decimal LimitAmount, int? Month, int? Year, bool? AlertAt80, bool? AlertAt100);
