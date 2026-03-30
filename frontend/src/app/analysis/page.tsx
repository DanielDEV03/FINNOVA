'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { exportFinancialReport } from '@/lib/exportPDF'
import { usePlan } from '@/hooks/usePlan'
import Link from 'next/link'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#0a1628', border: '1px solid rgba(16,185,129,0.3)' }}>
            <p className="text-gray-400 mb-1">{label}</p>
            {payload.map((p: any, i: number) => <p key={i} className="font-bold" style={{ color: p.color }}>{formatCOP(p.value)}</p>)}
        </div>
    )
}

type Tab = 'analysis' | 'insights'

function AnalysisContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'analysis')
    const { canUseAdvancedAnalysis } = usePlan()

    const switchTab = (t: Tab) => {
        setTab(t)
        router.replace(`/analysis?tab=${t}`, { scroll: false })
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                                {tab === 'analysis' ? '📊 Análisis' : '💡 Insights'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {tab === 'analysis' ? 'Gráficos y tendencias de tus gastos' : 'Recomendaciones inteligentes y alertas'}
                            </p>
                        </div>
                        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            <button onClick={() => switchTab('analysis')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'analysis' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                📊 Análisis
                            </button>
                            <button onClick={() => switchTab('insights')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'insights' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                💡 Insights
                            </button>
                        </div>
                    </div>

                    {tab === 'analysis' && <AnalysisTab canUseAdvancedAnalysis={canUseAdvancedAnalysis} />}
                    {tab === 'insights' && <InsightsTab />}
                </div>
            </div>
        </ProtectedRoute>
    )
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
            <AnalysisContent />
        </Suspense>
    )
}

// ── Analysis Tab ──────────────────────────────────────────────────────────────
function AnalysisTab({ canUseAdvancedAnalysis }: { canUseAdvancedAnalysis: boolean }) {
    const [analysis, setAnalysis] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeChart, setActiveChart] = useState<'pie' | 'bar' | 'area' | 'radar'>('pie')

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) load(id)
    }, [])

    const load = async (id: string) => {
        try {
            setLoading(true)
            await api.post(`/users/${id}/analysis/analyze`)
            const r = await api.get(`/users/${id}/analysis/spending`)
            setAnalysis(r.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    if (!loading && !canUseAdvancedAnalysis) return (
        <div className="flex items-center justify-center py-20">
            <div className="max-w-md text-center">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Análisis Avanzado</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Gráficos detallados, tendencias y exportación PDF. Disponible en el plan <span className="text-emerald-400 font-bold">Pro</span>.</p>
                <Link href="/pricing" className="inline-block px-8 py-3 rounded-xl font-bold text-white hover:scale-105 transition" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Ver planes →</Link>
            </div>
        </div>
    )

    if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>
    if (!analysis) return <div className="text-center py-20 text-gray-500">No hay datos suficientes</div>

    const categoryData = Object.entries(analysis.spendingByCategory || {}).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value)
    const monthlyData = Object.entries(analysis.monthlyTrends || {}).map(([month, amount]) => ({ month, amount: amount as number }))
    const radarData = categoryData.slice(0, 6).map(c => ({ category: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name, value: c.value }))
    const total = categoryData.reduce((s, c) => s + c.value, 0)

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Gasto Diario', value: formatCOP(analysis.averageDailySpending), icon: '💵', color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Total Gastado', value: formatCOP(total), icon: '💸', color: 'text-red-500' },
                    { label: 'Top Categoría', value: analysis.topCategory, icon: '🏆', color: 'text-yellow-500' },
                    { label: 'Categorías', value: String(categoryData.length), icon: '📂', color: 'text-violet-500' },
                ].map(k => (
                    <div key={k.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-4">
                        <div className="text-2xl mb-2">{k.icon}</div>
                        <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                        <div className={`text-lg font-black truncate ${k.color}`}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Selector de gráfica + Export */}
            <div className="flex gap-2 flex-wrap items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    {([['pie', '🥧 Distribución'], ['bar', '📊 Tendencia'], ['area', '📈 Evolución'], ['radar', '🕸️ Radar']] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setActiveChart(id)}
                            className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition ${activeChart === id ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <button onClick={() => exportFinancialReport({ userName: localStorage.getItem('userName') || 'Usuario', totalIncome: 0, totalExpenses: total, balance: 0, totalDebt: 0 })}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition hover:scale-105"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    📄 Exportar PDF
                </button>
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">
                        {activeChart === 'pie' ? 'Gastos por Categoría' : activeChart === 'bar' ? 'Tendencia Mensual' : activeChart === 'area' ? 'Evolución' : 'Radar'}
                    </h2>
                    <ResponsiveContainer width="100%" height={280}>
                        {activeChart === 'pie' ? (
                            <PieChart><Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} innerRadius={40} dataKey="value" paddingAngle={3}>
                                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie><Tooltip content={<CustomTooltip />} /><Legend formatter={v => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>} /></PieChart>
                        ) : activeChart === 'bar' ? (
                            <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} /><YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart>
                        ) : activeChart === 'area' ? (
                            <AreaChart data={monthlyData}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} /><YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#ag)" /></AreaChart>
                        ) : (
                            <RadarChart data={radarData}><PolarGrid stroke="rgba(255,255,255,0.1)" /><PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#9ca3af' }} /><Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} /><Tooltip content={<CustomTooltip />} /></RadarChart>
                        )}
                    </ResponsiveContainer>
                </div>

                {/* Ranking */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">🏅 Ranking de Gastos</h2>
                    <div className="space-y-3">
                        {categoryData.slice(0, 7).map((c, i) => {
                            const pct = total > 0 ? (c.value / total) * 100 : 0
                            return (
                                <div key={c.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2"><span className="text-xs text-gray-400 w-4">#{i + 1}</span>{c.name}</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{formatCOP(c.value)}</span>
                                    </div>
                                    <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5 text-right">{pct.toFixed(1)}%</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Insights de categorías */}
            {analysis.insights?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5">
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">💡 Recomendaciones por Categoría</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysis.insights.map((ins: any, i: number) => (
                            <div key={i} className="rounded-xl p-4 border-l-4" style={{ background: ins.trend === 'High' ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)', borderLeftColor: ins.trend === 'High' ? '#ef4444' : '#10b981' }}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-gray-900 dark:text-white text-sm">{ins.category}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ins.trend === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                        {ins.trend === 'High' ? '📈 Alto' : ins.trend === 'Low' ? '📉 Bajo' : '➡️ Normal'}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{formatCOP(ins.amount)} <span className="text-gray-400 font-normal">({ins.percentageOfTotal?.toFixed(1)}%)</span></p>
                                {ins.recommendation && <p className="text-xs text-gray-600 dark:text-gray-400">{ins.recommendation}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Insights Tab ──────────────────────────────────────────────────────────────
function InsightsTab() {
    const [insights, setInsights] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) api.get(`/users/${id}/insights/all`).then(r => setInsights(r.data)).catch(console.error).finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>

    const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5"

    return (
        <div className="space-y-6">
            {/* Presupuesto diario */}
            {insights?.dailyBudget && (
                <div className={`bg-gradient-to-br ${insights.dailyBudget.status === 'Safe' ? 'from-emerald-500 to-teal-600' : insights.dailyBudget.status === 'Warning' ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-red-600'} text-white p-6 rounded-xl`}>
                    <p className="text-sm opacity-80 mb-1">HOY PUEDES GASTAR</p>
                    <p className="text-4xl font-black mb-2">{formatCOP(insights.dailyBudget.availableToday)}</p>
                    <p className="text-sm opacity-90">{insights.dailyBudget.message}</p>
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        {[
                            { label: 'Restante', value: formatCOP(insights.dailyBudget.remainingForPeriod) },
                            { label: 'Días', value: String(insights.dailyBudget.daysUntilNextIncome) },
                            { label: 'Límite diario', value: formatCOP(insights.dailyBudget.dailyLimit) },
                        ].map(k => (
                            <div key={k.label} className="bg-white/20 rounded-lg p-3 text-center">
                                <p className="text-xs opacity-80">{k.label}</p>
                                <p className="font-bold text-sm">{k.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alertas */}
            {insights?.alerts?.alerts?.length > 0 && (
                <div className={card}>
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">🚨 Alertas Inteligentes</h2>
                    <div className="space-y-3">
                        {insights.alerts.alerts.map((a: any, i: number) => (
                            <div key={i} className={`p-4 rounded-xl border-l-4 ${a.severity === 'Critical' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : a.severity === 'Warning' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'}`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{a.icon}</span>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{a.title}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{a.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Gastos hormiga */}
            {insights?.smallExpenses?.totalMonthlyImpact > 0 && (
                <div className={card}>
                    <h2 className="font-bold text-gray-900 dark:text-white mb-2">🐜 Gastos Hormiga</h2>
                    <p className="text-sm text-gray-500 mb-4">Pequeños gastos que suman <strong className="text-red-500">{formatCOP(insights.smallExpenses.totalMonthlyImpact)}/mes</strong></p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {insights.smallExpenses.patterns?.slice(0, 6).map((p: any, i: number) => (
                            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-xs text-gray-500">{p.category}</p>
                                <p className="font-bold text-red-500 text-sm">{formatCOP(p.monthlyImpact)}/mes</p>
                                <p className="text-xs text-gray-400">{p.frequency}x/mes</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Fondo de emergencia */}
            {insights?.emergencyFund && (
                <div className={card}>
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">🛡️ Fondo de Emergencia</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Meta recomendada', value: formatCOP(insights.emergencyFund.recommendedAmount), color: 'text-emerald-500' },
                            { label: 'Ahorro mensual sugerido', value: formatCOP(insights.emergencyFund.monthlySavingNeeded), color: 'text-violet-500' },
                            { label: 'Meses para lograrlo', value: String(insights.emergencyFund.monthsToGoal), color: 'text-yellow-500' },
                        ].map(k => (
                            <div key={k.label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                                <p className={`font-black text-lg ${k.color}`}>{k.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Suscripciones detectadas */}
            {insights?.subscriptions?.subscriptions?.length > 0 && (
                <div className={card}>
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">📱 Suscripciones Detectadas</h2>
                    <div className="space-y-2">
                        {insights.subscriptions.subscriptions.map((s: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{s.name}</p>
                                    <p className="text-xs text-gray-500">{s.frequency}</p>
                                </div>
                                <p className="font-bold text-red-500">{formatCOP(s.amount)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
