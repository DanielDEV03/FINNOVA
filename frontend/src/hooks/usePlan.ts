'use client'
import { useEffect, useState } from 'react'
import { getMyPlan, type PlanInfo, PLAN_LIMITS } from '@/lib/subscription'

export function usePlan() {
    const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const userId = localStorage.getItem('userId')
        if (!userId) { setLoading(false); return }

        getMyPlan()
            .then(setPlanInfo)
            .catch(() => setPlanInfo({ plan: 'free', isPro: false, isBusiness: false, planExpiresAt: null, subscription: null }))
            .finally(() => setLoading(false))
    }, [])

    const plan = planInfo?.plan ?? 'free'
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free

    return {
        plan,
        isPro: planInfo?.isPro ?? false,
        isBusiness: planInfo?.isBusiness ?? false,
        planExpiresAt: planInfo?.planExpiresAt,
        subscription: planInfo?.subscription,
        limits,
        loading,
        canExportPDF: limits.pdfExport,
        canUseAdvancedAnalysis: limits.advancedAnalysis,
        canUsePushNotifications: limits.pushNotifications,
    }
}
