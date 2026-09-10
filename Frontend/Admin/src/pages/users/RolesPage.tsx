import { useState, useMemo, useEffect } from 'react'
import {
  ShieldCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  Copy,
  CheckCircle2,
  Shield,
  Package,
  ShoppingCart,
  Receipt,
  Truck,
  Users,
  BarChart3,
  Lock,
  Sparkles,
  X,
  Check,
  Filter,
  Loader2,
  Info,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Pagination, EmptyState, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { roleService } from '@/services/roleService'

// ─── Types & Permission Modules ──────────────────────────────────────────────

export type PermissionItem = {
  id: string
  name: string
  description: string
}

export type PermissionModule = {
  id: string
  title: string
  description: string
  icon: any
  color: string
  permissions: PermissionItem[]
}

export type RoleColor = 'violet' | 'emerald' | 'blue' | 'amber' | 'rose' | 'cyan'

export type Role = {
  id: string
  name: string
  code: string
  description: string
  color: RoleColor
  usersCount: number
  isSystem: boolean
  permissions: string[]
}

// ─── Permissions Registry (32 Granular Permissions) ──────────────────────────

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'inventory',
    title: 'Products & Inventory',
    description: 'Manage medicine catalog, stock levels, batches, and warehouse locations',
    icon: Package,
    color: 'violet',
    permissions: [
      { id: 'products.view', name: 'View Products', description: 'Browse medicine list, formulas, and pricing' },
      { id: 'products.create', name: 'Create Products', description: 'Add new drugs, medical supplies, and items' },
      { id: 'products.update', name: 'Update Products', description: 'Modify pricing, formulations, and details' },
      { id: 'products.delete', name: 'Delete Products', description: 'Archive or remove product items' },
      { id: 'inventory.view', name: 'View Stock Levels', description: 'Inspect stock quantities across warehouses' },
      { id: 'inventory.adjust', name: 'Adjust Stock', description: 'Perform manual stock adjustments and audits' },
    ]
  },
  {
    id: 'pos',
    title: 'POS Counter & Retail Sales',
    description: 'Process retail counter sales, checkout, and prescription billing',
    icon: ShoppingCart,
    color: 'emerald',
    permissions: [
      { id: 'sales.view', name: 'View Sales History', description: 'Access transaction history and POS logs' },
      { id: 'sales.create', name: 'Process POS Sales', description: 'Create new counter sales and checkout' },
      { id: 'sales.cancel', name: 'Cancel Transactions', description: 'Cancel pending or active POS sales' },
      { id: 'sales.return', name: 'Process Returns', description: 'Issue customer refunds and item returns' },
    ]
  },
  {
    id: 'billing',
    title: 'Tax Invoices & Billing',
    description: 'Generate B2B tax invoices, manage GST filings, and record payments',
    icon: Receipt,
    color: 'blue',
    permissions: [
      { id: 'billing.view', name: 'View Invoices', description: 'View GST tax invoices and customer balances' },
      { id: 'billing.create', name: 'Issue Invoices', description: 'Create new B2B and credit invoices' },
      { id: 'billing.update', name: 'Update Invoice / Payments', description: 'Record partial/full payments and adjustments' },
      { id: 'billing.print', name: 'Print & Export Invoices', description: 'Print tax invoices and download receipts' },
    ]
  },
  {
    id: 'purchases',
    title: 'Suppliers & Purchases',
    description: 'Manage pharma suppliers, purchase orders, and stock receiving',
    icon: Truck,
    color: 'amber',
    permissions: [
      { id: 'suppliers.view', name: 'View Suppliers', description: 'Access supplier directory and contact profiles' },
      { id: 'suppliers.manage', name: 'Manage Suppliers', description: 'Create and update supplier records' },
      { id: 'purchases.view', name: 'View Purchase Orders', description: 'Browse stock replenishment orders' },
      { id: 'purchases.create', name: 'Create Purchase Order', description: 'Generate new supplier stock orders' },
      { id: 'purchases.receive', name: 'Receive Goods', description: 'Verify and check-in delivered shipments' },
    ]
  },
  {
    id: 'users',
    title: 'User Management & Roles',
    description: 'Manage admin users, staff login access, and RBAC security matrix',
    icon: Users,
    color: 'rose',
    permissions: [
      { id: 'users.view', name: 'View Users', description: 'See list of staff accounts and activity' },
      { id: 'users.create', name: 'Create Staff Users', description: 'Register new staff login credentials' },
      { id: 'users.update', name: 'Update User Profile', description: 'Modify roles, password, and active status' },
      { id: 'users.delete', name: 'Delete User Account', description: 'Revoke access and archive accounts' },
      { id: 'roles.view', name: 'View Roles Matrix', description: 'Inspect role matrix and permission maps' },
      { id: 'roles.manage', name: 'Manage Roles', description: 'Create, edit, or delete RBAC security roles' },
    ]
  },
  {
    id: 'reports',
    title: 'Analytics & Financial Audit',
    description: 'Access revenue metrics, inventory turnover, GST compliance, and audit logs',
    icon: BarChart3,
    color: 'cyan',
    permissions: [
      { id: 'reports.view', name: 'View Revenue Analytics', description: 'Access sales charts and revenue summaries' },
      { id: 'reports.export', name: 'Export Financial Reports', description: 'Download CSV / PDF financial exports' },
      { id: 'audit.view', name: 'View Security Audit Logs', description: 'Inspect system activity and security log' },
      { id: 'audit.purge', name: 'Purge Audit Logs', description: 'Clear audit trail (Super Admin only)' },
    ]
  }
]

