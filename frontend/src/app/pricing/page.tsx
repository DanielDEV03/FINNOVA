'use client'

import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'

const plans = [
    {
        name: 'Gratis',
        price: 0,
        period: 'siempre',
        description: 'Para empezar a controlar tus finanzas',
        color: 'from-gray-700 to-gray-800',
        border: 'border-gray-700',
        badge: null,
        features: [
            '✅ Dashboard financiero',
            '✅ Hasta 50 transacciones/mes',
            '✅ Predicciones básicas IA',
            '✅ 1 simulación de escenarios',
            '✅ Alertas básicas',
            '❌ Exportar PDF',
            '❌ Análisis avanzado',
            '❌ Notificaciones push',
            '❌ Soporte prioritario',
        ],
        cta: 'Comenzar Gratis',
        ctaHref: '/auth/register',
        ctaStyle: 'bg-gray-700 hover:bg-gray-600 text-white',
    },
    {
        name: 'Pro',
        price: 29900,
        period: 'mes',
        description: 'Para quienes toman sus finanzas en serio',
        color: 'from-emerald-600 to-teal-600',
        border: 'border-emerald-500',
        badge: '⭐ Más popular',
        features: [
            '✅ Todo lo del plan Gratis',
            '✅ Transacciones ilimitadas',
            '✅ Predicciones IA avanzadas',
            '✅ Simulaciones ilimitadas',
            '✅ Exportar reportes PDF',
            '✅ Análisis detallado',
            '✅ Notificaciones push',
            '✅ Alertas inteligentes',
            '❌ Soporte prioritario',
        ],
        cta: 'Empezar Pro',
        ctaHref: '/auth/register?plan=pro',
        ctaStyle: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white',
    },
    {
        name: 'Business',
        price: 89900,
        period: 'mes',
        description: 'Para emprendedores y equipos',
        color: 'from-violet-600 to-purple-700',
        border: 'border-violet-500',
        badge: '🚀 Próximamente',
        features: [
            '✅ Todo lo del plan Pro',
            '✅ Múltiples cuentas',
            '✅ Panel de equipo',
            '✅ API access',
            '✅ Reportes personalizados',
            '✅ Integración contable',
            '✅ Soporte prioritario 24/7',
            '✅ Onboarding personalizado',
            '✅ SLA garantizado',
        ],
        cta: 'Próximamente',
        ctaHref: '#',
        ctaStyle: 'bg-violet-700/50 text-violet-300 cursor-not-allowed',
    },
]

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function PricingPage() {
    const [annual, setAnnual] = useState(false)

    return (
        <div className="min-h-screen bg-[#030712] text-white">
            <style>{`
                @keyframes glow { 0%,100%{opacity:.4}50%{opacity:.9} }
                .shimmer { background:linear-gradient(90deg,#10b981,#34d399,#10b981);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite; }
                @keyframes shimmer { 0%{background-position:-200% center}100%{background-position:200% center} }
                .glass { background:rgba(255,255,255,0.04); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); }
            `}</style>

            {/* Navbar simple */}
            <nav className="glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
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

                    {/* Toggle anual/mensual */}
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <span className={`text-sm ${!annual ? 'text-white font-semibold' : 'text-gray-500'}`}>Mensual</span>
                        <button onClick={() => setAnnual(!annual)}
                            className="relative w-12 h-6 rounded-full transition-colors"
                            style={{ background: annual ? '#10b981' : 'rgba(255,255,255,0.1)' }}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${annual ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className={`text-sm ${annual ? 'text-white font-semibold' : 'text-gray-500'}`}>
                            Anual <span className="text-emerald-400 text-xs font-bold">-20%</span>
                        </span>
                    </div>
                </div>

                {/* Cards de planes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    {plans.map((plan, i) => {
                        const price = annual && plan.price > 0 ? Math.floor(plan.price * 0.8) : plan.price
                        const isPopular = plan.badge === '⭐ Más popular'
                        return (
                            <div key={plan.name} className={`relative rounded-2xl p-7 flex flex-col ${isPopular ? 'ring-2 ring-emerald-500 scale-105' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isPopular ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}` }}>

                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                                        style={{ background: isPopular ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.4)' }}>
                                        {plan.badge}
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
                                    <p className="text-gray-500 text-sm">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    {plan.price === 0 ? (
                                        <div className="text-4xl font-black text-white">Gratis</div>
                                    ) : (
                                        <div>
                                            <span className="text-4xl font-black text-white">{formatCOP(price)}</span>
                                            <span className="text-gray-500 text-sm">/{plan.period}</span>
                                            {annual && plan.price > 0 && (
                                                <div className="text-xs text-emerald-400 mt-1">Ahorras {formatCOP(plan.price * 12 - price * 12)}/año</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <ul className="space-y-2.5 mb-8 flex-1">
                                    {plan.features.map(f => (
                                        <li key={f} className={`text-sm flex items-start gap-2 ${f.startsWith('❌') ? 'text-gray-600' : 'text-gray-300'}`}>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <Link href={plan.ctaHref}
                                    className={`block text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}>
                                    {plan.cta}
                                </Link>
                            </div>
                        )
                    })}
                </div>

                {/* FAQ */}
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black text-center mb-8">Preguntas frecuentes</h2>
                    <div className="space-y-4">
                        {[
                            { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí, puedes subir o bajar de plan cuando quieras. Los cambios aplican inmediatamente.' },
                            { q: '¿Mis datos están seguros?', a: 'Absolutamente. Usamos encriptación de extremo a extremo y nunca compartimos tus datos financieros.' },
                            { q: '¿Hay período de prueba para el plan Pro?', a: 'El plan Gratis es permanente. Puedes probar todas las funciones básicas sin límite de tiempo.' },
                            { q: '¿Cómo funciona el pago?', a: 'Aceptamos tarjetas de crédito/débito y PSE. Los pagos son procesados de forma segura.' },
                        ].map(faq => (
                            <div key={faq.q} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="font-semibold text-white mb-2">{faq.q}</div>
                                <div className="text-gray-400 text-sm">{faq.a}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA final */}
                <div className="text-center mt-20">
                    <p className="text-gray-400 mb-4">¿Tienes preguntas? Escríbenos</p>
                    <a href="mailto:ctslabscartagena@gmail.com" className="text-emerald-400 hover:text-emerald-300 font-semibold transition">
                        ctslabscartagena@gmail.com
                    </a>
                </div>
            </div>
        </div>
    )
}
