namespace FinancialCopilot.Domain.Entities;

/// <summary>
/// Miembro del equipo con acceso de solo lectura a una cuenta.
/// </summary>
public class TeamMember
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Role { get; set; } = "viewer";   // viewer (solo lectura)
    public string Status { get; set; } = "pending"; // pending | active | revoked

    public string? InviteEmail { get; set; }        // email al que se invitó
    public string? InviteToken { get; set; }        // token para aceptar invitación

    public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
