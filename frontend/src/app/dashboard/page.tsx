'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'
import GamificationWidget from '@/components/gamification/GamificationWidget'
import AchievementToast from '@/components/gamification/AchievementToast'
import { useAppTour } from '@/components/AppTour'
import NotificationBell from '@/components/NotificationBell'
import { exportFinancialReport } from '@/lib/exportPDF'

const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
}

interface DashboardData {
    totalIncome: number
    totalExpenses: number
    balance: number
    totalDebt: number
    recentTransactions: any[]
}

interface Alert {
    type: string
    severity: string
    title: string
    message: string
    icon: string
    actionLabel: string
    actionUrl: string
}

interface Alerts {
    alerts: Alert[]
    preventiveCount: number
    positiveCount: number
    actionableCount: number
}

interface DailyBudget {
    availableToday: number
    remainingForPeriod: number
    daysUntilNextIncome: number
    dailyLimit: number
    status: string
    message: string
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [alerts, setAlerts] = useState<Alerts | null>(null)
    const [dailyBudget, setDailyBudget] = useState<DailyBudget | null>(null)
    const { startTour } = useAppTour()
    const [userId, setUserId] = useState<string>('')
    const [showAllAlerts, setShowAllAlerts] = useState(false)
    const [newAchievement, setNewAchievement] = useState<any>(null)

    useEffect(() => {
        const id = localStorage.getItem('userId')
        if (id) {
            setUserId(id)
            loadDashboard(id)
            loadAlerts(id)
            loadDailyBudget(id)
        }

        // Lanzar tour si viene del onboarding
        if (localStorage.getItem('startTour') === 'true') {
            localStorage.removeItem('startTour')
            setTimeout(() => startTour(), 1200) // esperar que cargue el DOM
        }
    }, [])

    const loadDashboard = async (id: string) => {
        try {
            const response = await api.get(`/users/${id}/dashboard`)
            setData(response.data)
        } catch (error) {
            console.error('Error loading dashboard:', error)
        }
    }

    const loadAlerts = async (id: string) => {
        try {
            const response = await api.get(`/users/${id}/insights/alerts`)
            setAlerts(response.data)
        } catch (error) {
            console.error('Error loading alerts:', error)
        }
    }

    const loadDailyBudget = async (id: string) => {
        try {
            const response = await api.get(`/users/${id}/insights/daily-budget`)
            setDailyBudget(response.data)
        } catch (error) {
            console.error('Error loading daily budget:', error)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Safe': return 'from-green-500 to-green-600'
            case 'Warning': return 'from-yellow-500 to-yellow-600'
            case 'Critical': return 'from-red-500 to-red-600'
            default: return 'from-gray-500 to-gray-600'
        }
    }

