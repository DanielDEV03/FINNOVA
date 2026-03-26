// FINNOVA Service Worker — Web Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {}
    const title = data.title || 'FINNOVA'
    const options = {
        body: data.body || 'Tienes una nueva notificación',
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: data.tag || 'finnova-notification',
        data: { url: data.url || '/dashboard' },
        actions: data.actions || [],
        vibrate: [200, 100, 200],
    }
    event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification.data?.url || '/dashboard'
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) return client.focus()
            }
            if (clients.openWindow) return clients.openWindow(url)
        })
    )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))
