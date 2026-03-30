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
public class DebtsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IGamificationService _gamificationService;

    public DebtsController(IApplicationDbContext context, IGamificationService gamificationService)
    {
        _context = context;
        _gamificationService = gamificationService;
    }

    [HttpPost]
    public async Task<ActionResult<DebtDto>> Create(Guid userId, CreateDebtDto dto)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found");

            var debt = new Debt
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TotalAmount = dto.TotalAmount,
                RemainingAmount = dto.TotalAmount, // Inicialmente es el total
                InterestRate = dto.InterestRate,
                StartDate = DateTime.UtcNow,
                EndDate = null,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
            };

            _context.Debts.Add(debt);
            await _context.SaveChangesAsync();

            await _gamificationService.AddPointsAsync(userId, 15, "debt_registered", "Deuda registrada — ¡tomar control es el primer paso! 💳");

            return CreatedAtAction(nameof(GetById), new { userId, id = debt.Id },
                new DebtDto(
                    debt.Id,
                    debt.Description,
                    debt.TotalAmount,
                    debt.RemainingAmount,
                    debt.InterestRate,
                    debt.StartDate,
                    debt.EndDate
                ));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Debt Create Error: {ex.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<DebtDto>>> GetAll(Guid userId)
    {
        var debts = await _context.Debts
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.RemainingAmount)
            .Select(d => new DebtDto(
                d.Id,
                d.Description,
                d.TotalAmount,
                d.RemainingAmount,
                d.InterestRate,
                d.StartDate,
                d.EndDate
            ))
            .ToListAsync();

        return Ok(debts);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DebtDto>> GetById(Guid userId, Guid id)
    {
        var debt = await _context.Debts
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (debt == null)
            return NotFound();

        return new DebtDto(
            debt.Id,
            debt.Description,
            debt.TotalAmount,
            debt.RemainingAmount,
            debt.InterestRate,
            debt.StartDate,
            debt.EndDate
        );
    }

    [HttpPut("{id}/payment")]
    public async Task<ActionResult<DebtDto>> RegisterPayment(Guid userId, Guid id, [FromBody] PaymentDto payment)
    {
        try
        {
            var debt = await _context.Debts
                .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

            if (debt == null)
                return NotFound();

            debt.RemainingAmount -= payment.Amount;
            
            // Si la deuda está pagada, marcar como finalizada
            if (debt.RemainingAmount <= 0)
            {
                debt.RemainingAmount = 0;
                debt.EndDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // Gamificación: puntos por pago
            var isFullPayment = debt.RemainingAmount <= 0;
            await _gamificationService.AddPointsAsync(userId,
                isFullPayment ? 50 : 25,
                isFullPayment ? "debt_paid_off" : "debt_payment",
                isFullPayment ? "¡Deuda liquidada! 🎉" : "Pago de deuda registrado 💵");

            return Ok(new DebtDto(
                debt.Id,
                debt.Description,
                debt.TotalAmount,
                debt.RemainingAmount,
                debt.InterestRate,
                debt.StartDate,
                debt.EndDate
            ));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Payment Error: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid userId, Guid id)
    {
        var debt = await _context.Debts
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (debt == null)
            return NotFound();

        _context.Debts.Remove(debt);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET /api/users/{userId}/debts/analysis — análisis IA de deudas
    [HttpGet("analysis")]
    public async Task<IActionResult> GetDebtAnalysis(Guid userId)
    {
        var debts = await _context.Debts
            .Where(d => d.UserId == userId && d.EndDate == null)
            .ToListAsync();

        if (!debts.Any())
            return Ok(new { message = "Sin deudas activas", strategies = new object[] { }, totalInterestAvalanche = 0, totalInterestSnowball = 0 });

        var totalIncome = await _context.Incomes.Where(i => i.UserId == userId).SumAsync(i => (decimal?)i.Amount) ?? 0;
        var totalExpenses = await _context.Expenses.Where(e => e.UserId == userId).SumAsync(e => (decimal?)e.Amount) ?? 0;
        var monthCount = Math.Max(1, await _context.Incomes.Where(i => i.UserId == userId).Select(i => i.Date.Month).Distinct().CountAsync());
        var monthlyFree = (totalIncome - totalExpenses) / monthCount;
        var extraPayment = Math.Max(0, monthlyFree * 0.3m); // 30% del excedente para deudas

        // Estrategia Avalancha (mayor interés primero)
        var avalanche = SimulateStrategy(debts.OrderByDescending(d => d.InterestRate).ToList(), extraPayment);
        // Estrategia Bola de Nieve (menor saldo primero)
        var snowball = SimulateStrategy(debts.OrderBy(d => d.RemainingAmount).ToList(), extraPayment);

        var totalDebt = debts.Sum(d => d.RemainingAmount);
        var totalMonthlyInterest = debts.Sum(d => d.RemainingAmount * (d.InterestRate / 100 / 12));

        return Ok(new
        {
            summary = new
            {
                totalDebt,
                totalMonthlyInterest,
                monthlyFreeAmount = monthlyFree,
                extraPaymentSuggested = extraPayment,
                debtCount = debts.Count
            },
            strategies = new
            {
                avalanche = new { name = "Avalancha", description = "Paga primero la deuda con mayor tasa de interés", months = avalanche.months, totalInterest = avalanche.totalInterest, savings = snowball.totalInterest - avalanche.totalInterest },
                snowball = new { name = "Bola de Nieve", description = "Paga primero la deuda más pequeña para ganar motivación", months = snowball.months, totalInterest = snowball.totalInterest, savings = avalanche.totalInterest - snowball.totalInterest }
            },
            recommended = avalanche.totalInterest <= snowball.totalInterest ? "avalanche" : "snowball",
            recommendations = GenerateRecommendations(debts, monthlyFree, totalMonthlyInterest)
        });
    }

    private static (int months, decimal totalInterest) SimulateStrategy(List<Debt> orderedDebts, decimal extraPayment)
    {
        var remaining = orderedDebts.Select(d => d.RemainingAmount).ToList();
        var rates = orderedDebts.Select(d => d.InterestRate / 100 / 12).ToList();
        decimal totalInterest = 0;
        int months = 0;

        while (remaining.Any(r => r > 0) && months < 360)
        {
            months++;
            decimal extra = extraPayment;
            for (int i = 0; i < remaining.Count; i++)
            {
                if (remaining[i] <= 0) continue;
                var interest = remaining[i] * rates[i];
                totalInterest += interest;
                var minPayment = Math.Min(remaining[i] * 0.05m + interest, remaining[i] + interest);
                remaining[i] = Math.Max(0, remaining[i] + interest - minPayment);
                if (remaining[i] <= 0) { remaining[i] = 0; extra += minPayment; }
            }
            // Aplicar extra al primero con saldo
            for (int i = 0; i < remaining.Count; i++)
            {
                if (remaining[i] <= 0) continue;
                remaining[i] = Math.Max(0, remaining[i] - extra);
                break;
            }
        }
        return (months, Math.Round(totalInterest, 0));
    }

    private static List<string> GenerateRecommendations(List<Debt> debts, decimal monthlyFree, decimal monthlyInterest)
    {
        var recs = new List<string>();
        var highInterest = debts.Where(d => d.InterestRate > 20).ToList();
        if (highInterest.Any())
            recs.Add($"Tienes {highInterest.Count} deuda(s) con tasa >20% anual. Prioriza pagarlas para ahorrar en intereses.");
        if (monthlyInterest > monthlyFree * 0.3m)
            recs.Add("Tus intereses mensuales son altos respecto a tu excedente. Considera consolidar deudas.");
        if (debts.Count > 3)
            recs.Add("Con múltiples deudas, la estrategia Avalancha puede ahorrarte más dinero en intereses.");
        if (monthlyFree > 0)
            recs.Add($"Tienes ~{monthlyFree:N0} COP/mes de excedente. Destinar el 30% ({monthlyFree * 0.3m:N0} COP) a deudas acelera tu libertad financiera.");
        recs.Add("Evita adquirir nuevas deudas mientras pagas las actuales para no perder progreso.");
        return recs;
    }
}

public record DebtDto(
    Guid Id,
    string Description,
    decimal TotalAmount,
    decimal RemainingAmount,
    decimal InterestRate,
    DateTime StartDate,
    DateTime? EndDate
);

public record CreateDebtDto(
    string Description,
    decimal TotalAmount,
    decimal InterestRate
);

public record PaymentDto(
    decimal Amount
);

