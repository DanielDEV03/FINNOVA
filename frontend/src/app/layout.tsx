import type { Metadata } from 'next'
import './globals.css'
import ClientGamification from '@/components/gamification/ClientGamification'
import ThemeInit from '@/components/ThemeInit'

export const metadata: Metadata = {
    title: 'FINNOVA - Tu Copiloto Financiero',
    description: 'Tu copiloto financiero inteligente impulsado por IA',
    icons: {
        icon: '/favicon.svg',
        shortcut: '/favicon.svg',
        apple: '/favicon.svg',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className="dark">
            <head>
                <meta name="theme-color" content="#030712" />
                {/* manifest.json solo en producción con dominio propio */}
            </head>
            <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
                <ThemeInit />
                <ClientGamification>
                    {children}
                </ClientGamification>
            </body>
        </html>
    )
}
