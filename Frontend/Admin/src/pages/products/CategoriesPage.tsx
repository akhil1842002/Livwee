import { useState, useEffect } from 'react'
import { FolderTree, Plus, Search, Edit, Trash2, CheckCircle, Save, Loader2 } from 'lucide-react'
import { Button, Input, Textarea, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { categoryService } from '@/services/categoryService'

interface Category {
  id: string
  name: string
  slug: string
  productsCount: number
  status: 'ACTIVE' | 'INACTIVE'
  description: string
}

export function CategoriesPage() {
  const { showToast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', status: 'ACTIVE' as const })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const categorySchema: ValidationSchema<typeof formData> = {
    name: { required: 'Category name is required' },
  }

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const data = await categoryService.fetchCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch categories', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, categorySchema)
    setErrors(newErrors)
    return isValid
  }

  // Filtering & Pagination
  const filtered = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.slug.toLowerCase().includes(searchTerm.toLowerCase()))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleOpenAdd = () => {
    setFormData({ name: '', slug: '', description: '', status: 'ACTIVE' })
    setErrors({})
    setIsAddModalOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const res = await categoryService.createCategory({
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description || '',
        status: formData.status
      })
      setIsAddModalOpen(false)
      showToast(`Category "${formData.name}" created successfully!`, 'success')
      loadCategories()
    } catch (err: any) {
      showToast(err.message || 'Failed to create category', 'error')
    }
  }

  const handleToggleCategoryStatus = async (cat: Category) => {
    const newStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await categoryService.updateCategory(cat.id, { status: newStatus })
      showToast(`Category "${cat.name}" status set to ${newStatus}`, 'success')
      loadCategories()
    } catch (err: any) {
      showToast(err.message || 'Failed to update category status', 'error')
    }
  }

  const handleOpenEdit = (cat: Category) => {
    setSelectedCat(cat)
    setFormData({ name: cat.name, slug: cat.slug, description: cat.description, status: cat.status as 'ACTIVE' | 'INACTIVE' })
    setErrors({})
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCat) return
    if (!validate()) return

    try {
      await categoryService.updateCategory(selectedCat.id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        status: formData.status
      })
      setIsEditModalOpen(false)
      showToast(`Category updated successfully!`, 'success')
      loadCategories()
    } catch (err: any) {
      showToast(err.message || 'Failed to update category', 'error')
    }
  }

  const handleOpenDelete = (cat: Category) => {
    setSelectedCat(cat)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedCat) return
    try {
      await categoryService.deleteCategory(selectedCat.id)
      setIsDeleteModalOpen(false)
      showToast(`Category "${selectedCat.name}" deleted.`, 'info')
      loadCategories()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/20 border border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <FolderTree className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Product Categories</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Organize pharmaceutical products and consumables by categories</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 font-medium"
        >
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {/* Simple Search Input */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search categories by name or slug..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Full Width Data Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl overflow-hidden shadow-sm w-full transition-all duration-200">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full relative">
          <table className="w-full text-left text-sm sm:text-base text-slate-800 dark:text-slate-200 min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm text-slate-700 dark:text-slate-300 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Products</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
                    Loading categories...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <EmptyState
                  icon={FolderTree}
                  title="No Categories Found"
                  description="No category records match your search criteria. Click Add Category to create new category folders."
                  actionLabel="Add Category"
                  onAction={handleOpenAdd}
                  colSpan={5}
                />
              ) : (
                paginated.map(cat => (
                  <tr key={cat.id} className="hover:bg-orbit-primary/50/[0.04] dark:hover:bg-orbit-primary/10 transition-colors">
                    <td className="px-6 py-4.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{cat.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20/80 dark:bg-orbit-primary/15 dark:text-orbit-primary-light dark:border-orbit-primary/30">{cat.slug}</span>
                    </td>
                    <td className="px-6 py-4.5 font-bold text-slate-700 dark:text-slate-200">{cat.productsCount} items</td>
                    <td className="px-6 py-4.5">
                      <ToggleSwitch
                        checked={cat.status === 'ACTIVE'}
                        onChange={() => handleToggleCategoryStatus(cat)}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Category"
                          className="p-2 text-slate-500 hover:text-orbit-primary-light dark:text-slate-400 dark:hover:text-orbit-primary-light hover:bg-orbit-primary/10 rounded-xl transition-colors"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(cat)}
                          title="Delete Category"
                          className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
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
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        size="2xl"
        title="Add New Category"
        subtitle="Create a new product classification for inventory & POS"
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
              placeholder="e.g. Ophthalmology & Eye Care"
              required
            />
            <Input
              label="Category Slug (URL)"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="e.g. eye-care"
            />
          </div>
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of products in this category..."
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
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="2xl"
        title="Edit Category"
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
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deactivation"
        subtitle={`Are you sure you want to delete "${selectedCat?.name}"?`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This category contains <strong className="text-slate-800 dark:text-slate-200">{selectedCat?.productsCount} products</strong>. Deactivating will soft-delete the record while maintaining audit history.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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
