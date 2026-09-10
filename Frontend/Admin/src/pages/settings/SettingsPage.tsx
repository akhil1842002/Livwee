import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Monitor, User, Bell, Shield, Save, Camera, Palette, Lock, AlertTriangle, LogOut, Check, Eye, EyeOff, Upload, Trash2, Link, Image as ImageIcon } from 'lucide-react'
import { Button, Input, Badge, Modal } from '@/components/ui'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/utils/cn'
import { getUserAvatar, setUserAvatar } from '@/utils/avatarUtils'
import { ACCENT_COLORS, Accent, getUserAccent, applyAccent } from '@/utils/themeUtils'

type ThemeOption = 'dark' | 'light' | 'system'

const NOTIFS_KEY = 'medikit-notifications'

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-primary cursor-pointer',
        checked ? 'bg-orbit-primary' : 'bg-slate-200 dark:bg-orbit-surface3'
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  index = 0,
  className = '',
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
  index?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={cn(
        'bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl shadow-sm overflow-hidden flex flex-col',
        className
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-orbit-border">
        <div className="p-2 rounded-xl bg-orbit-primary/10 flex-shrink-0">
          <Icon className="w-4 h-4 text-orbit-primary-light" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-5 py-5 flex-1">
        {children}
      </div>
    </motion.div>
  )
}

