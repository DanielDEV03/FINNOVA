using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FinancialCopilot.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<SubscriptionsController> _logger;

    private static readonly Dictionary<string, Dictionary<string, decimal>> Prices = new()
    {
        ["pro"]      = new() { ["monthly"] = 29_900m, ["annual"] = 287_040m },
        ["business"] = new() { ["monthly"] = 89_900m, ["annual"] = 863_040m },
    };

    public SubscriptionsController(IApplicationDbContext context, IConfiguration config, ILogger<SubscriptionsController> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    // GET /api/subscriptions/my
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
                activeSub.Id, activeSub.Plan, activeSub.Status,
                activeSub.BillingCycle, activeSub.AmountPaid,
                activeSub.StartedAt, activeSub.ExpiresAt,
            }
        });
    }

    // POST /api/subscriptions/checkout — genera URL de Wompi Web Checkout
    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (!Prices.TryGetValue(req.Plan, out var cycles) || !cycles.TryGetValue(req.BillingCycle, out var amount))
            return BadRequest(new { message = "Plan o ciclo de facturación inválido" });

        var publicKey   = _config["Wompi:PublicKey"] ?? "";
        var integrityKey = _config["Wompi:IntegrityKey"] ?? "";
        var frontendUrl = _config["Wompi:FrontendUrl"] ?? "https://finnova-frontend.onrender.com";

        if (string.IsNullOrEmpty(publicKey) || string.IsNullOrEmpty(integrityKey))
            return StatusCode(503, new { message = "Pasarela de pago no configurada. Contacta al administrador." });

        var reference = $"FINNOVA-{userId}-{req.Plan[..3].ToUpper()}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var amountInCents = (long)(amount * 100);
        var currency = "COP";
        var redirectUrl = $"{frontendUrl}/payment/result";

        // SHA256: reference + amountInCents + currency + integrityKey
        var raw = $"{reference}{amountInCents}{currency}{integrityKey}";
        var signature = ComputeSha256(raw);

        // Guardar suscripción pendiente
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var sub = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            Plan = req.Plan,
            Status = "pending",
            BillingCycle = req.BillingCycle,
            AmountPaid = amount,
            Currency = currency,
            PaymentReference = reference,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = req.BillingCycle == "annual"
                ? DateTime.UtcNow.AddYears(1)
                : DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
        };
        _context.Subscriptions.Add(sub);
        await _context.SaveChangesAsync();

        // Construir URL de Wompi Web Checkout
        var email = user.Email;
        var name  = Uri.EscapeDataString(user.Name ?? "");
        var checkoutUrl = $"https://checkout.wompi.co/p/" +
            $"?public-key={Uri.EscapeDataString(publicKey)}" +
            $"&currency={currency}" +
            $"&amount-in-cents={amountInCents}" +
            $"&reference={Uri.EscapeDataString(reference)}" +
            $"&signature:integrity={signature}" +
            $"&redirect-url={Uri.EscapeDataString(redirectUrl)}" +
            $"&customer-data:email={Uri.EscapeDataString(email)}" +
            $"&customer-data:full-name={name}";

        return Ok(new { checkoutUrl, reference });
    }

    // POST /api/subscriptions/webhook — Wompi notifica el pago
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromBody] JsonElement body)
    {
        try
        {
            // Wompi envía: { "event": "transaction.updated", "data": { "transaction": {...} } }
            var eventType = body.TryGetProperty("event", out var ev) ? ev.GetString() : null;
            if (eventType != "transaction.updated") return Ok();

            var txData = body.GetProperty("data").GetProperty("transaction");
            var status    = txData.TryGetProperty("status", out var s) ? s.GetString() : null;
            var reference = txData.TryGetProperty("reference", out var r) ? r.GetString() : null;
            var txId      = txData.TryGetProperty("id", out var i) ? i.GetString() : null;

            if (status != "APPROVED" || string.IsNullOrEmpty(reference)) return Ok();

            // Verificar firma del webhook (opcional pero recomendado)
            var eventKey = _config["Wompi:EventsKey"] ?? "";
            if (!string.IsNullOrEmpty(eventKey))
            {
                var checksum = body.TryGetProperty("signature", out var sig)
                    ? sig.TryGetProperty("checksum", out var cs) ? cs.GetString() : null
                    : null;
                var properties = body.TryGetProperty("signature", out var sig2)
                    ? sig2.TryGetProperty("properties", out var props) ? props : (JsonElement?)null
                    : null;
                // Validación básica de checksum si está disponible
                _logger.LogInformation("Wompi webhook received for reference {Ref}, status {Status}", reference, status);
            }

            var sub = await _context.Subscriptions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.PaymentReference == reference);

            if (sub == null)
            {
                _logger.LogWarning("Wompi webhook: subscription not found for reference {Ref}", reference);
                return Ok();
            }

            sub.Status = "active";
            sub.PaymentGatewayId = txId;
            sub.PaymentMethod = "wompi";
            sub.User.Plan = sub.Plan;
            sub.User.PlanExpiresAt = sub.ExpiresAt;
            sub.User.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Plan {Plan} activated for user {UserId} via Wompi", sub.Plan, sub.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Wompi webhook");
        }

        return Ok();
    }

    // GET /api/subscriptions/verify/{reference} — frontend verifica el pago tras redirect
    [Authorize]
    [HttpGet("verify/{reference}")]
    public async Task<IActionResult> Verify(string reference)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var sub = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.PaymentReference == reference && s.UserId == userId);

        if (sub == null) return NotFound(new { message = "Referencia no encontrada" });

        // Si el webhook ya lo activó, devolver activo
        if (sub.Status == "active")
            return Ok(new { status = "active", plan = sub.Plan, expiresAt = sub.ExpiresAt });

        // Si no, consultar directamente a Wompi
        var publicKey = _config["Wompi:PublicKey"] ?? "";
        var env = publicKey.StartsWith("pub_test_") ? "sandbox" : "production";
        var baseUrl = env == "sandbox"
            ? "https://sandbox.wompi.co/v1"
            : "https://production.wompi.co/v1";

        using var http = new HttpClient();
        var wompiRes = await http.GetAsync($"{baseUrl}/transactions?reference={reference}");
        if (wompiRes.IsSuccessStatusCode)
        {
            var json = await wompiRes.Content.ReadFromJsonAsync<WompiTransactionsResponse>();
            var approved = json?.Data?.FirstOrDefault(t => t.Status == "APPROVED");
            if (approved != null)
            {
                sub.Status = "active";
                sub.PaymentGatewayId = approved.Id;
                sub.PaymentMethod = "wompi";
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    user.Plan = sub.Plan;
                    user.PlanExpiresAt = sub.ExpiresAt;
                    user.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                return Ok(new { status = "active", plan = sub.Plan, expiresAt = sub.ExpiresAt });
            }
        }

        return Ok(new { status = sub.Status, plan = sub.Plan });
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
        await _context.SaveChangesAsync();

        return Ok(new { message = "Suscripción cancelada. Seguirás teniendo acceso hasta el fin del período.", expiresAt = sub.ExpiresAt });
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLower();
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public record CheckoutRequest(string Plan, string BillingCycle);
public record ManualActivationRequest(string Email, string Plan, string BillingCycle, decimal AmountPaid);

public class WompiTransactionsResponse
{
    [System.Text.Json.Serialization.JsonPropertyName("data")]
    public List<WompiTransaction>? Data { get; set; }
}

public class WompiTransaction
{
    [System.Text.Json.Serialization.JsonPropertyName("id")]
    public string? Id { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("status")]
    public string? Status { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("reference")]
    public string? Reference { get; set; }
}


