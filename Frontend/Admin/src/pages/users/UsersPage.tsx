import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Plus, Search, Edit, Trash2, Save, Key, Eye, EyeOff, Lock, Shield, Loader2, Info, Lightbulb, ArrowRight } from 'lucide-react'
import { Button, Input, Select, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { userService } from '@/services/userService'
import { roleService } from '@/services/roleService'

type User = {
  id: string
  name: string
  email: string
  type: 'SUPER_ADMIN' | 'STAFF' | 'MANAGER'
  roles: string[]
  status: 'ACTIVE' | 'INACTIVE'
  lastLogin: string
  canLogin: boolean
  avatar?: string
}

const AVATAR_GRADIENTS = [
  'from-orbit-primary to-indigo-600',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-purple-600 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-red-600',
  'from-violet-600 to-purple-800',
  'from-sky-500 to-indigo-700'
]

function getUserAvatarStyle(str: string) {
  let hash = 0
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

function getUserInitials(name: string) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return parts[0].substring(0, 2).toUpperCase()
}

export function UsersPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isResetPassOpen, setIsResetPassOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    avatar: '',
    password: '',
    confirmPassword: '',
    type: 'STAFF' as 'SUPER_ADMIN' | 'STAFF' | 'MANAGER',
    role: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })

  const [resetPasswordState, setResetPasswordState] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  // Show/Hide password toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [roleOptions, setRoleOptions] = useState<string[]>([])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const data = await userService.fetchUsers()
      if (Array.isArray(data)) {
        const mapped: User[] = data.map((u: any) => {
          const rolesArray = Array.isArray(u.roles) && u.roles.length > 0
            ? u.roles
            : u.role
            ? [u.role]
            : ['Staff']
          return {
            id: u._id || u.id || Math.random().toString(36).substring(2, 9),
            name: u.name || 'Unnamed User',
            email: u.email || '',
            type: u.type || (u.role === 'Super Admin' || u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'STAFF'),
            roles: rolesArray,
            status: u.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            lastLogin: u.lastLogin || (u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : 'Never'),
            canLogin: u.canLogin ?? true,
            avatar: u.avatar || u.avatarUrl || ''
          }
        })
        setUsers(mapped)
      } else {
        setUsers([])
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch users', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const data = await roleService.fetchRoles()
      if (Array.isArray(data)) {
        const names = data.map((r: any) => r.name)
        setRoleOptions(names)
        return names
      }
    } catch (err) {
      console.warn('Could not fetch dynamic roles:', err)
    }
    setRoleOptions([])
    return []
  }

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.roles || []).some(r => (r || '').toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const openAdd = async () => {
    await loadRoles()
    setForm({
      name: '',
      email: '',
      avatar: '',
      password: '',
      confirmPassword: '',
      type: 'STAFF',
      role: '',
      status: 'ACTIVE'
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setIsAddOpen(true)
  }

  const openEdit = async (u: User) => {
    const roles = await loadRoles()
    setSelectedUser(u)
    const currentRole = (u.roles && u.roles.length > 0) ? u.roles[0] : (roles[0] || '')
    setForm({
      name: u.name || '',
      email: u.email || '',
      avatar: u.avatar || '',
      password: '',
      confirmPassword: '',
      type: u.type || 'STAFF',
      role: currentRole,
      status: u.status || 'ACTIVE'
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setIsEditOpen(true)
  }

  const openResetPass = (u: User) => {
    setSelectedUser(u)
    setResetPasswordState({ newPassword: '', confirmPassword: '' })
    setShowPassword(false)
    setIsResetPassOpen(true)
  }

  const openDelete = (u: User) => {
    if (u.type === 'SUPER_ADMIN' || u.email === 'akhil1842002@gmail.com') {
      showToast('Security Alert: Super Admin accounts cannot be deleted.', 'error')
      return
    }
    if (currentUser && (u.id === (currentUser as any)._id || u.id === (currentUser as any).id || u.email === currentUser.email)) {
      showToast('Security Alert: You cannot delete your own active user account.', 'error')
      return
    }
    setSelectedUser(u)
    setIsDeleteOpen(true)
  }

  // Password strength score
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' }
    if (pwd.length < 6) return { score: 25, label: 'Too short (min 6 chars)', color: 'text-rose-500 bg-rose-500' }
    let score = 50
    if (/[A-Z]/.test(pwd)) score += 15
    if (/[0-9]/.test(pwd)) score += 15
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20
    if (score <= 50) return { score, label: 'Fair Password', color: 'text-amber-500 bg-amber-500' }
    if (score <= 75) return { score, label: 'Strong Password', color: 'text-blue-500 bg-blue-500' }
    return { score: 100, label: 'Excellent & Secure', color: 'text-emerald-500 bg-emerald-500' }
  }

  const handleToggleUserStatus = async (targetUser: User) => {
    if (targetUser.type === 'SUPER_ADMIN' || targetUser.email === 'akhil1842002@gmail.com') {
      showToast('Super Admin accounts cannot be deactivated', 'error')
      return
    }
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await userService.updateUser(targetUser.id, { status: newStatus })
      showToast(`User account "${targetUser.name}" status updated to ${newStatus}`, 'success')
      loadUsers()
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error')
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.password) {
      showToast('Password is required for new staff accounts', 'error')
      return
    }
    if (form.password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error')
      return
    }
    if (form.password !== form.confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    try {
      await userService.createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        type: form.type,
        role: form.role,
        status: form.status,
        ...(form.avatar ? { avatar: form.avatar } : {})
      } as any)
      showToast(`Staff user "${form.name}" created with login credentials!`, 'success')
      setIsAddOpen(false)
      loadUsers()
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      await userService.updateUser(selectedUser.id, {
        name: form.name,
        email: form.email,
        type: form.type,
        role: form.role,
        status: form.status,
        ...(form.avatar ? { avatar: form.avatar } : {})
      } as any)
      showToast(`User account "${form.name}" updated`, 'success')
      setIsEditOpen(false)
      loadUsers()
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error')
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    if (!resetPasswordState.newPassword) {
      showToast('Please enter a new password', 'error')
      return
    }
    if (resetPasswordState.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }
    if (resetPasswordState.newPassword !== resetPasswordState.confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    try {
      await userService.resetPassword(selectedUser.id, resetPasswordState.newPassword)
      showToast(`Login password updated for ${selectedUser.name}`, 'success')
      setIsResetPassOpen(false)
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    try {
      await userService.deleteUser(selectedUser.id)
      showToast(`User "${selectedUser.name}" account removed`, 'info')
      setIsDeleteOpen(false)
      loadUsers()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error')
    }
  }

  const PAGE_SIZE = 5
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const strengthInfo = getPasswordStrength(form.password)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <UserCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User &amp; Staff Login Management</h1>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-orbit-primary/10 text-orbit-primary hover:bg-orbit-primary/20 dark:bg-orbit-primary/20 dark:text-orbit-primary-light transition-all border border-orbit-primary/30 shadow-sm"
              title="How to manage Users & Staff Access"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Users Guide</span>
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Create user accounts, set mandatory login passwords, and assign RBAC authorization roles
          </p>
        </div>

        <Button
          onClick={openAdd}
          className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 text-sm font-semibold py-2.5 px-5"
        >
          <Plus className="w-4 h-4" /> Create User &amp; Password
        </Button>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search by user name, email, or role..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[850px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">User Identity</th>
                <th className="px-6 py-4">Assigned Role</th>
                <th className="px-6 py-4">Login Access &amp; Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
                    Loading users...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <EmptyState
                  colSpan={5}
                  title="No Users Found"
                  description="There are no staff or admin user accounts created."
                  actionLabel="Create User & Password"
                  onAction={openAdd}
                />
              ) : (
                paginated.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getUserAvatarStyle(user.email || user.name)} text-white font-bold flex items-center justify-center text-xs shadow-sm border border-white/20 shrink-0 overflow-hidden relative group`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{getUserInitials(user.name)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{user.name}</p>
                          {user.type === 'SUPER_ADMIN' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20 dark:bg-orbit-primary/20 dark:text-orbit-primary-light">
                              Super Admin
                            </span>
                          )}
                          {user.type === 'MANAGER' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400">
                              Manager
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(user.roles || []).map(r => (
                      <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Shield className="w-3 h-3 text-orbit-primary-light" /> {r}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ToggleSwitch
                      checked={user.status === 'ACTIVE'}
                      onChange={() => handleToggleUserStatus(user)}
                      activeText="Active"
                      inactiveText="Blocked"
                      disabled={user.type === 'SUPER_ADMIN' || user.email === 'akhil1842002@gmail.com'}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openResetPass(user)}
                        title="Reset Password"
                        className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(user)}
                        title="Edit User"
                        className="p-1.5 text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light rounded-lg hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/20 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.type !== 'SUPER_ADMIN' && user.email !== 'akhil1842002@gmail.com' && (currentUser?.email !== user.email) ? (
                        <button
                          onClick={() => openDelete(user)}
                          title="Delete User"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span title="Protected Account (Cannot be deleted)" className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-orbit-border">
          <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="lg" title="Create User Account" subtitle="Fill in user identity and set initial password">
        <form noValidate onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Ramesh Kumar"
            required
          />
          <Input
            label="Email Address (Username)"
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="ramesh@pharmacy.com"
            required
          />
          <Input
            label="Profile Picture / Avatar URL (Optional)"
            value={form.avatar}
            onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))}
            placeholder="https://example.com/avatar.jpg"
          />

          <Select
            label="Authorization Role"
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            placeholder="Select authorization role..."
            options={roleOptions.map(r => ({ label: r, value: r }))}
            required
          />

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <ToggleSwitch
              label="Account Access Status"
              checked={form.status === 'ACTIVE'}
              onChange={val => setForm(p => ({ ...p, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              activeText="Active (Login Enabled)"
              inactiveText="Blocked (Login Disabled)"
            />
          </div>

          <div className="border-t border-slate-200 dark:border-orbit-border pt-4">
            <h3 className="text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light uppercase tracking-wider mb-3">Set Initial Login Password</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Repeat password"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {form.password && (
              <div className="mt-2.5">
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${strengthInfo.color}`} style={{ width: `${strengthInfo.score}%` }} />
                </div>
                <p className={`text-[11px] font-semibold mt-1 ${strengthInfo.color.split(' ')[0]}`}>{strengthInfo.label}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Create User &amp; Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="lg" title="Edit User Account" subtitle={`Updating details for ${selectedUser?.name}`}>
        <form noValidate onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
          />
          <Input
            label="Profile Picture / Avatar URL (Optional)"
            value={form.avatar}
            onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))}
            placeholder="https://example.com/avatar.jpg"
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Authorization Role *</label>
            <select
              value={form.role}
              disabled={!!(selectedUser && currentUser && (selectedUser.email === currentUser.email || selectedUser.id === currentUser._id))}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {roleOptions.length === 0 ? (
                <option value="">No created roles available</option>
              ) : (
                roleOptions.map(r => <option key={r} value={r}>{r}</option>)
              )}
            </select>
            {selectedUser && currentUser && (selectedUser.email === currentUser.email || selectedUser.id === currentUser._id) && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Security Policy: You cannot modify your own assigned authorization role.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <ToggleSwitch
              label="Account Access Status"
              checked={form.status === 'ACTIVE'}
              onChange={val => setForm(p => ({ ...p, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              activeText="Active (Login Enabled)"
              inactiveText="Blocked (Login Disabled)"
              disabled={selectedUser?.type === 'SUPER_ADMIN' || selectedUser?.email === 'akhil1842002@gmail.com'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={isResetPassOpen} onClose={() => setIsResetPassOpen(false)} size="sm" title="Reset User Password" subtitle={`Update login password for ${selectedUser?.name}`}>
        <form noValidate onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">New Password *</label>
            <input
              type="password"
              value={resetPasswordState.newPassword}
              onChange={e => setResetPasswordState(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="Enter new password"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password *</label>
            <input
              type="password"
              value={resetPasswordState.confirmPassword}
              onChange={e => setResetPasswordState(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsResetPassOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-lg shadow-amber-500/20">
              <Key className="w-4 h-4" /> Reset Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Delete User Account" subtitle="This action cannot be undone">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Are you sure you want to delete user account <span className="font-bold text-slate-900 dark:text-slate-100">{selectedUser?.name}</span> ({selectedUser?.email})?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2"><Trash2 className="w-4 h-4" /> Delete User</Button>
        </div>
      </Modal>

      {/* How to Use User Management & Access Guide Modal */}
      <Modal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="How to Manage Users & Staff Access Guide"
        size="3xl"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-orbit-primary shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">User & Role Security Workflow</p>
              Follow these simple steps to configure security roles, register store staff accounts, set initial passwords, and manage access permissions.
            </div>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Step 1: Configure Custom Roles & Permissions</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/users/roles') }} className="text-xs gap-1.5 text-orbit-primary hover:text-orbit-primary">
                  Go to Roles Matrix <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Before creating staff accounts, define custom RBAC Security Roles (e.g. Senior Pharmacist, POS Cashier, Inventory Manager) with explicit feature permissions.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Step 2: Create User Account & Set Password</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); openAdd() }} className="text-xs gap-1.5 text-emerald-600 hover:text-emerald-700">
                  <Plus className="w-3 h-3" /> Create User
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Click <span className="font-semibold text-orbit-primary">+ Create User & Password</span>, provide full name, work email address, and set a strong initial login password.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Step 3: Assign User Types & RBAC Security Role</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">User Form</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Select user account type (Super Admin, Manager, or Staff) and attach one or more active security roles to grant precise page & feature access.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">4</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Step 4: Password Resets & Access Control</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Table Actions</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Use the <span className="font-medium text-amber-600">Key icon</span> to issue instant password resets for employees, or toggle account status between Active and Inactive to revoke login access immediately.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsGuideOpen(false)} className="bg-orbit-primary text-white font-semibold">
              Got It, Thanks!
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
