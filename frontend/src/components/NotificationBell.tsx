'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker, requestPushPermission } from '@/lib/pushNotifications'

export default function NotificationBell() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if ('Notification' in window) setPermission(Notification.permission)
        registerServiceWorker()
    }, [])

    const enable = async () => {
        setLoading(true)
        const granted = await requestPushPermission()
        setPermission(granted ? 'granted' : 'denied')
        setLoading(false)
    }

    if (permission === 'granted') {
        return (
            <div title="Notificaciones activas" className="p-2 rounded-lg text-emerald-500" style={{ background: 'rgba(16,185,129,0.1)' }}>
                🔔
            </div>
        )
    }

    if (permission === 'denied') return null

    return (
        <button onClick={enable} disabled={loading}
            title="Activar notificaciones"
            className="p-2 rounded-lg text-gray-400 hover:text-yellow-400 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {loading ? '⏳' : '🔕'}
        </button>
    )
}
