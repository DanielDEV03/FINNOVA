'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'
import Logo from '@/components/Logo'

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading')
    const [plan, setPlan] = useState('')

    useEffect(() => {
        const txId = searchParams.get('id') // Wompi devuelve ?id=<transaction_id>
        if (!txId) { setStatus('failed'); return }

        // Buscar la referencia en nuestras suscripciones pendientes y verificar
        verifyPayment(txId)
    }, [])

    const verifyPayment = async (txId: string) => {
        try {
            // Primero obtenemos la referencia desde el id de transacción de Wompi
            // Wompi redirige con ?id=<transaction_id>, buscamos por ese id
            const userId = localStorage.getItem('userId')
            if (!userId) { router.push('/auth/login'); return }

            // Consultar directamente a Wompi para obtener la referencia
            const wompiEnv = process.env.NEXT_PUBLIC_WOMPI_ENV === 'production'
                ? 'production' : 'sandbox'
            const wompiBase = wompiEnv === 'production'
                ? 'https://production.wompi.co/v1'
                : 'https://sandbox.wompi.co/v1'

            const txRes = await fetch(`${wompiBase}/transactions/${txId}`)
            if (!txRes.ok) { setStatus('pending'); return }

            const txData = await txRes.json()
            const reference = txData?.data?.reference
            const txStatus = txData?.data?.status

            if (!reference) { setStatus('pending'); return }

            // Verificar en nuestro backend (activa el plan si está aprobado)
            const verifyRes = await api.get(`/subscriptions/verify/${reference}`)
            const result = verifyRes.data

            if (result.status === 'active' || txStatus === 'APPROVED') {
                setPlan(result.plan || '')
                setStatus('success')
                // Actualizar el plan en localStorage para que el contexto lo recargue
                localStorage.setItem('planRefresh', Date.now().toString())
                setTimeout(() => router.push('/dashboard'), 3000)
            } else if (txStatus === 'PENDING') {
                setStatus('pending')
            } else {
                setStatus('failed')
            }
        } catch {
            setStatus('pending') // Si falla la verificación, mostrar pending (el webhook lo activará)
        }
    }

    const planLabel: Record<string, string> = { pro: 'Pro ⭐', business: 'Business 🚀' }

    return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
            <style>{`
                @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
                .shimmer{background:linear-gradient(90deg,#10b981,#34d399,#10b981);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
                @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
            `}</style>

            <div className="text-center max-w-md w-full">
                <Link href="/" className="inline-flex items-center gap-2 mb-10 justify-center">
                    <Logo width={40} height={40} />
                    <span className="text-2xl font-black shimmer">FINNOVA</span>
                </Link>

                {status === 'loading' && (
                    <div>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-6" />
                        <p className="text-white text-xl font-bold mb-2">Verificando tu pago...</p>
                        <p className="text-gray-500 text-sm">Esto toma unos segundos</p>
                    </div>
                )}

                {status === 'success' && (
                    <div>
                        <div className="text-7xl mb-6" style={{ animation: 'bounce 0.6s ease' }}>🎉</div>
                        <h1 className="text-3xl font-black text-white mb-3">¡Pago exitoso!</h1>
                        <p className="text-emerald-400 text-lg font-bold mb-2">
                            Plan {planLabel[plan] || plan} activado
                        </p>
                        <p className="text-gray-400 text-sm mb-8">
                            Ya tienes acceso a todas las funciones premium. Redirigiendo al dashboard...
                        </p>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-6">
                            <div className="h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ width: '100%' }} />
                        </div>
                        <Link href="/dashboard"
                            className="inline-block px-8 py-3 rounded-xl font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            Ir al Dashboard →
                        </Link>
                    </div>
                )}

                {status === 'pending' && (
                    <div>
                        <div className="text-7xl mb-6">⏳</div>
                        <h1 className="text-3xl font-black text-white mb-3">Pago en proceso</h1>
                        <p className="text-yellow-400 text-base mb-4">
                            Tu pago está siendo procesado. Te notificaremos cuando se confirme.
                        </p>
                        <p className="text-gray-500 text-sm mb-8">
                            Esto puede tomar unos minutos. Tu plan se activará automáticamente.
                        </p>
                        <Link href="/dashboard"
                            className="inline-block px-8 py-3 rounded-xl font-bold text-white bg-gray-700 hover:bg-gray-600 transition">
                            Volver al Dashboard
                        </Link>
                    </div>
                )}

                {status === 'failed' && (
                    <div>
                        <div className="text-7xl mb-6">❌</div>
                        <h1 className="text-3xl font-black text-white mb-3">Pago no completado</h1>
                        <p className="text-red-400 text-base mb-4">
                            El pago no fue procesado. No se realizó ningún cobro.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link href="/pricing"
                                className="px-6 py-3 rounded-xl font-bold text-white"
                                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                Intentar de nuevo
                            </Link>
                            <Link href="/dashboard"
                                className="px-6 py-3 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition">
                                Volver
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030712] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    )
}
