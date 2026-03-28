namespace FinancialCopilot.Domain.Entities;

public class Subscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Plan { get; set; } = "free";          // free | pro | business
    public string Status { get; set; } = "active";      // active | cancelled | expired | pending
    public string BillingCycle { get; set; } = "monthly"; // monthly | annual

    public decimal AmountPaid { get; set; }
    public string Currency { get; set; } = "COP";

    // Wompi / payment gateway
    public string? PaymentReference { get; set; }       // referencia única del pago
    public string? PaymentGatewayId { get; set; }       // ID en Wompi
    public string? PaymentMethod { get; set; }          // card | pse | nequi

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
