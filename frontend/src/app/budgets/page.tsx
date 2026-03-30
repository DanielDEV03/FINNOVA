'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const CATEGORIES = ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Servicios', 'Ropa', 'Restaurantes', 'Tecnología', 'Deporte', 'Otro']

const STATUS_CONFIG = {
    exceeded: { color: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10', label: '🔴 Excedido', border: 'border-red-300 dark:border-red-700/40' },
    warning: { color: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/10', label: '🟡 Cerca del límite', border: 'border-yellow-300 dark:border-yellow-700/40' },
    ok: { color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10', label: '🟢 En control', border: 'border-emerald-200 dark:border-emerald-700/20' },
    unbudgeted: { color: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/50', label: '⚪ Sin presupuesto', border: 'border-gray-200 dark:border-white/5' },
}

export default function BudgetsPage() {
    const [userId, setUserId] = useState('')
    const [data, setData] = useState<any>(null)
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ category: 'Alimentación', limitAmount: '' })
    const now = new Date()
    const [month] = useState(now.getMonth() + 1)
    const [year] = useState(now.getFullYear())

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) { setUserId(id); load(id) }
    }, [])

    const load = async (id: string) => {
        try {
            setLoading(true)
            const [d, s] = await Promise.all([
                api.get(`/users/${id}/budgets?month=${month}&year=${year}`),
                api.get(`/users/${id}/budgets/summary`),
            ])
            setData(d.data); setSummary(s.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.post(`/users/${userId}/budgets`, { category: form.category, limitAmount: parseFloat(form.limitAmount), month, year })
            setShowForm(false); setForm({ category: 'Alimentación', limitAmount: '' }); load(userId)
        } catch { alert('Error al guardar presupuesto') }
    }

    const del = async (id: string) => {
        if (!confirm('¿Eliminar este presupuesto?')) return
        await api.delete(`/users/${userId}/budgets/${id}`); load(userId)
    }

    const monthName = new Date(year, month - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    const card = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 p-5"

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">🎯 Presupuestos</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 capitalize">{monthName} — controla tus gastos por categoría</p>
                        </div>
                        <button onClick={() => setShowForm(true)}
                            className="px-5 py-2.5 rounded-xl font-bold text-white transition hover:scale-105"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            + Nuevo Presupuesto
                        </button>
                    </div>

                    {/* Resumen del mes */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'Presupuestado', value: formatCOP(summary.totalBudgeted), color: 'text-violet-500', icon: '🎯' },
                                { label: 'Gastado', value: formatCOP(summary.totalSpent), color: 'text-red-500', icon: '💸' },
                                { label: 'Categorías excedidas', value: String(summary.exceeded), color: 'text-red-500', icon: '🔴' },
                                { label: 'Uso total', value: `${summary.overallPercentage}%`, color: summary.overallPercentage >= 100 ? 'text-red-500' : summary.overallPercentage >= 80 ? 'text-yellow-500' : 'text-emerald-500', icon: '📊' },
                            ].map(k => (
                                <div key={k.label} className={card}>
                                    <div className="text-2xl mb-2">{k.icon}</div>
                                    <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                                    <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Barra de progreso global */}
                    {summary && summary.totalBudgeted > 0 && (
                        <div className={`${card} mb-6`}>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">Progreso del mes</span>
                                <span className="text-gray-500">{formatCOP(summary.totalSpent)} / {formatCOP(summary.totalBudgeted)}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-4">
                                <div className="h-4 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.min(100, summary.overallPercentage)}%`,
                                        background: summary.overallPercentage >= 100 ? '#ef4444' : summary.overallPercentage >= 80 ? '#f59e0b' : '#10b981'
                                    }} />
                            </div>
                            {summary.exceeded > 0 && (
                                <p className="text-xs text-red-500 mt-2">⚠️ {summary.exceeded} categoría(s) han excedido su presupuesto este mes</p>
                            )}
                        </div>
                    )}

                    {/* Formulario */}
                    {showForm && (
                        <div className={`${card} mb-6`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-gray-900 dark:text-white">🎯 Nuevo Presupuesto</h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <form onSubmit={save} className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                            className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-white/10 text-sm">
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Límite mensual (COP)</label>
                                        <input required type="number" step="1000" placeholder="500000" value={form.limitAmount}
                                            onChange={e => setForm({ ...form, limitAmount: e.target.value })}
                                            className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-white/10 text-sm" />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Guardar</button>
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Cancelar</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>
                    ) : (
                        <div className="space-y-3">
                            {/* Presupuestos configurados */}
                            {data?.budgets?.map((b: any) => {
                                const cfg = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ok
                                return (
                                    <div key={b.id} className={`${card} border ${cfg.border}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{b.category}</h3>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                                                </div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-gray-500">Gastado: <strong className={cfg.text}>{formatCOP(b.spent)}</strong></span>
                                                    <span className="text-gray-500">Límite: <strong className="text-gray-900 dark:text-white">{formatCOP(b.limitAmount)}</strong></span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                                                    <div className={`h-3 rounded-full transition-all duration-700 ${cfg.color}`}
                                                        style={{ width: `${Math.min(100, b.percentage)}%` }} />
                                                </div>
                                                <div className="flex justify-between text-xs mt-1">
                                                    <span className={cfg.text}>{b.percentage}% usado</span>
                                                    <span className="text-gray-500">Restante: {formatCOP(b.remaining)}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => del(b.id)} className="text-gray-400 hover:text-red-500 transition text-lg shrink-0">🗑️</button>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Categorías sin presupuesto */}
                            {data?.unbudgeted?.length > 0 && (
                                <div className={card}>
                                    <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm">⚪ Gastos sin presupuesto asignado</h3>
                                    <div className="space-y-2">
                                        {data.unbudgeted.map((u: any) => (
                                            <div key={u.category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{u.category}</p>
                                                    <p className="text-xs text-gray-500">Gastado: {formatCOP(u.spent)}</p>
                                                </div>
                                                <button onClick={() => { setForm({ category: u.category, limitAmount: '' }); setShowForm(true) }}
                                                    className="text-xs px-3 py-1.5 rounded-lg font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 transition">
                                                    + Asignar límite
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Estado vacío */}
                            {!data?.budgets?.length && !data?.unbudgeted?.length && (
                                <div className={`${card} text-center py-16`}>
                                    <div className="text-6xl mb-4">🎯</div>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sin presupuestos este mes</p>
                                    <p className="text-gray-500 mb-6">Define límites por categoría para controlar tus gastos en tiempo real</p>
                                    <button onClick={() => setShowForm(true)}
                                        className="px-6 py-3 rounded-xl font-bold text-white"
                                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                        Crear mi primer presupuesto
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Link al análisis */}
                    <div className="mt-6 text-center">
                        <Link href="/analysis" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                            Ver análisis detallado de gastos →
                        </Link>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
