'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { usePlan } from '@/hooks/usePlan'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

type Tab = 'predictions' | 'simulator'

function PredictionsContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'predictions')
    const { isPro } = usePlan()

    const switchTab = (t: Tab) => {
        setTab(t)
        router.replace(`/predictions?tab=${t}`, { scroll: false })
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header con tabs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                                {tab === 'predictions' ? '🔮 Predicciones IA' : '⏰ Time Machine'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {tab === 'predictions'
                                    ? 'Proyecciones inteligentes basadas en tus datos'
                                    : 'Simula escenarios futuros y compara estrategias'}
                            </p>
                        </div>
                        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            <button onClick={() => switchTab('predictions')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'predictions' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                🔮 Predicciones
                            </button>
                            <button onClick={() => switchTab('simulator')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'simulator' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                ⏰ Simulador
                            </button>
                        </div>
                    </div>

                    {tab === 'predictions' && <PredictionsTab />}
                    {tab === 'simulator' && <SimulatorTab isPro={isPro} />}
                </div>
            </div>
        </ProtectedRoute>
    )
}

export default function PredictionsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
            <PredictionsContent />
        </Suspense>
    )
}

// ── Predictions Tab ───────────────────────────────────────────────────────────
function PredictionsTab() {
    const [prediction, setPrediction] = useState<any>(null)
    const [risk, setRisk] = useState<any>(null)
    const [expensePrediction, setExpensePrediction] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [monthsAhead, setMonthsAhead] = useState(3)

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) load(id, monthsAhead)
    }, [monthsAhead])

    const load = async (id: string, months: number) => {
        try {
            setLoading(true)
            const [p, r, e] = await Promise.all([
                api.get(`/users/${id}/predictions/balance?monthsAhead=${months}`),
                api.get(`/users/${id}/predictions/risk`),
                api.get(`/users/${id}/predictions/expenses?monthsAhead=${months}`),
            ])
            setPrediction(p.data); setRisk(r.data); setExpensePrediction(e.data)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>

    const chartData = prediction?.predictions?.map((p: any) => ({ month: p.month, balance: p.predictedBalance })) || []
    const hasLimitedData = !prediction || prediction.confidence < 0.7

    return (
        <div className="space-y-6">
            {/* Selector de período */}
            <div className="flex gap-2">
                {[3, 6, 12].map(m => (
                    <button key={m} onClick={() => setMonthsAhead(m)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${monthsAhead === m ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}>
                        📅 {m} meses
                    </button>
                ))}
            </div>

            {hasLimitedData && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700/40 rounded-xl p-4">
                    <p className="text-yellow-800 dark:text-yellow-300 font-semibold text-sm">⚠️ Datos limitados — registra transacciones de varios meses para predicciones más precisas.</p>
                </div>
            )}

            {/* KPIs de riesgo */}
            {risk && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Score de Riesgo', value: String(risk.riskScore), sub: '0-100', color: risk.riskScore >= 70 ? 'text-red-500' : risk.riskScore >= 40 ? 'text-yellow-500' : 'text-emerald-500' },
                        { label: 'Nivel', value: risk.riskLevel === 'high' ? '🔴 ALTO' : risk.riskLevel === 'medium' ? '🟡 MEDIO' : '🟢 BAJO', sub: '', color: 'text-gray-900 dark:text-white' },
                        { label: 'Ratio Gastos/Ingresos', value: `${(risk.metrics.expenseRatio * 100).toFixed(1)}%`, sub: 'Ideal <70%', color: risk.metrics.expenseRatio > 0.8 ? 'text-red-500' : 'text-emerald-500' },
                        { label: 'Confianza', value: `${(prediction?.confidence * 100 || 0).toFixed(0)}%`, sub: 'Basado en historial', color: 'text-violet-500' },
                    ].map(k => (
                        <div key={k.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-4">
                            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                            {k.sub && <p className="text-xs text-gray-400 mt-1">{k.sub}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Gráfico de balance */}
            {prediction && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-900 dark:text-white">📈 Proyección de Balance</h2>
                        <div className="flex gap-4 text-sm">
                            <span className="text-gray-500">Actual: <strong className="text-gray-900 dark:text-white">{formatCOP(prediction.currentBalance)}</strong></span>
                            <span className="text-gray-500">Proyectado: <strong className={prediction.predictions?.at(-1)?.predictedBalance >= prediction.currentBalance ? 'text-emerald-500' : 'text-red-500'}>{formatCOP(prediction.predictions?.at(-1)?.predictedBalance || 0)}</strong></span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                            <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                            <Tooltip formatter={(v: number) => formatCOP(v)} contentStyle={{ background: '#0a1628', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }} />
                            <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={3} name="Balance Predicho" dot={{ fill: '#10b981', r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Predicción por categoría */}
            {expensePrediction?.predictions?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">📊 Gastos Predichos por Categoría</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {expensePrediction.predictions.map((c: any) => (
                            <div key={c.category} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <p className="text-xs text-gray-500 mb-1">{c.category}</p>
                                <p className="font-bold text-red-500">{formatCOP(c.predictedAmount)}</p>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${c.confidence * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recomendaciones */}
            {risk?.recommendations?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                    <h2 className="font-bold text-gray-900 dark:text-white mb-3">💡 Recomendaciones IA</h2>
                    <div className="space-y-2">
                        {[...risk.recommendations, ...(prediction?.recommendations || [])].slice(0, 5).map((r: string, i: number) => (
                            <div key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                                <span className="text-emerald-500 shrink-0">•</span> {r}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Simulator Tab ─────────────────────────────────────────────────────────────
function SimulatorTab({ isPro }: { isPro: boolean }) {
    const [simulation, setSimulation] = useState<any>(null)
    const [userData, setUserData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [months, setMonths] = useState(12)
    const [selected, setSelected] = useState(['current', 'optimistic'])

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) load(id, months)
    }, [months])

    const load = async (id: string, m: number) => {
        try {
            setLoading(true)
            const [dash, sim] = await Promise.all([
                api.get(`/users/${id}/dashboard`),
                api.get(`/users/${id}/simulator?months=${m}`),
            ])
            setUserData(dash.data)
            setSimulation(sim.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    if (!isPro) return (
        <div className="flex items-center justify-center py-20">
            <div className="max-w-md text-center">
                <div className="text-6xl mb-4">⏰</div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Time Machine Financiera</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Simula 5 escenarios futuros y compara estrategias. Disponible en el plan <span className="text-emerald-400 font-bold">Pro</span>.</p>
                <Link href="/pricing" className="inline-block px-8 py-3 rounded-xl font-bold text-white hover:scale-105 transition" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    Ver planes →
                </Link>
            </div>
        </div>
    )

    if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>
    if (!simulation) return <div className="text-center py-20 text-gray-500">No hay datos para simular</div>

    const scenarioNames: Record<string, string> = {
        current: 'Situación Actual', optimistic: 'Optimista',
        pessimistic: 'Pesimista', reduce_expenses_20: 'Reducir Gastos 20%',
        aggressive_debt_payment: 'Pago Agresivo Deuda', optimized: 'Optimizado'
    }
    const scenarioColors: Record<string, string> = {
        current: '#8884d8', optimistic: '#10b981', pessimistic: '#ef4444',
        reduce_expenses_20: '#f59e0b', aggressive_debt_payment: '#6366f1', optimized: '#06b6d4'
    }

    const chartData = simulation.scenarios[selected[0]]?.timeline?.map((_: any, i: number) => {
        const pt: any = { month: i + 1 }
        selected.forEach(s => { if (simulation.scenarios[s]) pt[s] = simulation.scenarios[s].timeline[i]?.balance || 0 })
        return pt
    }) || []

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-2">
                    {[6, 12, 24].map(m => (
                        <button key={m} onClick={() => setMonths(m)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${months === m ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}>
                            {m}m
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    {Object.keys(simulation.scenarios).map(s => (
                        <button key={s} onClick={() => setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selected.includes(s) ? 'text-white' : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-white/5'}`}
                            style={selected.includes(s) ? { background: scenarioColors[s] } : {}}>
                            {scenarioNames[s] || s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mejor escenario */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-xl flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                    <p className="text-sm opacity-80">Mejor estrategia recomendada</p>
                    <p className="font-black text-lg">{scenarioNames[simulation.bestScenario] || simulation.bestScenario}</p>
                </div>
            </div>

            {/* Gráfico */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4">📈 Comparación de Escenarios</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} label={{ value: 'Mes', position: 'insideBottom', offset: -5 }} />
                        <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                        <Tooltip formatter={(v: number) => formatCOP(v)} contentStyle={{ background: '#0a1628', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }} />
                        <Legend />
                        {selected.map(s => (
                            <Line key={s} type="monotone" dataKey={s} stroke={scenarioColors[s] || '#8884d8'} strokeWidth={2} name={scenarioNames[s] || s} dot={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Cards de escenarios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(simulation.scenarios).map(([key, sc]: [string, any]) => (
                    <div key={key} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${key === simulation.bestScenario ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-gray-100 dark:border-white/5'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <p className="font-bold text-sm text-gray-900 dark:text-white">{scenarioNames[key] || key}</p>
                            {key === simulation.bestScenario && <span className="text-lg">🏆</span>}
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Balance final</span><span className="font-bold text-emerald-500">{formatCOP(sc.finalBalance)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Deuda final</span><span className="font-bold text-red-500">{formatCOP(sc.finalDebt)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Ahorrado</span><span className="font-bold text-violet-500">{formatCOP(sc.totalSaved)}</span></div>
                            {sc.debtPaidOff && <div className="text-center text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg py-1">✅ Deuda pagada</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recomendaciones */}
            {simulation.recommendations?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                    <h2 className="font-bold text-gray-900 dark:text-white mb-3">💡 Recomendaciones</h2>
                    <div className="space-y-2">
                        {simulation.recommendations.map((r: string, i: number) => (
                            <div key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                                <span className="text-emerald-500 shrink-0">🎯</span> {r}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
