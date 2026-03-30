'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import Logo from './Logo'
import { logout } from '@/lib/auth'
import ThemeToggle from './ThemeToggle'
import { usePlan } from '@/hooks/usePlan'
import { getPlanLabel } from '@/lib/subscription'

// Links principales (siempre visibles en desktop)
const PRIMARY_LINKS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/transactions', label: 'Transacciones', id: 'nav-transactions' },
    { href: '/predictions', label: 'Predicciones', id: 'nav-predictions' },
    { href: '/analysis', label: 'Análisis', id: 'nav-analysis' },
]

// Links secundarios (en dropdown "Más" en desktop, directos en móvil)
const SECONDARY_LINKS = [
    { href: '/insights', label: '💡 Insights' },
    { href: '/debts', label: '💰 Deudas' },
    { href: '/profile', label: '👤 Mi Perfil' },
]

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [moreOpen, setMoreOpen] = useState(false)
    const moreRef = useRef<HTMLDivElement>(null)
    const isAdmin = typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin'
    const { plan, isPro, isBusiness } = usePlan()

    // Cerrar dropdown al click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const navLink = "text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition text-sm"
    const mobileLink = "px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition"

    return (
        <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm dark:shadow-black/30 sticky top-0 z-50 border-b border-gray-200 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 md:h-20">

                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                        <Logo width={40} height={40} className="md:w-[50px] md:h-[50px]" />
                        <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-gray-900 via-emerald-600 to-gray-900 dark:from-white dark:via-emerald-400 dark:to-white bg-clip-text text-transparent tracking-tight">
                            FINNOVA
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden lg:flex items-center gap-4">
                        {PRIMARY_LINKS.map(l => (
                            <Link key={l.href} href={l.href} id={(l as any).id} className={navLink}>{l.label}</Link>
                        ))}

                        {/* TIME MACHINE */}
                        <Link href="/simulator" id="nav-simulator"
                            className="text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 bg-clip-text font-black text-sm">
                            ⏰ TIME MACHINE
                        </Link>

                        {/* Dropdown Más */}
                        <div className="relative" ref={moreRef}>
                            <button onClick={() => setMoreOpen(!moreOpen)}
                                className={`${navLink} flex items-center gap-1`}>
                                Más
                                <svg className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {moreOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-white/5 py-1 z-50">
                                    {SECONDARY_LINKS.map(l => (
                                        <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)}
                                            className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                                            {l.label}
                                        </Link>
                                    ))}
                                    {(isPro || isBusiness) && (
                                        <Link href="/business" onClick={() => setMoreOpen(false)}
                                            className="block px-4 py-2.5 text-sm text-violet-500 font-bold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
                                            🚀 Business
                                        </Link>
                                    )}
                                    {isAdmin && (
                                        <Link href="/admin" onClick={() => setMoreOpen(false)}
                                            className="block px-4 py-2.5 text-sm text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                                            🛡️ Admin
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Plan badge */}
                        <Link href="/profile" className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all hover:scale-105 ${isPro || isBusiness
                                ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                                : 'text-gray-500 border-gray-600/40 bg-gray-800/40 hover:text-emerald-400'
                            }`}>
                            {getPlanLabel(plan)}
                        </Link>

                        <ThemeToggle />
                        <button onClick={logout} className="text-sm text-red-500 hover:text-red-400 font-semibold transition">
                            Salir
                        </button>
                    </div>

                    {/* Mobile toggle */}
                    <div className="lg:hidden flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Toggle menu">
                            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                            <div className={`w-5 h-0.5 bg-current transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Mobile menu — todos los links */}
                {mobileMenuOpen && (
                    <div className="lg:hidden py-3 border-t border-gray-200 dark:border-white/5">
                        <div className="flex flex-col space-y-0.5">
                            {/* Plan badge */}
                            <Link href="/profile" onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-2.5 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 mb-1">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Mi plan</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPro || isBusiness ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gray-700/50 text-gray-400'
                                    }`}>{getPlanLabel(plan)}</span>
                            </Link>

                            {/* Todos los links */}
                            {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map(item => (
                                <Link key={item.href} href={item.href} className={mobileLink} onClick={() => setMobileMenuOpen(false)}>
                                    {(item as any).label}
                                </Link>
                            ))}

                            <Link href="/simulator"
                                className="px-4 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300 font-bold rounded-lg transition"
                                onClick={() => setMobileMenuOpen(false)}>
                                ⏰ TIME MACHINE
                            </Link>

                            {(isPro || isBusiness) && (
                                <Link href="/business"
                                    className="px-4 py-2.5 text-violet-500 font-bold rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
                                    onClick={() => setMobileMenuOpen(false)}>
                                    🚀 Business
                                </Link>
                            )}

                            {isAdmin && (
                                <Link href="/admin"
                                    className="px-4 py-2.5 text-red-500 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    onClick={() => setMobileMenuOpen(false)}>
                                    🛡️ Admin
                                </Link>
                            )}

                            <button onClick={() => { logout(); setMobileMenuOpen(false) }}
                                className="px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-left font-semibold mt-1">
                                🚪 Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
