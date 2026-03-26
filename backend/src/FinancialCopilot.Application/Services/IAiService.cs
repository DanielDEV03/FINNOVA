namespace FinancialCopilot.Application.Services;

public interface IAiService
{
    Task<BalancePredictionDto> PredictBalanceAsync(Guid userId, int monthsAhead = 3);
    Task<ExpensePredictionDto> PredictExpensesAsync(Guid userId, int monthsAhead = 3);
    Task<SimulationResultDto> SimulateScenarios(Guid userId, int months = 12);
    Task<RiskAnalysisDto> AnalyzeRiskAsync(Guid userId);
}

public record BalancePredictionDto(
    List<MonthlyPrediction> Predictions,
    double Confidence,
    string Trend,
    string RiskLevel,
    List<string> Recommendations,
    decimal CurrentBalance
);

public record MonthlyPrediction(
    string Month,
    decimal PredictedBalance,
    double Confidence
);

public record ExpensePredictionDto(
    List<CategoryPredictionItem> Predictions,
    decimal TotalPredicted,
    double Confidence,
    List<string> Recommendations
);

public record CategoryPredictionItem(
    string Category,
    decimal PredictedAmount,
    double Confidence,
    string Trend
);

// kept for internal use
public record CategoryPrediction(
    decimal Average,
    decimal PredictedNextMonth,
    string Trend
);

public record SimulationResultDto(
    Dictionary<string, ScenarioResult> Scenarios,
    ScenarioComparison Comparison,
    string BestScenario,
    List<string> Recommendations
);

public record ScenarioResult(
    List<MonthlySnapshot> Timeline,
    decimal FinalBalance,
    decimal FinalDebt,
    decimal TotalSaved,
    decimal TotalInterestPaid,
    bool DebtPaidOff,
    int MonthsToPositive
);

public record MonthlySnapshot(
    int Month,
    decimal Balance,
    decimal Debt,
    decimal NetIncome
);

public record ScenarioComparison(
    Dictionary<string, ScenarioScore> Scores,
    string BestScenario
);

public record ScenarioScore(
    decimal FinalBalance,
    decimal FinalDebt,
    decimal Score,
    bool DebtPaidOff
);

public record RiskAnalysisDto(
    int RiskScore,
    string RiskLevel,
    List<string> Factors,
    List<string> Recommendations,
    RiskMetrics Metrics
);

public record RiskMetrics(
    double ExpenseRatio,
    double Volatility,
    decimal Balance
);
