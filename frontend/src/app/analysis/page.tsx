'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { exportFinancialReport } from '@/lib/exportPDF'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'

interface SpendingAnalysis {
    spendingByCategory: Record<string, number>
    monthlyTrends: Record<string, number>
    insights: CategoryInsight[]
    averageDailySpending: number
    topCategory: string
}

interface CategoryInsight {
    category: string
    amount: number
    percentageOfTotal: number
    trend: string
    recommendation: string
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#0a1628', border: '1px solid rgba(16,185,129,0.3)' }}>
            <p className="text-gray-400 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="font-bold" style={{ color: p.color }}>{formatCOP(p.value)}</p>
            ))}
        </div>
    )
}

export default function AnalysisPage() {
    const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string>('')
    const [activeChart, setActiveChart] = useState<'pie' | 'bar' | 'area' | 'radar'>('pie')

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) { setUserId(id); loadAnalysis(id) }
    }, [])

    const loadAnalysis = async (id: string) => {
        try {
            setLoading(true)
            await api.post(`/users/${id}/analysis/analyze`)
            const r = await api.get(`/users/${id}/analysis/spending`)
            setAnalysis(r.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    if (loading) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Analizando tus gastos con IA...</p>
            </div>
        </div>
    )

    if (!analysis) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <div className="text-center">
                <span className="text-6xl block mb-4">📊</span>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No hay datos suficientes para analizar</p>
                <a href="/transactions" className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition">
                    Registrar transacciones
                </a>
            </div>
        </div>
    )

    const categoryData = Object.entries(analysis.spendingByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    const monthlyData = Object.entries(analysis.monthlyTrends)
        .map(([month, amount]) => ({ month, amount }))

    const radarData = categoryData.slice(0, 6).map(c => ({
        category: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
        value: c.value
    }))

    const totalSpending = categoryData.reduce((s, c) => s + c.value, 0)

    const card = "bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-black/20 border border-gray-100 dark:border-white/5 p-5 md:p-6"
    const chartBg = { background: 'transparent' }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-3 sm:p-4 md:p-8">
                <div className="w-full max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">📊 Análisis Financiero</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Insights inteligentes sobre tus patrones de gasto</p>
                        </div>
                        <button onClick={() => exportFinancialReport({
                            userName: localStorage.getItem('userName') || 'Usuario',
                            totalIncome: 0, totalExpenses: totalSpending, balance: 0, totalDebt: 0
                        })}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition hover:scale-105"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            📄 Exportar PDF
                        </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Gasto Diario', value: formatCOP(analysis.averageDailySpending), icon: '💵', color: 'text-emerald-600 dark:text-emerald-400' },
                            { label: 'Total Gastado', value: formatCOP(totalSpending), icon: '💸', color: 'text-red-500' },
                            { label: 'Top Categoría', value: analysis.topCategory, icon: '🏆', color: 'text-yellow-500' },
                            { label: 'Categorías', value: String(categoryData.length), icon: '📂', color: 'text-violet-500' },
                        ].map(k => (
                            <div key={k.label} className={card}>
                                <div className="text-2xl mb-2">{k.icon}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</div>
                                <div className={`text-lg font-black truncate ${k.color}`}>{k.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Selector de gráfica */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {([
                            { id: 'pie', label: '🥧 Distribución' },
                            { id: 'bar', label: '📊 Tendencia' },
                            { id: 'area', label: '📈 Evolución' },
                            { id: 'radar', label: '🕸️ Radar' },
                        ] as const).map(c => (
                            <button key={c.id} onClick={() => setActiveChart(c.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeChart === c.id
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:border-emerald-400'}`}>
                                {c.label}
                            </button>
                        ))}
                    </div>

                    {/* Gráficas */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className={card}>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                {activeChart === 'pie' ? 'Gastos por Categoría' :
                                    activeChart === 'bar' ? 'Tendencia Mensual' :
                                        activeChart === 'area' ? 'Evolución de Gastos' : 'Radar de Categorías'}
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                {activeChart === 'pie' ? (
                                    <PieChart>
                                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} innerRadius={40} dataKey="value" paddingAngle={3}>
                                            {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>} />
                                    </PieChart>
                                ) : activeChart === 'bar' ? (
                                    <BarChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                        <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                ) : activeChart === 'area' ? (
                                    <AreaChart data={monthlyData}>
                                        <defs>
                                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                        <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#areaGrad)" dot={{ fill: '#10b981', r: 4 }} />
                                    </AreaChart>
                                ) : (
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                        <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                        <Tooltip content={<CustomTooltip />} />
                                    </RadarChart>
                                )}
                            </ResponsiveContainer>
                        </div>

                        {/* Ranking de categorías */}
                        <div className={card}>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">🏅 Ranking de Gastos</h2>
                            <div className="space-y-3">
                                {categoryData.slice(0, 7).map((c, i) => {
                                    const pct = totalSpending > 0 ? (c.value / totalSpending) * 100 : 0
                                    return (
                                        <div key={c.name}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                                                    {c.name}
                                                </span>
                                                <span className="font-bold text-gray-900 dark:text-white">{formatCOP(c.value)}</span>
                                            </div>
                                            <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <div className="h-2 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5 text-right">{pct.toFixed(1)}%</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Insights */}
                    <div className={card}>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">💡 Recomendaciones IA</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.insights.map((insight, i) => (
                                <div key={i} className="rounded-xl p-4 border-l-4"
                                    style={{
                                        background: insight.trend === 'High' ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
                                        borderLeftColor: insight.trend === 'High' ? '#ef4444' : '#10b981'
                                    }}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">{insight.category}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${insight.trend === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                            {insight.trend === 'High' ? '📈 Alto' : insight.trend === 'Low' ? '📉 Bajo' : '➡️ Normal'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{formatCOP(insight.amount)} <span className="text-gray-400 font-normal">({insight.percentageOfTotal.toFixed(1)}%)</span></p>
                                    {insight.recommendation && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{insight.recommendation}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
