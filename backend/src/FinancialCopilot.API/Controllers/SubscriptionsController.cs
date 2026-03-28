using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace FinancialCopilot.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<SubscriptionsController> _logger;

    // Precios en COP
    private static readonly Dictionary<string, Dictionary<string, decimal>> Prices = new()
    {
        ["pro"]      = new() { ["monthly"] = 29_900m, ["annual"] = 287_040m },  // 20% off anual
        ["business"] = new() { ["monthly"] = 89_900m, ["annual"] = 863_040m },
    };

    public SubscriptionsController(IApplicationDbContext context, IConfiguration config, ILogger<SubscriptionsController> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    // GET /api/subscriptions/my — plan actual del usuario
    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyPlan()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var activeSub = await _context.Subscriptions
            .Where(s => s.UserId == userId && s.Status == "active" && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.ExpiresAt)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            plan = user.Plan,
            isPro = user.IsPro,
            isBusiness = user.IsBusiness,
            planExpiresAt = user.PlanExpiresAt,
            subscription = activeSub == null ? null : new
            {
                activeSub.Id,
                activeSub.Plan,
                activeSub.Status,
                activeSub.BillingCycle,
                activeSub.AmountPaid,
                activeSub.StartedAt,
                activeSub.ExpiresAt,
            }
        });
    }

    // POST /api/subscriptions/checkout — genera link de pago Wompi
    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (!Prices.TryGetValue(req.Plan, out var cycles) || !cycles.TryGetValue(req.BillingCycle, out var amount))
            return BadRequest(new { message = "Plan o ciclo de facturación inválido" });

        var reference = $"FINNOVA-{userId}-{req.Plan}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var publicKey = _config["Wompi:PublicKey"] ?? "";
        var redirectUrl = _config["Wompi:RedirectUrl"] ?? "https://finnova-frontend.onrender.com/dashboard";

        // URL de checkout de Wompi
        var wompiUrl = $"https://checkout.wompi.co/p/" +
            $"?public-key={publicKey}" +
            $"&currency=COP" +
            $"&amount-in-cents={amount * 100:0}" +
            $"&reference={reference}" +
            $"&redirect-url={Uri.EscapeDataString(redirectUrl + $"?plan={req.Plan}&ref={reference}")}";

        // Guardar suscripción pendiente
        var sub = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            Plan = req.Plan,
            Status = "pending",
            BillingCycle = req.BillingCycle,
            AmountPaid = amount,
            Currency = "COP",
            PaymentReference = reference,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = req.BillingCycle == "annual"
                ? DateTime.UtcNow.AddYears(1)
                : DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
        };

        _context.Subscriptions.Add(sub);
        await _context.SaveChangesAsync();

        return Ok(new { checkoutUrl = wompiUrl, reference });
    }

    // POST /api/subscriptions/webhook — Wompi notifica el pago
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();

        _logger.LogInformation("Wompi webhook received: {Body}", body[..Math.Min(500, body.Length)]);

        try
        {
            var payload = JsonSerializer.Deserialize<WompiWebhookPayload>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (payload?.Data?.Transaction == null) return Ok();

            var tx = payload.Data.Transaction;
            if (tx.Status != "APPROVED") return Ok();

            var sub = await _context.Subscriptions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.PaymentReference == tx.Reference);

            if (sub == null) return Ok();

            // Activar suscripción
            sub.Status = "active";
            sub.PaymentGatewayId = tx.Id;
            sub.PaymentMethod = tx.PaymentMethodType;

            // Actualizar plan del usuario
            sub.User.Plan = sub.Plan;
            sub.User.PlanExpiresAt = sub.ExpiresAt;
            sub.User.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Subscription activated for user {UserId}: {Plan}", sub.UserId, sub.Plan);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Wompi webhook");
        }

        return Ok();
    }

    // POST /api/subscriptions/activate-manual — admin activa plan manualmente
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("activate-manual")]
    public async Task<IActionResult> ActivateManual([FromBody] ManualActivationRequest req)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null) return NotFound(new { message = "Usuario no encontrado" });

        var sub = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Plan = req.Plan,
            Status = "active",
            BillingCycle = req.BillingCycle,
            AmountPaid = req.AmountPaid,
            Currency = "COP",
            PaymentReference = $"MANUAL-{user.Id}-{DateTime.UtcNow:yyyyMMddHHmmss}",
            PaymentMethod = "manual",
            StartedAt = DateTime.UtcNow,
            ExpiresAt = req.BillingCycle == "annual"
                ? DateTime.UtcNow.AddYears(1)
                : DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
        };

        user.Plan = req.Plan;
        user.PlanExpiresAt = sub.ExpiresAt;
        user.UpdatedAt = DateTime.UtcNow;

        _context.Subscriptions.Add(sub);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Plan {req.Plan} activado para {user.Email}", expiresAt = sub.ExpiresAt });
    }

    // POST /api/subscriptions/cancel
    [Authorize]
    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var sub = await _context.Subscriptions
            .Where(s => s.UserId == userId && s.Status == "active")
            .OrderByDescending(s => s.ExpiresAt)
            .FirstOrDefaultAsync();

        if (sub == null) return NotFound(new { message = "No tienes una suscripción activa" });

        sub.Status = "cancelled";
        sub.CancelledAt = DateTime.UtcNow;

        // El plan sigue activo hasta que expire
        await _context.SaveChangesAsync();

        return Ok(new { message = "Suscripción cancelada. Seguirás teniendo acceso hasta el fin del período.", expiresAt = sub.ExpiresAt });
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public record CheckoutRequest(string Plan, string BillingCycle);
public record ManualActivationRequest(string Email, string Plan, string BillingCycle, decimal AmountPaid);

// Wompi webhook DTOs
public class WompiWebhookPayload
{
    public string? Event { get; set; }
    public WompiData? Data { get; set; }
}
public class WompiData { public WompiTransaction? Transaction { get; set; } }
public class WompiTransaction
{
    public string? Id { get; set; }
    public string? Reference { get; set; }
    public string? Status { get; set; }
    public string? PaymentMethodType { get; set; }
    public long AmountInCents { get; set; }
}
