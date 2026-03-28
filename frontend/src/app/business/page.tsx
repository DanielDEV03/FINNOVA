'use client'
import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { usePlan } from '@/hooks/usePlan'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function BusinessPage() {
    const { isBusiness, loading } = usePlan()
    const [tab, setTab] = useState<'accounts' | 'team' | 'apikeys' | 'reports'>('accounts')

    if (loading) return <div className="p-8 text-center">Cargando...</div>

    if (!isBusiness) return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🚀</div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Panel Business</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Múltiples cuentas, panel de equipo, API access y reportes personalizados.
                        Disponible en el plan <span className="text-violet-400 font-bold">Business</span>.
                    </p>
                    <Link href="/pricing"
                        className="inline-block px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                        Ver planes →
                    </Link>
                </div>
            </div>
        </ProtectedRoute>
    )

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">🚀 Panel Business</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Gestiona tus cuentas, equipo, API y reportes</p>

                    <div className="flex gap-2 mb-8 flex-wrap">
                        {([
                            { id: 'accounts', label: '🏦 Cuentas' },
                            { id: 'team', label: '👥 Equipo' },
                            { id: 'apikeys', label: '🔑 API Keys' },
                            { id: 'reports', label: '📊 Reportes' },
                        ] as const).map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition ${tab === t.id ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'accounts' && <AccountsTab />}
                    {tab === 'team' && <TeamTab />}
                    {tab === 'apikeys' && <ApiKeysTab />}
                    {tab === 'reports' && <ReportsTab />}
                </div>
            </div>
        </ProtectedRoute>
    )
}

