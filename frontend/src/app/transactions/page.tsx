'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useGamification } from '@/components/gamification/GamificationProvider'
import { usePlan } from '@/hooks/usePlan'
import Link from 'next/link'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const EXPENSE_CATEGORIES = ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Servicios', 'Ropa', 'Restaurantes', 'Tecnología', 'Deporte', 'Otro']
const INCOME_TYPES = ['Salario', 'Freelance', 'Inversión', 'Negocio', 'Arriendo', 'Otro']

const CATEGORY_ICONS: Record<string, string> = {
    'Alimentación': '🍔', 'Transporte': '🚗', 'Vivienda': '🏠', 'Entretenimiento': '🎮',
    'Salud': '💊', 'Educación': '📚', 'Servicios': '💡', 'Salario': '💰', 'Freelance': '💼',
    'Inversión': '📈', 'Ropa': '👕', 'Restaurantes': '🍽️', 'Tecnología': '💻', 'Deporte': '🏃', 'Negocio': '🏢', 'Arriendo': '🏘️', 'Otro': '📦'
}

const PREDEFINED_TAGS = ['Necesario', 'Capricho', 'Inversión', 'Emergencia', 'Entretenimiento', 'Salud', 'Educación']

interface Transaction {
    id: string; amount: number; category?: string; type?: string
    date: string; description: string; location?: string
    isRecurring?: boolean; recurrenceType?: string; tags?: string[]
    transactionType: 'income' | 'expense'
}

interface BudgetStatus {
    category: string; limitAmount: number; spent: number
    remaining: number; percentage: number; status: 'ok' | 'warning' | 'exceeded'
}

interface AiCategoryInsight {
    predictedNextMonth: number; trend: string; avgMonthly: number
}

