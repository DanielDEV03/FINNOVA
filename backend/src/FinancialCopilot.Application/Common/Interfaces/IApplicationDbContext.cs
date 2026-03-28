using FinancialCopilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FinancialCopilot.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Income> Incomes { get; }
    DbSet<Expense> Expenses { get; }
    DbSet<Debt> Debts { get; }
    DbSet<Alert> Alerts { get; }
    DbSet<SpendingPattern> SpendingPatterns { get; }
    DbSet<UserProgress> UserProgress { get; }
    DbSet<Achievement> Achievements { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<Subscription> Subscriptions { get; }
    DbSet<Account> Accounts { get; }
    DbSet<TeamMember> TeamMembers { get; }
    DbSet<ApiKey> ApiKeys { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
