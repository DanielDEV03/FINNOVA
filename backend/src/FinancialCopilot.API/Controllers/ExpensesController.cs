using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Application.DTOs;
using FinancialCopilot.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinancialCopilot.API.Controllers;

[Authorize]
[ApiController]
[Route("api/users/{userId}/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IGamificationService _gamificationService;

    public ExpensesController(IApplicationDbContext context, IGamificationService gamificationService)
    {
        _context = context;
        _gamificationService = gamificationService;
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> Create(Guid userId, CreateExpenseDto dto)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found");

            // Límite plan free: 50 transacciones por mes
            if (!user.IsPro)
            {
                var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var monthlyExpenses = await _context.Expenses.CountAsync(e => e.UserId == userId && e.CreatedAt >= startOfMonth);
                var monthlyIncomes = await _context.Incomes.CountAsync(i => i.UserId == userId && i.CreatedAt >= startOfMonth);
                if (monthlyExpenses + monthlyIncomes >= 50)
                    return StatusCode(402, new { message = "Límite de 50 transacciones/mes alcanzado. Actualiza a Pro para transacciones ilimitadas.", upgradeUrl = "/pricing" });
            }

            var expense = new Expense
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = dto.Amount,
                Category = dto.Category,
                Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc),
                Description = dto.Description,
                Location = dto.Location,
                IsRecurring = dto.IsRecurring,
                RecurrenceType = dto.RecurrenceType != null ? Enum.Parse<RecurrenceType>(dto.RecurrenceType) : null,
                Tags = dto.Tags ?? new List<string>(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            // Award points for logging expense
            await _gamificationService.AddPointsAsync(userId, 10, "expense_logged", "Gasto registrado 📝");

            return CreatedAtAction(nameof(GetById), new { userId, id = expense.Id },
                new ExpenseDto(
                    expense.Id, 
                    expense.Amount, 
                    expense.Category, 
                    expense.Date, 
                    expense.Description,
                    expense.Location,
                    expense.IsRecurring,
                    expense.RecurrenceType?.ToString(),
                    expense.Tags
                ));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Expense Create Error: {ex.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<ExpenseDto>>> GetAll(Guid userId)
    {
        var expenses = await _context.Expenses
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.Date)
            .Select(e => new ExpenseDto(
                e.Id, 
                e.Amount, 
                e.Category, 
                e.Date, 
                e.Description,
                e.Location,
                e.IsRecurring,
                e.RecurrenceType != null ? e.RecurrenceType.ToString() : null,
                e.Tags
            ))
            .ToListAsync();

        return Ok(expenses);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> GetById(Guid userId, Guid id)
    {
        var expense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense == null)
            return NotFound();

        return new ExpenseDto(
            expense.Id, 
            expense.Amount, 
            expense.Category, 
            expense.Date, 
            expense.Description,
            expense.Location,
            expense.IsRecurring,
            expense.RecurrenceType?.ToString(),
            expense.Tags
        );
    }
}