// ── Accounts Tab ─────────────────────────────────────────────────────────────
function AccountsTab() {
    const [accounts, setAccounts] = useState<any>(null)
    const [creating, setCreating] = useState(false)
    const [form, setForm] = useState({ name: '', type: 'personal', color: '#10b981', icon: '💼' })

    useEffect(() => { load() }, [])

    const load = async () => {
        try { const r = await api.get('/accounts'); setAccounts(r.data) } catch { }
    }

    const create = async (e: React.FormEvent) => {
        e.preventDefault()
        try { await api.post('/accounts', form); setCreating(false); load() } catch { alert('Error') }
    }

    const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5"

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mis Cuentas</h2>
                <button onClick={() => setCreating(!creating)}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                    + Nueva cuenta
                </button>
            </div>

            {creating && (
                <form onSubmit={create} className={`${card} mb-4 space-y-3`}>
                    <input required placeholder="Nombre (ej: Negocio, Ahorros)" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-white/10" />
                    <div className="flex gap-3">
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                            className="flex-1 p-3 border rounded-lg dark:bg-gray-800 dark:border-white/10">
                            <option value="personal">Personal</option>
                            <option value="business">Negocio</option>
                            <option value="savings">Ahorros</option>
                            <option value="investment">Inversión</option>
                        </select>
                        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                            className="w-12 h-12 rounded-lg border cursor-pointer" />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 rounded-lg font-bold text-white bg-violet-600 hover:bg-violet-700">Crear</button>
                        <button type="button" onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg font-bold bg-gray-100 dark:bg-gray-800">Cancelar</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {accounts?.owned?.map((a: any) => (
                    <div key={a.id} className={card}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                style={{ background: a.color + '20', border: `2px solid ${a.color}` }}>
                                {a.icon}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{a.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{a.type} {a.isDefault && '· Principal'}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400">{a.currency}</p>
                    </div>
                ))}
                {accounts?.shared?.map((a: any) => (
                    <div key={a.id} className={`${card} opacity-80`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gray-100 dark:bg-gray-800">
                                {a.icon}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{a.name}</p>
                                <p className="text-xs text-gray-500">Compartida · {a.role}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Team Tab ──────────────────────────────────────────────────────────────────
function TeamTab() {
    const [accounts, setAccounts] = useState<any[]>([])
    const [selectedAccount, setSelectedAccount] = useState<string>('')
    const [members, setMembers] = useState<any[]>([])
    const [email, setEmail] = useState('')

    useEffect(() => {
        api.get('/accounts').then(r => {
            setAccounts(r.data.owned || [])
            if (r.data.owned?.length > 0) setSelectedAccount(r.data.owned[0].id)
        }).catch(() => { })
    }, [])

    useEffect(() => {
        if (selectedAccount) api.get(`/accounts/${selectedAccount}/team`).then(r => setMembers(r.data)).catch(() => { })
    }, [selectedAccount])

    const invite = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const r = await api.post(`/accounts/${selectedAccount}/team/invite`, { email })
            alert(r.data.message)
            setEmail('')
            api.get(`/accounts/${selectedAccount}/team`).then(r => setMembers(r.data))
        } catch { alert('Error al invitar') }
    }

    const remove = async (memberId: string) => {
        if (!confirm('¿Remover miembro?')) return
        await api.delete(`/accounts/${selectedAccount}/team/${memberId}`)
        setMembers(members.filter(m => m.id !== memberId))
    }

    const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5"

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Panel de Equipo</h2>
            {accounts.length === 0 ? (
                <p className="text-gray-500">Crea una cuenta primero en la pestaña Cuentas.</p>
            ) : (
                <>
                    <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
                        className="mb-4 p-3 border rounded-lg dark:bg-gray-800 dark:border-white/10 w-full sm:w-auto">
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <form onSubmit={invite} className={`${card} mb-4 flex gap-3`}>
                        <input type="email" required placeholder="Email del miembro" value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="flex-1 p-3 border rounded-lg dark:bg-gray-800 dark:border-white/10" />
                        <button type="submit" className="px-5 py-2 rounded-lg font-bold text-white bg-violet-600 hover:bg-violet-700">
                            Invitar
                        </button>
                    </form>

                    <div className="space-y-3">
                        {members.map(m => (
                            <div key={m.id} className={`${card} flex items-center justify-between`}>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {m.user?.name || m.inviteEmail}
                                    </p>
                                    <p className="text-xs text-gray-500">{m.user?.email || 'Invitación pendiente'} · {m.role} · {m.status}</p>
                                </div>
                                <button onClick={() => remove(m.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold">
                                    Remover
                                </button>
                            </div>
                        ))}
                        {members.length === 0 && <p className="text-gray-500 text-sm">Sin miembros aún. Invita a alguien.</p>}
                    </div>
                </>
            )}
        </div>
    )
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────
function ApiKeysTab() {
    const [keys, setKeys] = useState<any[]>([])
    const [creating, setCreating] = useState(false)
    const [name, setName] = useState('')
    const [newKey, setNewKey] = useState<string | null>(null)

    useEffect(() => { api.get('/api-keys').then(r => setKeys(r.data)).catch(() => { }) }, [])

    const create = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const r = await api.post('/api-keys', { name, scopes: ['read:transactions', 'read:dashboard'] })
            setNewKey(r.data.key)
            setCreating(false)
            setName('')
            api.get('/api-keys').then(r => setKeys(r.data))
        } catch { alert('Error') }
    }

    const revoke = async (id: string) => {
        if (!confirm('¿Revocar esta API key?')) return
        await api.delete(`/api-keys/${id}`)
        setKeys(keys.filter(k => k.id !== id))
    }

    const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5"

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">API Keys</h2>
                <button onClick={() => setCreating(!creating)}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-violet-600 hover:bg-violet-700">
                    + Nueva key
                </button>
            </div>

            {newKey && (
                <div className={`${card} mb-4 border-2 border-yellow-400`}>
                    <p className="font-bold text-yellow-600 mb-2">⚠️ Guarda esta key ahora — no podrás verla de nuevo</p>
                    <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm break-all font-mono">{newKey}</code>
                    <button onClick={() => { navigator.clipboard.writeText(newKey); alert('Copiada') }}
                        className="mt-2 text-sm text-violet-600 font-semibold hover:underline">
                        📋 Copiar
                    </button>
                </div>
            )}

            {creating && (
                <form onSubmit={create} className={`${card} mb-4 flex gap-3`}>
                    <input required placeholder="Nombre (ej: Zapier, Mi app)" value={name}
                        onChange={e => setName(e.target.value)}
                        className="flex-1 p-3 border rounded-lg dark:bg-gray-800 dark:border-white/10" />
                    <button type="submit" className="px-5 py-2 rounded-lg font-bold text-white bg-violet-600">Crear</button>
                    <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">✕</button>
                </form>
            )}

            <div className={`${card} mb-4 text-sm`}>
                <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">📖 Cómo usar tu API</p>
                <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs font-mono">
                    {`GET https://finnova-backend.onrender.com/api/v1/dashboard\nX-Api-Key: fk_live_XXXXXXXXXXXXXXXX`}
                </code>
                <p className="text-gray-500 mt-2">Endpoints disponibles: <code>/api/v1/dashboard</code>, <code>/api/v1/transactions</code>, <code>/api/v1/me</code></p>
            </div>

            <div className="space-y-3">
                {keys.map(k => (
                    <div key={k.id} className={`${card} flex items-center justify-between`}>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{k.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{k.keyPrefix}••••••••</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {k.requestCount} requests · {k.lastUsedAt ? `Último uso: ${new Date(k.lastUsedAt).toLocaleDateString('es-CO')}` : 'Sin usar'}
                            </p>
                        </div>
                        <button onClick={() => revoke(k.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold">
                            Revocar
                        </button>
                    </div>
                ))}
                {keys.length === 0 && <p className="text-gray-500 text-sm">Sin API keys. Crea una para integrar con otras apps.</p>}
            </div>
        </div>
    )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab() {
    const [from, setFrom] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
    })
    const [to, setTo] = useState(new Date().toISOString().split('T')[0])
    const [type, setType] = useState('')
    const [categories, setCategories] = useState('')
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState<any>(null)

    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : ''

    const loadPreview = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ from, to })
            if (type) params.set('type', type)
            if (categories) params.set('categories', categories)
            const r = await api.get(`/users/${userId}/reports/data?${params}`)
            setPreview(r.data)
        } catch { alert('Error al cargar reporte') }
        finally { setLoading(false) }
    }

    const exportPDF = async () => {
        if (!preview) return
        const { exportFinancialReport } = await import('@/lib/exportPDF')
        await exportFinancialReport({
            userName: preview.userName,
            totalIncome: preview.totalIncome,
            totalExpenses: preview.totalExpenses,
            balance: preview.balance,
            totalDebt: 0,
            transactions: preview.transactions,
            period: `${new Date(from).toLocaleDateString('es-CO')} — ${new Date(to).toLocaleDateString('es-CO')}`
        })
    }

    const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
    const card = "bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/5 p-5"

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reportes Personalizados</h2>

            <div className={`${card} mb-4`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Desde</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-white/10 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-white/10 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                        <select value={type} onChange={e => setType(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-white/10 text-sm">
                            <option value="">Todos</option>
                            <option value="income">Solo ingresos</option>
                            <option value="expense">Solo gastos</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Categorías (separadas por coma)</label>
                        <input placeholder="Alimentación,Transporte" value={categories}
                            onChange={e => setCategories(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:border-white/10 text-sm" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadPreview} disabled={loading}
                        className="px-5 py-2 rounded-lg font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60">
                        {loading ? 'Cargando...' : '🔍 Previsualizar'}
                    </button>
                    {preview && (
                        <button onClick={exportPDF}
                            className="px-5 py-2 rounded-lg font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            📄 Exportar PDF
                        </button>
                    )}
                </div>
            </div>

            {preview && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Ingresos', value: formatCOP(preview.totalIncome), color: 'text-emerald-600' },
                            { label: 'Gastos', value: formatCOP(preview.totalExpenses), color: 'text-red-500' },
                            { label: 'Balance', value: formatCOP(preview.balance), color: preview.balance >= 0 ? 'text-emerald-600' : 'text-red-500' },
                            { label: 'Transacciones', value: String(preview.transactionCount), color: 'text-violet-600' },
                        ].map(k => (
                            <div key={k.label} className={card}>
                                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                                <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
                            </div>
                        ))}
                    </div>

                    {preview.byCategory?.length > 0 && (
                        <div className={card}>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Por categoría</h3>
                            <div className="space-y-2">
                                {preview.byCategory.map((c: any) => (
                                    <div key={c.category} className="flex justify-between text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">{c.category}</span>
                                        <span className="font-bold text-red-500">{formatCOP(c.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
