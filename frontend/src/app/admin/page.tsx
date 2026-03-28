'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
const formatDate = (d: string | null) => d ? new Date(d).toLocaleString('es-CO') : 'Nunca'

type Tab = 'metrics' | 'users' | 'logs' | 'system' | 'broadcast'

interface Metrics {
    users: { total: number; active30d: number; newLast7d: number; newToday: number; locked: number; suspended: number; byRole: { role: string; count: number }[] }
    transactions: { totalExpenses: number; totalIncomes: number; totalDebts: number; totalExpenseAmount: number; totalIncomeAmount: number; netBalance: number }
    registrationsByDay: { date: string; count: number }[]
    loginsByDay: { date: string; count: number }[]
    topCategories: { category: string; total: number; count: number }[]
    topUsers: { id: string; name: string; email: string; role: string; lastLoginAt: string | null; transactionCount: number }[]
    security: { errors24h: number; failedLogins24h: number }
}

interface AuditLog {
    id: string; userId: string | null; action: string; entity: string
    ipAddress: string | null; success: boolean; details: string | null; createdAt: string
}

interface AdminUser {
    id: string; name: string; email: string; role: string; plan?: string
    createdAt: string; lastLoginAt: string | null; failedLoginAttempts: number; isLocked: boolean
    lockedUntil: string | null; transactionCount: number
}

interface SystemStatus {
    status: string; errors24h: number; loginsLastHour: number
    failedLogins24h: number; activeTokens: number
    suspiciousIps: { ip: string; attempts: number }[]
}

interface UserDetail {
    user: AdminUser
    financials: { totalIncome: number; totalExpenses: number; totalDebts: number; incomeCount: number; expenseCount: number; balance: number }
    recentActivity: AuditLog[]
    activeTokens: number
}

