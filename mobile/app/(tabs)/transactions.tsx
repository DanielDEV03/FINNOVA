import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../../lib/api'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function TransactionsScreen() {
    const [incomes, setIncomes] = useState<any[]>([])
    const [expenses, setExpenses] = useState<any[]>([])
    const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all')
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ type: 'expense', amount: '', description: '', category: 'Alimentación' })

    useEffect(() => { load() }, [])

    const load = async () => {
        const id = await AsyncStorage.getItem('userId')
        if (!id) return
        const [i, e] = await Promise.all([api.get(`/users/${id}/incomes`), api.get(`/users/${id}/expenses`)])
        setIncomes(i.data)
        setExpenses(e.data)
    }

    const save = async () => {
        const id = await AsyncStorage.getItem('userId')
        if (!id || !form.amount) return
        if (form.type === 'income') {
            await api.post(`/users/${id}/incomes`, { amount: parseFloat(form.amount), type: form.category, description: form.description, date: new Date().toISOString() })
        } else {
            await api.post(`/users/${id}/expenses`, { amount: parseFloat(form.amount), category: form.category, description: form.description, date: new Date().toISOString() })
        }
        setShowAdd(false)
        setForm({ type: 'expense', amount: '', description: '', category: 'Alimentación' })
        load()
    }

    const all = [
        ...incomes.map(i => ({ ...i, txType: 'income' })),
        ...expenses.map(e => ({ ...e, txType: 'expense' }))
    ].sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())

    const filtered = tab === 'all' ? all : all.filter(t => t.txType === tab)

    return (
        <View style={s.container}>
            <View style={s.header}>
                <Text style={s.title}>💳 Transacciones</Text>
                <TouchableOpacity onPress={() => setShowAdd(true)} style={s.addBtn}>
                    <Text style={s.addBtnText}>+ Agregar</Text>
                </TouchableOpacity>
            </View>

            <View style={s.tabs}>
                {(['all', 'income', 'expense'] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
                        <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                            {t === 'all' ? 'Todos' : t === 'income' ? '💰 Ingresos' : '💸 Gastos'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView>
                {filtered.map((t, i) => (
                    <View key={i} style={s.row}>
                        <Text style={s.rowIcon}>{t.txType === 'income' ? '💰' : '💸'}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={s.rowDesc}>{t.description || t.type || t.category}</Text>
                            <Text style={s.rowMeta}>{t.category || t.type} • {new Date(t.date || t.createdAt).toLocaleDateString('es-CO')}</Text>
                        </View>
                        <Text style={[s.rowAmount, { color: t.txType === 'income' ? '#10b981' : '#ef4444' }]}>
                            {t.txType === 'income' ? '+' : '-'}{formatCOP(t.amount)}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
                <View style={s.modal}>
                    <Text style={s.modalTitle}>Nueva Transacción</Text>
                    <View style={s.typeRow}>
                        {(['expense', 'income'] as const).map(tp => (
                            <TouchableOpacity key={tp} onPress={() => setForm(f => ({ ...f, type: tp }))}
                                style={[s.typeBtn, form.type === tp && { backgroundColor: tp === 'income' ? '#10b981' : '#ef4444' }]}>
                                <Text style={s.typeBtnText}>{tp === 'income' ? '💰 Ingreso' : '💸 Gasto'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput style={s.input} placeholder="Monto (COP)" placeholderTextColor="#6b7280" keyboardType="numeric"
                        value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} />
                    <TextInput style={s.input} placeholder="Descripción" placeholderTextColor="#6b7280"
                        value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />
                    <TextInput style={s.input} placeholder="Categoría" placeholderTextColor="#6b7280"
                        value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))} />
                    <TouchableOpacity onPress={save} style={s.saveBtn}><Text style={s.saveBtnText}>Guardar</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowAdd(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>Cancelar</Text></TouchableOpacity>
                </View>
            </Modal>
        </View>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030712' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: '900', color: '#fff' },
    addBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#0a1628', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tabActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    tabText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    rowIcon: { fontSize: 22, marginRight: 12 },
    rowDesc: { fontSize: 13, color: '#e5e7eb', fontWeight: '600' },
    rowMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
    rowAmount: { fontSize: 13, fontWeight: '800' },
    modal: { flex: 1, backgroundColor: '#030712', padding: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 24 },
    typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    typeBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#0a1628', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    typeBtnText: { color: '#fff', fontWeight: '700' },
    input: { backgroundColor: '#0a1628', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', fontSize: 14 },
    saveBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
    cancelBtnText: { color: '#6b7280', fontSize: 14 },
})
