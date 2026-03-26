'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

// Contador animado
function AnimatedCounter({ end, prefix = '', suffix = '', duration = 2000 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)
    const started = useRef(false)

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true
                const start = Date.now()
                const tick = () => {
                    const elapsed = Date.now() - start
                    const progress = Math.min(elapsed / duration, 1)
                    const eased = 1 - Math.pow(1 - progress, 3)
                    setCount(Math.floor(eased * end))
                    if (progress < 1) requestAnimationFrame(tick)
                }
                requestAnimationFrame(tick)
            }
        }, { threshold: 0.3 })
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [end, duration])

    return <span ref={ref}>{prefix}{count.toLocaleString('es-CO')}{suffix}</span>
}

// Partícula flotante
function Particle({ style }: { style: React.CSSProperties }) {
    return <div className="absolute rounded-full pointer-events-none" style={style} />
}

export default function LandingPage() {
    const router = useRouter()
    const [scrolled, setScrolled] = useState(false)
    const [activeFeature, setActiveFeature] = useState(0)
    const [mobileMenu, setMobileMenu] = useState(false)
    const [liveStats, setLiveStats] = useState({ totalUsers: 0, totalTransactions: 0 })

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        const interval = setInterval(() => setActiveFeature(f => (f + 1) % 6), 3000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        fetch(`${apiUrl}/admin/public-stats`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setLiveStats(d) })
            .catch(() => { }) // silencioso — si falla muestra 0
    }, [])

    const particles = Array.from({ length: 20 }, (_, i) => ({
        width: `${Math.random() * 6 + 2}px`,
        height: `${Math.random() * 6 + 2}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        background: i % 3 === 0 ? 'rgba(16,185,129,0.4)' : i % 3 === 1 ? 'rgba(52,211,153,0.3)' : 'rgba(110,231,183,0.2)',
        animation: `float ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite alternate`,
    }))

    const features = [
        { icon: '🧠', title: 'IA Predictiva', desc: 'Predicciones inteligentes de tu futuro financiero basadas en tus patrones de gasto', color: 'from-violet-500 to-purple-600' },
        { icon: '📊', title: 'Análisis Automático', desc: 'Identifica automáticamente tus hábitos de gasto y recibe recomendaciones personalizadas', color: 'from-blue-500 to-cyan-600' },
        { icon: '🎯', title: 'Simulador de Escenarios', desc: 'Visualiza diferentes escenarios financieros antes de tomar decisiones importantes', color: 'from-emerald-500 to-teal-600' },
        { icon: '💳', title: 'Gestión de Deudas', desc: 'Controla tus deudas, calcula intereses y recibe planes de pago optimizados', color: 'from-orange-500 to-red-500' },
        { icon: '🔔', title: 'Alertas Inteligentes', desc: 'Recibe notificaciones automáticas sobre gastos elevados y riesgos financieros', color: 'from-yellow-500 to-orange-500' },
        { icon: '📈', title: 'Reportes Visuales', desc: 'Gráficas interactivas y reportes detallados de tu situación financiera', color: 'from-pink-500 to-rose-600' },
    ]

    const testimonials = [
        { name: 'María González', role: 'Profesional Independiente', initials: 'MG', text: 'Gracias a FINNOVA logré reducir mis gastos en 30% y pagar mi tarjeta de crédito en 6 meses.', color: 'from-emerald-400 to-teal-500' },
        { name: 'Carlos Rodríguez', role: 'Emprendedor', initials: 'CR', text: 'Las predicciones de IA me ayudaron a planificar mejor mi flujo de caja. Increíble herramienta.', color: 'from-blue-400 to-indigo-500' },
        { name: 'Ana Martínez', role: 'Estudiante', initials: 'AM', text: 'Finalmente entiendo a dónde va mi dinero. La app es súper fácil de usar y me ha ayudado a ahorrar.', color: 'from-violet-400 to-purple-500' },
    ]

    const stats = [
        { value: liveStats.totalUsers, suffix: '', label: 'Usuarios registrados' },
        { value: liveStats.totalTransactions, suffix: '', label: 'Transacciones registradas' },
        { value: 3, suffix: ' servicios', label: 'IA + Backend + DB' },
        { value: 2026, suffix: '', label: 'Año de lanzamiento' },
    ]

    return (
        <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
            <style>{`
        @keyframes float { from { transform: translateY(0px) rotate(0deg); } to { transform: translateY(-20px) rotate(180deg); } }
        @keyframes glow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes orbit { from { transform: rotate(0deg) translateX(120px) rotate(0deg); } to { transform: rotate(360deg) translateX(120px) rotate(-360deg); } }
        @keyframes scanline { 0% { top: -10%; } 100% { top: 110%; } }
        .animate-slide-up { animation: slideUp 0.8s ease forwards; }
        .animate-fade-in { animation: fadeIn 1s ease forwards; }
        .shimmer-text { background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s linear infinite; }
        .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; }
        .glass-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(16,185,129,0.4); transform: translateY(-4px); box-shadow: 0 20px 60px rgba(16,185,129,0.15); }
        .glow-green { box-shadow: 0 0 40px rgba(16,185,129,0.3); }
        .grid-bg { background-image: linear-gradient(rgba(16,185,129,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.05) 1px, transparent 1px); background-size: 60px 60px; }
      `}</style>

            {/* ── NAVBAR ── */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'glass shadow-lg shadow-black/20' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 md:h-20">
                        <div className="flex items-center gap-2">
                            <Logo width={44} height={44} priority />
                            <span className="text-2xl md:text-3xl font-black tracking-tight shimmer-text">FINNOVA</span>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                            <a href="#features" className="text-gray-400 hover:text-emerald-400 text-sm font-medium transition-colors">Características</a>
                            <a href="#how" className="text-gray-400 hover:text-emerald-400 text-sm font-medium transition-colors">Cómo funciona</a>
                            <a href="#testimonials" className="text-gray-400 hover:text-emerald-400 text-sm font-medium transition-colors">Testimonios</a>
                            <Link href="/auth/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Iniciar Sesión</Link>
                            <button onClick={() => router.push('/auth/register')}
                                className="relative px-5 py-2.5 rounded-xl text-sm font-bold overflow-hidden group"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <span className="relative z-10">Comenzar Gratis</span>
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                            </button>
                        </div>
                        <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-gray-400">
                            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileMenu ? 'rotate-45 translate-y-1.5' : ''}`} />
                            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileMenu ? 'opacity-0' : ''}`} />
                            <div className={`w-5 h-0.5 bg-current transition-all ${mobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`} />
                        </button>
                    </div>
                    {mobileMenu && (
                        <div className="md:hidden glass rounded-2xl mb-4 p-4 space-y-3">
                            {['#features', '#how', '#testimonials'].map((href, i) => (
                                <a key={href} href={href} onClick={() => setMobileMenu(false)}
                                    className="block text-gray-300 hover:text-emerald-400 py-2 text-sm font-medium transition-colors">
                                    {['Características', 'Cómo funciona', 'Testimonios'][i]}
                                </a>
                            ))}
                            <Link href="/auth/login" className="block text-gray-300 py-2 text-sm">Iniciar Sesión</Link>
                            <button onClick={() => router.push('/auth/register')}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                Comenzar Gratis
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="relative min-h-screen flex items-center justify-center grid-bg overflow-hidden pt-20">
                {/* Partículas */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {particles.map((p, i) => <Particle key={i} style={p} />)}
                </div>

                {/* Orbes de fondo */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', animation: 'glow 4s ease-in-out infinite' }} />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', animation: 'glow 6s ease-in-out 2s infinite' }} />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fade-in"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'glow 1.5s ease-in-out infinite' }} />
                        <span className="text-emerald-400 text-sm font-semibold">Powered by Artificial Intelligence</span>
                    </div>

                    {/* Título */}
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-none animate-slide-up">
                        <span className="text-white">Tu Copiloto</span>
                        <br />
                        <span className="shimmer-text">Financiero</span>
                        <br />
                        <span className="text-white">Impulsado por </span>
                        <span className="shimmer-text">IA</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        Toma el control de tus finanzas con inteligencia artificial. Predicciones precisas,
                        análisis automático y recomendaciones personalizadas para alcanzar tus metas.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <button onClick={() => router.push('/auth/register')}
                            className="relative px-8 py-4 rounded-2xl font-bold text-lg overflow-hidden group glow-green"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <span className="relative z-10">Comenzar Gratis →</span>
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                            <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', filter: 'blur(8px)', zIndex: -1 }} />
                        </button>
                        <a href="#features"
                            className="px-8 py-4 rounded-2xl font-semibold text-gray-300 hover:text-white transition-all duration-300 glass hover:border-emerald-500/40">
                            Ver Características
                        </a>
                    </div>

                    <p className="text-xs text-gray-600 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                        No requiere tarjeta de crédito • 100% Seguro • Hecho en Colombia 🇨🇴
                    </p>

                    {/* Dashboard preview */}
                    <div className="mt-16 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                        <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden"
                            style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 80px rgba(16,185,129,0.15), 0 40px 80px rgba(0,0,0,0.6)' }}>

                            {/* Barra de título */}
                            <div className="flex items-center gap-2 px-4 py-3"
                                style={{ background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                                <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                                <div className="flex-1 mx-3 h-6 rounded-md flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span className="text-xs text-gray-500">finnova.app/dashboard</span>
                                </div>
                            </div>

                            {/* Contenido del dashboard */}
                            <div className="p-5 md:p-7">
                                {/* Cards principales */}
                                <div className="grid grid-cols-3 gap-3 md:gap-4 mb-5">
                                    {[
                                        {
                                            label: 'Balance Total',
                                            value: '$8,450,000',
                                            change: '↑ +12% este mes',
                                            icon: '💰',
                                            bg: 'rgba(16,185,129,0.12)',
                                            border: 'rgba(16,185,129,0.25)',
                                            changeColor: '#10b981'
                                        },
                                        {
                                            label: 'Predicción IA',
                                            value: '$9,200,000',
                                            change: 'En 3 meses',
                                            icon: '🔮',
                                            bg: 'rgba(139,92,246,0.12)',
                                            border: 'rgba(139,92,246,0.25)',
                                            changeColor: '#a78bfa'
                                        },
                                        {
                                            label: 'Ahorro Sugerido',
                                            value: '$750,000',
                                            change: 'Por mes',
                                            icon: '🎯',
                                            bg: 'rgba(59,130,246,0.12)',
                                            border: 'rgba(59,130,246,0.2)',
                                            changeColor: '#60a5fa'
                                        },
                                    ].map(card => (
                                        <div key={card.label} className="rounded-xl p-4 md:p-5 flex flex-col"
                                            style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                                            <div className="text-2xl md:text-3xl mb-3">{card.icon}</div>
                                            <div className="text-xs text-gray-400 mb-1.5">{card.label}</div>
                                            <div className="text-base md:text-xl font-black text-white leading-tight">{card.value}</div>
                                            <div className="text-xs mt-1.5 font-medium" style={{ color: card.changeColor }}>{card.change}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Gráfica de barras */}
                                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-gray-500 font-medium">Actividad financiera</span>
                                        <span className="text-xs text-emerald-400">↑ Tendencia positiva</span>
                                    </div>
                                    <div className="flex items-end gap-1 h-14">
                                        {[30, 50, 38, 65, 45, 72, 55, 80, 62, 88, 70, 100].map((h, i) => (
                                            <div key={i} className="flex-1 rounded-sm"
                                                style={{
                                                    height: `${h}%`,
                                                    background: i === 11
                                                        ? '#10b981'
                                                        : `rgba(16,185,129,${0.15 + (i / 12) * 0.45})`,
                                                    transition: 'height 0.5s ease'
                                                }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section className="py-16 border-y" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(16,185,129,0.03)' }}>
                <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {stats.map(s => (
                        <div key={s.label}>
                            <div className="text-3xl md:text-4xl font-black shimmer-text">
                                <AnimatedCounter end={s.value} suffix={s.suffix} />
                            </div>
                            <div className="text-gray-500 text-sm mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" className="py-24 grid-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Características</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">Características Poderosas</h2>
                        <p className="text-gray-400 text-lg max-w-xl mx-auto">Todo lo que necesitas para dominar tus finanzas personales</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((f, i) => (
                            <div key={i}
                                className={`glass-card rounded-2xl p-7 cursor-pointer ${activeFeature === i ? 'border-emerald-500/40 bg-emerald-500/5' : ''}`}
                                onMouseEnter={() => setActiveFeature(i)}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 bg-gradient-to-br ${f.color}`}>
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                                {activeFeature === i && (
                                    <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'glow 1s infinite' }} />
                                        Activo
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how" className="py-24" style={{ background: 'linear-gradient(180deg, #030712 0%, #0a1628 50%, #030712 100%)' }}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Proceso</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">¿Cómo Funciona?</h2>
                        <p className="text-gray-400 text-lg">Comienza en 3 simples pasos</p>
                    </div>

                    <div className="relative">
                        {/* Línea conectora */}
                        <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)' }} />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { n: '01', title: 'Crea tu Cuenta', desc: 'Regístrate gratis en menos de 1 minuto. No necesitas tarjeta de crédito.', icon: '🚀' },
                                { n: '02', title: 'Registra tus Transacciones', desc: 'Agrega tus ingresos, gastos y deudas. La IA comenzará a aprender tus patrones.', icon: '📝' },
                                { n: '03', title: 'Recibe Insights', desc: 'Obtén predicciones, alertas y recomendaciones personalizadas automáticamente.', icon: '✨' },
                            ].map((step, i) => (
                                <div key={i} className="text-center group">
                                    <div className="relative inline-flex items-center justify-center mb-6">
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl relative z-10"
                                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}>
                                            {step.icon}
                                        </div>
                                        <div className="absolute inset-0 rounded-full"
                                            style={{ background: 'rgba(16,185,129,0.2)', animation: 'pulse-ring 2s ease-out infinite', animationDelay: `${i * 0.5}s` }} />
                                    </div>
                                    <div className="text-emerald-400 text-xs font-bold tracking-widest mb-2">{step.n}</div>
                                    <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section id="testimonials" className="py-24 grid-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Testimonios</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">Lo Que Dicen Nuestros Usuarios</h2>
                        <p className="text-gray-400 text-lg">Miles de personas ya están mejorando sus finanzas</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {testimonials.map((t, i) => (
                            <div key={i} className="glass-card rounded-2xl p-7 group">
                                <div className="flex gap-1 mb-5">
                                    {[...Array(5)].map((_, j) => (
                                        <svg key={j} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${t.color}`}>
                                        {t.initials}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{t.name}</div>
                                        <div className="text-gray-500 text-xs">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0"
                    style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.15) 0%, transparent 70%)' }} />
                <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                        ¿Listo para Transformar<br />
                        <span className="shimmer-text">tus Finanzas?</span>
                    </h2>
                    <p className="text-gray-400 text-lg mb-10">
                        Únete a miles de usuarios que ya están tomando mejores decisiones financieras con IA
                    </p>
                    <button onClick={() => router.push('/auth/register')}
                        className="relative px-10 py-5 rounded-2xl font-black text-xl overflow-hidden group"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 60px rgba(16,185,129,0.4)' }}>
                        <span className="relative z-10">Comenzar Gratis Ahora →</span>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                    </button>
                    <p className="text-gray-600 text-sm mt-5">Sin compromisos • Cancela cuando quieras</p>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t py-12" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#020810' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <Logo width={36} height={36} />
                                <span className="text-xl font-black shimmer-text">FINNOVA</span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed mb-3">Tu copiloto financiero impulsado por inteligencia artificial.</p>
                            <a href="mailto:ctslabscartagena@gmail.com"
                                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
                                <span>✉️</span> ctslabscartagena@gmail.com
                            </a>
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm mb-4">Producto</h4>
                            <ul className="space-y-2">
                                <li><a href="#features" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Características</a></li>
                                <li><a href="#how" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Cómo funciona</a></li>
                                <li><a href="#testimonials" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Testimonios</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm mb-4">Empresa</h4>
                            <ul className="space-y-2">
                                <li><span className="text-gray-500 text-sm">CTS Labs Cartagena</span></li>
                                <li>
                                    <a href="mailto:ctslabscartagena@gmail.com"
                                        className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">
                                        Contacto
                                    </a>
                                </li>
                                <li>
                                    <a href="mailto:ctslabscartagena@gmail.com"
                                        className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">
                                        Soporte
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm mb-4">Legal</h4>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Privacidad</a></li>
                                <li><a href="#" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Términos</a></li>
                                <li><a href="#" className="text-gray-500 hover:text-emerald-400 text-sm transition-colors">Seguridad</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-gray-600 text-sm">© 2026 FINNOVA by CTS Labs Cartagena. Todos los derechos reservados. Hecho con pasión en Colombia 🇨🇴</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'glow 1.5s infinite' }} />
                            <span className="text-gray-600 text-xs">Todos los sistemas operativos</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
