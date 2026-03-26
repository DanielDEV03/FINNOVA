'use client'

import Link from 'next/link'
import { useState } from 'react'
import Logo from './Logo'
import { logout } from '@/lib/auth'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const isAdmin = typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin'

    const navLink = "text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition text-sm"
    const mobileLink = "px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition"

    return (
        <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm dark:shadow-black/30 sticky top-0 z-50 border-b border-gray-200 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 md:h-20">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Logo width={40} height={40} className="md:w-[50px] md:h-[50px]" />
                        <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-gray-900 via-emerald-600 to-gray-900 dark:from-white dark:via-emerald-400 dark:to-white bg-clip-text text-transparent tracking-tight">
                            FINNOVA
                        </span>
                    </Link>

                    <div className="hidden lg:flex items-center gap-5">
                        <Link href="/dashboard" className={navLink}>Dashboard</Link>
                        <Link href="/transactions" className={navLink} id="nav-transactions">Transacciones</Link>
                        <Link href="/insights" className={navLink}>Insights</Link>
                        <Link href="/predictions" className={navLink} id="nav-predictions">Predicciones</Link>
                        <Link href="/analysis" className={navLink} id="nav-analysis">Análisis</Link>
                        <Link href="/simulator" className="text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 bg-clip-text font-black text-sm" id="nav-simulator">
                            ⏰ TIME MACHINE
                        </Link>
                        {isAdmin && (
                            <Link href="/admin" className="text-red-500 hover:text-red-400 font-bold text-sm transition">🛡️ Admin</Link>
                        )}
                        <ThemeToggle />
                        <button onClick={logout} className="text-sm text-red-500 hover:text-red-400 font-semibold transition">
                            Salir
                        </button>
                    </div>

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

                {mobileMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-gray-200 dark:border-white/5">
                        <div className="flex flex-col space-y-1">
                            {[
                                { href: '/dashboard', label: '📊 Dashboard' },
                                { href: '/transactions', label: '💳 Transacciones' },
                                { href: '/insights', label: '💡 Insights' },
                                { href: '/predictions', label: '🔮 Predicciones' },
                                { href: '/analysis', label: '📈 Análisis' },
                                { href: '/debts', label: '💰 Deudas' },
                            ].map(item => (
                                <Link key={item.href} href={item.href} className={mobileLink} onClick={() => setMobileMenuOpen(false)}>
                                    {item.label}
                                </Link>
                            ))}
                            <Link href="/simulator" className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300 font-bold rounded-lg transition" onClick={() => setMobileMenuOpen(false)}>
                                ⏰ TIME MACHINE
                            </Link>
                            {isAdmin && (
                                <Link href="/admin" className="px-4 py-2 text-red-500 font-bold rounded-lg" onClick={() => setMobileMenuOpen(false)}>🛡️ Admin</Link>
                            )}
                            <button onClick={() => { logout(); setMobileMenuOpen(false) }}
                                className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-left font-semibold">
                                🚪 Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
