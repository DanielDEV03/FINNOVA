import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../../lib/api'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function DashboardScreen() {
    const [data, setData] = useState<any>(null)
    const [userName, setUserName] = useState('')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        load()
        AsyncStorage.getItem('userName').then(n => setUserName(n?.split(' ')[0] || 'Usuario'))
    }, [])

    const load = async () => {
        try {
            const id = await AsyncStorage.getItem('userId')
            if (!id) return
            const r = await api.get(`/users/${id}/dashboard`)
            setData(r.data)
        } catch (e) { console.error(e) }
    }

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

    const kpis = data ? [
        { label: 'Ingresos', value: formatCOP(data.totalIncome), icon: '💰', color: '#10b981' },
        { label: 'Gastos', value: formatCOP(data.totalExpenses), icon: '💸', color: '#ef4444' },
        { label: 'Balance', value: formatCOP(data.balance), icon: data.balance >= 0 ? '📈' : '📉', color: data.balance >= 0 ? '#10b981' : '#ef4444' },
        { label: 'Deudas', value: formatCOP(data.totalDebt), icon: '💳', color: '#f59e0b' },
    ] : []

    return (
        <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}>
            <View style={s.header}>
                <Text style={s.greeting}>Hola, {userName} 👋</Text>
                <Text style={s.subtitle}>Tu resumen financiero</Text>
            </View>

            {!data ? (
                <Text style={s.loading}>Cargando...</Text>
            ) : (
                <>
                    <View style={s.grid}>
                        {kpis.map(k => (
                            <View key={k.label} style={[s.card, { borderLeftColor: k.color }]}>
                                <Text style={s.cardIcon}>{k.icon}</Text>
                                <Text style={s.cardLabel}>{k.label}</Text>
                                <Text style={[s.cardValue, { color: k.color }]}>{k.value}</Text>
                            </View>
                        ))}
                    </View>

                    {data.recentTransactions?.length > 0 && (
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>Transacciones Recientes</Text>
                            {data.recentTransactions.slice(0, 5).map((t: any, i: number) => (
                                <View key={i} style={s.txRow}>
                                    <Text style={s.txIcon}>{t.type === 'income' ? '💰' : '💸'}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.txDesc}>{t.description || t.type}</Text>
                                        <Text style={s.txCat}>{t.category}</Text>
                                    </View>
                                    <Text style={[s.txAmount, { color: t.type === 'income' ? '#10b981' : '#ef4444' }]}>
                                        {t.type === 'income' ? '+' : '-'}{formatCOP(t.amount)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030712' },
    header: { padding: 20, paddingTop: 24 },
    greeting: { fontSize: 26, fontWeight: '900', color: '#fff' },
    subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    loading: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
    card: { width: '47%', backgroundColor: '#0a1628', borderRadius: 16, padding: 16, borderLeftWidth: 3, marginBottom: 4 },
    cardIcon: { fontSize: 24, marginBottom: 8 },
    cardLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
    cardValue: { fontSize: 16, fontWeight: '900' },
    section: { margin: 16, backgroundColor: '#0a1628', borderRadius: 16, padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    txIcon: { fontSize: 20, marginRight: 12 },
    txDesc: { fontSize: 13, color: '#e5e7eb', fontWeight: '600' },
    txCat: { fontSize: 11, color: '#6b7280', marginTop: 2 },
    txAmount: { fontSize: 13, fontWeight: '800' },
})
