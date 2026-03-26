// Theme management — persiste en localStorage
export type Theme = 'dark' | 'light'

export const getTheme = (): Theme => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('theme') as Theme) ?? 'dark'
}

export const setTheme = (theme: Theme) => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}

export const initTheme = () => {
    const theme = getTheme()
    setTheme(theme)
}
