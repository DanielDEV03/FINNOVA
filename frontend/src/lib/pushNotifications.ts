'use client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

export async function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
    try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        console.log('SW registered:', reg.scope)
        return reg
    } catch (e) {
        console.error('SW registration failed:', e)
        return null
    }
}

export async function requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const permission = await Notification.requestPermission()
    return permission === 'granted'
}

export async function subscribeToPush(apiUrl: string, token: string): Promise<boolean> {
    try {
        const reg = await registerServiceWorker()
        if (!reg) return false

        const granted = await requestPushPermission()
        if (!granted) return false

        if (!VAPID_PUBLIC_KEY) {
            // Sin VAPID key, usar notificaciones locales
            return true
        }

        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })

        await fetch(`${apiUrl}/notifications/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(sub)
        })

        return true
    } catch (e) {
        console.error('Push subscription failed:', e)
        return false
    }
}

// Notificación local (sin servidor) — funciona siempre
export function showLocalNotification(title: string, body: string, url = '/dashboard') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const n = new Notification(title, {
        body,
        icon: '/icon-192.png',
        tag: 'finnova-local',
        data: { url }
    })
    n.onclick = () => { window.focus(); window.location.href = url; n.close() }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
