'use client'
import { useEffect, useState } from 'react'
import { getTheme, setTheme, type Theme } from '@/lib/theme'

export default function ThemeToggle() {
    const [theme, setThemeState] = useState<Theme>('dark')

    useEffect(() => { setThemeState(getTheme()) }, [])

    const toggle = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        setThemeState(next)
    }

    return (
        <button onClick={toggle} title="Cambiar tema"
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    )
}
