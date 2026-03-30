'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createCheckout } from '@/lib/subscription'
import { usePlan } from '@/hooks/usePlan'

const plans = [
    {
        id: 'free',
        name: 'Gratis',
        price: { monthly: 0, annual: 0 },
        description: 'Para empezar a controlar tus finanzas',
        badge: null,
        popular: false,
        features: [
            { label: 'Dashboard financiero', included: true },
            { label: 'Hasta 50 transacciones/mes', included: true },
            { label: 'Predicciones básicas IA', included: true },
            { label: 'Alertas básicas', included: true },
            { label: 'Deudas y gastos', included: true },
            { label: 'Análisis avanzado + Insights', included: false },
            { label: 'Simulador Time Machine', included: false },
            { label: 'Exportar PDF', included: false },
            { label: 'Transacciones ilimitadas', included: false },
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: { monthly: 29_900, annual: 287_040 },
        description: 'Para quienes toman sus finanzas en serio',
        badge: '⭐ Más popular',
        popular: true,
        features: [
            { label: 'Todo lo del plan Gratis', included: true },
            { label: 'Transacciones ilimitadas', included: true },
            { label: 'Predicciones IA avanzadas', included: true },
            { label: 'Simulador Time Machine (5 escenarios)', included: true },
            { label: 'Análisis avanzado + Insights completos', included: true },
            { label: 'Exportar reportes PDF', included: true },
            { label: 'Alertas inteligentes proactivas', included: true },
            { label: 'Notificaciones push', included: true },
            { label: 'Múltiples cuentas', included: false },
        ],
    },
    {
        id: 'business',
        name: 'Business',
        price: { monthly: 89_900, annual: 863_040 },
        description: 'Para emprendedores y equipos',
        badge: '🚀 Business',
        popular: false,
        comingSoon: false,
        features: [
            { label: 'Todo lo del plan Pro', included: true },
            { label: 'Múltiples cuentas', included: true },
            { label: 'Panel de equipo (solo lectura)', included: true },
            { label: 'API access (solo lectura)', included: true },
            { label: 'Reportes personalizados con filtros', included: true },
            { label: 'Soporte prioritario 24/7', included: true },
            { label: 'Onboarding personalizado', included: true },
        ],
    },
]

const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

function PricingContent() {
    const searchParams = useSearchParams()
    const [annual, setAnnual] = useState(false)
    const [loading, setLoading] = useState<string | null>(null)
    const { plan: currentPlan } = usePlan()

    // Auto-trigger checkout si viene de register con ?plan=
    useEffect(() => {
        const planFromUrl = searchParams.get('plan')
        if (planFromUrl && planFromUrl !== 'free') {
            const userId = localStorage.getItem('userId')
            if (userId) {
                // pequeño delay para que el plan context cargue
                setTimeout(() => handleCheckout(planFromUrl), 800)
            }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const handleCheckout = async (planId: string) => {
        const userId = localStorage.getItem('userId')
        if (!userId) { window.location.href = '/auth/register?plan=' + planId; return }

        setLoading(planId)
        try {
            const { checkoutUrl } = await createCheckout(planId, annual ? 'annual' : 'monthly')
            window.location.href = checkoutUrl
        } catch {
            alert('Error al procesar el pago. Intenta de nuevo.')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-[#030712] text-white">
            <style>{`
                .shimmer{background:linear-gradient(90deg,#10b981,#34d399,#10b981);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
                @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
                .glass{background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08)}
            `}</style>

            <nav className="glass border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <Link href="/" className="flex items-center gap-2">
                    <Logo width={36} height={36} />
                    <span className="text-xl font-black shimmer">FINNOVA</span>
                </Link>
                <div className="flex gap-3">
                    <Link href="/auth/login" className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Iniciar Sesión</Link>
                    <Link href="/auth/register" className="px-4 py-2 text-sm font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                        Comenzar Gratis
                    </Link>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-4 py-20">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Precios</span>
                    <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4">
                        Simple y <span className="shimmer">transparente</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        Empieza gratis. Escala cuando lo necesites. Sin sorpresas.
                    </p>

                    {/* Toggle mensual/anual */}
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <span className={`text-sm ${!annual ? 'text-white font-semibold' : 'text-gray-500'}`}>Mensual</span>
                        <button onClick={() => setAnnual(!annual)}
                            className="relative w-12 h-6 rounded-full transition-colors"
                            style={{ background: annual ? '#10b981' : 'rgba(255,255,255,0.1)' }}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${annual ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className={`text-sm ${annual ? 'text-white font-semibold' : 'text-gray-500'}`}>
                            Anual <span className="text-emerald-400 text-xs font-bold ml-1">-20%</span>
                        </span>
                    </div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    {plans.map(plan => {
                        const price = annual ? plan.price.annual : plan.price.monthly
                        const isCurrentPlan = currentPlan === plan.id
                        return (
                            <div key={plan.id}
                                className={`relative rounded-2xl p-7 flex flex-col transition-all ${plan.popular ? 'ring-2 ring-emerald-500 scale-105' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${plan.popular ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}` }}>

                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                                        style={{ background: plan.popular ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.4)' }}>
                                        {plan.badge}
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
                                    <p className="text-gray-500 text-sm">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    {price === 0 ? (
                                        <div className="text-4xl font-black text-white">Gratis</div>
                                    ) : (
                                        <div>
                                            <span className="text-4xl font-black text-white">{formatCOP(price)}</span>
                                            <span className="text-gray-500 text-sm">/{annual ? 'año' : 'mes'}</span>
                                            {annual && (
                                                <div className="text-xs text-emerald-400 mt-1">
                                                    Ahorras {formatCOP(plan.price.monthly * 12 - price)}/año
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <ul className="space-y-2.5 mb-8 flex-1">
                                    {plan.features.map(f => (
                                        <li key={f.label} className={`text-sm flex items-center gap-2 ${f.included ? 'text-gray-300' : 'text-gray-600'}`}>
                                            <span>{f.included ? '✅' : '❌'}</span>
                                            {f.label}
                                        </li>
                                    ))}
                                </ul>

                                {isCurrentPlan ? (
                                    <div className="block text-center py-3 rounded-xl font-bold text-sm bg-emerald-900/40 text-emerald-400 border border-emerald-500/30">
                                        ✓ Plan actual
                                    </div>
                                ) : plan.id === 'free' ? (
                                    <Link href="/auth/register"
                                        className="block text-center py-3 rounded-xl font-bold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-all">
                                        Comenzar Gratis
                                    </Link>
                                ) : (plan as any).comingSoon ? (
                                    <div className="block text-center py-3 rounded-xl font-bold text-sm bg-violet-700/30 text-violet-400 cursor-not-allowed">
                                        Próximamente
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleCheckout(plan.id)}
                                        disabled={loading === plan.id}
                                        className="block w-full text-center py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                        {loading === plan.id ? '⏳ Procesando...' : `Empezar ${plan.name}`}
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Garantía */}
                <div className="text-center mb-16 p-8 rounded-2xl" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div className="text-4xl mb-3">🛡️</div>
                    <h3 className="text-xl font-bold text-white mb-2">Garantía de 7 días</h3>
                    <p className="text-gray-400 max-w-md mx-auto text-sm">
                        Si no estás satisfecho en los primeros 7 días, te devolvemos el dinero sin preguntas.
                    </p>
                </div>

                {/* FAQ */}
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black text-center mb-8">Preguntas frecuentes</h2>
                    <div className="space-y-4">
                        {[
                            { q: '¿Cómo funciona el pago?', a: 'Procesamos pagos con Wompi — acepta tarjetas Visa/Mastercard, PSE y Nequi. 100% seguro.' },
                            { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes subir de plan inmediatamente. Al bajar, el plan actual sigue activo hasta que expire.' },
                            { q: '¿Mis datos están seguros?', a: 'Absolutamente. Encriptación de extremo a extremo. Nunca compartimos tus datos financieros.' },
                            { q: '¿Hay período de prueba?', a: 'El plan Gratis es permanente. Prueba las funciones básicas sin límite de tiempo.' },
                            { q: '¿Qué pasa si cancelo?', a: 'Sigues teniendo acceso hasta el fin del período pagado. No hay cobros adicionales.' },
                        ].map(faq => (
                            <div key={faq.q} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="font-semibold text-white mb-2">{faq.q}</div>
                                <div className="text-gray-400 text-sm">{faq.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>}>
            <PricingContent />
        </Suspense>
    )
}
