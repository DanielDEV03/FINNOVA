using FinancialCopilot.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace FinancialCopilot.API.Middleware;

/// <summary>
/// Requiere que el usuario tenga un plan específico para acceder al endpoint.
/// Uso: [RequirePlan("pro")] o [RequirePlan("pro", "business")]
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequirePlanAttribute : Attribute, IAsyncActionFilter
{
    private readonly string[] _requiredPlans;

    public RequirePlanAttribute(params string[] plans)
    {
        _requiredPlans = plans;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var userIdClaim = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "No autenticado" });
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<IApplicationDbContext>();
        var user = await db.Users.FindAsync(userId);

        if (user == null)
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Usuario no encontrado" });
            return;
        }

        var userPlan = user.Plan ?? "free";
        var planActive = user.PlanExpiresAt == null || user.PlanExpiresAt > DateTime.UtcNow;
        var effectivePlan = planActive ? userPlan : "free";

        if (!_requiredPlans.Contains(effectivePlan))
        {
            context.Result = new ObjectResult(new
            {
                message = "Esta función requiere un plan de pago",
                requiredPlan = _requiredPlans.First(),
                currentPlan = effectivePlan,
                upgradeUrl = "/pricing"
            })
            { StatusCode = 402 }; // Payment Required
            return;
        }

        await next();
    }
}
