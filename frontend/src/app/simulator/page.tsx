'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'
import { usePlan } from '@/hooks/usePlan'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Formato de moneda colombiana
const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
}

interface SimulationResult {
    scenarios: Record<string, Scenario>
    comparison: any
    bestScenario: string
    recommendations: string[]
}

interface Scenario {
    timeline: MonthlySnapshot[]
    finalBalance: number
    finalDebt: number
    totalSaved: number
    totalInterestPaid: number
    debtPaidOff: boolean
    monthsToPositive: number
}

interface MonthlySnapshot {
    month: number
    balance: number
    debt: number
    netIncome: number
}

interface UserFinancialData {
    monthlyIncome: number
    monthlyExpenses: number
    currentBalance: number
    totalDebt: number
}

export default function SimulatorPage() {
    const [simulation, setSimulation] = useState<SimulationResult | null>(null)
    const [userData, setUserData] = useState<UserFinancialData | null>(null)
    const [userExpenses, setUserExpenses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string>('')
    const [selectedScenarios, setSelectedScenarios] = useState<string[]>(['current', 'optimistic'])
    const [months, setMonths] = useState(12)
    const { isPro } = usePlan()

    // Paywall — simulador es Pro
    if (!loading && !isPro) return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="text-6xl mb-4">⏰</div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Time Machine Financiera</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Simula escenarios futuros: optimista, pesimista, reducción de gastos y pago agresivo de deudas.
                        Disponible en el plan <span className="text-emerald-400 font-bold">Pro</span>.
                    </p>
                    <div className="rounded-xl p-4 mb-6 text-left space-y-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        {['5 escenarios financieros simultáneos', 'Proyección hasta 24 meses', 'Comparativa de escenarios', 'Recomendaciones IA para cada escenario', 'Simulaciones ilimitadas'].map(f => (
                            <div key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-emerald-400">✓</span> {f}
                            </div>
                        ))}
                    </div>
                    <Link href="/pricing"
                        className="inline-block px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                        Ver planes →
                    </Link>
                    <p className="text-xs text-gray-500 mt-3">Desde $29.900 COP/mes</p>
                </div>
            </div>
        </ProtectedRoute>
    )

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) {
            setUserId(id)
            loadSimulation(id, months)
        }
    }, [months])

    const loadSimulation = async (id: string, m: number) => {
        try {
            setLoading(true)

            // Cargar datos del usuario primero
            const dashboardResponse = await api.get(`/users/${id}/dashboard`)
            const dashboard = dashboardResponse.data

            setUserData({
                monthlyIncome: dashboard.totalIncome,
                monthlyExpenses: dashboard.totalExpenses,
                currentBalance: dashboard.balance,
                totalDebt: dashboard.totalDebt
            })

            // Cargar gastos del usuario para recomendaciones
            const expensesResponse = await api.get(`/users/${id}/expenses`)
            setUserExpenses(expensesResponse.data)

            // Luego cargar la simulación
            const response = await api.get(`/users/${id}/simulator?months=${m}`)
            setSimulation(response.data)
        } catch (error) {
            console.error('Error loading simulation:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8">Simulando escenarios...</div>

    if (!simulation) return <div className="p-8">No hay datos para simular</div>

    // Debug: mostrar datos crudos
    console.log('Simulation data:', simulation)
    console.log('Scenarios keys:', Object.keys(simulation.scenarios))
    console.log('Current scenario:', simulation.scenarios.current)

    const scenarioNames: Record<string, string> = {
        current: 'Situación Actual',
        reduce_expenses_20: 'Reducir Gastos 20%',
        increase_income_15: 'Aumentar Ingresos 15%',
        aggressive_debt_payment: 'Pago Agresivo de Deuda',
        optimized: 'Escenario Optimizado'
    }

    const scenarioDescriptions: Record<string, string> = {
        current: 'Mantener tus ingresos y gastos actuales sin cambios',
        reduce_expenses_20: 'Reducir tus gastos mensuales en un 20% (ej: menos salidas, cancelar suscripciones)',
        increase_income_15: 'Aumentar tus ingresos en 15% (ej: trabajo extra, freelance, aumento salarial)',
        aggressive_debt_payment: 'Destinar 50% de tu ahorro mensual al pago de deudas',
        optimized: 'Combinar: reducir gastos 10% + aumentar ingresos 10% (estrategia balanceada)'
    }

    const scenarioColors: Record<string, string> = {
        current: '#8884d8',
        reduce_expenses_20: '#82ca9d',
        increase_income_15: '#ffc658',
        aggressive_debt_payment: '#ff8042',
        optimized: '#00C49F'
    }

    // Filtrar selectedScenarios para incluir solo los que existen
    const validSelectedScenarios = selectedScenarios.filter(s => simulation.scenarios[s])

    // Si no hay escenarios válidos seleccionados, usar los disponibles
    const scenariosToUse = validSelectedScenarios.length > 0
        ? validSelectedScenarios
        : Object.keys(simulation.scenarios).slice(0, 2)

    const chartData = simulation.scenarios[scenariosToUse[0]]?.timeline.map((_, index) => {
        const dataPoint: any = { month: index + 1 }
        scenariosToUse.forEach(scenario => {
            if (simulation.scenarios[scenario]) {
                dataPoint[scenario] = simulation.scenarios[scenario].timeline[index]?.balance || 0
            }
        })
        return dataPoint
    }) || []

    const toggleScenario = (scenario: string) => {
        // Solo permitir toggle si el escenario existe
        if (!simulation.scenarios[scenario]) return

        if (selectedScenarios.includes(scenario)) {
            setSelectedScenarios(selectedScenarios.filter(s => s !== scenario))
        } else {
            setSelectedScenarios([...selectedScenarios, scenario])
        }
    }

    // Calcular recomendaciones reales basadas en gastos del usuario
    const calculateSmartRecommendations = () => {
        if (userExpenses.length === 0) {
            // Fallback a recomendaciones genéricas
            return [
                { icon: '☕', title: 'Reducir Café', description: 'De 20 a 10 cafés/mes ($8,000 c/u)', monthly: 80000 },
                { icon: '🚗', title: 'Transporte Compartido', description: 'Compartir Uber 3 veces/semana', monthly: 120000 },
                { icon: '🍕', title: 'Menos Delivery', description: 'Cocinar 2 veces más/semana', monthly: 200000 }
            ]
        }

        // Agrupar gastos por categoría
        const categoryTotals: Record<string, number> = {}
        const categoryCounts: Record<string, number> = {}

        userExpenses.forEach(expense => {
            const cat = expense.category || 'Otros'
            categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        })

        // Ordenar categorías por gasto total
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3) // Top 3 categorías

        // Generar recomendaciones basadas en categorías reales
        const recommendations = sortedCategories.map(([category, total]) => {
            const count = categoryCounts[category]
            const avgPerTransaction = total / count
            const reduction = total * 0.3 // Reducir 30%

            // Iconos por categoría
            const icons: Record<string, string> = {
                'Alimentación': '🍕',
                'Transporte': '🚗',
                'Entretenimiento': '🎮',
                'Restaurantes': '🍽️',
                'Café': '☕',
                'Compras': '🛍️',
                'Servicios': '💳',
                'Salud': '🏥',
                'Educación': '📚',
                'Otros': '💰'
            }

            return {
                icon: icons[category] || '💰',
                title: `Reducir ${category}`,
                description: `De ${formatCOP(total)} a ${formatCOP(total - reduction)}/mes`,
                monthly: reduction
            }
        })

        return recommendations.length > 0 ? recommendations : [
            { icon: '💰', title: 'Reducir Gastos', description: 'Identifica gastos no esenciales', monthly: userData?.monthlyExpenses ? userData.monthlyExpenses * 0.2 : 200000 }
        ]
    }

    const smartRecommendations = calculateSmartRecommendations()
    const totalMonthlySavings = smartRecommendations.reduce((sum, rec) => sum + rec.monthly, 0)

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 md:p-8">
                <div className="w-full max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3 sm:gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-1 sm:mb-2 text-gray-900">🎯 Simulador Financiero</h1>
                            <p className="text-sm sm:text-base text-gray-600">Compara 5 escenarios reales de tu futuro financiero</p>
                        </div>
                        <select
                            value={months}
                            onChange={(e) => setMonths(Number(e.target.value))}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-semibold text-sm sm:text-base"
                        >
                            <option value={6}>📅 6 meses</option>
                            <option value={12}>📅 12 meses</option>
                            <option value={24}>📅 24 meses</option>
                        </select>
                    </div>

                    {/* Información del Usuario */}
                    {userData && (
                        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg mb-6 md:mb-8 border border-gray-200">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">📊 Tu Situación Actual</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg md:rounded-xl border border-emerald-200">
                                    <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 font-medium">Ingresos Mensuales</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600 break-words">{formatCOP(userData.monthlyIncome)}</p>
                                </div>
                                <div className="p-4 sm:p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-lg md:rounded-xl border border-red-200">
                                    <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 font-medium">Gastos Mensuales</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 break-words">{formatCOP(userData.monthlyExpenses)}</p>
                                </div>
                                <div className="p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg md:rounded-xl border border-orange-200">
                                    <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 font-medium">Deuda Actual</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 break-words">{formatCOP(userData.totalDebt)}</p>
                                </div>
                                <div className="p-4 sm:p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg md:rounded-xl border border-green-200">
                                    <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 font-medium">Balance Actual</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 break-words">{formatCOP(userData.currentBalance)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cómo funciona */}
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold mb-4">💡 ¿Cómo funciona el simulador?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📈</span>
                                <div>
                                    <p className="font-bold mb-1">Proyección mes a mes</p>
                                    <p className="opacity-90">Calculamos tu balance futuro considerando ingresos, gastos, deuda e intereses cada mes</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🎯</span>
                                <div>
                                    <p className="font-bold mb-1">5 escenarios diferentes</p>
                                    <p className="opacity-90">Comparamos qué pasaría si reduces gastos, aumentas ingresos, pagas deuda o combinas estrategias</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">💰</span>
                                <div>
                                    <p className="font-bold mb-1">Pago automático de deuda</p>
                                    <p className="opacity-90">El simulador calcula pagos mínimos (5% del saldo) y en el escenario agresivo destina 50% del ahorro</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🏆</span>
                                <div>
                                    <p className="font-bold mb-1">Mejor recomendación</p>
                                    <p className="opacity-90">Identificamos el escenario que maximiza tu balance final y minimiza tu deuda</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg mb-6 md:mb-8 border border-green-400">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-3xl sm:text-4xl md:text-5xl flex-shrink-0">🏆</span>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm opacity-90 mb-1">Mejor Escenario Recomendado</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{scenarioNames[simulation.bestScenario]}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg mb-6 md:mb-8 border border-gray-200">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">📈 Comparación de Escenarios</h2>

                        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
                            {Object.keys(simulation.scenarios).map(scenario => (
                                <button
                                    key={scenario}
                                    onClick={() => toggleScenario(scenario)}
                                    className={`px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-all transform hover:scale-105 ${selectedScenarios.includes(scenario)
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {scenarioNames[scenario]}
                                </button>
                            ))}
                        </div>

                        <ResponsiveContainer width="100%" height={300} className="sm:h-[400px] md:h-[450px]">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis
                                    dataKey="month"
                                    label={{ value: 'Mes', position: 'insideBottom', offset: -5 }}
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    label={{ value: 'Balance', angle: -90, position: 'insideLeft' }}
                                    tickFormatter={(value) => formatCOP(value)}
                                    style={{ fontSize: '12px' }}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCOP(value)}
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                {selectedScenarios.map(scenario => (
                                    <Line
                                        key={scenario}
                                        type="monotone"
                                        dataKey={scenario}
                                        stroke={scenarioColors[scenario]}
                                        strokeWidth={3}
                                        name={scenarioNames[scenario]}
                                        dot={{ fill: scenarioColors[scenario], r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 md:mb-8">
                        {Object.entries(simulation.scenarios).map(([key, scenario]) => (
                            <div
                                key={key}
                                className={`bg-white p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 border ${key === simulation.bestScenario ? 'ring-2 sm:ring-4 ring-green-500 border-green-300' : 'border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm sm:text-base md:text-lg font-bold">{scenarioNames[key]}</h3>
                                    {key === simulation.bestScenario && (
                                        <span className="text-xl sm:text-2xl">🏆</span>
                                    )}
                                </div>

                                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 min-h-[40px]">{scenarioDescriptions[key]}</p>

                                <div className="space-y-2 sm:space-y-3">
                                    <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                                        <span className="text-xs text-gray-600 block mb-1">Balance Final</span>
                                        <span className="text-base sm:text-lg md:text-xl font-bold text-green-600 break-words">
                                            {formatCOP(scenario.finalBalance)}
                                        </span>
                                    </div>

                                    <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
                                        <span className="text-xs text-gray-600 block mb-1">Deuda Final</span>
                                        <span className="text-base sm:text-lg md:text-xl font-bold text-red-600 break-words">
                                            {formatCOP(scenario.finalDebt)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-emerald-50 rounded">
                                            <span className="text-xs text-gray-600 block">Ahorrado</span>
                                            <span className="text-xs sm:text-sm font-bold text-emerald-600 break-words">
                                                {formatCOP(scenario.totalSaved)}
                                            </span>
                                        </div>
                                        <div className="p-2 bg-orange-50 rounded">
                                            <span className="text-xs text-gray-600 block">Interés</span>
                                            <span className="text-xs sm:text-sm font-bold text-orange-600 break-words">
                                                {formatCOP(scenario.totalInterestPaid)}
                                            </span>
                                        </div>
                                    </div>

                                    {scenario.debtPaidOff && (
                                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-center text-xs sm:text-sm font-bold">
                                            ✅ Deuda Completamente Pagada
                                        </div>
                                    )}

                                    {!scenario.debtPaidOff && scenario.finalDebt > 0 && (
                                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-100 text-yellow-800 rounded-lg text-center text-xs sm:text-sm">
                                            ⚠️ Deuda pendiente
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">💡 Recomendaciones del Simulador</h2>
                        <div className="space-y-3">
                            {simulation.recommendations.map((rec, index) => (
                                <div key={index} className="flex items-start gap-4 p-5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 hover:shadow-md transition-shadow">
                                    <span className="text-3xl">🎯</span>
                                    <p className="flex-1 text-lg text-gray-700">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* IMPACTO DE PEQUEÑOS CAMBIOS */}
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-8 rounded-2xl mb-8 border-2 border-green-300">
                        <h2 className="text-3xl font-black mb-6 text-center text-gray-800">💡 Impacto de Pequeños Cambios</h2>
                        <p className="text-center text-gray-600 mb-8">
                            Decisiones simples HOY generan resultados significativos después
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {smartRecommendations.map((rec, index) => (
                                <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-4xl">{rec.icon}</span>
                                        <h3 className="text-xl font-bold text-gray-800">{rec.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">{rec.description}</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Ahorro mensual:</span>
                                            <span className="font-bold text-green-600">{formatCOP(rec.monthly)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">En {months} meses:</span>
                                            <span className="font-bold text-green-600">{formatCOP(rec.monthly * months)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 bg-white p-6 rounded-xl shadow-lg">
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-2">💰 Ahorro Total Combinado</p>
                                <p className="text-4xl font-black text-green-600">{formatCOP(totalMonthlySavings * months)}</p>
                                <p className="text-sm text-gray-600 mt-2">en {months} meses con estos {smartRecommendations.length} cambios basados en tus gastos</p>
                            </div>
                        </div>
                    </div>

                    {/* COMPARACIÓN DE RESULTADOS */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-8 rounded-2xl border-2 border-blue-300">
                        <h2 className="text-3xl font-black mb-6 text-center text-gray-800">📊 Comparación de Resultados</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-800">Sin Cambios</h3>
                                    <span className="text-3xl">😐</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-600">Balance Final</p>
                                        <p className="text-2xl font-bold text-gray-700">
                                            {formatCOP(simulation.scenarios.current?.finalBalance || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Deuda Final</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {formatCOP(simulation.scenarios.current?.finalDebt || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border-2 border-green-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-800">Con Optimización</h3>
                                    <span className="text-3xl">🚀</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-600">Balance Final</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatCOP(simulation.scenarios[simulation.bestScenario]?.finalBalance || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Deuda Final</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatCOP(simulation.scenarios[simulation.bestScenario]?.finalDebt || 0)}
                                        </p>
                                    </div>
                                    <div className="pt-3 border-t border-green-200">
                                        <p className="text-sm text-gray-600">Mejora Total</p>
                                        <p className="text-3xl font-black text-green-600">
                                            {formatCOP((simulation.scenarios[simulation.bestScenario]?.finalBalance || 0) - (simulation.scenarios.current?.finalBalance || 0))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
