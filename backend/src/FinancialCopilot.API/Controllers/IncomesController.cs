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
public class IncomesController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IGamificationService _gamificationService;

    public IncomesController(IApplicationDbContext context, IGamificationService gamificationService)
    {
        _context = context;
        _gamificationService = gamificationService;
    }

    [HttpPost]
    public async Task<ActionResult<IncomeDto>> Create(Guid userId, CreateIncomeDto dto)
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

            var income = new Income
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = dto.Amount,
                Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc),
                Type = dto.Type,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
            };

            _context.Incomes.Add(income);
            await _context.SaveChangesAsync();

            // Gamificación: Otorgar puntos por registrar ingreso
            await _gamificationService.AddPointsAsync(userId, 15, "income_created", "Ingreso registrado");

            return CreatedAtAction(nameof(GetById), new { userId, id = income.Id },
                new IncomeDto(income.Id, income.Amount, income.Date, income.Type, income.Description));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Income Create Error: {ex.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<IncomeDto>>> GetAll(Guid userId)
    {
        var incomes = await _context.Incomes
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.Date)
            .Select(i => new IncomeDto(i.Id, i.Amount, i.Date, i.Type, i.Description))
            .ToListAsync();

        return Ok(incomes);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<IncomeDto>> GetById(Guid userId, Guid id)
    {
        var income = await _context.Incomes
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);

        if (income == null)
            return NotFound();

        return new IncomeDto(income.Id, income.Amount, income.Date, income.Type, income.Description);
    }
}


