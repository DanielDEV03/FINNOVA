'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useGamification } from '@/components/gamification/GamificationProvider'
import { usePlan } from '@/hooks/usePlan'
import Link from 'next/link'

const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
}

interface Transaction {
    id: string
    amount: number
    category?: string
    type?: string
    date: string
    description: string
    location?: string
    isRecurring?: boolean
    recurrenceType?: string
    tags?: string[]
    transactionType: 'income' | 'expense'
}

export default function TransactionsPage() {
    const { showAchievement, triggerUpdate } = useGamification();
    const { isPro, limits } = usePlan()
    const [userId, setUserId] = useState<string>('')
    const [showForm, setShowForm] = useState<'income' | 'expense' | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState({
        type: 'all',
        category: 'all',
        search: ''
    })
    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        type: 'Salario',
        date: new Date().toISOString().split('T')[0],
        description: '',
        location: '',
        isRecurring: false,
        recurrenceType: '',
        tags: [] as string[]
    })

    const [tagInput, setTagInput] = useState('')

    const predefinedTags = [
        'Necesario',
        'Capricho',
        'Inversión',
        'Emergencia',
        'Entretenimiento',
        'Salud',
        'Educación'
    ]

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) {
            setUserId(id)
            loadTransactions(id)
        }
    }, [])

    const loadTransactions = async (id: string) => {
        try {
            setLoading(true)
            const [incomesRes, expensesRes] = await Promise.all([
                api.get(`/users/${id}/incomes`),
                api.get(`/users/${id}/expenses`)
            ])

            const incomes: Transaction[] = incomesRes.data.map((income: any) => ({
                ...income,
                transactionType: 'income' as const
            }))

            const expenses: Transaction[] = expensesRes.data.map((expense: any) => ({
                ...expense,
                transactionType: 'expense' as const
            }))

            const allTransactions = [...incomes, ...expenses].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )

            setTransactions(allTransactions)
        } catch (error) {
            console.error('Error loading transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            if (showForm === 'income') {
                await api.post(`/users/${userId}/incomes`, {
                    amount: parseFloat(formData.amount),
                    type: formData.type,
                    date: formData.date,
                    description: formData.description
                })

                // Mostrar logro de gamificación
                showAchievement({
                    title: '💰 Ingreso Registrado',
                    description: 'Has ganado 15 puntos',
                    icon: '💰',
                    pointsEarned: 15
                });
            } else {
                await api.post(`/users/${userId}/expenses`, {
                    amount: parseFloat(formData.amount),
                    category: formData.category,
                    date: formData.date,
                    description: formData.description,
                    location: formData.location || null,
                    isRecurring: formData.isRecurring,
                    recurrenceType: formData.isRecurring ? formData.recurrenceType : null,
                    tags: formData.tags
                })

                // Mostrar logro de gamificación
                showAchievement({
                    title: '📝 Gasto Registrado',
                    description: 'Has ganado 10 puntos',
                    icon: '📝',
                    pointsEarned: 10
                });
            }

            // Actualizar widget flotante
            triggerUpdate();

            alert('Transacción registrada exitosamente')
            setShowForm(null)
            setFormData({
                amount: '',
                category: '',
                type: 'Salario',
                date: new Date().toISOString().split('T')[0],
                description: '',
                location: '',
                isRecurring: false,
                recurrenceType: '',
                tags: []
            })
            setTagInput('')
            loadTransactions(userId)
        } catch (error: any) {
            if (error.response?.status === 402) {
                alert(error.response.data.message)
                window.location.href = '/pricing'
                return
            }
            alert('Error al registrar transacción')
        }
    }

    const filteredTransactions = transactions.filter(t => {
        if (filter.type !== 'all' && t.transactionType !== filter.type) return false
        if (filter.category !== 'all') {
            if (t.transactionType === 'expense' && t.category !== filter.category) return false
            if (t.transactionType === 'income' && t.type !== filter.category) return false
        }
        if (filter.search) {
            const searchLower = filter.search.toLowerCase()
            return (
                t.description?.toLowerCase().includes(searchLower) ||
                t.category?.toLowerCase().includes(searchLower) ||
                t.type?.toLowerCase().includes(searchLower) ||
                t.location?.toLowerCase().includes(searchLower)
            )
        }
        return true
    })

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            'Alimentación': '🍔',
            'Transporte': '🚗',
            'Vivienda': '🏠',
            'Entretenimiento': '🎮',
            'Salud': '💊',
            'Educación': '📚',
            'Servicios': '💡',
            'Salario': '💰',
            'Freelance': '💼',
            'Inversión': '📈',
            'Otro': '📦'
        }
        return icons[category] || '💵'
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 md:p-8">
                <div className="w-full max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-3 sm:gap-4">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">💳 Transacciones</h1>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {!isPro && transactions.length >= 50 ? (
                                <Link href="/pricing"
                                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base text-center transition-all hover:scale-105"
                                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
                                    🔒 Límite alcanzado — Upgrade Pro
                                </Link>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowForm('income')}
                                        className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-semibold text-sm sm:text-base"
                                    >
                                        + Ingreso
                                    </button>
                                    <button
                                        onClick={() => setShowForm('expense')}
                                        className="flex-1 sm:flex-none bg-gradient-to-r from-red-500 to-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-semibold text-sm sm:text-base"
                                    >
                                        + Gasto
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Banner límite plan free — solo transacciones del mes actual */}
                    {!isPro && (() => {
                        const now = new Date()
                        const thisMonth = transactions.filter(t => {
                            const d = new Date(t.date)
                            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                        }).length
                        return thisMonth >= 40 ? (
                            <div className="mb-4 p-3 rounded-xl flex items-center justify-between gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    ⚠️ Usaste <strong>{thisMonth}/50</strong> transacciones este mes (plan Gratis).
                                </p>
                                <Link href="/pricing" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap hover:underline">
                                    Upgrade Pro →
                                </Link>
                            </div>
                        ) : null
                    })()}

                    {showForm && (
                        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg mb-6 md:mb-8 border border-gray-200">
                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                                    {showForm === 'income' ? '💰 Nuevo Ingreso' : '💸 Nuevo Gasto'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(null)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full p-3 border rounded"
                                        required
                                    />
                                </div>

                                {showForm === 'income' ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Tipo</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full p-3 border rounded"
                                        >
                                            <option>Salario</option>
                                            <option>Freelance</option>
                                            <option>Inversión</option>
                                            <option>Otro</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Categoría</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-3 border rounded"
                                            required
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option>Alimentación</option>
                                            <option>Transporte</option>
                                            <option>Vivienda</option>
                                            <option>Entretenimiento</option>
                                            <option>Salud</option>
                                            <option>Educación</option>
                                            <option>Servicios</option>
                                            <option>Otro</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-3 border rounded"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-3 border rounded"
                                        rows={3}
                                    />
                                </div>

                                {showForm === 'expense' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Ubicación (opcional)</label>
                                            <input
                                                type="text"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                className="w-full p-3 border rounded"
                                                placeholder="Ej: Supermercado, Restaurante, etc."
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                                            <input
                                                type="checkbox"
                                                id="isRecurring"
                                                checked={formData.isRecurring}
                                                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                                className="w-5 h-5"
                                            />
                                            <label htmlFor="isRecurring" className="text-sm font-medium">
                                                ¿Es un gasto recurrente?
                                            </label>
                                        </div>

                                        {formData.isRecurring && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Frecuencia</label>
                                                <select
                                                    value={formData.recurrenceType}
                                                    onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value })}
                                                    className="w-full p-3 border rounded"
                                                    required
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="Daily">Diario</option>
                                                    <option value="Weekly">Semanal</option>
                                                    <option value="Monthly">Mensual</option>
                                                    <option value="Yearly">Anual</option>
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium mb-2">Etiquetas</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {predefinedTags.map(tag => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => {
                                                            if (formData.tags.includes(tag)) {
                                                                setFormData({
                                                                    ...formData,
                                                                    tags: formData.tags.filter(t => t !== tag)
                                                                })
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    tags: [...formData.tags, tag]
                                                                })
                                                            }
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-sm ${formData.tags.includes(tag)
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            }`}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                                                                setFormData({
                                                                    ...formData,
                                                                    tags: [...formData.tags, tagInput.trim()]
                                                                })
                                                                setTagInput('')
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 p-2 border rounded text-sm"
                                                    placeholder="Agregar etiqueta personalizada (Enter para agregar)"
                                                />
                                            </div>
                                            {formData.tags.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {formData.tags.map(tag => (
                                                        <span
                                                            key={tag}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-blue-800 rounded-full text-sm"
                                                        >
                                                            {tag}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    tags: formData.tags.filter(t => t !== tag)
                                                                })}
                                                                className="text-emerald-600 hover:text-blue-800"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
                                    >
                                        💾 Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(null)}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Filtros */}
                    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg mb-4 sm:mb-6 border border-gray-200">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">🔍 Filtros</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                                <select
                                    value={filter.type}
                                    onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value="all">Todos</option>
                                    <option value="income">Ingresos</option>
                                    <option value="expense">Gastos</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                                <select
                                    value={filter.category}
                                    onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value="all">Todas</option>
                                    <option value="Alimentación">Alimentación</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Vivienda">Vivienda</option>
                                    <option value="Entretenimiento">Entretenimiento</option>
                                    <option value="Salud">Salud</option>
                                    <option value="Educación">Educación</option>
                                    <option value="Servicios">Servicios</option>
                                    <option value="Salario">Salario</option>
                                    <option value="Freelance">Freelance</option>
                                    <option value="Inversión">Inversión</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                                <input
                                    type="text"
                                    value={filter.search}
                                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                    placeholder="Descripción, ubicación..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Lista de Transacciones */}
                    <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                            <h2 className="text-xl sm:text-2xl font-bold">📋 Historial de Transacciones</h2>
                            <p className="text-xs sm:text-sm opacity-90 mt-1">
                                {filteredTransactions.length} transacciones encontradas
                            </p>
                        </div>

                        {loading ? (
                            <div className="p-8 sm:p-12 text-center">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-500"></div>
                                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Cargando transacciones...</p>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="p-8 sm:p-12 text-center">
                                <span className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 block">📭</span>
                                <p className="text-lg sm:text-xl text-gray-600 mb-2">No hay transacciones</p>
                                <p className="text-sm sm:text-base text-gray-500">Registra tu primera transacción para comenzar</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredTransactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="p-4 sm:p-5 md:p-6 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                                            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                                <div className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">
                                                    {getCategoryIcon(transaction.category || transaction.type || '')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-gray-800 text-base sm:text-lg">
                                                            {transaction.category || transaction.type}
                                                        </h3>
                                                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${transaction.transactionType === 'income'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {transaction.transactionType === 'income' ? 'Ingreso' : 'Gasto'}
                                                        </span>
                                                        {transaction.isRecurring && (
                                                            <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-blue-700">
                                                                🔄 {transaction.recurrenceType}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {transaction.description && (
                                                        <p className="text-sm sm:text-base text-gray-600 mb-2 break-words">{transaction.description}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                                                        <span>📅 {new Date(transaction.date).toLocaleDateString('es-CO')}</span>
                                                        {transaction.location && (
                                                            <span className="truncate">📍 {transaction.location}</span>
                                                        )}
                                                    </div>
                                                    {transaction.tags && transaction.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                                                            {transaction.tags.map((tag, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-2 py-0.5 sm:py-1 bg-green-100 text-purple-700 rounded-full text-xs font-medium"
                                                                >
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-lg sm:text-xl md:text-2xl font-bold whitespace-nowrap ${transaction.transactionType === 'income'
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                    }`}>
                                                    {transaction.transactionType === 'income' ? '+' : '-'}
                                                    {formatCOP(transaction.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