export const ALL_PERMISSION_IDS = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id))

const COLOR_CLASSES: Record<RoleColor, { bg: string; text: string; border: string; ring: string; badge: string }> = {
  violet: {
    bg: 'bg-orbit-primary/10 dark:bg-orbit-primary/20',
    text: 'text-orbit-primary-light dark:text-orbit-primary-light',
    border: 'border-orbit-primary/30 dark:border-orbit-primary/30',
    ring: 'focus:ring-orbit-primary',
    badge: 'bg-orbit-primary/10 text-orbit-primary dark:bg-orbit-primary/20 dark:text-orbit-primary-light border-orbit-primary/20 dark:border-orbit-primary/30'
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-500/30',
    ring: 'focus:ring-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-500/30',
    ring: 'focus:ring-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-500/30',
    ring: 'focus:ring-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-500/30',
    ring: 'focus:ring-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-300 dark:border-cyan-500/30',
    ring: 'focus:ring-cyan-500',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30'
  }
}

// ─── Premium Role Form Studio Modal ──────────────────────────────────────────

function RoleFormStudioModal({
  isOpen,
  mode,
  initialRole,
  onClose,
  onSave
}: {
  isOpen: boolean
  mode: 'create' | 'edit' | 'clone'
  initialRole?: Role | null
  onClose: () => void
  onSave: (roleData: { name: string; description: string; color: RoleColor; permissions: string[] }) => void
}) {
  if (!isOpen) return null

  const [name, setName] = useState(mode === 'clone' ? `${initialRole?.name} (Copy)` : (initialRole?.name || ''))
  const [description, setDescription] = useState(initialRole?.description || '')
  const [color, setColor] = useState<RoleColor>(initialRole?.color || 'violet')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialRole?.permissions || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeModuleTab, setActiveModuleTab] = useState<string>('all')

  const totalPermissionsCount = ALL_PERMISSION_IDS.length
  const selectedCount = selectedPermissions.length
  const progressPercent = Math.round((selectedCount / totalPermissionsCount) * 100)

  // Auto-selection map: When page view or action access is selected, auto-select view & data detail permissions
  const PERMISSION_AUTO_SELECT: Record<string, string[]> = {
    'products.view': ['inventory.view'],
    'products.create': ['products.view', 'inventory.view'],
    'products.update': ['products.view', 'inventory.view'],
    'products.delete': ['products.view', 'inventory.view'],
    'inventory.view': ['products.view'],
    'inventory.adjust': ['inventory.view', 'products.view'],
    'sales.create': ['sales.view'],
    'sales.cancel': ['sales.view'],
    'sales.return': ['sales.view'],
    'billing.view': ['sales.view'],
    'billing.create': ['billing.view', 'sales.view'],
    'billing.update': ['billing.view', 'sales.view'],
    'billing.print': ['billing.view'],
    'suppliers.manage': ['suppliers.view'],
    'purchases.view': ['suppliers.view'],
    'purchases.create': ['purchases.view', 'suppliers.view'],
    'purchases.receive': ['purchases.view', 'suppliers.view'],
    'users.create': ['users.view', 'roles.view'],
    'users.update': ['users.view', 'roles.view'],
    'users.delete': ['users.view', 'roles.view'],
    'users.view': ['roles.view'],
    'roles.manage': ['roles.view', 'users.view'],
    'reports.export': ['reports.view'],
    'audit.purge': ['audit.view']
  }

  // Toggle single permission with auto-selected view & detail permissions
  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => {
      const isSelected = prev.includes(permId)
      if (isSelected) {
        return prev.filter(p => p !== permId)
      } else {
        const autoSelected = PERMISSION_AUTO_SELECT[permId] || []
        return Array.from(new Set([...prev, permId, ...autoSelected]))
      }
    })
  }

  // Toggle module all permissions
  const toggleModuleAll = (modulePermIds: string[]) => {
    const allSelected = modulePermIds.every(id => selectedPermissions.includes(id))
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !modulePermIds.includes(id)))
    } else {
      const allAutoSelected = modulePermIds.flatMap(id => [id, ...(PERMISSION_AUTO_SELECT[id] || [])])
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...allAutoSelected])))
    }
  }

  // Filter modules & permissions based on search and tab
  const filteredModules = useMemo(() => {
    return PERMISSION_MODULES.map(mod => {
      if (activeModuleTab !== 'all' && mod.id !== activeModuleTab) return null

      const matchingPerms = mod.permissions.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.title.toLowerCase().includes(searchQuery.toLowerCase())
      )

      if (searchQuery && matchingPerms.length === 0) return null

      return {
        ...mod,
        permissions: searchQuery ? matchingPerms : mod.permissions
      }
    }).filter(Boolean) as PermissionModule[]
  }, [searchQuery, activeModuleTab])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name, description, color, permissions: selectedPermissions })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6 px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-5xl bg-white dark:bg-[#161622] rounded-2xl shadow-[0_32px_90px_rgba(0,0,0,0.4)] border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">

        {/* Studio Header */}
        <div className="relative bg-gradient-to-r from-orbit-primary via-orbit-primary-light to-orbit-primary p-6 pl-6 sm:pl-8 pr-16 sm:pr-20 text-white shrink-0">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 p-2.5 rounded-xl bg-white/15 hover:bg-white/30 border border-white/25 text-white transition-all shadow-lg cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-white/15 border border-white/20 backdrop-blur-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {mode === 'create' ? 'Create Custom Security Role' : mode === 'clone' ? 'Clone Role Definition' : `Edit Role: ${initialRole?.name}`}
                </h2>
              </div>
              <p className="text-white/70 text-xs sm:text-sm mt-1">
                Configure role identity, badge color accent, and fine-grained RBAC module permissions
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Role Name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Senior Pharmacist Supervisor"
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of privileges..."
            />
          </div>

          {/* Module Permission Groups */}
          <div className="space-y-5">
            {filteredModules.map(mod => {
              const ModIcon = mod.icon
              const modPermIds = mod.permissions.map(p => p.id)
              const allSelected = modPermIds.every(id => selectedPermissions.includes(id))
              const someSelected = modPermIds.some(id => selectedPermissions.includes(id))

              return (
                <div
                  key={mod.id}
                  className="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${COLOR_CLASSES[mod.color as RoleColor].bg} ${COLOR_CLASSES[mod.color as RoleColor].text}`}>
                        <ModIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{mod.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{mod.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleModuleAll(modPermIds)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        allSelected
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                          : someSelected
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {allSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      {allSelected ? 'Module Enabled' : someSelected ? 'Partial Module' : 'Enable Module All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mod.permissions.map(perm => {
                      const isChecked = selectedPermissions.includes(perm.id)
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none flex items-start gap-3 ${
                            isChecked
                              ? 'bg-white dark:bg-[#1f1f2e] border-orbit-primary/80 dark:border-orbit-primary/70 shadow-md ring-1 ring-orbit-primary/30'
                              : 'bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-orbit-primary border-orbit-primary text-white shadow-sm'
                              : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className={`block font-semibold text-xs transition-colors ${
                              isChecked ? 'text-orbit-primary dark:text-orbit-primary-light font-bold' : 'text-slate-800 dark:text-slate-200'
                            }`}>
                              {perm.name}
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                              {perm.description}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              Changes will immediately take effect for assigned staff accounts upon save.
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 px-6"
              >
                <Save className="w-4 h-4" /> {mode === 'create' ? 'Create Role' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Roles Page Component ───────────────────────────────────────────────

export function RolesPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user: currentUser } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'clone' | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const loadRoles = async () => {
    try {
      setIsLoading(true)
      const data = await roleService.fetchRoles()
      setRoles(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch roles', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const isRoleAssignedToSelf = (role: Role) => {
    if (!currentUser || !currentUser.roles) return false
    return currentUser.roles.some((r: any) =>
      (typeof r === 'string' && r.toLowerCase() === role.name.toLowerCase()) ||
      (r && r.name && r.name.toLowerCase() === role.name.toLowerCase())
    )
  }

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateNew = () => {
    setSelectedRole(null)
    setModalMode('create')
  }

  const handleEditRole = (role: Role) => {
    if (isRoleAssignedToSelf(role) && role.name !== 'Super Admin') {
      showToast('Security Alert: You cannot modify the privileges of a security role assigned to your own active account.', 'error')
      return
    }
    setSelectedRole(role)
    setModalMode('edit')
  }

  const handleCloneRole = (role: Role) => {
    setSelectedRole(role)
    setModalMode('clone')
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) return
    if (isRoleAssignedToSelf(selectedRole)) {
      showToast('Security Alert: You cannot delete a security role currently assigned to your active login account.', 'error')
      setIsDeleteOpen(false)
      return
    }
    try {
      await roleService.deleteRole(selectedRole.id)
      showToast(`Role "${selectedRole.name}" deleted`, 'info')
      setIsDeleteOpen(false)
      setSelectedRole(null)
      loadRoles()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role', 'error')
    }
  }

  const handleSaveFromStudio = async (data: { name: string; description: string; color: RoleColor; permissions: string[] }) => {
    try {
      if (modalMode === 'create' || modalMode === 'clone') {
        await roleService.createRole({
          name: data.name,
          description: data.description,
          permissions: data.permissions
        })
        showToast(`Role "${data.name}" successfully created`, 'success')
      } else if (modalMode === 'edit' && selectedRole) {
        await roleService.updateRole(selectedRole.id, {
          name: data.name,
          description: data.description,
          permissions: data.permissions
        })
        showToast(`Role "${data.name}" updated`, 'success')
      }
      setModalMode(null)
      setSelectedRole(null)
      loadRoles()
    } catch (err: any) {
      showToast(err.message || 'Failed to save role', 'error')
    }
  }

  const PAGE_SIZE = 6
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Roles &amp; Security Matrix</h1>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-orbit-primary/10 text-orbit-primary hover:bg-orbit-primary/20 dark:bg-orbit-primary/20 dark:text-orbit-primary-light transition-all border border-orbit-primary/30 shadow-sm"
              title="How to manage Roles & Security"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Roles Guide</span>
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configure custom security roles, assign domain privilege matrices, and control staff authorization
          </p>
        </div>

        <Button
          onClick={handleCreateNew}
          className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 text-sm font-semibold py-2.5 px-5"
        >
          <Plus className="w-4 h-4" /> Create Custom Role
        </Button>
      </div>

      {/* Search Bar & Filter */}
      <div className="flex items-center gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search roles by name or description..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
          Loading security roles...
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-12 text-center">
          <EmptyState
            icon={ShieldCheck}
            title="No Roles Found"
            description="No roles match your filter criteria."
            actionLabel="Create Custom Role"
            onAction={handleCreateNew}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginated.map(role => {
            const colors = COLOR_CLASSES[role.color || 'violet']
            const permCount = role.permissions.length
            return (
              <div
                key={role.id}
                className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl border ${colors.bg} ${colors.text} ${colors.border}`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                          {role.name}
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{role.code}</span>
                      </div>
                    </div>

                    {role.isSystem && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        SYSTEM
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.25rem]">
                    {role.description || 'Custom authorization security role'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {role.usersCount} Staff assigned
                    </span>
                    <span className="font-bold text-orbit-primary-light">
                      {permCount} Privileges
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCloneRole(role)}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Clone
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditRole(role)}
                      title={isRoleAssignedToSelf(role) && role.name !== 'Super Admin' ? 'Assigned to your active account (Locked)' : 'Edit Role'}
                      className={`p-2 rounded-lg transition-colors ${
                        isRoleAssignedToSelf(role) && role.name !== 'Super Admin'
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                          : 'text-slate-400 hover:text-orbit-primary-light hover:bg-orbit-primary/5'
                      }`}
                    >
                      {isRoleAssignedToSelf(role) && role.name !== 'Super Admin' ? <Lock className="w-4 h-4 text-amber-500" /> : <Edit className="w-4 h-4" />}
                    </button>
                    {!role.isSystem && !isRoleAssignedToSelf(role) ? (
                      <button
                        onClick={() => { setSelectedRole(role); setIsDeleteOpen(true) }}
                        title="Delete Role"
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span title={role.isSystem ? 'System Role (Protected)' : 'Assigned to your account (Protected)'} className="p-2 text-slate-300 dark:text-slate-600 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="p-4 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl">
          <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Role Studio Modal */}
      {modalMode && (
        <RoleFormStudioModal
          isOpen={true}
          mode={modalMode}
          initialRole={selectedRole}
          onClose={() => setModalMode(null)}
          onSave={handleSaveFromStudio}
        />
      )}

      {/* Delete Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Security Role?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-slate-100">{selectedRole?.name}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button onClick={handleDeleteRole} className="bg-rose-600 hover:bg-rose-500 text-white">Confirm Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* How to Use Roles & Security Matrix Step-by-Step Guide Modal */}
      <Modal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="How to Use Roles & Security Matrix Guide"
        size="3xl"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-orbit-primary shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Role-Based Access Control (RBAC) Workflow</p>
              Roles define what actions pharmacy staff can perform. Create granular security roles, assign domain permission flags, and attach roles to user accounts.
            </div>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Step 1: Create or Clone Custom Role</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); handleCreateNew() }} className="text-xs gap-1.5 text-orbit-primary hover:text-orbit-primary">
                  <Plus className="w-3 h-3" /> Create Role
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Click <span className="font-semibold text-orbit-primary">+ Create Custom Role</span> or clone existing default system roles (e.g. Senior Pharmacist, Cashier).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Step 2: Select Fine-Grained Permissions</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Role Studio</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                In the Role Studio modal, toggle granular permissions across 8 domain modules (Products, Billing/POS, Purchasing, Inventory, Reports, Users).
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Step 3: Assign Roles to Staff Accounts</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/users') }} className="text-xs gap-1.5 text-emerald-600 hover:text-emerald-700">
                  Go to Users Page <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Head over to the Users page and attach your saved security roles to individual staff members to enforce authorization immediately.
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
