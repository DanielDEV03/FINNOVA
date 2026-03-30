'use client'

import Link from 'next/link'
import { useState } from 'react'
import Logo from './Logo'
import { logout } from '@/lib/auth'
import ThemeToggle from './ThemeToggle'
import { usePlan } from '@/hooks/usePlan'
import { getPlanLabel } from '@/lib/subscription'

// Todos los links — mismo orden en desktop y móvil
const NAV_LINKS = [
    { href: '/dashboard', label: 'Dashboard', id: undefined },
    { href: '/transactions', label: 'Transacciones', id: 'nav-transactions' },
    { href: '/budgets', label: 'Presupuestos', id: undefined },
    { href: '/analysis', label: 'Análisis', id: 'nav-analysis' },
    { href: '/predictions', label: 'Predicciones IA', id: 'nav-predictions' },
    { href: '/debts', label: 'Deudas', id: undefined },
    { href: '/profile', label: 'Mi Perfil', id: undefined },
]

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const isAdmin = typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin'
    const { plan, isPro, isBusiness } = usePlan()

    const navLink = "text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition text-sm whitespace-nowrap"
    const mobileLink = "px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition"

    return (
        <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm dark:shadow-black/30 sticky top-0 z-50 border-b border-gray-200 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-4">
                        <Logo width={36} height={36} />
                        <span className="text-lg font-black bg-gradient-to-r from-gray-900 via-emerald-600 to-gray-900 dark:from-white dark:via-emerald-400 dark:to-white bg-clip-text text-transparent tracking-tight">
                            FINNOVA
                        </span>
                    </Link>

                    {/* Desktop — todos los links */}
                    <div className="hidden lg:flex items-center gap-3 flex-1 overflow-x-auto">
                        {NAV_LINKS.map(l => (
                            <Link key={l.href} href={l.href} id={l.id} className={navLink}>{l.label}</Link>
                        ))}

                        {(isPro || isBusiness) && (
                            <Link href="/business" className="text-violet-400 hover:text-violet-300 font-bold text-sm whitespace-nowrap transition">
                                🚀 Business
                            </Link>
                        )}
                        {isAdmin && (
                            <Link href="/admin" className="text-red-500 hover:text-red-400 font-bold text-sm whitespace-nowrap transition">
                                🛡️ Admin
                            </Link>
                        )}
                    </div>

                    {/* Desktop — acciones derecha */}
                    <div className="hidden lg:flex items-center gap-2 ml-3 shrink-0">
                        <Link href="/profile" className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all hover:scale-105 ${isPro || isBusiness
                            ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                            : 'text-gray-500 border-gray-600/40 bg-gray-800/40 hover:text-emerald-400'
                            }`}>
                            {getPlanLabel(plan)}
                        </Link>
                        <ThemeToggle />
                        <button onClick={logout} className="text-sm text-red-500 hover:text-red-400 font-semibold transition whitespace-nowrap">
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

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden py-3 border-t border-gray-200 dark:border-white/5">
                        <div className="flex flex-col space-y-0.5">
                            {/* Plan badge */}
                            <Link href="/profile" onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-2.5 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 mb-1">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Mi plan</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPro || isBusiness
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-gray-700/50 text-gray-400'
                                    }`}>{getPlanLabel(plan)}</span>
                            </Link>

                            {NAV_LINKS.map(item => (
                                <Link key={item.href} href={item.href} className={mobileLink} onClick={() => setMobileMenuOpen(false)}>
                                    {item.label}
                                </Link>
                            ))}

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