    if (!data) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando dashboard...</p>
            </div>
        </div>
    )

    // Filtrar alertas críticas y de advertencia
    const criticalAlerts = alerts?.alerts.filter(a => a.severity === 'Critical' || a.severity === 'Warning') || []
    const displayAlerts = showAllAlerts ? criticalAlerts : criticalAlerts.slice(0, 3)

    return (
        <ProtectedRoute>
            <AchievementToast
                achievement={newAchievement}
                onClose={() => setNewAchievement(null)}
            />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-3 sm:p-4 md:p-8">
                <div className="w-full max-w-7xl mx-auto">
                    <div className="mb-6 md:mb-8 flex items-start justify-between" id="dashboard-title">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">💼 Dashboard Financiero</h1>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">Resumen de tu situación financiera</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <NotificationBell />
                            <button
                                onClick={() => data && exportFinancialReport({
                                    userName: localStorage.getItem('userName') || 'Usuario',
                                    totalIncome: data.totalIncome,
                                    totalExpenses: data.totalExpenses,
                                    balance: data.balance,
                                    totalDebt: data.totalDebt,
                                    transactions: data.recentTransactions
                                })}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-all hover:scale-105"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                                title="Exportar reporte PDF">
                                📄 PDF
                            </button>
                        </div>
                    </div>

                    {/* GAMIFICACIÓN WIDGET */}
                    <div className="mb-6 md:mb-8" id="gamification-widget">
                        <GamificationWidget />
                    </div>

                    {/* ALERTAS PRIORITARIAS */}
                    {criticalAlerts.length > 0 && (
                        <div className="mb-6 md:mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🚨 Alertas Prioritarias</h2>
                                {criticalAlerts.length > 3 && (
                                    <button
                                        onClick={() => setShowAllAlerts(!showAllAlerts)}
                                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                    >
                                        {showAllAlerts ? 'Ver menos' : `Ver todas (${criticalAlerts.length})`}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {displayAlerts.map((alert, index) => (
                                    <div
                                        key={index}
                                        className={`rounded-lg sm:rounded-xl p-4 sm:p-5 border-2 ${alert.severity === 'Critical'
                                            ? 'bg-red-50 border-red-300'
                                            : 'bg-yellow-50 border-yellow-300'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <span className="text-2xl sm:text-3xl flex-shrink-0">{alert.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-base sm:text-lg mb-1">{alert.title}</h3>
                                                <p className="text-sm sm:text-base text-gray-700 mb-3">{alert.message}</p>
                                                {alert.actionUrl && (
                                                    <Link
                                                        href={alert.actionUrl}
                                                        className={`inline-block px-3 sm:px-4 py-2 rounded-lg text-sm font-medium ${alert.severity === 'Critical'
                                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                            }`}
                                                    >
                                                        {alert.actionLabel}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PRESUPUESTO DIARIO */}
                    {dailyBudget && (
                        <div className="mb-6 md:mb-8" id="daily-budget">
                            <div className={`bg-gradient-to-br ${getStatusColor(dailyBudget.status)} p-6 sm:p-8 rounded-xl shadow-lg text-white`}>
                                <div className="text-center">
                                    <p className="text-xs sm:text-sm font-medium mb-2 opacity-90">HOY PUEDES GASTAR</p>
                                    <p className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
                                        {formatCOP(dailyBudget.availableToday)}
                                    </p>
                                    <p className="text-sm sm:text-base opacity-90">{dailyBudget.message}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">
                                    <div className="bg-white/20 backdrop-blur-sm p-3 sm:p-4 rounded-lg">
                                        <p className="text-xs opacity-90">Te quedan</p>
                                        <p className="text-base sm:text-lg font-bold">{formatCOP(dailyBudget.remainingForPeriod)}</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm p-3 sm:p-4 rounded-lg">
                                        <p className="text-xs opacity-90">Días restantes</p>
                                        <p className="text-base sm:text-lg font-bold">{dailyBudget.daysUntilNextIncome}</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm p-3 sm:p-4 rounded-lg">
                                        <p className="text-xs opacity-90">Límite diario</p>
                                        <p className="text-base sm:text-lg font-bold">{formatCOP(dailyBudget.dailyLimit)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MÉTRICAS PRINCIPALES */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
                        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg text-white transform transition hover:scale-105">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-green-100 text-xs sm:text-sm font-medium">Ingresos Totales</h3>
                                <span className="text-2xl sm:text-3xl">💰</span>
                            </div>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{formatCOP(data.totalIncome)}</p>
                            <p className="text-green-100 text-xs mt-1 sm:mt-2">Total acumulado</p>
                        </div>

                        <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg text-white transform transition hover:scale-105">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-red-100 text-xs sm:text-sm font-medium">Gastos Totales</h3>
                                <span className="text-2xl sm:text-3xl">💸</span>
                            </div>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{formatCOP(data.totalExpenses)}</p>
                            <p className="text-red-100 text-xs mt-1 sm:mt-2">Total acumulado</p>
                        </div>

                        <div className={`bg-gradient-to-br ${data.balance >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600'} p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg text-white transform transition hover:scale-105`}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-emerald-100 text-xs sm:text-sm font-medium">Balance</h3>
                                <span className="text-2xl sm:text-3xl">{data.balance >= 0 ? '📈' : '📉'}</span>
                            </div>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{formatCOP(data.balance)}</p>
                            <p className="text-emerald-100 text-xs mt-1 sm:mt-2">
                                {data.balance >= 0 ? 'Positivo' : 'Negativo'}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl shadow-lg text-white transform transition hover:scale-105">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-purple-100 text-xs sm:text-sm font-medium">Deudas</h3>
                                <span className="text-2xl sm:text-3xl">💳</span>
                            </div>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{formatCOP(data.totalDebt)}</p>
                            <p className="text-purple-100 text-xs mt-1 sm:mt-2">Total pendiente</p>
                        </div>
                    </div>

                    {/* ACCIONES RÁPIDAS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8" id="quick-actions">
                        <Link
                            href="/transactions"
                            className="bg-white p-4 sm:p-5 rounded-lg shadow hover:shadow-lg transition text-center"
                        >
                            <span className="text-3xl sm:text-4xl mb-2 block">💰</span>
                            <p className="text-sm sm:text-base font-semibold text-gray-900">Transacciones</p>
                        </Link>
                        <Link
                            href="/simulator"
                            className="bg-white p-4 sm:p-5 rounded-lg shadow hover:shadow-lg transition text-center"
                        >
                            <span className="text-3xl sm:text-4xl mb-2 block">🎯</span>
                            <p className="text-sm sm:text-base font-semibold text-gray-900">Simulador</p>
                        </Link>
                        <Link
                            href="/predictions"
                            className="bg-white p-4 sm:p-5 rounded-lg shadow hover:shadow-lg transition text-center"
                        >
                            <span className="text-3xl sm:text-4xl mb-2 block">🔮</span>
                            <p className="text-sm sm:text-base font-semibold text-gray-900">Predicciones</p>
                        </Link>
                        <Link
                            href="/analysis"
                            className="bg-white p-4 sm:p-5 rounded-lg shadow hover:shadow-lg transition text-center"
                        >
                            <span className="text-3xl sm:text-4xl mb-2 block">📊</span>
                            <p className="text-sm sm:text-base font-semibold text-gray-900">Análisis</p>
                        </Link>
                    </div>

                    {/* TRANSACCIONES RECIENTES */}
                    {data.recentTransactions && data.recentTransactions.length > 0 && (
                        <div className="bg-white rounded-lg md:rounded-xl shadow-lg p-4 sm:p-5 md:p-6">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 text-gray-900">Transacciones Recientes</h2>
                            <div className="space-y-3">
                                {data.recentTransactions.slice(0, 5).map((transaction: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{transaction.type === 'income' ? '💰' : '💸'}</span>
                                            <div>
                                                <p className="font-semibold text-sm sm:text-base">{transaction.description}</p>
                                                <p className="text-xs sm:text-sm text-gray-600">{transaction.category}</p>
                                            </div>
                                        </div>
                                        <p className={`font-bold text-sm sm:text-base ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {transaction.type === 'income' ? '+' : '-'}{formatCOP(transaction.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <Link
                                href="/transactions"
                                className="block mt-4 text-center text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                            >
                                Ver todas las transacciones →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    )
}
