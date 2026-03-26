import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../../lib/api'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function PredictionsScreen() {
    const [prediction, setPrediction] = useState<any>(null)
    const [risk, setRisk] = useState<any>(null)
    const [months, setMonths] = useState(3)
    const [loading, setLoading] = useState(true)

    useEffect(() => { load() }, [months])

    const load = async () => {
        try {
            setLoading(true)
            const id = await AsyncStorage.getItem('userId')
            if (!id) return
            const [p, r] = await Promise.all([
                api.get(`/users/${id}/predictions/balance?monthsAhead=${months}`),
                api.get(`/users/${id}/predictions/risk`)
            ])
            setPrediction(p.data)
            setRisk(r.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    return (
        <ScrollView style={s.container}>
            <View style={s.header}>
                <Text style={s.title}>🔮 Predicciones IA</Text>
                <View style={s.tabs}>
                    {[3, 6, 12].map(m => (
                        <TouchableOpacity key={m} onPress={() => setMonths(m)}
                            style={[s.tab, months === m && s.tabActive]}>
                            <Text style={[s.tabText, months === m && s.tabTextActive]}>{m} meses</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? <Text style={s.loading}>Generando predicciones...</Text> : (
                <>
                    {prediction && (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>📈 Balance Proyectado</Text>
                            <Text style={s.bigValue}>{formatCOP(prediction.predictions?.[prediction.predictions.length - 1]?.predictedBalance || 0)}</Text>
                            <Text style={s.sub}>En {months} meses • Confianza: {((prediction.confidence || 0) * 100).toFixed(0)}%</Text>
                            <View style={[s.badge, { backgroundColor: prediction.trend === 'increasing' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                                <Text style={{ color: prediction.trend === 'increasing' ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: '700' }}>
                                    {prediction.trend === 'increasing' ? '📈 Tendencia creciente' : '📉 Tendencia decreciente'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {risk && (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>⚠️ Análisis de Riesgo</Text>
                            <View style={s.riskRow}>
                                <Text style={s.riskScore}>{risk.riskScore}</Text>
                                <View>
                                    <Text style={[s.riskLevel, { color: risk.riskLevel === 'high' ? '#ef4444' : risk.riskLevel === 'medium' ? '#f59e0b' : '#10b981' }]}>
                                        {risk.riskLevel === 'high' ? '🔴 Alto' : risk.riskLevel === 'medium' ? '🟡 Medio' : '🟢 Bajo'}
                                    </Text>
                                    <Text style={s.sub}>Ratio gastos: {((risk.metrics?.expenseRatio || 0) * 100).toFixed(0)}%</Text>
                                </View>
                            </View>
                            {risk.recommendations?.slice(0, 2).map((r: string, i: number) => (
                                <Text key={i} style={s.rec}>• {r}</Text>
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
    header: { padding: 20 },
    title: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 16 },
    tabs: { flexDirection: 'row', gap: 8 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0a1628', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tabActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    tabText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    loading: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
    card: { margin: 16, marginTop: 0, backgroundColor: '#0a1628', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 12 },
    bigValue: { fontSize: 32, fontWeight: '900', color: '#10b981', marginBottom: 4 },
    sub: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
    riskRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
    riskScore: { fontSize: 48, fontWeight: '900', color: '#fff' },
    riskLevel: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    rec: { fontSize: 12, color: '#9ca3af', lineHeight: 18, marginTop: 4 },
})
