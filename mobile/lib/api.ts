import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'https://finnova-backend-hquh.onrender.com/api'

export const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    r => r,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.multiRemove(['token', 'userId', 'userName'])
        }
        return Promise.reject(error)
    }
)

export const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password })
    await AsyncStorage.setItem('token', r.data.token)
    await AsyncStorage.setItem('userId', r.data.userId)
    await AsyncStorage.setItem('userName', r.data.name)
    return r.data
}

export const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'userId', 'userName'])
}