export default function AdminPage() {
    const router = useRouter()
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [logTotal, setLogTotal] = useState(0)
    const [logPage, setLogPage] = useState(1)
    const [users, setUsers] = useState<AdminUser[]>([])
    const [userTotal, setUserTotal] = useState(0)
    const [userPage, setUserPage] = useState(1)
    const [system, setSystem] = useState<SystemStatus | null>(null)
    const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
    const [tab, setTab] = useState<Tab>('metrics')
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [logAction, setLogAction] = useState('')
    const [logSuccess, setLogSuccess] = useState('')
    const [broadcast, setBroadcast] = useState({ message: '', details: '', severity: 'Warning' })
    const [broadcastSent, setBroadcastSent] = useState(false)
    const [actionMsg, setActionMsg] = useState('')

    useEffect(() => {
        const role = localStorage.getItem('userRole')
        if (role !== 'admin' && role !== 'support') { router.push('/dashboard'); return }
        loadAll()
    }, [])

    const loadAll = async () => {
        try {
            const [m, s] = await Promise.all([api.get('/admin/metrics'), api.get('/admin/system-status')])
            setMetrics(m.data)
            setSystem(s.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const loadUsers = useCallback(async () => {
        const params = new URLSearchParams({ page: String(userPage), pageSize: '20' })
        if (search) params.set('search', search)
        if (roleFilter) params.set('role', roleFilter)
        const r = await api.get(`/admin/users?${params}`)
        setUsers(r.data.users); setUserTotal(r.data.total)
    }, [userPage, search, roleFilter])

    const loadLogs = useCallback(async () => {
        const params = new URLSearchParams({ page: String(logPage), pageSize: '50' })
        if (logAction) params.set('action', logAction)
        if (logSuccess !== '') params.set('success', logSuccess)
        const r = await api.get(`/admin/audit-logs?${params}`)
        setLogs(r.data.logs); setLogTotal(r.data.total)
    }, [logPage, logAction, logSuccess])

    useEffect(() => { if (tab === 'users') loadUsers() }, [tab, loadUsers])
    useEffect(() => { if (tab === 'logs') loadLogs() }, [tab, loadLogs])

    const notify = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000) }

    const doAction = async (url: string, method: 'post' | 'delete' | 'patch', body?: object, confirm?: string) => {
        if (confirm && !window.confirm(confirm)) return
        try {
            const r = method === 'delete' ? await api.delete(url) : method === 'patch' ? await api.patch(url, body) : await api.post(url, body)
            notify(r.data.message || 'Acción completada')
            loadUsers()
            if (selectedUser) loadUserDetail(selectedUser.user.id)
        } catch (e: any) { notify(e.response?.data?.message || 'Error') }
    }

    const loadUserDetail = async (id: string) => {
        const r = await api.get(`/admin/users/${id}`)
        setSelectedUser(r.data)
    }

    const exportCSV = async (type: 'users' | 'audit-logs') => {
        const r = await api.get(`/admin/export/${type}`, { responseType: 'blob' })
        const url = URL.createObjectURL(r.data)
        const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`; a.click()
    }

    const sendBroadcast = async () => {
        if (!broadcast.message.trim()) return
        await api.post('/admin/broadcast-alert', broadcast)
        setBroadcastSent(true); setBroadcast({ message: '', details: '', severity: 'Warning' })
        setTimeout(() => setBroadcastSent(false), 3000)
    }

    const roleColor = (role: string) => ({
        admin: 'bg-red-900 text-red-300', support: 'bg-blue-900 text-blue-300',
        suspended: 'bg-gray-700 text-gray-400', user: 'bg-green-900 text-green-300'
    }[role] ?? 'bg-gray-700 text-gray-300')

    if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-xl">Cargando...</div>

    const tabs: { id: Tab; label: string }[] = [
        { id: 'metrics', label: '📊 Métricas' }, { id: 'users', label: '👥 Usuarios' },
        { id: 'logs', label: '📋 Audit Log' }, { id: 'system', label: '🔒 Seguridad' },
        { id: 'broadcast', label: '📢 Broadcast' }
    ]

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto p-4 md:p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black">🛡️ Panel Admin</h1>
                        <p className="text-gray-400 text-sm mt-1">Finnova — Control total</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => exportCSV('users')} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs">⬇ CSV Usuarios</button>
                        <button onClick={() => router.push('/dashboard')} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs">← Dashboard</button>
                    </div>
                </div>

                {actionMsg && <div className="mb-4 px-4 py-3 bg-emerald-800 text-emerald-200 rounded-lg text-sm">{actionMsg}</div>}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── MÉTRICAS ── */}
                {tab === 'metrics' && metrics && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Total Usuarios', value: metrics.users.total, icon: '👥', color: 'from-blue-700 to-blue-800' },
                                { label: 'Activos 30d', value: metrics.users.active30d, icon: '🟢', color: 'from-emerald-700 to-emerald-800' },
                                { label: 'Nuevos 7d', value: metrics.users.newLast7d, icon: '✨', color: 'from-purple-700 to-purple-800' },
                                { label: 'Suspendidos', value: metrics.users.suspended, icon: '🚫', color: 'from-red-700 to-red-800' },
                            ].map(k => (
                                <div key={k.label} className={`bg-gradient-to-br ${k.color} p-4 rounded-xl`}>
                                    <div className="text-xl mb-1">{k.icon}</div>
                                    <div className="text-3xl font-black">{k.value}</div>
                                    <div className="text-xs opacity-80 mt-1">{k.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Volumen financiero */}
                            <div className="bg-gray-800 rounded-xl p-5">
                                <h2 className="font-bold mb-3">💰 Volumen Financiero</h2>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Ingresos totales', value: metrics.transactions.totalIncomeAmount, color: 'text-green-400', count: metrics.transactions.totalIncomes },
                                        { label: 'Gastos totales', value: metrics.transactions.totalExpenseAmount, color: 'text-red-400', count: metrics.transactions.totalExpenses },
                                        { label: 'Balance neto', value: metrics.transactions.netBalance, color: metrics.transactions.netBalance >= 0 ? 'text-emerald-400' : 'text-red-400', count: metrics.transactions.totalDebts },
                                    ].map(r => (
                                        <div key={r.label} className="flex justify-between items-center bg-gray-700 px-4 py-3 rounded-lg">
                                            <div>
                                                <p className="text-xs text-gray-400">{r.label}</p>
                                                <p className={`text-lg font-bold ${r.color}`}>{formatCOP(r.value)}</p>
                                            </div>
                                            <span className="text-xs text-gray-500">{r.count} reg.</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top categorías */}
                            <div className="bg-gray-800 rounded-xl p-5">
                                <h2 className="font-bold mb-3">🏷️ Top Categorías de Gasto</h2>
                                <div className="space-y-2">
                                    {metrics.topCategories.map((c, i) => (
                                        <div key={c.category} className="flex items-center gap-3">
                                            <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>{c.category}</span>
                                                    <span className="text-red-400">{formatCOP(c.total)}</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-red-500 h-1.5 rounded-full"
                                                        style={{ width: `${Math.min(100, (c.total / metrics.topCategories[0].total) * 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Gráficas de actividad */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[
                                { title: '📈 Registros últimos 30d', data: metrics.registrationsByDay, color: 'bg-emerald-500' },
                                { title: '🔑 Logins últimos 7d', data: metrics.loginsByDay, color: 'bg-blue-500' },
                            ].map(chart => (
                                <div key={chart.title} className="bg-gray-800 rounded-xl p-5">
                                    <h2 className="font-bold mb-4">{chart.title}</h2>
                                    {chart.data.length === 0
                                        ? <p className="text-gray-500 text-sm">Sin datos</p>
                                        : <div className="flex items-end gap-1 h-20">
                                            {chart.data.map(d => {
                                                const max = Math.max(...chart.data.map(x => x.count), 1)
                                                return (
                                                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                                                        <span className="text-xs text-gray-500">{d.count}</span>
                                                        <div className={`w-full ${chart.color} rounded-t`} style={{ height: `${Math.max(4, (d.count / max) * 64)}px` }} />
                                                        <span className="text-xs text-gray-600">{new Date(d.date).getDate()}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    }
                                </div>
                            ))}
                        </div>

                        {/* Roles */}
                        <div className="bg-gray-800 rounded-xl p-5">
                            <h2 className="font-bold mb-3">🎭 Distribución de Roles</h2>
                            <div className="flex flex-wrap gap-3">
                                {metrics.users.byRole.map(r => (
                                    <div key={r.role} className={`px-5 py-3 rounded-lg text-center ${roleColor(r.role)}`}>
                                        <div className="text-2xl font-black">{r.count}</div>
                                        <div className="text-xs capitalize">{r.role}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── USUARIOS ── */}
                {tab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <input value={search} onChange={e => { setSearch(e.target.value); setUserPage(1) }}
                                placeholder="Buscar nombre o email..."
                                className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" />
                            <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setUserPage(1) }}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                                <option value="">Todos los roles</option>
                                {['user', 'admin', 'support', 'suspended'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button onClick={loadUsers} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm">Buscar</button>
                        </div>

                        <div className="text-xs text-gray-500">{userTotal} usuarios encontrados</div>

                        <div className="bg-gray-800 rounded-xl overflow-x-auto">
                            <table className="w-full text-sm min-w-[700px]">
                                <thead className="bg-gray-700">
                                    <tr>{['Nombre', 'Email', 'Rol', 'Plan', 'Último login', 'Transacciones', 'Estado', 'Acciones'].map(h =>
                                        <th key={h} className="px-3 py-3 text-left text-gray-300 font-semibold text-xs">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-750 cursor-pointer"
                                            onClick={() => loadUserDetail(u.id)}>
                                            <td className="px-3 py-3 font-medium">{u.name}</td>
                                            <td className="px-3 py-3 text-gray-400 text-xs">{u.email}</td>
                                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                                <select value={u.role}
                                                    onChange={e => doAction(`/admin/users/${u.id}/role`, 'patch', { role: e.target.value })}
                                                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs">
                                                    {['user', 'admin', 'support', 'suspended'].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.plan === 'business' ? 'bg-violet-900 text-violet-300' :
                                                    u.plan === 'pro' ? 'bg-emerald-900 text-emerald-300' :
                                                        'bg-gray-700 text-gray-400'
                                                    }`}>
                                                    {u.plan === 'business' ? '🚀 Business' : u.plan === 'pro' ? '⭐ Pro' : '🆓 Free'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-gray-400 text-xs">{formatDate(u.lastLoginAt)}</td>
                                            <td className="px-3 py-3 text-center text-gray-300">{u.transactionCount}</td>
                                            <td className="px-3 py-3">
                                                {u.isLocked
                                                    ? <span className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs">🔒 Bloqueado</span>
                                                    : u.role === 'suspended'
                                                        ? <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">🚫 Suspendido</span>
                                                        : <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">✅ Activo</span>}
                                            </td>
                                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex gap-1 flex-wrap">
                                                    {u.isLocked && <button onClick={() => doAction(`/admin/users/${u.id}/unlock`, 'post')}
                                                        className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs">Desbloquear</button>}
                                                    {u.role !== 'suspended'
                                                        ? <button onClick={() => doAction(`/admin/users/${u.id}/suspend`, 'post', {}, `¿Suspender a ${u.name}?`)}
                                                            className="px-2 py-1 bg-orange-700 hover:bg-orange-600 rounded text-xs">Suspender</button>
                                                        : <button onClick={() => doAction(`/admin/users/${u.id}/reactivate`, 'post')}
                                                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs">Reactivar</button>}
                                                    <button onClick={() => doAction(`/admin/users/${u.id}/force-logout`, 'post')}
                                                        className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs">Logout</button>
                                                    <button onClick={() => doAction(`/admin/users/${u.id}`, 'delete', {}, `¿ELIMINAR PERMANENTEMENTE a ${u.name}? Esta acción no se puede deshacer.`)}
                                                        className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs">Eliminar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div className="flex gap-2 justify-center">
                            <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)}
                                className="px-3 py-1 bg-gray-700 rounded text-sm disabled:opacity-40">← Anterior</button>
                            <span className="px-3 py-1 text-sm text-gray-400">Pág {userPage} / {Math.ceil(userTotal / 20)}</span>
                            <button disabled={userPage >= Math.ceil(userTotal / 20)} onClick={() => setUserPage(p => p + 1)}
                                className="px-3 py-1 bg-gray-700 rounded text-sm disabled:opacity-40">Siguiente →</button>
                        </div>
                    </div>
                )}

                {/* ── DETALLE USUARIO (modal) ── */}
                {selectedUser && (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                        <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedUser.user.name}</h2>
                                    <p className="text-gray-400 text-sm">{selectedUser.user.email}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${roleColor(selectedUser.user.role)}`}>{selectedUser.user.role}</span>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[
                                    { label: 'Ingresos', value: formatCOP(selectedUser.financials.totalIncome), color: 'text-green-400' },
                                    { label: 'Gastos', value: formatCOP(selectedUser.financials.totalExpenses), color: 'text-red-400' },
                                    { label: 'Balance', value: formatCOP(selectedUser.financials.balance), color: selectedUser.financials.balance >= 0 ? 'text-emerald-400' : 'text-red-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-gray-700 p-3 rounded-lg text-center">
                                        <p className="text-xs text-gray-400">{s.label}</p>
                                        <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-gray-400">
                                <div>Registrado: {formatDate(selectedUser.user.createdAt as any)}</div>
                                <div>Último login: {formatDate(selectedUser.user.lastLoginAt)}</div>
                                <div>Sesiones activas: {selectedUser.activeTokens}</div>
                                <div>Transacciones: {selectedUser.financials.incomeCount + selectedUser.financials.expenseCount}</div>
                            </div>

                            <h3 className="font-semibold text-sm mb-2">Actividad reciente</h3>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {selectedUser.recentActivity.map(l => (
                                    <div key={l.id} className={`flex gap-2 text-xs px-3 py-2 rounded ${l.success ? 'bg-gray-700' : 'bg-red-950/40'}`}>
                                        <span className="text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('es-CO')}</span>
                                        <span className="text-yellow-300">{l.action}</span>
                                        <span className="text-gray-400 truncate">{l.details || ''}</span>
                                    </div>
                                ))}
                            </div>

                            {/* ── Activar plan manualmente ── */}
                            <div className="mt-5 pt-4 border-t border-gray-700">
                                <h3 className="font-semibold text-sm mb-3">🎯 Activar Plan</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {(['free', 'pro', 'business'] as const).map(plan => (
                                        <button key={plan}
                                            onClick={() => doAction(`/admin/users/${selectedUser.user.id}/plan`, 'post', {
                                                plan, months: 1
                                            }, `¿Activar plan ${plan.toUpperCase()} para ${selectedUser.user.email}?`)}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${plan === 'free' ? 'bg-gray-600 hover:bg-gray-500 text-white' :
                                                plan === 'pro' ? 'bg-emerald-700 hover:bg-emerald-600 text-white' :
                                                    'bg-violet-700 hover:bg-violet-600 text-white'
                                                }`}>
                                            {plan === 'free' ? '🆓 Free' : plan === 'pro' ? '⭐ Pro' : '🚀 Business'}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Activa el plan inmediatamente por 1 mes sin cobro.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── AUDIT LOG ── */}
                {tab === 'logs' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <input value={logAction} onChange={e => { setLogAction(e.target.value); setLogPage(1) }}
                                placeholder="Filtrar acción (login, register...)"
                                className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" />
                            <select value={logSuccess} onChange={e => { setLogSuccess(e.target.value); setLogPage(1) }}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                                <option value="">Todos</option>
                                <option value="true">✅ Exitosos</option>
                                <option value="false">❌ Fallidos</option>
                            </select>
                            <button onClick={loadLogs} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm">Filtrar</button>
                            <button onClick={() => exportCSV('audit-logs')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">⬇ CSV</button>
                        </div>

                        <div className="text-xs text-gray-500">{logTotal} registros</div>

                        <div className="bg-gray-800 rounded-xl overflow-x-auto">
                            <table className="w-full text-xs min-w-[600px]">
                                <thead className="bg-gray-700">
                                    <tr>{['Fecha', 'Acción', 'Entidad', 'IP', 'Estado', 'Detalles'].map(h =>
                                        <th key={h} className="px-3 py-3 text-left text-gray-300 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {logs.map(l => (
                                        <tr key={l.id} className={`border-t border-gray-700 ${!l.success ? 'bg-red-950/20' : ''}`}>
                                            <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('es-CO')}</td>
                                            <td className="px-3 py-2 font-mono text-yellow-300">{l.action}</td>
                                            <td className="px-3 py-2 text-gray-300">{l.entity}</td>
                                            <td className="px-3 py-2 text-gray-500">{l.ipAddress || '-'}</td>
                                            <td className="px-3 py-2">{l.success ? '✅' : '❌'}</td>
                                            <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{l.details || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-2 justify-center">
                            <button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)}
                                className="px-3 py-1 bg-gray-700 rounded text-sm disabled:opacity-40">← Anterior</button>
                            <span className="px-3 py-1 text-sm text-gray-400">Pág {logPage} / {Math.ceil(logTotal / 50)}</span>
                            <button disabled={logPage >= Math.ceil(logTotal / 50)} onClick={() => setLogPage(p => p + 1)}
                                className="px-3 py-1 bg-gray-700 rounded text-sm disabled:opacity-40">Siguiente →</button>
                        </div>
                    </div>
                )}

                {/* ── SEGURIDAD ── */}
                {tab === 'system' && system && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Estado', value: system.status === 'healthy' ? '✅ Healthy' : '⚠️ Degraded', color: system.status === 'healthy' ? 'from-emerald-700 to-emerald-800' : 'from-yellow-700 to-yellow-800' },
                                { label: 'Errores 24h', value: system.errors24h, color: system.errors24h > 20 ? 'from-red-700 to-red-800' : 'from-gray-700 to-gray-800' },
                                { label: 'Logins última hora', value: system.loginsLastHour, color: 'from-blue-700 to-blue-800' },
                                { label: 'Sesiones activas', value: system.activeTokens, color: 'from-purple-700 to-purple-800' },
                            ].map(k => (
                                <div key={k.label} className={`bg-gradient-to-br ${k.color} p-4 rounded-xl`}>
                                    <div className="text-2xl font-black">{k.value}</div>
                                    <div className="text-xs opacity-80 mt-1">{k.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-800 rounded-xl p-5">
                            <h2 className="font-bold mb-3">🚨 Logins fallidos 24h: <span className="text-red-400">{system.failedLogins24h}</span></h2>
                            {system.suspiciousIps.length === 0
                                ? <p className="text-gray-500 text-sm">No se detectaron IPs sospechosas en la última hora.</p>
                                : <>
                                    <p className="text-yellow-400 text-sm mb-3">⚠️ IPs con múltiples intentos fallidos en la última hora:</p>
                                    <div className="space-y-2">
                                        {system.suspiciousIps.map(s => (
                                            <div key={s.ip} className="flex justify-between items-center bg-red-950/40 border border-red-800 px-4 py-3 rounded-lg">
                                                <span className="font-mono text-sm text-red-300">{s.ip}</span>
                                                <span className="text-red-400 font-bold">{s.attempts} intentos</span>
                                            </div>
                                        ))}
                                    </div>
                                </>}
                        </div>

                        <button onClick={() => { loadAll(); notify('Estado actualizado') }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
                            🔄 Actualizar estado
                        </button>
                        <button onClick={async () => {
                            try {
                                const r = await api.get('/admin/email-status')
                                const d = r.data
                                notify(`Email: user=${d.smtpUser} | pwd=${d.passwordHint} | configured=${d.isConfigured}`)
                            } catch { notify('Error al obtener estado del email') }
                        }} className="px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg text-sm">
                            📧 Diagnóstico Email
                        </button>
                        <button onClick={async () => {
                            const email = prompt('Email de destino para la prueba:')
                            if (!email) return
                            try {
                                const r = await api.post('/admin/email-test', { toEmail: email })
                                notify(r.data.message)
                            } catch (e: any) { notify(e.response?.data?.error || 'Error enviando email') }
                        }} className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 rounded-lg text-sm">
                            ✉️ Enviar Email de Prueba
                        </button>
                    </div>
                )}

                {/* ── BROADCAST ── */}
                {tab === 'broadcast' && (
                    <div className="max-w-xl space-y-4">
                        <div className="bg-gray-800 rounded-xl p-6">
                            <h2 className="font-bold text-lg mb-4">📢 Enviar alerta a todos los usuarios</h2>
                            <p className="text-gray-400 text-sm mb-4">El mensaje aparecerá en el dashboard de cada usuario activo.</p>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Severidad</label>
                                    <select value={broadcast.severity} onChange={e => setBroadcast(b => ({ ...b, severity: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                                        <option value="Info">ℹ️ Info</option>
                                        <option value="Warning">⚠️ Warning</option>
                                        <option value="Critical">🚨 Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Mensaje *</label>
                                    <input value={broadcast.message} onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))}
                                        placeholder="Ej: Mantenimiento programado el sábado..."
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Detalles (opcional)</label>
                                    <textarea value={broadcast.details} onChange={e => setBroadcast(b => ({ ...b, details: e.target.value }))}
                                        rows={3} placeholder="Información adicional..."
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none" />
                                </div>
                                <button onClick={sendBroadcast} disabled={!broadcast.message.trim()}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg font-bold text-sm transition">
                                    📢 Enviar a todos los usuarios
                                </button>
                                {broadcastSent && <p className="text-emerald-400 text-sm text-center">✅ Alerta enviada correctamente</p>}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
