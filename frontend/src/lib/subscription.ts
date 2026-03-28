import { api } from './api'

export interface PlanInfo {
    plan: 'free' | 'pro' | 'business'
    isPro: boolean
    isBusiness: boolean
    planExpiresAt: string | null
    subscription: {
        id: string
        plan: string
        status: string
        billingCycle: string
        amountPaid: number
        startedAt: string
        expiresAt: string
    } | null
}

export const PLAN_LIMITS = {
    free: {
        transactionsPerMonth: 50,
        simulations: 1,
        pdfExport: false,
        advancedAnalysis: false,
        pushNotifications: false,
        prioritySupport: false,
    },
    pro: {
        transactionsPerMonth: Infinity,
        simulations: Infinity,
        pdfExport: true,
        advancedAnalysis: true,
        pushNotifications: true,
        prioritySupport: false,
    },
    business: {
        transactionsPerMonth: Infinity,
        simulations: Infinity,
        pdfExport: true,
        advancedAnalysis: true,
        pushNotifications: true,
        prioritySupport: true,
    },
}

export async function getMyPlan(): Promise<PlanInfo> {
    const res = await api.get('/subscriptions/my')
    return res.data
}

export async function createCheckout(plan: string, billingCycle: string): Promise<{ checkoutUrl: string; reference: string }> {
    const res = await api.post('/subscriptions/checkout', { plan, billingCycle })
    return res.data
}

export async function cancelSubscription(): Promise<{ message: string; expiresAt: string }> {
    const res = await api.post('/subscriptions/cancel')
    return res.data
}

export function getPlanLabel(plan: string): string {
    return { free: 'Gratis', pro: 'Pro ⭐', business: 'Business 🚀' }[plan] ?? plan
}

export function getPlanColor(plan: string): string {
    return {
        free: 'text-gray-400',
        pro: 'text-emerald-400',
        business: 'text-violet-400',
    }[plan] ?? 'text-gray-400'
}