export default function TransactionsPage() {
    const { showAchievement, triggerUpdate } = useGamification()
    const { isPro } = usePlan()
    const [userId, setUserId] = useState('')
    const [showForm, setShowForm] = useState<'income' | 'expense' | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState({ type: 'all', category: 'all', search: '' })
    const [formData, setFormData] = useState({
        amount: '', category: '', type: 'Salario',
        date: new Date().toISOString().split('T')[0],
        description: '', location: '', isRecurring: false, recurrenceType: '', tags: [] as string[]
    })
    const [tagInput, setTagInput] = useState('')

    // Presupuesto + IA por categoría
    const [budgets, setBudgets] = useState<BudgetStatus[]>([])
    const [budgetSummary, setBudgetSummary] = useState<any>(null)
    const [activeBudget, setActiveBudget] = useState<BudgetStatus | null>(null)
    const [aiInsight, setAiInsight] = useState<AiCategoryInsight | null>(null)
    const [loadingInsight, setLoadingInsight] = useState(false)

    useEffect(() => {
        const id = localStorage.getItem('userId') || ''
        setUserId(id)
        if (id) { loadTransactions(id); loadBudgets(id) }
    }, [])

    const loadTransactions = async (id: string) => {
        try {
            setLoading(true)
            const [inc, exp] = await Promise.all([api.get(`/users/${id}/incomes`), api.get(`/users/${id}/expenses`)])
            const all: Transaction[] = [
                ...inc.data.map((x: any) => ({ ...x, transactionType: 'income' as const })),
                ...exp.data.map((x: any) => ({ ...x, transactionType: 'expense' as const }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            setTransactions(all)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const loadBudgets = async (id: string) => {
        try {
            const now = new Date()
            const [detail, summary] = await Promise.all([
                api.get(`/users/${id}/budgets?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
                api.get(`/users/${id}/budgets/summary`)
            ])
            setBudgets(detail.data?.budgets || [])
            setBudgetSummary(summary.data)
        } catch { /* sin presupuestos aún */ }
    }

    // Al cambiar categoría en el form → buscar presupuesto activo + predicción IA
    const onCategoryChange = useCallback(async (cat: string) => {
        setFormData(f => ({ ...f, category: cat }))
        const found = budgets.find(b => b.category === cat) || null
        setActiveBudget(found)
        if (!cat || cat === '') { setAiInsight(null); return }
        try {
            setLoadingInsight(true)
            const r = await api.get(`/users/${userId}/analysis/spending`)
            const catData = r.data?.insights?.find((i: any) => i.category === cat)
            if (catData) {
                setAiInsight({
                    predictedNextMonth: catData.amount * 1.05,
                    trend: catData.trend,
                    avgMonthly: catData.amount
                })
            } else { setAiInsight(null) }
        } catch { setAiInsight(null) }
        finally { setLoadingInsight(false) }
    }, [budgets, userId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (showForm === 'income') {
                await api.post(`/users/${userId}/incomes`, {
                    amount: parseFloat(formData.amount), type: formData.type,
                    date: formData.date, description: formData.description
                })
                showAchievement({ title: '💰 Ingreso Registrado', description: 'Has ganado 15 puntos', icon: '💰', pointsEarned: 15 })
            } else {
                await api.post(`/users/${userId}/expenses`, {
                    amount: parseFloat(formData.amount), category: formData.category,
                    date: formData.date, description: formData.description,
                    location: formData.location || null, isRecurring: formData.isRecurring,
                    recurrenceType: formData.isRecurring ? formData.recurrenceType : null,
                    tags: formData.tags
                })
                showAchievement({ title: '📝 Gasto Registrado', description: 'Has ganado 10 puntos', icon: '📝', pointsEarned: 10 })
            }
            triggerUpdate()
            setShowForm(null)
            setActiveBudget(null); setAiInsight(null)
            setFormData({ amount: '', category: '', type: 'Salario', date: new Date().toISOString().split('T')[0], description: '', location: '', isRecurring: false, recurrenceType: '', tags: [] })
            setTagInput('')
            loadTransactions(userId); loadBudgets(userId)
        } catch (error: any) {
            if (error.response?.status === 402) { alert(error.response.data.message); window.location.href = '/pricing'; return }
            alert('Error al registrar transacción')
        }
    }

    const filtered = transactions.filter(t => {
        if (filter.type !== 'all' && t.transactionType !== filter.type) return false
        if (filter.category !== 'all') {
            if (t.transactionType === 'expense' && t.category !== filter.category) return false
            if (t.transactionType === 'income' && t.type !== filter.category) return false
        }
        if (filter.search) {
            const s = filter.search.toLowerCase()
            return t.description?.toLowerCase().includes(s) || t.category?.toLowerCase().includes(s) || t.type?.toLowerCase().includes(s) || t.location?.toLowerCase().includes(s)
        }
        return true
    })

    const getBudgetForTransaction = (t: Transaction) => {
        if (t.transactionType !== 'expense' || !t.category) return null
        return budgets.find(b => b.category === t.category) || null
    }

    const card = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5"

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-3 sm:p-4 md:p-8">
                <div className="w-full max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white">💳 Transacciones</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registra y controla tus movimientos financieros</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {!isPro && transactions.length >= 50 ? (
                                <Link href="/pricing" className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm text-center text-white hover:scale-105 transition" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                    🔒 Límite — Upgrade Pro
                                </Link>
                            ) : (
                                <>
                                    <button onClick={() => { setShowForm('income'); setActiveBudget(null); setAiInsight(null) }}
                                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow hover:scale-105 transition"
                                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                        + Ingreso
                                    </button>
                                    <button onClick={() => { setShowForm('expense'); setActiveBudget(null); setAiInsight(null) }}
                                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow hover:scale-105 transition"
                                        style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                        + Gasto
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Banner límite free */}
                    {!isPro && (() => {
                        const now = new Date()
                        const thisMonth = transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length
                        return thisMonth >= 40 ? (
                            <div className="mb-4 p-3 rounded-xl flex items-center justify-between gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">⚠️ Usaste <strong>{thisMonth}/50</strong> transacciones este mes.</p>
                                <Link href="/pricing" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap hover:underline">Upgrade Pro →</Link>
                            </div>
                        ) : null
                    })()}

                    {/* FORMULARIO */}
                    {showForm && (
                        <div className={`${card} p-5 mb-6 shadow-lg`}>
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                    {showForm === 'income' ? '💰 Nuevo Ingreso' : '💸 Nuevo Gasto'}
                                </h2>
                                <button onClick={() => { setShowForm(null); setActiveBudget(null); setAiInsight(null) }}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Campos del form */}
                                <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Monto (COP)</label>
                                            <input type="number" step="1000" required value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                placeholder="0" className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Fecha</label>
                                            <input type="date" required value={formData.date}
                                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                                        </div>
                                    </div>

                                    {showForm === 'income' ? (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Tipo de ingreso</label>
                                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm">
                                                {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Categoría</label>
                                            <select required value={formData.category} onChange={e => onCategoryChange(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm">
                                                <option value="">Seleccionar categoría...</option>
                                                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Descripción (opcional)</label>
                                        <input type="text" value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Ej: Almuerzo en el trabajo" className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm" />
                                    </div>

                                    {showForm === 'expense' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Ubicación (opcional)</label>
                                                <input type="text" value={formData.location}
                                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                    placeholder="Ej: Éxito, Rappi, etc." className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm" />
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <input type="checkbox" id="isRecurring" checked={formData.isRecurring}
                                                    onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                                                <label htmlFor="isRecurring" className="text-sm text-gray-700 dark:text-gray-300">¿Gasto recurrente?</label>
                                                {formData.isRecurring && (
                                                    <select value={formData.recurrenceType} onChange={e => setFormData({ ...formData, recurrenceType: e.target.value })}
                                                        className="ml-auto p-2 rounded-lg border border-gray-200 dark:border-white/10 dark:bg-gray-700 text-xs" required>
                                                        <option value="">Frecuencia...</option>
                                                        <option value="Daily">Diario</option>
                                                        <option value="Weekly">Semanal</option>
                                                        <option value="Monthly">Mensual</option>
                                                        <option value="Yearly">Anual</option>
                                                    </select>
                                                )}
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-2">Etiquetas</label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {PREDEFINED_TAGS.map(tag => (
                                                        <button key={tag} type="button"
                                                            onClick={() => setFormData({ ...formData, tags: formData.tags.includes(tag) ? formData.tags.filter(t => t !== tag) : [...formData.tags, tag] })}
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${formData.tags.includes(tag) ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) { setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] }); setTagInput('') } } }}
                                                    placeholder="Etiqueta personalizada (Enter)" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-xs" />
                                            </div>
                                        </>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white text-sm hover:scale-105 transition"
                                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                            💾 Guardar
                                        </button>
                                        <button type="button" onClick={() => { setShowForm(null); setActiveBudget(null); setAiInsight(null) }}
                                            className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition">
                                            Cancelar
                                        </button>
                                    </div>
                                </form>

                                {/* Panel lateral IA + Presupuesto */}
                                {showForm === 'expense' && (
                                    <div className="space-y-4">
                                        {/* Presupuesto activo de la categoría */}
                                        {formData.category && (
                                            <div className={`rounded-2xl p-4 border ${activeBudget ? (activeBudget.status === 'exceeded' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700/30' : activeBudget.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-700/30' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700/30') : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-white/5'}`}>
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                                                    {CATEGORY_ICONS[formData.category]} Presupuesto — {formData.category}
                                                </p>
                                                {activeBudget ? (
                                                    <>
                                                        <div className="flex justify-between text-sm mb-2">
                                                            <span className="text-gray-600 dark:text-gray-400">Gastado</span>
                                                            <span className={`font-bold ${activeBudget.status === 'exceeded' ? 'text-red-600' : activeBudget.status === 'warning' ? 'text-yellow-600' : 'text-emerald-600'}`}>
                                                                {formatCOP(activeBudget.spent)}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                                                            <div className="h-3 rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.min(100, activeBudget.percentage)}%`, background: activeBudget.status === 'exceeded' ? '#ef4444' : activeBudget.status === 'warning' ? '#f59e0b' : '#10b981' }} />
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className={`font-semibold ${activeBudget.status === 'exceeded' ? 'text-red-500' : activeBudget.status === 'warning' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                                                {activeBudget.percentage}% usado
                                                            </span>
                                                            <span className="text-gray-500">Límite: {formatCOP(activeBudget.limitAmount)}</span>
                                                        </div>
                                                        {activeBudget.status === 'exceeded' && (
                                                            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">🔴 Presupuesto excedido en {formatCOP(activeBudget.spent - activeBudget.limitAmount)}</p>
                                                        )}
                                                        {activeBudget.status === 'warning' && (
                                                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 font-semibold">🟡 Solo te quedan {formatCOP(activeBudget.remaining)}</p>
                                                        )}
                                                        {activeBudget.status === 'ok' && (
                                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-semibold">🟢 Disponible: {formatCOP(activeBudget.remaining)}</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-center py-3">
                                                        <p className="text-xs text-gray-500 mb-2">Sin presupuesto asignado</p>
                                                        <Link href="/budgets" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                                            + Crear presupuesto →
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Predicción IA */}
                                        {formData.category && (
                                            <div className="rounded-2xl p-4 border border-violet-200 dark:border-violet-700/30 bg-violet-50 dark:bg-violet-900/10">
                                                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-2 uppercase tracking-wide">🤖 Predicción IA</p>
                                                {loadingInsight ? (
                                                    <div className="flex items-center gap-2 py-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-500" />
                                                        <span className="text-xs text-gray-500">Analizando...</span>
                                                    </div>
                                                ) : aiInsight ? (
                                                    <>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Gasto promedio en {formData.category}:</p>
                                                        <p className="text-lg font-black text-violet-600 dark:text-violet-400">{formatCOP(aiInsight.avgMonthly)}<span className="text-xs font-normal text-gray-500">/mes</span></p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Tendencia: <span className={`font-semibold ${aiInsight.trend === 'High' ? 'text-red-500' : aiInsight.trend === 'Low' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                                                {aiInsight.trend === 'High' ? '📈 Alta' : aiInsight.trend === 'Low' ? '📉 Baja' : '➡️ Estable'}
                                                            </span>
                                                        </p>
                                                        {activeBudget && aiInsight.avgMonthly > activeBudget.limitAmount && (
                                                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-semibold">
                                                                ⚠️ Históricamente gastas más de tu límite en esta categoría
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-gray-500 py-2">Registra más gastos en esta categoría para obtener predicciones</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Tip si no hay categoría seleccionada */}
                                        {!formData.category && (
                                            <div className="rounded-2xl p-4 border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-gray-800 text-center">
                                                <p className="text-3xl mb-2">🎯</p>
                                                <p className="text-xs text-gray-500">Selecciona una categoría para ver tu presupuesto y predicción IA en tiempo real</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MINI-PANEL PRESUPUESTOS DEL MES */}
                    {budgetSummary && budgetSummary.totalBudgets > 0 && (
                        <div className={`${card} p-4 mb-5 shadow-sm`}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">🎯 Presupuestos del mes</p>
                                <Link href="/budgets" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">Gestionar →</Link>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                {[
                                    { label: 'Presupuestado', value: formatCOP(budgetSummary.totalBudgeted), color: 'text-violet-500' },
                                    { label: 'Gastado', value: formatCOP(budgetSummary.totalSpent), color: 'text-red-500' },
                                    { label: 'Excedidos', value: String(budgetSummary.exceeded), color: budgetSummary.exceeded > 0 ? 'text-red-500' : 'text-emerald-500' },
                                    { label: 'Uso total', value: `${budgetSummary.overallPercentage}%`, color: budgetSummary.overallPercentage >= 100 ? 'text-red-500' : budgetSummary.overallPercentage >= 80 ? 'text-yellow-500' : 'text-emerald-500' },
                                ].map(k => (
                                    <div key={k.label} className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-0.5">{k.label}</p>
                                        <p className={`text-sm font-black ${k.color}`}>{k.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                <div className="h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(100, budgetSummary.overallPercentage)}%`, background: budgetSummary.overallPercentage >= 100 ? '#ef4444' : budgetSummary.overallPercentage >= 80 ? '#f59e0b' : '#10b981' }} />
                            </div>
                            {/* Barras por categoría */}
                            {budgets.length > 0 && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {budgets.slice(0, 6).map(b => (
                                        <div key={b.category} className="flex items-center gap-2">
                                            <span className="text-xs w-24 truncate text-gray-600 dark:text-gray-400">{CATEGORY_ICONS[b.category] || '📦'} {b.category}</span>
                                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, b.percentage)}%`, background: b.status === 'exceeded' ? '#ef4444' : b.status === 'warning' ? '#f59e0b' : '#10b981' }} />
                                            </div>
                                            <span className={`text-xs font-bold w-10 text-right ${b.status === 'exceeded' ? 'text-red-500' : b.status === 'warning' ? 'text-yellow-500' : 'text-emerald-500'}`}>{b.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FILTROS */}
                    <div className={`${card} p-4 mb-5 shadow-sm`}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm">
                                <option value="all">Todos los tipos</option>
                                <option value="income">Solo ingresos</option>
                                <option value="expense">Solo gastos</option>
                            </select>
                            <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}
                                className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm">
                                <option value="all">Todas las categorías</option>
                                {[...EXPENSE_CATEGORIES, ...INCOME_TYPES].map(c => <option key={c}>{c}</option>)}
                            </select>
                            <input type="text" value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
                                placeholder="🔍 Buscar..." className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-gray-800 text-sm" />
                        </div>
                    </div>

                    {/* HISTORIAL */}
                    <div className={`${card} shadow-sm overflow-hidden`}>
                        <div className="p-4 sm:p-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            <div>
                                <h2 className="text-lg font-black text-white">📋 Historial</h2>
                                <p className="text-xs text-emerald-100 mt-0.5">{filtered.length} transacciones</p>
                            </div>
                            {budgetSummary?.exceeded > 0 && (
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-500 text-white">
                                    🔴 {budgetSummary.exceeded} presupuesto(s) excedido(s)
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">Cargando transacciones...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <span className="text-5xl mb-3 block">📭</span>
                                <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Sin transacciones</p>
                                <p className="text-sm text-gray-500">Registra tu primera transacción para comenzar</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {filtered.map(t => {
                                    const budget = getBudgetForTransaction(t)
                                    return (
                                        <div key={t.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <span className="text-2xl sm:text-3xl flex-shrink-0">{CATEGORY_ICONS[t.category || t.type || ''] || '💵'}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{t.category || t.type}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.transactionType === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                                                {t.transactionType === 'income' ? 'Ingreso' : 'Gasto'}
                                                            </span>
                                                            {t.isRecurring && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">🔄 {t.recurrenceType}</span>}
                                                            {/* Badge de presupuesto */}
                                                            {budget && (
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${budget.status === 'exceeded' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : budget.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                                    {budget.status === 'exceeded' ? '🔴' : budget.status === 'warning' ? '🟡' : '🟢'} {budget.percentage}% del presupuesto
                                                                </span>
                                                            )}
                                                        </div>
                                                        {t.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">{t.description}</p>}
                                                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                                            <span>📅 {new Date(t.date).toLocaleDateString('es-CO')}</span>
                                                            {t.location && <span className="truncate">📍 {t.location}</span>}
                                                        </div>
                                                        {t.tags && t.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                {t.tags.map((tag, i) => <span key={i} className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-xs">#{tag}</span>)}
                                                            </div>
                                                        )}
                                                        {/* Mini barra de presupuesto inline */}
                                                        {budget && (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 max-w-32">
                                                                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, budget.percentage)}%`, background: budget.status === 'exceeded' ? '#ef4444' : budget.status === 'warning' ? '#f59e0b' : '#10b981' }} />
                                                                </div>
                                                                <span className="text-xs text-gray-400">{formatCOP(budget.remaining)} restante</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className={`text-base sm:text-lg font-black whitespace-nowrap flex-shrink-0 ${t.transactionType === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {t.transactionType === 'income' ? '+' : '-'}{formatCOP(t.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </ProtectedRoute>
    )
}
