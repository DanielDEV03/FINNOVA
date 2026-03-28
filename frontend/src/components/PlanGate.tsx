'use client'
import Link from 'next/link'

interface PlanGateProps {
    requiredPlan?: 'pro' | 'business'
    currentPlan: string
    feature: string
    children: React.ReactNode
}

export default function PlanGate({ requiredPlan = 'pro', currentPlan, feature, children }: PlanGateProps) {
    const hasAccess = requiredPlan === 'pro'
        ? currentPlan === 'pro' || currentPlan === 'business'
        : currentPlan === 'business'

    if (hasAccess) return <>{children}</>

    return (
        <div className="relative rounded-xl overflow-hidden">
            {/* Blurred preview */}
            <div className="pointer-events-none select-none blur-sm opacity-40">
                {children}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="text-white font-bold text-lg mb-1">{feature}</h3>
                <p className="text-gray-400 text-sm mb-4">
                    Disponible en el plan <span className="text-emerald-400 font-semibold capitalize">{requiredPlan}</span>
                </p>
                <Link href="/pricing"
                    className="px-5 py-2.5 rounded-lg font-bold text-sm text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    Ver planes →
                </Link>
            </div>
        </div>
    )
}
