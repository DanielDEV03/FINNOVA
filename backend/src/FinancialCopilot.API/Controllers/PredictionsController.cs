using FinancialCopilot.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FinancialCopilot.API.Controllers;

[Authorize]
[ApiController]
[Route("api/users/{userId}/[controller]")]
public class PredictionsController : ControllerBase
{
    private readonly IAiService _aiService;

    public PredictionsController(IAiService aiService) => _aiService = aiService;

    private bool OwnsResource(Guid userId)
    {
        var tokenUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        return role == "admin" || tokenUserId == userId.ToString();
    }

    [HttpGet("balance")]
    public async Task<ActionResult<BalancePredictionDto>> PredictBalance(Guid userId, [FromQuery] int monthsAhead = 3)
    {
        if (!OwnsResource(userId)) return Forbid();
        try { return Ok(await _aiService.PredictBalanceAsync(userId, monthsAhead)); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpGet("expenses")]
    public async Task<ActionResult<ExpensePredictionDto>> PredictExpenses(Guid userId, [FromQuery] int monthsAhead = 3)
    {
        if (!OwnsResource(userId)) return Forbid();
        try { return Ok(await _aiService.PredictExpensesAsync(userId, monthsAhead)); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpGet("risk")]
    public async Task<ActionResult<RiskAnalysisDto>> AnalyzeRisk(Guid userId)
    {
        if (!OwnsResource(userId)) return Forbid();
        try { return Ok(await _aiService.AnalyzeRiskAsync(userId)); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }
}
