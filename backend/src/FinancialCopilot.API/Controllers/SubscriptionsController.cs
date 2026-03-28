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

    // POST /api/subscriptions/checkout — genera link de pago MercadoPago
    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (!Prices.TryGetValue(req.Plan, out var cycles) || !cycles.TryGetValue(req.BillingCycle, out var amount))
            return BadRequest(new { message = "Plan o ciclo de facturación inválido" });

        var reference = $"FINNOVA-{userId}-{req.Plan}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var accessToken = _config["MercadoPago:AccessToken"] ?? "";
        var frontendUrl = _config["MercadoPago:FrontendUrl"] ?? "https://finnova-frontend.onrender.com";

        // Crear preferencia en MercadoPago
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

        var preference = new
        {
            items = new[]
            {
                new
                {
                    title = $"FINNOVA {char.ToUpper(req.Plan[0]) + req.Plan[1..]} — {(req.BillingCycle == "annual" ? "Anual" : "Mensual")}",
                    quantity = 1,
                    unit_price = (double)amount,
                    currency_id = "COP"
                }
            },
            external_reference = reference,
            back_urls = new
            {
                success = $"{frontendUrl}/dashboard?plan={req.Plan}&ref={reference}&status=success",
                failure = $"{frontendUrl}/pricing?status=failed",
                pending = $"{frontendUrl}/dashboard?plan={req.Plan}&ref={reference}&status=pending"
            },
            auto_return = "approved",
            notification_url = $"{_config["MercadoPago:BackendUrl"] ?? "https://finnova-backend.onrender.com"}/api/subscriptions/webhook",
            metadata = new { user_id = userId.ToString(), plan = req.Plan, billing_cycle = req.BillingCycle }
        };

        var mpResponse = await http.PostAsJsonAsync("https://api.mercadopago.com/checkout/preferences", preference);

        if (!mpResponse.IsSuccessStatusCode)
        {
            var err = await mpResponse.Content.ReadAsStringAsync();
            _logger.LogError("MercadoPago error: {Error}", err);
            return StatusCode(502, new { message = "Error al crear el pago. Intenta de nuevo." });
        }

        var mpResult = await mpResponse.Content.ReadFromJsonAsync<MercadoPagoPreferenceResponse>();

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
            PaymentGatewayId = mpResult?.Id,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = req.BillingCycle == "annual"
                ? DateTime.UtcNow.AddYears(1)
                : DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
        };

        _context.Subscriptions.Add(sub);
        await _context.SaveChangesAsync();

        return Ok(new { checkoutUrl = mpResult?.InitPoint ?? mpResult?.SandboxInitPoint, reference });
    }

    // POST /api/subscriptions/webhook — MercadoPago notifica el pago
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromQuery] string? type, [FromQuery] string? id)
    {
        try
        {
            // MercadoPago envía type=payment&id=<payment_id> como query params
            if (type != "payment" || string.IsNullOrEmpty(id))
                return Ok();

            var accessToken = _config["MercadoPago:AccessToken"] ?? "";
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

            var paymentRes = await http.GetAsync($"https://api.mercadopago.com/v1/payments/{id}");
            if (!paymentRes.IsSuccessStatusCode) return Ok();

            var payment = await paymentRes.Content.ReadFromJsonAsync<MercadoPagoPayment>();
            if (payment == null || payment.Status != "approved") return Ok();

            var reference = payment.ExternalReference;
            var sub = await _context.Subscriptions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.PaymentReference == reference);

            if (sub == null) return Ok();

            sub.Status = "active";
            sub.PaymentGatewayId = payment.Id?.ToString();
            sub.PaymentMethod = payment.PaymentTypeId;
            sub.User.Plan = sub.Plan;
            sub.User.PlanExpiresAt = sub.ExpiresAt;
            sub.User.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Subscription activated via MercadoPago for user {UserId}: {Plan}", sub.UserId, sub.Plan);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing MercadoPago webhook");
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

// MercadoPago DTOs
public class MercadoPagoPreferenceResponse
{
    [System.Text.Json.Serialization.JsonPropertyName("id")]
    public string? Id { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("init_point")]
    public string? InitPoint { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("sandbox_init_point")]
    public string? SandboxInitPoint { get; set; }
}

public class MercadoPagoPayment
{
    [System.Text.Json.Serialization.JsonPropertyName("id")]
    public long? Id { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("status")]
    public string? Status { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("external_reference")]
    public string? ExternalReference { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("payment_type_id")]
    public string? PaymentTypeId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("transaction_amount")]
    public decimal TransactionAmount { get; set; }
}
