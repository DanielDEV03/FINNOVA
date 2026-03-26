using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FinancialCopilot.Application.Common.Interfaces;
using FinancialCopilot.Application.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FinancialCopilot.Infrastructure.Services;

public class AiService : IAiService
{
    private readonly IApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly string _aiEngineUrl;

    public AiService(IApplicationDbContext context, IConfiguration configuration, HttpClient httpClient)
    {
        _context = context;
        _httpClient = httpClient;
        _aiEngineUrl = configuration["AiEngine:Url"] ?? "http://localhost:8000";

        var apiKey = configuration["AiEngine:ApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
            _httpClient.DefaultRequestHeaders.Add("X-AI-Engine-Key", apiKey);
    }

    public async Task<BalancePredictionDto> PredictBalanceAsync(Guid userId, int monthsAhead = 3)
    {
        var transactions = await GetUserTransactions(userId);
        
        var request = new
        {
            user_id = userId.ToString(),
            transactions = transactions.Select(t => new
            {
                amount = t.Amount,
                date = t.Date.ToString("o"),
                type = t.Type,
                category = t.Category
            }),
            months_ahead = monthsAhead
        };

        var response = await PostToAiEngine("/predict/balance", request);
        var result = JsonSerializer.Deserialize<AiBalancePredictionResponse>(response, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (result == null)
            throw new Exception("Failed to get prediction from AI engine");

        return new BalancePredictionDto(
            result.Predictions.Select(p => new MonthlyPrediction(p.Month, (decimal)p.PredictedBalance, p.Confidence)).ToList(),
            result.Confidence,
            result.Trend,
            result.RiskLevel,
            result.Recommendations,
            (decimal)result.CurrentBalance
        );
    }

    public async Task<ExpensePredictionDto> PredictExpensesAsync(Guid userId, int monthsAhead = 3)
    {
        var transactions = await GetUserTransactions(userId);
        
        var request = new
        {
            user_id = userId.ToString(),
            transactions = transactions.Where(t => t.Type == "expense").Select(t => new
            {
                amount = t.Amount,
                date = t.Date.ToString("o"),
                type = t.Type,
                category = t.Category
            }),
            months_ahead = monthsAhead
        };

        var response = await PostToAiEngine("/predict/expenses", request);
        var result = JsonSerializer.Deserialize<AiExpensePredictionResponse>(response, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (result == null)
            throw new Exception("Failed to get expense prediction from AI engine");

        var predictions = result.CategoryPredictions.Select(kvp => new CategoryPredictionItem(
            kvp.Key,
            (decimal)kvp.Value.PredictedNextMonth * monthsAhead,
            0.6,
            kvp.Value.Trend
        )).ToList();

        var total = predictions.Sum(p => p.PredictedAmount);
        var confidence = predictions.Count > 0 ? 0.6 : 0.3;
        var recommendations = new List<string>();
        if (predictions.Count == 0)
            recommendations.Add("Registra más gastos para obtener predicciones por categoría.");
        else
            recommendations.Add($"Se predicen {predictions.Count} categorías de gasto para los próximos {monthsAhead} meses.");

        return new ExpensePredictionDto(predictions, total, confidence, recommendations);
    }

    public async Task<SimulationResultDto> SimulateScenarios(Guid userId, int months = 12)
    {
        try
        {
            // Ejecutar consultas secuencialmente para evitar problemas de concurrencia
            var incomes = await _context.Incomes
                .Where(i => i.UserId == userId)
                .Select(i => new { i.Amount, i.Date })
                .ToListAsync();

            var expenses = await _context.Expenses
                .Where(e => e.UserId == userId)
                .Select(e => new { e.Amount, e.Date })
                .ToListAsync();

            var debts = await _context.Debts
                .Where(d => d.UserId == userId)
                .Select(d => new { d.RemainingAmount, d.InterestRate })
                .ToListAsync();

            var totalIncome = incomes.Sum(i => i.Amount);
            var totalExpenses = expenses.Sum(e => e.Amount);
            var totalDebt = debts.Sum(d => d.RemainingAmount);
            var avgInterestRate = debts.Where(d => d.RemainingAmount > 0).Average(d => (double?)d.InterestRate) ?? 0;

            var balance = totalIncome - totalExpenses;

            // Calcular promedios mensuales
            var monthCount = incomes.Select(i => i.Date.Month).Distinct().Count();
            monthCount = Math.Max(monthCount, 1);

            var monthlyIncome = totalIncome / monthCount;
            var monthlyExpenses = totalExpenses / monthCount;

            var request = new
            {
                current_balance = balance,
                monthly_income = monthlyIncome,
                monthly_expenses = monthlyExpenses,
                debt = totalDebt,
                interest_rate = avgInterestRate,
                months = months
            };

            Console.WriteLine($"Simulator Request: balance={balance}, income={monthlyIncome}, expenses={monthlyExpenses}");

            var response = await PostToAiEngine("/simulate", request);
            
            Console.WriteLine($"Simulator Response: {response.Substring(0, Math.Min(500, response.Length))}...");

            var result = JsonSerializer.Deserialize<AiSimulationResponse>(response, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null)
                throw new Exception("Failed to deserialize simulation response from AI engine");

            if (result.Scenarios == null || result.Scenarios.Count == 0)
                throw new Exception("AI engine returned empty scenarios");

            Console.WriteLine($"Deserialized scenarios count: {result.Scenarios.Count}");
            Console.WriteLine($"Current scenario final balance: {result.Scenarios["current"].FinalBalance}");

            var scenarios = result.Scenarios.ToDictionary(
                kvp => kvp.Key,
                kvp => new ScenarioResult(
                    kvp.Value.Timeline.Select(t => new MonthlySnapshot(t.Month, (decimal)t.Balance, (decimal)t.Debt, (decimal)t.NetIncome)).ToList(),
                    (decimal)kvp.Value.FinalBalance,
                    (decimal)kvp.Value.FinalDebt,
                    (decimal)kvp.Value.TotalSaved,
                    (decimal)kvp.Value.TotalInterestPaid,
                    kvp.Value.DebtPaidOff,
                    kvp.Value.MonthsToPositive
                )
            );

            Console.WriteLine($"Converted current scenario final balance: {scenarios["current"].FinalBalance}");

            var comparisonScores = new Dictionary<string, ScenarioScore>();
            
            foreach (var kvp in result.Comparison)
            {
                // Skip "best_scenario" ya que es un string, no un objeto
                if (kvp.Key == "best_scenario")
                    continue;
                
                // Deserializar el JsonElement a AiScenarioScore
                var scoreData = JsonSerializer.Deserialize<AiScenarioScore>(kvp.Value.GetRawText(), new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (scoreData != null)
                {
                    comparisonScores[kvp.Key] = new ScenarioScore(
                        (decimal)scoreData.FinalBalance,
                        (decimal)scoreData.FinalDebt,
                        (decimal)scoreData.Score,
                        scoreData.DebtPaidOff
                    );
                }
            }

            var comparison = new ScenarioComparison(comparisonScores, result.BestScenario);

            return new SimulationResultDto(
                scenarios,
                comparison,
                result.BestScenario,
                result.Recommendations
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"SimulateScenarios Error: {ex.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            throw;
        }
    }

    public async Task<RiskAnalysisDto> AnalyzeRiskAsync(Guid userId)
    {
        var transactions = await GetUserTransactions(userId);
        
        var request = new
        {
            user_id = userId.ToString(),
            transactions = transactions.Select(t => new
            {
                amount = t.Amount,
                date = t.Date.ToString("o"),
                type = t.Type
            }),
            months_ahead = 3
        };

        var response = await PostToAiEngine("/analyze/risk", request);
        var result = JsonSerializer.Deserialize<AiRiskAnalysisResponse>(response, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (result == null)
            throw new Exception("Failed to get risk analysis from AI engine");

        return new RiskAnalysisDto(
            result.GetRiskScore(),
            result.GetRiskLevel(),
            result.Factors,
            result.Recommendations,
            new RiskMetrics(
                result.GetExpenseRatio(),
                result.GetVolatility(),
                (decimal)result.GetBalance()
            )
        );
    }

    private async Task<List<TransactionData>> GetUserTransactions(Guid userId)
    {
        // Ejecutar consultas secuencialmente para evitar problemas de concurrencia
        var incomes = await _context.Incomes
            .Where(i => i.UserId == userId)
            .Select(i => new TransactionData
            {
                Amount = (double)i.Amount,
                Date = i.Date,
                Type = "income",
                Category = i.Type
            })
            .ToListAsync();

        var expenses = await _context.Expenses
            .Where(e => e.UserId == userId)
            .Select(e => new TransactionData
            {
                Amount = (double)e.Amount,
                Date = e.Date,
                Type = "expense",
                Category = e.Category
            })
            .ToListAsync();

        return incomes.Concat(expenses).OrderBy(t => t.Date).ToList();
    }

    private async Task<string> PostToAiEngine(string endpoint, object data)
    {
        try
        {
            var json = JsonSerializer.Serialize(data);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            Console.WriteLine($"Calling AI Engine: {_aiEngineUrl}{endpoint}");
            
            var response = await _httpClient.PostAsync($"{_aiEngineUrl}{endpoint}", content);
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex) when (ex is HttpRequestException || ex is TaskCanceledException || ex is OperationCanceledException)
        {
            Console.WriteLine($"AI Engine not available ({ex.GetType().Name}): {ex.Message}");
            Console.WriteLine($"Using fallback data for endpoint: {endpoint}");
            return GetMockResponse(endpoint, data);
        }
    }
    
    private string GetMockResponse(string endpoint, object data)
    {
        // Extraer datos reales del request para el mock
        var json = JsonSerializer.Serialize(data);
        var doc = JsonDocument.Parse(json);
        
        double currentBalance = 0, monthlyIncome = 0, monthlyExpenses = 0, debt = 0, interestRate = 0;
        int months = 12;
        
        try
        {
            var root = doc.RootElement;
            if (root.TryGetProperty("current_balance", out var cb)) currentBalance = cb.GetDouble();
            if (root.TryGetProperty("monthly_income", out var mi)) monthlyIncome = mi.GetDouble();
            if (root.TryGetProperty("monthly_expenses", out var me)) monthlyExpenses = me.GetDouble();
            if (root.TryGetProperty("debt", out var d)) debt = d.GetDouble();
            if (root.TryGetProperty("interest_rate", out var ir)) interestRate = ir.GetDouble();
            if (root.TryGetProperty("months", out var m)) months = m.GetInt32();
        }
        catch { }

        if (endpoint == "/simulate")
        {
            var scenarios = new Dictionary<string, object>
            {
                ["current"] = BuildScenario(currentBalance, monthlyIncome, monthlyExpenses, debt, interestRate, months, 1.0, 1.0),
                ["optimistic"] = BuildScenario(currentBalance, monthlyIncome * 1.15, monthlyExpenses * 0.9, debt, interestRate, months, 1.15, 0.9),
                ["pessimistic"] = BuildScenario(currentBalance, monthlyIncome * 0.9, monthlyExpenses * 1.1, debt, interestRate, months, 0.9, 1.1),
                ["reduce_expenses_20"] = BuildScenario(currentBalance, monthlyIncome, monthlyExpenses * 0.8, debt, interestRate, months, 1.0, 0.8),
                ["aggressive_debt_payment"] = BuildScenario(currentBalance, monthlyIncome, monthlyExpenses, debt, interestRate, months, 1.0, 1.0, aggressiveDebt: true),
            };

            var result = new
            {
                scenarios,
                comparison = scenarios.ToDictionary(
                    kvp => kvp.Key,
                    kvp => (object)new
                    {
                        final_balance = ((dynamic)kvp.Value).final_balance,
                        final_debt = ((dynamic)kvp.Value).final_debt,
                        score = CalculateScore(((dynamic)kvp.Value).final_balance, ((dynamic)kvp.Value).final_debt),
                        debt_paid_off = ((dynamic)kvp.Value).debt_paid_off
                    }
                ),
                best_scenario = "reduce_expenses_20",
                recommendations = new[]
                {
                    monthlyExpenses > monthlyIncome * 0.8
                        ? $"Tus gastos ({monthlyExpenses:N0} COP) son muy altos respecto a tus ingresos. Intenta reducirlos un 20%."
                        : "Mantén tus hábitos actuales y busca oportunidades de ahorro.",
                    debt > 0
                        ? $"Tienes {debt:N0} COP en deuda. El escenario de pago agresivo puede liberarte antes."
                        : "Sin deudas activas. Enfócate en aumentar tu fondo de emergencia.",
                    monthlyIncome - monthlyExpenses > 0
                        ? $"Ahorras {monthlyIncome - monthlyExpenses:N0} COP/mes. Considera invertir el excedente."
                        : "Revisa tus gastos para generar ahorro mensual positivo."
                }
            };

            return JsonSerializer.Serialize(result);
        }

        if (endpoint == "/predict/balance")
        {
            double totalIncome = 0, totalExpenses = 0;
            var monthSet = new HashSet<string>();
            try
            {
                var root = doc.RootElement;
                if (root.TryGetProperty("transactions", out var txs))
                {
                    foreach (var tx in txs.EnumerateArray())
                    {
                        var amount = tx.TryGetProperty("amount", out var a) ? a.GetDouble() : 0;
                        var type = tx.TryGetProperty("type", out var t) ? t.GetString() : "";
                        var date = tx.TryGetProperty("date", out var d) ? d.GetString() ?? "" : "";
                        if (date.Length >= 7) monthSet.Add(date.Substring(0, 7));
                        if (type == "income") totalIncome += amount;
                        else totalExpenses += amount;
                    }
                }
            }
            catch { }

            var balance = totalIncome - totalExpenses;
            var monthCount = Math.Max(1, monthSet.Count);
            var monthsAhead = 3;
            try { if (doc.RootElement.TryGetProperty("months_ahead", out var ma)) monthsAhead = ma.GetInt32(); } catch { }

            var avgMonthlyIncome = totalIncome / monthCount;
            var avgMonthlyExpenses = totalExpenses / monthCount;
            var avgMonthlyNet = avgMonthlyIncome - avgMonthlyExpenses;
            var confidence = monthCount >= 6 ? 0.9 : monthCount >= 3 ? 0.7 : monthCount >= 2 ? 0.6 : 0.5;

            var predictions = Enumerable.Range(1, monthsAhead).Select(i => new
            {
                month = DateTime.UtcNow.AddMonths(i).ToString("yyyy-MM"),
                predicted_balance = Math.Round(balance + avgMonthlyNet * i, 2),
                confidence
            }).ToList();

            var predictResult = new
            {
                predictions,
                confidence,
                trend = avgMonthlyNet >= 0 ? "increasing" : "decreasing",
                risk_level = balance < 0 ? "high" : avgMonthlyNet < 0 ? "medium" : "low",
                recommendations = new[]
                {
                    balance < 0 ? "Tu balance es negativo. Prioriza reducir gastos." : $"Balance actual: {balance:N0} COP.",
                    avgMonthlyNet < 0 ? $"Gastas {Math.Abs(avgMonthlyNet):N0} COP más de lo que ingresas por mes." : $"Ahorras {avgMonthlyNet:N0} COP/mes en promedio.",
                    monthCount < 3 ? "Registra más meses para predicciones más precisas." : "Buen historial de datos."
                },
                current_balance = Math.Round(balance, 2)
            };
            return JsonSerializer.Serialize(predictResult);
        }

        if (endpoint == "/analyze/risk")
        {
            double totalInc = 0, totalExp = 0;
            var monthlyExpMap = new Dictionary<string, double>();
            try
            {
                var root = doc.RootElement;
                if (root.TryGetProperty("transactions", out var txs))
                    foreach (var tx in txs.EnumerateArray())
                    {
                        var amount = tx.TryGetProperty("amount", out var a) ? a.GetDouble() : 0;
                        var type = tx.TryGetProperty("type", out var t) ? t.GetString() : "";
                        var date = tx.TryGetProperty("date", out var d) ? d.GetString() ?? "" : "";
                        var month = date.Length >= 7 ? date.Substring(0, 7) : "unknown";
                        if (type == "income") totalInc += amount;
                        else
                        {
                            totalExp += amount;
                            if (!monthlyExpMap.ContainsKey(month)) monthlyExpMap[month] = 0;
                            monthlyExpMap[month] += amount;
                        }
                    }
            }
            catch { }

            var expenseRatio = totalInc > 0 ? totalExp / totalInc : (totalExp > 0 ? 1.0 : 0.0);
            var riskScore = expenseRatio > 0.9 ? 70 : expenseRatio > 0.7 ? 40 : 20;
            var riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

            // Calcular volatilidad real
            double volatility = 0;
            if (monthlyExpMap.Count > 1)
            {
                var vals = monthlyExpMap.Values.ToList();
                var avg = vals.Average();
                volatility = avg > 0 ? Math.Sqrt(vals.Sum(v => Math.Pow(v - avg, 2)) / vals.Count) / avg : 0;
            }

            var riskResult = new
            {
                risk_score = riskScore,
                risk_level = riskLevel,
                factors = expenseRatio > 0.8
                    ? new[] { "Alta volatilidad en gastos", "Gastos concentrados en pocas categorías", "Gastos inconsistentes" }
                    : new[] { "Situación financiera estable" },
                recommendations = new[]
                {
                    expenseRatio > 0.8 ? "Reduce gastos al 70% de tus ingresos para mayor estabilidad." : "Buen control de gastos. Considera aumentar tu fondo de emergencia.",
                    totalInc - totalExp > 0 ? $"Balance positivo de {totalInc - totalExp:N0} COP." : "Trabaja en generar un balance positivo mensual."
                },
                metrics = new
                {
                    expense_ratio = Math.Round(expenseRatio, 3),
                    volatility = Math.Round(volatility, 3),
                    balance = Math.Round(totalInc - totalExp, 2)
                }
            };
            return JsonSerializer.Serialize(riskResult);
        }

        if (endpoint == "/predict/expenses")
        {
            var categoryMap = new Dictionary<string, (double total, int count)>();
            try
            {
                var root = doc.RootElement;
                if (root.TryGetProperty("transactions", out var txs))
                    foreach (var tx in txs.EnumerateArray())
                    {
                        var amount = tx.TryGetProperty("amount", out var a) ? a.GetDouble() : 0;
                        var cat = tx.TryGetProperty("category", out var c) ? c.GetString() ?? "Otros" : "Otros";
                        if (!categoryMap.ContainsKey(cat)) categoryMap[cat] = (0, 0);
                        categoryMap[cat] = (categoryMap[cat].total + amount, categoryMap[cat].count + 1);
                    }
            }
            catch { }

            var catPredictions = categoryMap.ToDictionary(
                kvp => kvp.Key,
                kvp => (object)new
                {
                    average = Math.Round(kvp.Value.total / Math.Max(1, kvp.Value.count), 2),
                    predicted_next_month = Math.Round(kvp.Value.total / Math.Max(1, kvp.Value.count), 2),
                    trend = "stable"
                }
            );

            return JsonSerializer.Serialize(new { category_predictions = catPredictions });
        }

        return @"{""error"": ""AI Engine unavailable"", ""message"": ""Using fallback data""}";
    }

    private object BuildScenario(double balance, double income, double expenses, double debt,
        double interestRate, int months, double incomeMultiplier, double expenseMultiplier, bool aggressiveDebt = false)
    {
        var timeline = new List<object>();
        double currentBalance = balance;
        double currentDebt = debt;
        double totalSaved = 0;
        double totalInterest = 0;
        int? monthsToPositive = null;

        for (int i = 1; i <= months; i++)
        {
            double interest = currentDebt > 0 ? currentDebt * (interestRate / 100 / 12) : 0;
            double minDebtPayment = currentDebt > 0 ? Math.Min(currentDebt * 0.05, currentDebt) : 0;
            double extraDebtPayment = aggressiveDebt && income > expenses
                ? Math.Min((income - expenses) * 0.5, currentDebt)
                : 0;

            double netIncome = income - expenses - minDebtPayment - extraDebtPayment - interest;
            currentBalance += netIncome;
            currentDebt = Math.Max(0, currentDebt - minDebtPayment - extraDebtPayment);
            totalSaved += Math.Max(0, netIncome);
            totalInterest += interest;

            if (currentBalance > 0 && monthsToPositive == null) monthsToPositive = i;

            timeline.Add(new { month = i, balance = Math.Round(currentBalance, 2), debt = Math.Round(currentDebt, 2), net_income = Math.Round(netIncome, 2) });
        }

        return new
        {
            timeline,
            final_balance = Math.Round(currentBalance, 2),
            final_debt = Math.Round(currentDebt, 2),
            total_saved = Math.Round(totalSaved, 2),
            total_interest_paid = Math.Round(totalInterest, 2),
            debt_paid_off = currentDebt <= 0,
            months_to_positive = monthsToPositive ?? months
        };
    }

    private double CalculateScore(double finalBalance, double finalDebt)
    {
        double score = 50;
        if (finalBalance > 0) score += Math.Min(30, finalBalance / 1000000 * 10);
        if (finalDebt <= 0) score += 20;
        return Math.Round(Math.Min(100, score), 1);
    }

    private class TransactionData
    {
        public double Amount { get; set; }
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Category { get; set; }
    }

    private class AiBalancePredictionResponse
    {
        [JsonPropertyName("predictions")]
        public List<AiMonthlyPrediction> Predictions { get; set; } = new();

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("trend")]
        public string Trend { get; set; } = string.Empty;

        [JsonPropertyName("risk_level")]
        public string RiskLevel { get; set; } = string.Empty;

        [JsonPropertyName("recommendations")]
        public List<string> Recommendations { get; set; } = new();

        [JsonPropertyName("current_balance")]
        public double CurrentBalance { get; set; }
    }

    private class AiMonthlyPrediction
    {
        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("predicted_balance")]
        public double PredictedBalance { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }
    }

    private class AiExpensePredictionResponse
    {
        [JsonPropertyName("category_predictions")]
        public Dictionary<string, AiCategoryPrediction> CategoryPredictions { get; set; } = new();
    }

    private class AiCategoryPrediction
    {
        [JsonPropertyName("average")]
        public double Average { get; set; }

        [JsonPropertyName("predicted_next_month")]
        public double PredictedNextMonth { get; set; }

        [JsonPropertyName("trend")]
        public string Trend { get; set; } = string.Empty;
    }

    private class AiSimulationResponse
    {
        [JsonPropertyName("scenarios")]
        public Dictionary<string, AiScenarioResult> Scenarios { get; set; } = new();
        
        [JsonPropertyName("comparison")]
        public Dictionary<string, JsonElement> Comparison { get; set; } = new();
        
        [JsonPropertyName("best_scenario")]
        public string BestScenario { get; set; } = string.Empty;
        
        [JsonPropertyName("recommendations")]
        public List<string> Recommendations { get; set; } = new();
    }

    private class AiScenarioResult
    {
        [JsonPropertyName("timeline")]
        public List<AiMonthlySnapshot> Timeline { get; set; } = new();
        
        [JsonPropertyName("final_balance")]
        public double FinalBalance { get; set; }
        
        [JsonPropertyName("final_debt")]
        public double FinalDebt { get; set; }
        
        [JsonPropertyName("total_saved")]
        public double TotalSaved { get; set; }
        
        [JsonPropertyName("total_interest_paid")]
        public double TotalInterestPaid { get; set; }
        
        [JsonPropertyName("debt_paid_off")]
        public bool DebtPaidOff { get; set; }
        
        [JsonPropertyName("months_to_positive")]
        public int MonthsToPositive { get; set; }
    }

    private class AiMonthlySnapshot
    {
        [JsonPropertyName("month")]
        public int Month { get; set; }
        
        [JsonPropertyName("balance")]
        public double Balance { get; set; }
        
        [JsonPropertyName("debt")]
        public double Debt { get; set; }
        
        [JsonPropertyName("net_income")]
        public double NetIncome { get; set; }
    }

    private class AiScenarioScore
    {
        [JsonPropertyName("final_balance")]
        public double FinalBalance { get; set; }
        
        [JsonPropertyName("final_debt")]
        public double FinalDebt { get; set; }
        
        [JsonPropertyName("score")]
        public double Score { get; set; }
        
        [JsonPropertyName("debt_paid_off")]
        public bool DebtPaidOff { get; set; }
    }

    private class AiRiskAnalysisResponse
    {
        [JsonPropertyName("health_score")]
        public int HealthScore { get; set; }

        [JsonPropertyName("risk_score")]
        public int RiskScore { get; set; }

        [JsonPropertyName("health_level")]
        public string HealthLevel { get; set; } = string.Empty;

        [JsonPropertyName("risk_level")]
        public string RiskLevel { get; set; } = string.Empty;

        public List<string> Factors { get; set; } = new();
        public List<string> Recommendations { get; set; } = new();

        [JsonPropertyName("key_metrics")]
        public AiKeyMetrics? KeyMetrics { get; set; }

        public AiRiskMetrics? Metrics { get; set; }

        // Helpers para unificar ambos formatos
        public int GetRiskScore() => RiskScore > 0 ? RiskScore : (100 - HealthScore);
        public string GetRiskLevel()
        {
            if (!string.IsNullOrEmpty(RiskLevel)) return RiskLevel;
            return HealthLevel switch
            {
                "excellent" => "low",
                "good" => "low",
                "fair" => "medium",
                "poor" => "high",
                _ => "medium"
            };
        }
        public double GetExpenseRatio() => KeyMetrics?.ExpenseRatio ?? Metrics?.ExpenseRatio ?? 0;
        public double GetVolatility() => KeyMetrics?.ExpenseVolatility ?? Metrics?.Volatility ?? 0;
        public double GetBalance() => Metrics?.Balance ?? 0;
    }

    private class AiKeyMetrics
    {
        [JsonPropertyName("expense_ratio")]
        public double ExpenseRatio { get; set; }

        [JsonPropertyName("savings_rate")]
        public double SavingsRate { get; set; }

        [JsonPropertyName("expense_volatility")]
        public double ExpenseVolatility { get; set; }

        [JsonPropertyName("category_diversity")]
        public double CategoryDiversity { get; set; }
    }

    private class AiRiskMetrics
    {
        public double ExpenseRatio { get; set; }
        public double Volatility { get; set; }
        public double Balance { get; set; }
    }
}