// ─── Row item helper ──────────────────────────────────────────────────────────
function SettingRow({
  label,
  description,
  action,
  divider = true,
}: {
  label: string
  description?: string
  action: React.ReactNode
  divider?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3.5', divider && 'border-b border-slate-100 dark:border-orbit-border last:border-0')}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{label}</p>
        {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { theme, toggle } = useTheme()
  const { user, updateUser, updateProfileApi, changePasswordApi } = useAuth()
  const { showToast } = useToast()

  const [themeOption, setThemeOption] = useState<ThemeOption>(theme)
  const [accent, setAccent] = useState<Accent>(() => getUserAccent(user?.email))

  // User Profile
  const [name, setName] = useState(user?.name || 'Super Admin')
  const [email, setEmail] = useState(user?.email || 'admin@livwee.com')
  const [saved, setSaved] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPass, setIsChangingPass] = useState(false)

  // Avatar / DP State
  const [avatarUrl, setAvatarUrl] = useState<string>(() => getUserAvatar(user?.email))
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAvatarUrl(getUserAvatar(user?.email))
  }, [user?.email])

  const updateAvatar = (newUrl: string) => {
    const targetEmail = user?.email || email || 'default'
    setUserAvatar(targetEmail, newUrl)
    setAvatarUrl(newUrl)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      updateAvatar(result)
      showToast('Profile display picture updated!', 'success')
      setIsAvatarModalOpen(false)
    }
    reader.readAsDataURL(file)
  }

  const handleUrlSave = () => {
    if (!avatarUrlInput.trim()) {
      showToast('Please enter a valid image URL', 'error')
      return
    }
    updateAvatar(avatarUrlInput.trim())
    showToast('Display picture updated from URL!', 'success')
    setIsAvatarModalOpen(false)
    setAvatarUrlInput('')
  }

  const handleRemoveAvatar = () => {
    updateAvatar('')
    showToast('Display picture removed', 'info')
    setIsAvatarModalOpen(false)
  }

  // Notifications
  const [notifications, setNotifications] = useState(() => {
    const savedNotifs = localStorage.getItem(NOTIFS_KEY)
    return savedNotifs ? JSON.parse(savedNotifs) : { email: true, push: false, digest: true, security: true }
  })

  // Security Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)

  // Password Form
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)

  // Account delete confirm
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name)
      if (user.email) setEmail(user.email)
    }
  }, [user])

  useEffect(() => {
    const current = getUserAccent(user?.email)
    setAccent(current)
    applyAccent(current, user?.email)
  }, [user?.email])

  const handleTheme = (opt: ThemeOption) => {
    setThemeOption(opt)
    if (opt !== 'system') {
      const wantDark = opt === 'dark'
      if (wantDark !== (theme === 'dark')) toggle()
    }
    showToast(`Theme switched to ${opt} mode`, 'info')
  }

  const handleAccent = async (c: Accent) => {
    setAccent(c)
    applyAccent(c, user?.email || email)
    showToast(`Accent color updated to ${c.name}`, 'success')
    try {
      await updateProfileApi(name.trim(), email.trim(), c.primary, avatarUrl)
    } catch (err) {
      console.warn('Could not persist accent to DB:', err)
    }
  }

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      showToast('Display name and email are required', 'error')
      return
    }
    try {
      setIsSavingProfile(true)
      await updateProfileApi(name.trim(), email.trim(), accent.primary, avatarUrl)
      updateUser({ name: name.trim(), email: email.trim(), avatar: avatarUrl, accentColor: accent.primary })
      setSaved(true)
      showToast('Profile and preferences saved to database!', 'success')
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleToggleNotif = (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value }
    setNotifications(updated)
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated))
    showToast(`Notification preference updated`, 'info')
  }

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passForm.currentPassword || !passForm.newPassword) {
      showToast('Please enter both current and new password', 'error')
      return
    }
    if (passForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error')
      return
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      showToast('New passwords do not match', 'error')
      return
    }

    try {
      setIsChangingPass(true)
      await changePasswordApi(passForm.currentPassword, passForm.newPassword)
      showToast('Password changed successfully in database!', 'success')
      setIsPasswordModalOpen(false)
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error')
    } finally {
      setIsChangingPass(false)
    }
  }

  const handleSignOutAllSessions = () => {
    showToast('Signed out of all other active browser sessions.', 'info')
  }

  const handleDeleteAccountConfirm = () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('Please type "DELETE" to confirm account deletion', 'error')
      return
    }
    showToast('Account deletion request queued.', 'warning')
    setIsDeleteModalOpen(false)
  }

  const themeOpts: { value: ThemeOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-orbit-bg">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Account &amp; User Settings</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20 dark:bg-orbit-primary/20 dark:text-orbit-primary-light">
                {user?.type || 'ACTIVE USER'}
              </span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Manage your personal profile, display picture, password, theme appearance, and security preferences
            </p>
          </div>
        </div>

        {/* ── Grid layout ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Profile card (full width) ─────────────────────────────────── */}
          <SectionCard
            icon={User}
            title="Profile"
            description="Your display name and admin account identity"
            index={0}
            className="lg:col-span-2"
          >
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Avatar / DP */}
              <div className="relative flex-shrink-0 group">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orbit-primary to-orbit-primary-light flex items-center justify-center text-white text-2xl font-bold select-none shadow-md shadow-orbit-primary/30 overflow-hidden cursor-pointer relative ring-2 ring-white dark:ring-orbit-surface hover:opacity-95 transition-opacity"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Display Picture" className="w-full h-full object-cover" />
                  ) : (
                    name ? name.charAt(0).toUpperCase() : <User className="w-8 h-8 opacity-70" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-orbit-primary hover:bg-orbit-primary-light flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer text-white ring-2 ring-white dark:ring-orbit-surface"
                  title="Update Display Picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Fields + save */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Display name" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                <div className="sm:col-span-2 flex justify-end pt-1">
                  <Button size="sm" onClick={handleSaveProfile} disabled={isSavingProfile} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 font-medium shadow-md shadow-orbit-primary/30">
                    <Save className="w-3.5 h-3.5" /> {saved ? 'Saved!' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Appearance card ───────────────────────────────────────────── */}
          <SectionCard icon={Palette} title="Appearance" description="Customize theme and dynamic accent color" index={1}>

            {/* Theme selector */}
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Theme Mode</p>
            <div className="flex gap-2 flex-wrap mb-5">
              {themeOpts.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleTheme(opt.value)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer',
                    themeOption === opt.value
                      ? 'bg-orbit-primary/15 border-orbit-primary/40 text-orbit-primary-light shadow-sm font-bold'
                      : 'border-slate-200 dark:border-orbit-border text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-orbit-border2'
                  )}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Accent color */}
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Accent Primary Palette</p>
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.name}
                  title={c.name}
                  onClick={() => handleAccent(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer',
                    accent.primary === c.primary
                      ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-orbit-surface scale-110 shadow-md'
                      : 'hover:scale-105 opacity-60 hover:opacity-100'
                  )}
                  style={{ background: c.primary, '--tw-ring-color': c.primary } as React.CSSProperties}
                >
                  {accent.primary === c.primary && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Dynamically updates primary buttons, active side menus, badges, and focus rings app-wide.
            </p>

            {/* Live preview strip */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-orbit-surface2 border border-slate-100 dark:border-orbit-border">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2">Live UI Component Preview</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" className="bg-orbit-primary text-white">Primary Button</Button>
                <Button variant="outline" size="sm">Outline Button</Button>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white shadow-sm" style={{ background: accent.primary }}>
                  {accent.name} Badge
                </span>
              </div>
            </div>
          </SectionCard>

          {/* ── Notifications card ────────────────────────────────────────── */}
          <SectionCard icon={Bell} title="Notifications" description="Control how you receive alerts and digests" index={2}>
            {[
              { key: 'email'    as const, label: 'Email notifications',  desc: 'Receive transaction alerts and invoice updates' },
              { key: 'push'     as const, label: 'Push notifications',   desc: 'Real-time in-app browser popups for stock alerts' },
              { key: 'digest'   as const, label: 'Weekly digest',        desc: 'Summary of weekly sales and turnover metrics' },
              { key: 'security' as const, label: 'Security alerts',      desc: 'Immediate notifications on new sign-ins' },
            ].map(item => (
              <SettingRow
                key={item.key}
                label={item.label}
                description={item.desc}
                action={
                  <Toggle
                    checked={notifications[item.key]}
                    onChange={v => handleToggleNotif(item.key, v)}
                  />
                }
              />
            ))}
          </SectionCard>

          {/* ── Security card ─────────────────────────────────────────────── */}
          <SectionCard icon={Shield} title="Security" description="Password, 2FA, and account protection" index={3}>
            <SettingRow
              label="Password"
              description="Keep your account secure with regular updates"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="gap-1.5"
                >
                  <Lock className="w-3 h-3" /> Change
                </Button>
              }
            />
            <SettingRow
              label="Two-Factor Authentication (2FA)"
              description="Add an extra layer of protection for admin login"
              action={
                <div className="flex items-center gap-2">
                  <Badge variant={is2FAEnabled ? 'success' : 'danger'}>{is2FAEnabled ? 'Active' : 'Off'}</Badge>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIs2FAEnabled(prev => !prev)
                      showToast(is2FAEnabled ? '2FA disabled' : '2FA enabled successfully', is2FAEnabled ? 'info' : 'success')
                    }}
                    className="gap-1.5 bg-orbit-primary text-white"
                  >
                    <Shield className="w-3 h-3" /> {is2FAEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              }
            />
            <SettingRow
              label="Active Sessions"
              description="Sign out all active logins on other browsers"
              action={
                <Button variant="outline" size="sm" onClick={handleSignOutAllSessions} className="gap-1.5">
                  <LogOut className="w-3 h-3" /> Sign Out All
                </Button>
              }
            />
            <SettingRow
              label="Danger Zone"
              description="Permanently delete account and data"
              divider={false}
              action={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDeleteConfirmText(''); setIsDeleteModalOpen(true) }}
                  className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white"
                >
                  <AlertTriangle className="w-3 h-3" /> Delete Account
                </Button>
              }
            />
          </SectionCard>

        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        size="md"
        title="Change Password"
        subtitle="Update your security password"
      >
        <form noValidate onSubmit={handleChangePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Current Password *</label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={passForm.currentPassword}
                onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                className="w-full h-10 px-3.5 pr-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">New Password *</label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={passForm.newPassword}
                onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
                className="w-full h-10 px-3.5 pr-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password *</label>
            <input
              type="password"
              value={passForm.confirmPassword}
              onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isChangingPass} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-md shadow-orbit-primary/30">
              <Lock className="w-4 h-4" /> Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        size="md"
        title="Delete Account"
        subtitle="This action will permanently delete user records"
      >
        <div className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Danger Zone Warning</p>
              <p className="mt-1 leading-relaxed">
                Deactivating this admin account will revoke access to the pharmacy portal.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleDeleteAccountConfirm} className="bg-rose-600 hover:bg-rose-500 text-white gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Delete Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Avatar Modal */}
      <Modal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        size="md"
        title="Update Display Picture"
        subtitle="Upload a profile photo or paste an image link"
      >
        <div className="space-y-5">
          {/* Current DP Preview */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50 dark:bg-orbit-surface2 border border-slate-100 dark:border-orbit-border">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orbit-primary to-orbit-primary-light flex items-center justify-center text-white text-3xl font-bold select-none shadow-lg shadow-orbit-primary/30 overflow-hidden mb-3 ring-4 ring-white dark:ring-orbit-surface">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                name ? name.charAt(0).toUpperCase() : <User className="w-10 h-10 opacity-70" />
              )}
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{name}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{email}</p>
          </div>

          {/* Upload Button */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Option 1: Upload from Device</label>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 py-2.5 shadow-md shadow-orbit-primary/30 font-medium text-xs"
            >
              <Upload className="w-4 h-4" /> Select Photo File (PNG, JPG, WEBP)
            </Button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-orbit-border w-full" />
            <span className="bg-white dark:bg-orbit-surface px-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider">OR</span>
          </div>

          {/* Image URL Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Option 2: Image Web URL</label>
            <div className="flex gap-2">
              <Input
                value={avatarUrlInput}
                onChange={e => setAvatarUrlInput(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleUrlSave}
                className="gap-1.5 font-medium"
              >
                <Link className="w-3.5 h-3.5 text-orbit-primary-light" /> Apply
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-orbit-border">
            {avatarUrl ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveAvatar}
                className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove DP
              </Button>
            ) : <div />}
            <Button variant="outline" size="sm" onClick={() => setIsAvatarModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
