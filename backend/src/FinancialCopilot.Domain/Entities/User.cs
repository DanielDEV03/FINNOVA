namespace FinancialCopilot.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "user"; // user | admin | support

    // Subscription
    public string Plan { get; set; } = "free";          // free | pro | business
    public DateTime? PlanExpiresAt { get; set; }

    public bool IsPro => Plan is "pro" or "business" && (PlanExpiresAt == null || PlanExpiresAt > DateTime.UtcNow);
    public bool IsBusiness => Plan == "business" && (PlanExpiresAt == null || PlanExpiresAt > DateTime.UtcNow);
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Brute force protection
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public ICollection<Income> Incomes { get; set; } = new List<Income>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<Debt> Debts { get; set; } = new List<Debt>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
