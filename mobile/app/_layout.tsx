import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack screenOptions={{
                headerStyle: { backgroundColor: '#030712' },
                headerTintColor: '#10b981',
                headerTitleStyle: { fontWeight: '900', color: '#fff' },
                contentStyle: { backgroundColor: '#030712' }
            }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login" options={{ title: 'Iniciar Sesión', headerShown: false }} />
                <Stack.Screen name="auth/register" options={{ title: 'Crear Cuenta', headerShown: false }} />
            </Stack>
        </>
    )
}
