using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.API.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FinancialCopilot.API.Controllers;

[Authorize]
[ApiController]
[Route("api/users/{userId}/reports")]
public class ReportsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public ReportsController(IApplicationDbContext context) => _context = context;

    // GET /api/users/{userId}/reports/data?from=&to=&categories=&type=
    // Devuelve los datos filtrados para que el frontend genere el PDF
    [HttpGet("data")]
    [RequirePlan("pro", "business")]
    public async Task<IActionResult> GetReportData(
        Guid userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? categories,  // "Alimentación,Transporte"
        [FromQuery] string? type)        // "income" | "expense" | null = all
    {
        var requesterId = GetUserId();
        if (requesterId != userId) return Forbid();

        var fromDate = from ?? DateTime.UtcNow.AddMonths(-1);
        var toDate = to ?? DateTime.UtcNow;
        var categoryList = categories?.Split(',').Select(c => c.Trim()).ToList();

        // Incomes
        var incomesQuery = _context.Incomes
            .Where(i => i.UserId == userId && i.Date >= fromDate && i.Date <= toDate);

        if (type == "expense") incomesQuery = incomesQuery.Where(_ => false);
        if (categoryList?.Count > 0) incomesQuery = incomesQuery.Where(i => categoryList.Contains(i.Type));

        var incomes = await incomesQuery
            .OrderByDescending(i => i.Date)
            .Select(i => new
            {
                i.Id, amount = i.Amount, date = i.Date,
                type = "income", category = i.Type, i.Description
            })
            .ToListAsync();

        // Expenses
        var expensesQuery = _context.Expenses
            .Where(e => e.UserId == userId && e.Date >= fromDate && e.Date <= toDate);

        if (type == "income") expensesQuery = expensesQuery.Where(_ => false);
        if (categoryList?.Count > 0) expensesQuery = expensesQuery.Where(e => categoryList.Contains(e.Category));

        var expenses = await expensesQuery
            .OrderByDescending(e => e.Date)
            .Select(e => new
            {
                e.Id, amount = e.Amount, date = e.Date,
                type = "expense", category = e.Category, e.Description
            })
            .ToListAsync();

        var user = await _context.Users.FindAsync(userId);
        var totalIncome = incomes.Sum(i => (decimal)i.amount);
        var totalExpenses = expenses.Sum(e => (decimal)e.amount);

        // Breakdown por categoría
        var byCategory = expenses
            .GroupBy(e => e.category)
            .Select(g => new { category = g.Key, total = g.Sum(e => (decimal)e.amount), count = g.Count() })
            .OrderByDescending(g => g.total)
            .ToList();

        return Ok(new
        {
            period = new { from = fromDate, to = toDate },
            userName = user?.Name ?? "Usuario",
            totalIncome,
            totalExpenses,
            balance = totalIncome - totalExpenses,
            transactionCount = incomes.Count + expenses.Count,
            byCategory,
            transactions = incomes.Cast<object>()
                .Concat(expenses.Cast<object>())
                .OrderByDescending(t => ((dynamic)t).date)
                .ToList()
        });
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
