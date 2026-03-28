using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using System.Text;

namespace FinancialCopilot.API.Controllers;

[Authorize(Roles = "admin,support")]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;

    public AdminController(IApplicationDbContext context, IEmailService emailService, IConfiguration config)
    {
        _context = context;
        _emailService = emailService;
        _config = config;
    }

    // ─── STATS PÚBLICAS (sin auth) ──────────────────────────────────────────────

  [AllowAnonymous]
  [HttpGet("public-stats")]
  public async Task<IActionResult> GetPublicStats()
  {
      var totalUsers      = await _context.Users.CountAsync();
      var totalExpenses   = await _context.Expenses.CountAsync();
      var totalIncomes    = await _context.Incomes.CountAsync();
      var totalTransactions = totalExpenses + totalIncomes;

      return Ok(new
      {
          totalUsers,
          totalTransactions,
      });
  }

  // ─── DIAGNÓSTICO Y TEST DE EMAIL ─────────────────────────────────────────

  [HttpGet("email-status")]
  [Authorize(Roles = "admin")]
  public IActionResult GetEmailStatus()
  {
      // Mostrar qué valores está leyendo (sin exponer la contraseña completa)
      var user   = _config["Email:SmtpUser"] ?? "(vacío)";
      var pwd    = _config["Email:SmtpPassword"];
      var host   = _config["Email:SmtpHost"] ?? "(vacío)";
      var port   = _config["Email:SmtpPort"] ?? "(vacío)";
      var aiUrl  = _config["AiEngine:Url"] ?? "(vacío — verifica AiEngine__Url en Render)";

      return Ok(new
      {
          smtpHost     = host,
          smtpPort     = port,
          smtpUser     = user,
          hasPassword  = !string.IsNullOrEmpty(pwd),
          passwordHint = string.IsNullOrEmpty(pwd) ? "(no configurada)" : $"{pwd[..Math.Min(4, pwd.Length)]}****",
          isConfigured = !string.IsNullOrEmpty(user) && !string.IsNullOrEmpty(pwd),
          aiEngineUrl  = aiUrl,
          note         = "Si isConfigured=false, verifica que las env vars en Render usen Email__SmtpUser (doble guión bajo)"
      });
  }

  [HttpPost("email-test")]
  [Authorize(Roles = "admin")]
  public async Task<IActionResult> TestEmail([FromBody] TestEmailDto dto)
  {
      try
      {
          await _emailService.SendWelcomeAsync(dto.ToEmail, "Admin Test");
          return Ok(new { message = $"Email de prueba enviado a {dto.ToEmail}. Revisa los logs de Render para ver si hubo error." });
      }
      catch (Exception ex)
      {
          return BadRequest(new { error = ex.Message });
      }
  }

  // ─── MÉTRICAS ────────────────────────────────────────────────────────────

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sevenDaysAgo = now.AddDays(-7);
        var today = now.Date;

        var totalUsers      = await _context.Users.CountAsync();
        var activeUsers30d  = await _context.Users.CountAsync(u => u.LastLoginAt >= thirtyDaysAgo);
        var newUsers7d      = await _context.Users.CountAsync(u => u.CreatedAt >= sevenDaysAgo);
        var newUsersToday   = await _context.Users.CountAsync(u => u.CreatedAt >= today);
        var lockedUsers     = await _context.Users.CountAsync(u => u.LockedUntil != null && u.LockedUntil > now);
        var suspendedUsers  = await _context.Users.CountAsync(u => u.Role == "suspended");

        var totalExpenses       = await _context.Expenses.CountAsync();
        var totalIncomes        = await _context.Incomes.CountAsync();
        var totalDebts          = await _context.Debts.CountAsync();
        var totalExpenseAmount  = await _context.Expenses.SumAsync(e => (decimal?)e.Amount) ?? 0;
        var totalIncomeAmount   = await _context.Incomes.SumAsync(i => (decimal?)i.Amount) ?? 0;

        var usersByRole = await _context.Users
            .GroupBy(u => u.Role)
            .Select(g => new { role = g.Key, count = g.Count() })
            .ToListAsync();

        // Registros por día (últimos 30 días)
        var registrationsByDay = await _context.Users
            .Where(u => u.CreatedAt >= thirtyDaysAgo)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

        // Logins por día (últimos 7 días)
        var loginsByDay = await _context.AuditLogs
            .Where(l => l.Action == "login" && l.CreatedAt >= sevenDaysAgo)
            .GroupBy(l => l.CreatedAt.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

        // Top categorías de gasto
        var topCategories = await _context.Expenses
            .GroupBy(e => e.Category)
            .Select(g => new { category = g.Key, total = g.Sum(e => e.Amount), count = g.Count() })
            .OrderByDescending(x => x.total)
            .Take(5)
            .ToListAsync();

        // Usuarios más activos (por transacciones)
        var topUsers = await _context.Users
            .Select(u => new
            {
                u.Id, u.Name, u.Email, u.Role, u.LastLoginAt, u.CreatedAt,
                transactionCount = u.Incomes.Count + u.Expenses.Count
            })
            .OrderByDescending(u => u.transactionCount)
            .Take(10)
            .ToListAsync();

        // Errores últimas 24h
        var errors24h = await _context.AuditLogs
            .Where(l => !l.Success && l.CreatedAt >= now.AddHours(-24))
            .CountAsync();

        var failedLogins24h = await _context.AuditLogs
            .Where(l => l.Action == "login_failed" && l.CreatedAt >= now.AddHours(-24))
            .CountAsync();

        return Ok(new
        {
            users = new { total = totalUsers, active30d = activeUsers30d, newLast7d = newUsers7d,
                newToday = newUsersToday, locked = lockedUsers, suspended = suspendedUsers, byRole = usersByRole },
            transactions = new { totalExpenses, totalIncomes, totalDebts,
                totalExpenseAmount, totalIncomeAmount, netBalance = totalIncomeAmount - totalExpenseAmount },
            registrationsByDay,
            loginsByDay,
            topCategories,
            topUsers,
            security = new { errors24h, failedLogins24h },
            generatedAt = now
        });
    }

    // ─── SISTEMA ─────────────────────────────────────────────────────────────

    [HttpGet("system-status")]
    public async Task<IActionResult> GetSystemStatus()
    {
        var now = DateTime.UtcNow;
        var errors24h       = await _context.AuditLogs.CountAsync(l => !l.Success && l.CreatedAt >= now.AddHours(-24));
        var loginsLastHour  = await _context.AuditLogs.CountAsync(l => l.Action == "login" && l.CreatedAt >= now.AddHours(-1));
        var failedLogins24h = await _context.AuditLogs.CountAsync(l => l.Action == "login_failed" && l.CreatedAt >= now.AddHours(-24));
        var activeTokens    = await _context.RefreshTokens.CountAsync(r => !r.IsRevoked && r.ExpiresAt > now);

        // IPs con más intentos fallidos (posibles ataques)
        var suspiciousIps = await _context.AuditLogs
            .Where(l => l.Action == "login_failed" && l.CreatedAt >= now.AddHours(-1) && l.IpAddress != null)
            .GroupBy(l => l.IpAddress)
            .Select(g => new { ip = g.Key, attempts = g.Count() })
            .Where(x => x.attempts >= 3)
            .OrderByDescending(x => x.attempts)
            .Take(10)
            .ToListAsync();

        return Ok(new
        {
            status = errors24h > 50 ? "degraded" : "healthy",
            errors24h, loginsLastHour, failedLogins24h, activeTokens,
            suspiciousIps,
            timestamp = now
        });
    }

    // ─── USUARIOS ────────────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null, [FromQuery] string? role = null,
        [FromQuery] string? sort = "createdAt")
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(u => u.Name.Contains(search) || u.Email.Contains(search));
        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role);

        query = sort switch
        {
            "lastLogin"  => query.OrderByDescending(u => u.LastLoginAt),
            "name"       => query.OrderBy(u => u.Name),
            _            => query.OrderByDescending(u => u.CreatedAt)
        };

        var total = await query.CountAsync();
        var now = DateTime.UtcNow;
        var users = await query
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new
            {
                u.Id, u.Name, u.Email, u.Role, u.Plan, u.PlanExpiresAt, u.CreatedAt, u.LastLoginAt,
                u.FailedLoginAttempts,
                isLocked = u.LockedUntil != null && u.LockedUntil > now,
                lockedUntil = u.LockedUntil,
                transactionCount = u.Incomes.Count + u.Expenses.Count
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, users });
    }

    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUserDetail(Guid id)
    {
        var now = DateTime.UtcNow;
        var user = await _context.Users
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id, u.Name, u.Email, u.Role, u.Plan, u.PlanExpiresAt, u.CreatedAt, u.LastLoginAt,
                u.FailedLoginAttempts, u.LockedUntil,
                isLocked = u.LockedUntil != null && u.LockedUntil > now
            })
            .FirstOrDefaultAsync();

        if (user == null) return NotFound();

        var totalIncome   = await _context.Incomes.Where(i => i.UserId == id).SumAsync(i => (decimal?)i.Amount) ?? 0;
        var totalExpenses = await _context.Expenses.Where(e => e.UserId == id).SumAsync(e => (decimal?)e.Amount) ?? 0;
        var totalDebts    = await _context.Debts.Where(d => d.UserId == id).SumAsync(d => (decimal?)d.RemainingAmount) ?? 0;
        var incomeCount   = await _context.Incomes.CountAsync(i => i.UserId == id);
        var expenseCount  = await _context.Expenses.CountAsync(e => e.UserId == id);

        var recentLogs = await _context.AuditLogs
            .Where(l => l.UserId == id)
            .OrderByDescending(l => l.CreatedAt)
            .Take(20)
            .ToListAsync();

        var activeTokens = await _context.RefreshTokens
            .CountAsync(r => r.UserId == id && !r.IsRevoked && r.ExpiresAt > now);

        return Ok(new
        {
            user,
            financials = new { totalIncome, totalExpenses, totalDebts, incomeCount, expenseCount,
                balance = totalIncome - totalExpenses },
            recentActivity = recentLogs,
            activeTokens
        });
    }

    [HttpPatch("users/{id}/role")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleDto dto)
    {
        var validRoles = new[] { "user", "admin", "support", "suspended" };
        if (!validRoles.Contains(dto.Role))
            return BadRequest(new { message = "Rol inválido" });

        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        // Proteger: no puedes quitarte el rol de admin a ti mismo
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (callerId == id.ToString() && dto.Role != "admin")
            return BadRequest(new { message = "No puedes cambiar tu propio rol de admin" });

        user.Role = dto.Role;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Rol actualizado a {dto.Role}", userId = id });
    }

    [HttpPost("users/{id}/unlock")]
    public async Task<IActionResult> UnlockUser(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.LockedUntil = null;
        user.FailedLoginAttempts = 0;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Cuenta desbloqueada" });
    }

    [HttpPost("users/{id}/suspend")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> SuspendUser(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (callerId == id.ToString())
            return BadRequest(new { message = "No puedes suspenderte a ti mismo" });

        user.Role = "suspended";
        user.UpdatedAt = DateTime.UtcNow;

        // Revocar todos sus tokens activos
        var tokens = await _context.RefreshTokens
            .Where(r => r.UserId == id && !r.IsRevoked)
            .ToListAsync();
        foreach (var t in tokens) t.IsRevoked = true;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Usuario suspendido y sesiones revocadas" });
    }

    [HttpPost("users/{id}/reactivate")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ReactivateUser(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.Role = "user";
        user.LockedUntil = null;
        user.FailedLoginAttempts = 0;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Usuario reactivado" });
    }

    [HttpPost("users/{id}/force-logout")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ForceLogout(Guid id)
    {
        var tokens = await _context.RefreshTokens
            .Where(r => r.UserId == id && !r.IsRevoked)
            .ToListAsync();

        foreach (var t in tokens) t.IsRevoked = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"{tokens.Count} sesiones revocadas" });
    }

    [HttpDelete("users/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (callerId == id.ToString())
            return BadRequest(new { message = "No puedes eliminarte a ti mismo" });

        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Usuario {user.Email} eliminado permanentemente" });
    }

    // ─── AUDIT LOG ───────────────────────────────────────────────────────────

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        [FromQuery] string? action = null, [FromQuery] Guid? userId = null,
        [FromQuery] bool? success = null, [FromQuery] string? ip = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var query = _context.AuditLogs.AsQueryable();

        if (!string.IsNullOrEmpty(action)) query = query.Where(l => l.Action.Contains(action));
        if (userId.HasValue)               query = query.Where(l => l.UserId == userId);
        if (success.HasValue)              query = query.Where(l => l.Success == success);
        if (!string.IsNullOrEmpty(ip))     query = query.Where(l => l.IpAddress == ip);
        if (from.HasValue)                 query = query.Where(l => l.CreatedAt >= from);
        if (to.HasValue)                   query = query.Where(l => l.CreatedAt <= to);

        var total = await query.CountAsync();
        var logs  = await query.OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { total, page, pageSize, logs });
    }

    // ─── EXPORTAR CSV ────────────────────────────────────────────────────────

    [HttpGet("export/users")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ExportUsers()
    {
        var now = DateTime.UtcNow;
        var users = await _context.Users
            .Select(u => new
            {
                u.Id, u.Name, u.Email, u.Role, u.CreatedAt, u.LastLoginAt,
                isLocked = u.LockedUntil != null && u.LockedUntil > now,
                transactionCount = u.Incomes.Count + u.Expenses.Count
            })
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Id,Nombre,Email,Rol,Registrado,Ultimo Login,Bloqueado,Transacciones");
        foreach (var u in users)
            sb.AppendLine($"{u.Id},{u.Name},{u.Email},{u.Role},{u.CreatedAt:yyyy-MM-dd},{u.LastLoginAt?.ToString("yyyy-MM-dd") ?? "nunca"},{u.isLocked},{u.transactionCount}");

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"usuarios_{now:yyyyMMdd}.csv");
    }

    [HttpGet("export/audit-logs")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ExportAuditLogs([FromQuery] int days = 7)
    {
        var from = DateTime.UtcNow.AddDays(-days);
        var logs = await _context.AuditLogs
            .Where(l => l.CreatedAt >= from)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Fecha,Accion,Entidad,UserId,IP,Exitoso,Detalles");
        foreach (var l in logs)
            sb.AppendLine($"{l.CreatedAt:yyyy-MM-dd HH:mm:ss},{l.Action},{l.Entity},{l.UserId},{l.IpAddress},{l.Success},{l.Details?.Replace(",", ";")}");

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"audit_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    // ─── BROADCAST (notificación a todos) ────────────────────────────────────

    [HttpPost("broadcast-alert")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> BroadcastAlert([FromBody] BroadcastDto dto)
    {
        var users = await _context.Users
            .Where(u => u.Role != "suspended")
            .Select(u => u.Id)
            .ToListAsync();

        var alerts = users.Select(uid => new Domain.Entities.Alert
        {
            Id = Guid.NewGuid(),
            UserId = uid,
            Type = "admin_broadcast",
            Severity = dto.Severity ?? "Info",
            Message = dto.Message,
            Details = dto.Details,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.Alerts.AddRange(alerts);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Alerta enviada a {alerts.Count} usuarios" });
    }
}

public record UpdateRoleDto(string Role);
public record BroadcastDto(string Message, string? Details, string? Severity);
public record TestEmailDto(string ToEmail);
