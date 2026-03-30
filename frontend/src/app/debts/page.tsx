'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

interface Debt {
    id: string; description: string; totalAmount: number; remainingAmount: number
    interestRate: number; startDate: string; endDate: string | null
}

const DEBT_TYPES = ['Tarjeta de Crédito', 'Préstamo Personal', 'Hipoteca', 'Vehículo', 'Educativo', 'Familiar', 'Otro']

export default function DebtsPage() {
    const [userId, setUserId] = useState('')
    const [debts, setDebts] = useState<Debt[]>([])
    const [analysis, setAnalysis] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'list' | 'strategies'>('list')
    const [showForm, setShowForm] = useState(false)
    const [payModal, setPayModal] = useState<Debt | null>(null)
    const [payAmount, setPayAmount] = useState('')
    const [form, setForm] = useState({ description: '', totalAmount: '', interestRate: '', type: 'Tarjeta de Crédito' })

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) { setUserId(id); load(id) }
    }, [])

    const load = async (id: string) => {
        try {
            setLoading(true)
            const [d, a] = await Promise.all([api.get(`/users/${id}/debts`), api.get(`/users/${id}/debts/analysis`)])
            setDebts(d.data); setAnalysis(a.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.post(`/users/${userId}/debts`, { description: `${form.type}: ${form.description}`, totalAmount: parseFloat(form.totalAmount), interestRate: parseFloat(form.interestRate) })
            setShowForm(false); setForm({ description: '', totalAmount: '', interestRate: '', type: 'Tarjeta de Crédito' }); load(userId)
        } catch { alert('Error al registrar deuda') }
    }

    const pay = async () => {
        if (!payModal || !payAmount) return
        try {
            await api.put(`/users/${userId}/debts/${payModal.id}/payment`, { amount: parseFloat(payAmount) })
            setPayModal(null); setPayAmount(''); load(userId)
        } catch { alert('Error al registrar pago') }
    }

    const del = async (id: string) => {
        if (!confirm('¿Eliminar esta deuda?')) return
        await api.delete(`/users/${userId}/debts/${id}`); load(userId)
    }

    const progress = (d: Debt) => ((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100
    const monthlyInterest = (d: Debt) => d.remainingAmount * (d.interestRate / 100 / 12)
    const totalDebt = debts.filter(d => !d.endDate).reduce((s, d) => s + d.remainingAmount, 0)
    const totalPaid = debts.reduce((s, d) => s + (d.totalAmount - d.remainingAmount), 0)
    const totalMonthlyInterest = debts.filter(d => !d.endDate).reduce((s, d) => s + monthlyInterest(d), 0)

    const card = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 p-5"

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">💳 Deudas</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona y elimina tus deudas con estrategias IA</p>
                        </div>
                        <button onClick={() => setShowForm(true)}
                            className="px-5 py-2.5 rounded-xl font-bold text-white transition hover:scale-105"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            + Nueva Deuda
                        </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Deuda Total', value: formatCOP(totalDebt), color: 'text-red-500', icon: '💳' },
                            { label: 'Total Pagado', value: formatCOP(totalPaid), color: 'text-emerald-500', icon: '✅' },
                            { label: 'Interés Mensual', value: formatCOP(totalMonthlyInterest), color: 'text-orange-500', icon: '📈' },
                            { label: 'Deudas Activas', value: String(debts.filter(d => !d.endDate).length), color: 'text-violet-500', icon: '📋' },
                        ].map(k => (
                            <div key={k.label} className={card}>
                                <div className="text-2xl mb-2">{k.icon}</div>
                                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                                <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                        <button onClick={() => setTab('list')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'list' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                            📋 Mis Deudas
                        </button>
                        <button onClick={() => setTab('strategies')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'strategies' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                            🤖 Estrategias IA
                        </button>
                    </div>

                    {/* Formulario nueva deuda */}
                    {showForm && (
                        <div className={`${card} mb-6`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-gray-900 dark:text-white">💳 Nueva Deuda</h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <form onSubmit={submit} className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Tipo de deuda</label>
                                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                            className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-white/10 text-sm">
                                            {DEBT_TYPES.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                                        <input required placeholder="Ej: Bancolombia Visa" value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                            className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-white/10 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Monto total (COP)</label>
                                        <input required type="number" step="1000" placeholder="5000000" value={form.totalAmount}
                                            onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                                            className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-white/10 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Tasa de interés anual (%)</label>
                                        <input required type="number" step="0.1" placeholder="24.5" value={form.interestRate}
                                            onChange={e => setForm({ ...form, interestRate: e.target.value })}
                                            className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-white/10 text-sm" />
                                    </div>
                                </div>
                                {form.totalAmount && form.interestRate && (
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl text-sm text-orange-700 dark:text-orange-400">
                                        💡 Interés mensual estimado: <strong>{formatCOP(parseFloat(form.totalAmount) * parseFloat(form.interestRate) / 100 / 12)}</strong>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>💾 Guardar</button>
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Cancelar</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tab: Lista */}
                    {tab === 'list' && (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>
                            ) : debts.length === 0 ? (
                                <div className={`${card} text-center py-16`}>
                                    <div className="text-6xl mb-4">🎉</div>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Sin deudas registradas!</p>
                                    <p className="text-gray-500">Registra una deuda para comenzar a gestionarla con IA</p>
                                </div>
                            ) : debts.map(debt => {
                                const prog = progress(debt)
                                const mInterest = monthlyInterest(debt)
                                const isPaid = !!debt.endDate
                                const monthsLeft = Math.ceil(debt.remainingAmount / (debt.remainingAmount * 0.05))
                                return (
                                    <div key={debt.id} className={`${card} ${isPaid ? 'opacity-60' : ''}`}>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <h3 className="font-black text-gray-900 dark:text-white">{debt.description}</h3>
                                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-bold">{debt.interestRate}% anual</span>
                                                    {isPaid && <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">✅ Pagada</span>}
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                    <div><p className="text-xs text-gray-500">Restante</p><p className="font-black text-red-500">{formatCOP(debt.remainingAmount)}</p></div>
                                                    <div><p className="text-xs text-gray-500">Original</p><p className="font-bold text-gray-700 dark:text-gray-300">{formatCOP(debt.totalAmount)}</p></div>
                                                    <div><p className="text-xs text-gray-500">Interés/mes</p><p className="font-bold text-orange-500">{formatCOP(mInterest)}</p></div>
                                                    <div><p className="text-xs text-gray-500">Meses restantes</p><p className="font-bold text-violet-500">{isPaid ? '—' : `~${monthsLeft}`}</p></div>
                                                </div>

                                                {/* Barra de progreso */}
                                                <div className="mb-2">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Progreso</span><span className="font-bold text-emerald-500">{prog.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                                                        <div className="h-3 rounded-full transition-all" style={{ width: `${prog}%`, background: prog >= 75 ? '#10b981' : prog >= 40 ? '#f59e0b' : '#ef4444' }} />
                                                    </div>
                                                </div>

                                                {!isPaid && (
                                                    <p className="text-xs text-orange-600 dark:text-orange-400">⚠️ Cada mes se generan <strong>{formatCOP(mInterest)}</strong> de interés</p>
                                                )}
                                                {isPaid && debt.endDate && (
                                                    <p className="text-xs text-emerald-600 font-semibold">🎉 Pagada el {new Date(debt.endDate).toLocaleDateString('es-CO')}</p>
                                                )}
                                            </div>

                                            <div className="flex md:flex-col gap-2 shrink-0">
                                                {!isPaid && (
                                                    <button onClick={() => { setPayModal(debt); setPayAmount('') }}
                                                        className="flex-1 md:flex-none px-4 py-2 rounded-xl font-bold text-white text-sm"
                                                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                                        💵 Pagar
                                                    </button>
                                                )}
                                                <button onClick={() => del(debt.id)}
                                                    className="flex-1 md:flex-none px-4 py-2 rounded-xl font-bold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm transition">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Tab: Estrategias IA */}
                    {tab === 'strategies' && analysis && (
                        <div className="space-y-5">
                            {/* Resumen */}
                            <div className={card}>
                                <h2 className="font-bold text-gray-900 dark:text-white mb-4">📊 Tu Situación de Deudas</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Deuda total activa', value: formatCOP(analysis.summary?.totalDebt || 0), color: 'text-red-500' },
                                        { label: 'Interés mensual total', value: formatCOP(analysis.summary?.totalMonthlyInterest || 0), color: 'text-orange-500' },
                                        { label: 'Excedente mensual', value: formatCOP(analysis.summary?.monthlyFreeAmount || 0), color: 'text-emerald-500' },
                                    ].map(k => (
                                        <div key={k.label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                                            <p className={`font-black text-lg ${k.color}`}>{k.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Estrategias */}
                            {analysis.strategies && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(analysis.strategies).map(([key, s]: [string, any]) => {
                                        const isRecommended = analysis.recommended === key
                                        return (
                                            <div key={key} className={`${card} ${isRecommended ? 'ring-2 ring-emerald-500' : ''}`}>
                                                {isRecommended && (
                                                    <div className="inline-block px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full mb-3">🏆 Recomendada por IA</div>
                                                )}
                                                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-1">
                                                    {key === 'avalanche' ? '🌊 Avalancha' : '⛄ Bola de Nieve'}
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-4">{s.description}</p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Meses para liberarte</span><span className="font-bold text-gray-900 dark:text-white">{s.months} meses</span></div>
                                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total en intereses</span><span className="font-bold text-red-500">{formatCOP(s.totalInterest)}</span></div>
                                                    {s.savings > 0 && (
                                                        <div className="flex justify-between text-sm"><span className="text-gray-500">Ahorras vs la otra</span><span className="font-bold text-emerald-500">+{formatCOP(s.savings)}</span></div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Recomendaciones IA */}
                            {analysis.recommendations?.length > 0 && (
                                <div className={card}>
                                    <h2 className="font-bold text-gray-900 dark:text-white mb-4">🤖 Recomendaciones IA</h2>
                                    <div className="space-y-2">
                                        {analysis.recommendations.map((r: string, i: number) => (
                                            <div key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
                                                <span className="text-emerald-500 shrink-0">💡</span> {r}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pago sugerido */}
                            {analysis.summary?.extraPaymentSuggested > 0 && (
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5 rounded-2xl">
                                    <p className="text-sm opacity-80 mb-1">Pago extra sugerido por mes (30% de tu excedente)</p>
                                    <p className="text-3xl font-black">{formatCOP(analysis.summary.extraPaymentSuggested)}</p>
                                    <p className="text-sm opacity-80 mt-2">Aplicar este monto extra acelera significativamente tu libertad de deudas</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Modal de pago */}
                    {payModal && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setPayModal(null)}>
                            <div className={`${card} max-w-md w-full`} onClick={e => e.stopPropagation()}>
                                <h3 className="font-black text-gray-900 dark:text-white text-xl mb-1">💵 Registrar Pago</h3>
                                <p className="text-gray-500 text-sm mb-4">{payModal.description} · Saldo: <strong className="text-red-500">{formatCOP(payModal.remainingAmount)}</strong></p>
                                <input type="number" step="1000" placeholder="Monto del pago" value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-white/10 mb-3" />
                                <div className="flex gap-2 mb-4">
                                    <button onClick={() => setPayAmount(String(Math.round(payModal.remainingAmount * 0.05)))}
                                        className="text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-semibold">
                                        Mínimo (5%)
                                    </button>
                                    <button onClick={() => setPayAmount(String(payModal.remainingAmount))}
                                        className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg font-semibold">
                                        Pagar todo
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={pay} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Confirmar</button>
                                    <button onClick={() => setPayModal(null)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    )
}
