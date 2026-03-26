import { Tabs } from 'expo-router'

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            tabBarStyle: { backgroundColor: '#0a1628', borderTopColor: 'rgba(255,255,255,0.06)', height: 60 },
            tabBarActiveTintColor: '#10b981',
            tabBarInactiveTintColor: '#6b7280',
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            headerStyle: { backgroundColor: '#030712' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '900' },
        }}>
            <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }} />
            <Tabs.Screen name="transactions" options={{ title: 'Transacciones', tabBarIcon: ({ color }) => <TabIcon emoji="💳" color={color} /> }} />
            <Tabs.Screen name="predictions" options={{ title: 'IA', tabBarIcon: ({ color }) => <TabIcon emoji="🔮" color={color} /> }} />
            <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
        </Tabs>
    )
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
    return <span style={{ fontSize: 20, opacity: color === '#10b981' ? 1 : 0.5 }}>{emoji}</span>
}
