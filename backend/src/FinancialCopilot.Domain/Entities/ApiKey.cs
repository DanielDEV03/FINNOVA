namespace FinancialCopilot.Domain.Entities;

/// <summary>
/// API Key para acceso externo de solo lectura (plan Business).
/// </summary>
public class ApiKey
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Name { get; set; } = string.Empty;   // "Mi integración", "Zapier", etc.
    public string KeyHash { get; set; } = string.Empty; // SHA256 del key (nunca guardar en claro)
    public string KeyPrefix { get; set; } = string.Empty; // primeros 8 chars para identificar (fk_live_XXXXXXXX)

    public string[] Scopes { get; set; } = ["read:transactions", "read:dashboard"]; // permisos

    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public long RequestCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
}
