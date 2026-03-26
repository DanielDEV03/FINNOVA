import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { logout } from '../../lib/api'
import { router } from 'expo-router'

export default function ProfileScreen() {
    const [user, setUser] = useState({ name: '', email: '' })

    useEffect(() => {
        AsyncStorage.multiGet(['userName', 'userEmail']).then(pairs => {
            setUser({ name: pairs[0][1] || '', email: pairs[1][1] || '' })
        })
    }, [])

    const handleLogout = () => {
        Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: async () => { await logout(); router.replace('/auth/login') } }
        ])
    }

    const menuItems = [
        { icon: '💳', label: 'Mis Transacciones', onPress: () => router.push('/(tabs)/transactions') },
        { icon: '🔮', label: 'Predicciones IA', onPress: () => router.push('/(tabs)/predictions') },
        { icon: '🌐', label: 'Abrir en Web', onPress: () => { } },
        { icon: '📧', label: 'Soporte', onPress: () => { } },
    ]

    return (
        <ScrollView style={s.container}>
            <View style={s.hero}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={s.name}>{user.name}</Text>
                <Text style={s.email}>{user.email}</Text>
                <View style={s.badge}><Text style={s.badgeText}>✨ Plan Gratis</Text></View>
            </View>

            <View style={s.menu}>
                {menuItems.map((item, i) => (
                    <TouchableOpacity key={i} onPress={item.onPress} style={s.menuItem}>
                        <Text style={s.menuIcon}>{item.icon}</Text>
                        <Text style={s.menuLabel}>{item.label}</Text>
                        <Text style={s.menuArrow}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={s.footer}>
                <Text style={s.footerText}>FINNOVA v1.0.0</Text>
                <Text style={s.footerText}>© 2026 CTS Labs Cartagena</Text>
            </View>

            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
                <Text style={s.logoutText}>🚪 Cerrar Sesión</Text>
            </TouchableOpacity>
        </ScrollView>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030712' },
    hero: { alignItems: 'center', padding: 32, paddingBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarText: { fontSize: 32, fontWeight: '900', color: '#fff' },
    name: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
    email: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
    badge: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
    badgeText: { color: '#10b981', fontSize: 12, fontWeight: '700' },
    menu: { margin: 16, backgroundColor: '#0a1628', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    menuIcon: { fontSize: 20, marginRight: 14 },
    menuLabel: { flex: 1, fontSize: 14, color: '#e5e7eb', fontWeight: '600' },
    menuArrow: { fontSize: 20, color: '#6b7280' },
    footer: { alignItems: 'center', padding: 16, gap: 4 },
    footerText: { fontSize: 11, color: '#374151' },
    logoutBtn: { margin: 16, backgroundColor: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginBottom: 40 },
    logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
})
