'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from './Navbar'
import MobileNav from './mobile/MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    useEffect(() => {
        const userId = localStorage.getItem('userId')
        if (!userId) {
            router.push('/')
        }
    }, [router])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Navbar />
            <main className="pb-20 lg:pb-0">
                {children}
            </main>
            <MobileNav />
        </div>
    )
}
