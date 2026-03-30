'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
    { href: '/dashboard', icon: '🏠', label: 'Inicio' },
    { href: '/transactions', icon: '💳', label: 'Transacciones' },
    { href: '/budgets', icon: '🎯', label: 'Presupuestos' },
    { href: '/analysis', icon: '📊', label: 'Análisis' },
    { href: '/predictions', icon: '🔮', label: 'IA' },
    { href: '/debts', icon: '💰', label: 'Deudas' },
]

export default function MobileNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-white/5 safe-area-pb">
            <div className="flex items-center justify-around px-1 py-2">
                {NAV_ITEMS.map(item => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link key={item.href} href={item.href}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-0 flex-1 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                            <span className={`text-xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
                            <span className={`text-[10px] font-semibold truncate w-full text-center leading-tight ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                                {item.label}
                            </span>
                            {active && <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
