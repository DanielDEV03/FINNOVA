'use client'
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getMyPlan, type PlanInfo, PLAN_LIMITS } from '@/lib/subscription'

interface PlanContextValue {
    plan: string
    isPro: boolean
    isBusiness: boolean
    planExpiresAt: string | null
    subscription: PlanInfo['subscription']
    limits: typeof PLAN_LIMITS['free']
    loading: boolean
    canExportPDF: boolean
    canUseAdvancedAnalysis: boolean
    canUsePushNotifications: boolean
    refresh: () => Promise<void>
}

const PlanContext = createContext<PlanContextValue>({
    plan: 'free', isPro: false, isBusiness: false, planExpiresAt: null,
    subscription: null, limits: PLAN_LIMITS.free, loading: true,
    canExportPDF: false, canUseAdvancedAnalysis: false, canUsePushNotifications: false,
    refresh: async () => { },
})

export function PlanProvider({ children }: { children: ReactNode }) {
    const [info, setInfo] = useState<PlanInfo | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
        if (!userId) { setLoading(false); return }
        try {
            const data = await getMyPlan()
            setInfo(data)
        } catch {
            setInfo({ plan: 'free', isPro: false, isBusiness: false, planExpiresAt: null, subscription: null })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const plan = info?.plan ?? 'free'
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free

    return (
        <PlanContext.Provider value={{
            plan,
            isPro: info?.isPro ?? false,
            isBusiness: info?.isBusiness ?? false,
            planExpiresAt: info?.planExpiresAt ?? null,
            subscription: info?.subscription ?? null,
            limits,
            loading,
            canExportPDF: limits.pdfExport,
            canUseAdvancedAnalysis: limits.advancedAnalysis,
            canUsePushNotifications: limits.pushNotifications,
            refresh: load,
        }}>
            {children}
        </PlanContext.Provider>
    )
}

export const usePlan = () => useContext(PlanContext)
