import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { login } from '../../lib/api'

export default function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        if (!email || !password) { setError('Completa todos los campos'); return }
        setLoading(true); setError('')
        try {
            await login(email, password)
            router.replace('/(tabs)')
        } catch (e: any) {
            setError(e.response?.data?.message || 'Error al iniciar sesión')
        } finally { setLoading(false) }
    }

    return (
        <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.inner}>
                <Text style={s.logo}>FINNOVA</Text>
                <Text style={s.title}>Bienvenido de vuelta</Text>
                <Text style={s.subtitle}>Inicia sesión en tu cuenta</Text>

                {error ? <View style={s.error}><Text style={s.errorText}>{error}</Text></View> : null}

                <TextInput style={s.input} placeholder="Email" placeholderTextColor="#6b7280"
                    value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={s.input} placeholder="Contraseña" placeholderTextColor="#6b7280"
                    value={password} onChangeText={setPassword} secureTextEntry />

                <TouchableOpacity onPress={handleLogin} disabled={loading} style={[s.btn, loading && { opacity: 0.6 }]}>
                    <Text style={s.btnText}>{loading ? 'Iniciando...' : 'Iniciar Sesión →'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/auth/register')} style={s.link}>
                    <Text style={s.linkText}>¿No tienes cuenta? <Text style={s.linkAccent}>Regístrate gratis</Text></Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030712' },
    inner: { flex: 1, justifyContent: 'center', padding: 28 },
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
