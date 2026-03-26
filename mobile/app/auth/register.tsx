import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../../lib/api'

export default function RegisterScreen() {
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        if (!form.name || !form.email || !form.password) { setError('Completa todos los campos'); return }
        if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
        setLoading(true); setError('')
        try {
            const r = await api.post('/auth/register', form)
            await AsyncStorage.setItem('token', r.data.token)
            await AsyncStorage.setItem('userId', r.data.userId)
            await AsyncStorage.setItem('userName', r.data.name)
            router.replace('/(tabs)')
        } catch (e: any) {
            setError(e.response?.data?.message || 'Error al registrar')
        } finally { setLoading(false) }
    }

    return (
        <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={s.inner}>
                <Text style={s.logo}>FINNOVA</Text>
                <Text style={s.title}>Crea tu cuenta gratis</Text>
                <Text style={s.subtitle}>Sin tarjeta de crédito</Text>

                {error ? <View style={s.error}><Text style={s.errorText}>{error}</Text></View> : null}

                {(['name', 'email', 'password'] as const).map(field => (
                    <TextInput key={field} style={s.input}
                        placeholder={field === 'name' ? 'Nombre completo' : field === 'email' ? 'Email' : 'Contraseña'}
                        placeholderTextColor="#6b7280"
                        value={form[field]} onChangeText={v => setForm(f => ({ ...f, [field]: v }))}
                        keyboardType={field === 'email' ? 'email-address' : 'default'}
                        autoCapitalize={field === 'name' ? 'words' : 'none'}
                        secureTextEntry={field === 'password'} />
                ))}

                <TouchableOpacity onPress={handleRegister} disabled={loading} style={[s.btn, loading && { opacity: 0.6 }]}>
                    <Text style={s.btnText}>{loading ? 'Creando cuenta...' : 'Crear Cuenta →'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/auth/login')} style={s.link}>
                    <Text style={s.linkText}>¿Ya tienes cuenta? <Text style={s.linkAccent}>Inicia sesión</Text></Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030712' },
    inner: { flexGrow: 1, justifyContent: 'center', padding: 28 },
    logo: { fontSize: 32, fontWeight: '900', color: '#10b981', textAlign: 'center', marginBottom: 8, letterSpacing: 2 },
    title: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
    error: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
    errorText: { color: '#fca5a5', fontSize: 13 },
    input: { backgroundColor: '#0a1628', borderRadius: 14, padding: 16, color: '#fff', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', fontSize: 15 },
    btn: { backgroundColor: '#10b981', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 8, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 12, elevation: 4 },
    btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#6b7280', fontSize: 14 },
    linkAccent: { color: '#10b981', fontWeight: '700' },
})
