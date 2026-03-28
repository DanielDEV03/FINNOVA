'use client'
import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { usePlan } from '@/hooks/usePlan'
import { cancelSubscription, getPlanLabel } from '@/lib/subscription'
import Link from 'next/link'
import { logout } from '@/lib/auth'

export default function ProfilePage() {
    const { plan, isPro, isBusiness, planExpiresAt, subscription, loading, refresh } = usePlan()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [cancelling, setCancelling] = useState(false)

    useEffect(() => {
        setName(localStorage.getItem('userName') || '')
        setEmail(localStorage.getItem('userEmail') || '')
    }, [])

    const handleCancel = async () => {
        if (!confirm('¿Cancelar suscripción? Seguirás teniendo acceso hasta que expire.')) return
        setCancelling(true)
        try {
            const r = await cancelSubscription()
            alert(r.message)
            await refresh()
        } catch { alert('Error al cancelar') }
        finally { setCancelling(false) }
    }

    const planColor = plan === 'business' ? 'from-violet-600 to-purple-700' : plan === 'pro' ? 'from-emerald-600 to-teal-600' : 'from-gray-600 to-gray-700'
    const card = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 p-6"

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
                <div className="max-w-2xl mx-auto space-y-5">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">👤 Mi Perfil</h1>

                    {/* Info básica */}
                    <div className={card}>
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${planColor} flex items-center justify-center text-2xl font-black text-white`}>
                                {name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xl font-black text-gray-900 dark:text-white">{name}</p>
                                <p className="text-gray-500 text-sm">{email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Plan actual */}
                    <div className={card}>
                        <h2 className="font-bold text-gray-900 dark:text-white mb-4">📋 Plan actual</h2>
                        <div className={`bg-gradient-to-r ${planColor} rounded-xl p-5 text-white mb-4`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-80 mb-1">Tu plan</p>
                                    <p className="text-2xl font-black">{getPlanLabel(plan)}</p>
                                </div>
                                <div className="text-4xl">
                                    {plan === 'business' ? '🚀' : plan === 'pro' ? '⭐' : '🆓'}
                                </div>
                            </div>
                            {planExpiresAt && (
                                <p className="text-sm opacity-80 mt-3">
                                    Vence el {new Date(planExpiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            )}
                        </div>

                        {plan === 'free' ? (
                            <Link href="/pricing"
                                className="block text-center py-3 rounded-xl font-bold text-white transition hover:scale-105"
                                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                ⬆️ Mejorar a Pro — $29.900/mes
                            </Link>
                        ) : (
                            <div className="space-y-3">
                                <Link href="/pricing"
                                    className="block text-center py-2.5 rounded-xl font-semibold text-sm border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
                                    Ver todos los planes
                                </Link>
                                {subscription?.status === 'active' && (
                                    <button onClick={handleCancel} disabled={cancelling}
                                        className="w-full py-2.5 rounded-xl font-semibold text-sm text-red-500 border border-red-500/30 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">
                                        {cancelling ? 'Cancelando...' : '❌ Cancelar suscripción'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Verificar pago pendiente */}
                    {subscription?.status === 'pending' && (
                        <div className={`${card} border-yellow-400/30`} style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                            <h3 className="font-bold text-yellow-600 dark:text-yellow-400 mb-2">⏳ Pago pendiente</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Tu pago está siendo procesado. Si ya pagaste y no se activó, contacta soporte.
                            </p>
                            <a href="mailto:ctslabscartagena@gmail.com?subject=Verificar pago FINNOVA"
                                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                                📧 Contactar soporte →
                            </a>
                        </div>
                    )}

                    {/* Features del plan */}
                    <div className={card}>
                        <h2 className="font-bold text-gray-900 dark:text-white mb-4">✅ Incluido en tu plan</h2>
                        <div className="space-y-2">
                            {[
                                { label: 'Dashboard financiero', ok: true },
                                { label: `Transacciones ${plan === 'free' ? '(50/mes)' : 'ilimitadas'}`, ok: true },
                                { label: 'Predicciones IA', ok: true },
                                { label: 'Exportar PDF', ok: isPro || isBusiness },
                                { label: 'Análisis avanzado', ok: isPro || isBusiness },
                                { label: 'Simulador ilimitado', ok: isPro || isBusiness },
                                { label: 'Múltiples cuentas', ok: isBusiness },
                                { label: 'Panel de equipo', ok: isBusiness },
                                { label: 'API access', ok: isBusiness },
                            ].map(f => (
                                <div key={f.label} className={`flex items-center gap-2 text-sm ${f.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 line-through'}`}>
                                    <span>{f.ok ? '✅' : '❌'}</span> {f.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cerrar sesión */}
                    <button onClick={logout}
                        className="w-full py-3 rounded-xl font-bold text-red-500 border border-red-500/30 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        🚪 Cerrar sesión
                    </button>
                </div>
            </div>
        </ProtectedRoute>
    )
}
