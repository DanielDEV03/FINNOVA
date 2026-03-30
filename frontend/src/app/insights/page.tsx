'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Insights fue fusionado con Análisis
export default function InsightsRedirect() {
    const router = useRouter()
    useEffect(() => { router.replace('/analysis?tab=insights') }, [router])
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>
}
