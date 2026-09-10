import { useState, useEffect, useMemo } from 'react'
import { Building2, Plus, Search, Edit, Trash2, Tag, Save, CheckCircle2, XCircle } from 'lucide-react'
import { Button, Input, Textarea, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'

export interface SupplierCategoryItem {
  id: string
  name: string
  slug: string
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  vendorsCount: number
}

const DEFAULT_SUPPLIER_CATEGORIES: SupplierCategoryItem[] = []

export const getStoredSupplierCategories = (): SupplierCategoryItem[] => {
  return []
}

export const saveStoredSupplierCategories = (_items: SupplierCategoryItem[]) => {}

export function SupplierCategoriesPage() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<SupplierCategoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCat, setSelectedCat] = useState<SupplierCategoryItem | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  useEffect(() => {
    setCategories(getStoredSupplierCategories())
  }, [])

  const categorySchema: ValidationSchema<typeof formData> = {
    name: { required: 'Category name is required' }
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, categorySchema)
    setErrors(newErrors)
    return isValid
  }

  // Filtered & Paginated
  const filtered = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [categories, searchTerm])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = categories.length
    const active = categories.filter(c => c.status === 'ACTIVE').length
    const inactive = categories.filter(c => c.status === 'INACTIVE').length
    return { total, active, inactive }
  }, [categories])

  const handleToggleStatus = (cat: SupplierCategoryItem) => {
    const newStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const updated = categories.map(c => c.id === cat.id ? { ...c, status: newStatus } : c)
    setCategories(updated)
    saveStoredSupplierCategories(updated)
    showToast(`Supplier Category "${cat.name}" status updated to ${newStatus}`, 'info')
  }

  const handleOpenAdd = () => {
    setFormData({ name: '', slug: '', description: '', status: 'ACTIVE' })
    setErrors({})
    setIsAddOpen(true)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const trimmedName = formData.name.trim()
    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors({ name: `Category "${trimmedName}" already exists!` })
      showToast(`Category "${trimmedName}" already exists!`, 'error')
      return
    }

    const newCat: SupplierCategoryItem = {
      id: `scat-${Date.now().toString(36)}`,
      name: trimmedName,
      slug: formData.slug.trim() || trimmedName.toLowerCase().replace(/\s+/g, '-'),
      description: formData.description.trim(),
      status: formData.status,
      vendorsCount: 0
    }

    const updated = [newCat, ...categories]
    setCategories(updated)
    saveStoredSupplierCategories(updated)
    setIsAddOpen(false)
    showToast(`Supplier Category "${trimmedName}" created successfully!`, 'success')
  }

  const handleOpenEdit = (cat: SupplierCategoryItem) => {
    setSelectedCat(cat)
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      status: cat.status
    })
    setErrors({})
    setIsEditOpen(true)
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCat) return
    if (!validate()) return

    const trimmedName = formData.name.trim()
    if (categories.some(c => c.id !== selectedCat.id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors({ name: `Category "${trimmedName}" already exists!` })
      showToast(`Category "${trimmedName}" already exists!`, 'error')
      return
    }

    const updatedCat: SupplierCategoryItem = {
      ...selectedCat,
      name: trimmedName,
      slug: formData.slug.trim() || trimmedName.toLowerCase().replace(/\s+/g, '-'),
      description: formData.description.trim(),
      status: formData.status
    }

    const updated = categories.map(c => c.id === selectedCat.id ? updatedCat : c)
    setCategories(updated)
    saveStoredSupplierCategories(updated)
    setIsEditOpen(false)
    showToast(`Supplier Category "${trimmedName}" updated successfully!`, 'success')
  }

  const handleOpenDelete = (cat: SupplierCategoryItem) => {
    setSelectedCat(cat)
    setIsDeleteOpen(true)
  }

  const handleDelete = () => {
    if (!selectedCat) return
    const updated = categories.filter(c => c.id !== selectedCat.id)
    setCategories(updated)
    saveStoredSupplierCategories(updated)
    setIsDeleteOpen(false)
    showToast(`Supplier Category "${selectedCat.name}" removed.`, 'info')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orbit-primary/10 border border-orbit-primary/20 text-orbit-primary-light">
              <Tag className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Supplier Categories</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage vendor classifications, supply divisions &amp; procurement categories
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 font-semibold text-sm px-5 py-2.5"
        >
          <Plus className="w-4 h-4" /> Add Supplier Category
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Categories</span>
            <Tag className="w-4 h-4 text-orbit-primary-light" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{metrics.total}</p>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Divisions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{metrics.active}</p>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inactive Categories</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-2">{metrics.inactive}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search supplier categories by name, slug, or description..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-800 dark:text-slate-200 min-w-[650px]">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Linked Vendors</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-border">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Tag}
                  title="No Supplier Categories Found"
                  description="No category matches your search criteria. Click Add Supplier Category to create one."
                  actionLabel="Add Supplier Category"
                  onAction={handleOpenAdd}
                  colSpan={5}
                />
              ) : (
                paginated.map(cat => (
                  <tr key={cat.id} className="hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{cat.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md line-clamp-1">{cat.description || 'No description provided'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20 dark:bg-orbit-primary/15 dark:text-orbit-primary-light dark:border-orbit-primary/30">
                        {cat.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                      {cat.vendorsCount} suppliers
                    </td>
                    <td className="px-6 py-4">
                      <ToggleSwitch
                        checked={cat.status === 'ACTIVE'}
                        onChange={() => handleToggleStatus(cat)}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Category"
                          className="p-2 text-slate-500 hover:text-orbit-primary-light dark:text-slate-400 dark:hover:text-orbit-primary-light hover:bg-orbit-primary/10 rounded-xl transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(cat)}
                          title="Delete Category"
                          className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        size="2xl"
        title="Add New Supplier Category"
        subtitle="Create a new classification for procurement and vendor directory"
      >
        <form noValidate onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              placeholder="e.g. Cold Chain Biologics"
              required
            />
            <Input
              label="Category Slug (URL Identifier)"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="e.g. cold-chain-biologics"
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief overview of items supplied under this category..."
            rows={3}
          />

          <div className="pt-2 border-t border-orbit-border">
            <ToggleSwitch
              label="Category Status"
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              activeText="Active"
              inactiveText="Inactive"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-semibold shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        size="2xl"
        title="Edit Supplier Category"
        subtitle={`Updating category: ${selectedCat?.name}`}
      >
        <form noValidate onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              required
            />
            <Input
              label="Category Slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />

          <div className="pt-2 border-t border-orbit-border">
            <ToggleSwitch
              label="Category Status"
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              activeText="Active"
              inactiveText="Inactive"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-semibold shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        size="sm"
        title="Delete Supplier Category"
        subtitle="Confirm category removal"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Are you sure you want to remove <strong className="text-slate-900 dark:text-slate-100">{selectedCat?.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500 text-white">
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
