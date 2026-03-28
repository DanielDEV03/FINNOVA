namespace FinancialCopilot.Domain.Entities;

/// <summary>
/// Cuenta financiera (personal, negocio, ahorros, etc.)
/// Permite separar transacciones por contexto.
/// </summary>
public class Account
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }           // usuario dueño
    public User Owner { get; set; } = null!;

    public string Name { get; set; } = string.Empty;   // "Personal", "Negocio", "Ahorros"
    public string Type { get; set; } = "personal";     // personal | business | savings | investment
    public string? Description { get; set; }
    public string Currency { get; set; } = "COP";
    public string Color { get; set; } = "#10b981";     // color para UI
    public string Icon { get; set; } = "💼";

    public bool IsDefault { get; set; } = false;
    public bool IsArchived { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<TeamMember> TeamMembers { get; set; } = new List<TeamMember>();
}
