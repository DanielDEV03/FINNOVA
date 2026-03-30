namespace FinancialCopilot.Domain.Entities;

/// <summary>
/// Presupuesto mensual por categoría definido por el usuario.
/// </summary>
public class Budget
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Category { get; set; } = string.Empty;  // "Alimentación", "Transporte", etc.
    public decimal LimitAmount { get; set; }               // Límite mensual en COP
    public int Month { get; set; }                         // 1-12
    public int Year { get; set; }

    public bool AlertAt80 { get; set; } = true;            // Alertar al 80%
    public bool AlertAt100 { get; set; } = true;           // Alertar al 100%

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
