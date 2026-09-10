import { useState, useEffect } from 'react'
import { Award, Plus, Search, Edit, Trash2, CheckCircle, Save, Loader2 } from 'lucide-react'
import { Button, Input, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { brandService } from '@/services/brandService'

interface Brand {
  id: string
  name: string
  code: string
  productsCount: number
  status: 'ACTIVE' | 'INACTIVE'
}

export function BrandsPage() {
  const { showToast } = useToast()

  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const brandSchema: ValidationSchema<typeof formData> = {
    name: { required: 'Brand name is required' },
  }

  const loadBrands = async () => {
    try {
      setIsLoading(true)
      const data = await brandService.fetchBrands()
      setBrands(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch brands', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBrands()
  }, [])

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, brandSchema)
    setErrors(newErrors)
    return isValid
  }

  const filtered = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.code.toLowerCase().includes(searchTerm.toLowerCase()))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleToggleBrandStatus = async (brand: Brand) => {
    const newStatus = brand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await brandService.updateBrand(brand.id, { status: newStatus })
      showToast(`Brand "${brand.name}" status set to ${newStatus}`, 'success')
      loadBrands()
    } catch (err: any) {
      showToast(err.message || 'Failed to update brand status', 'error')
    }
  }

  const handleOpenAdd = () => {
    setFormData({ name: '', code: '', status: 'ACTIVE' })
    setErrors({})
    setIsAddOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await brandService.createBrand({
        name: formData.name,
        code: formData.code || formData.name.substring(0, 3).toUpperCase(),
        status: formData.status
      })
      setIsAddOpen(false)
      showToast(`Brand "${formData.name}" added successfully!`, 'success')
      loadBrands()
    } catch (err: any) {
      showToast(err.message || 'Failed to add brand', 'error')
    }
  }

  const handleOpenEdit = (brand: Brand) => {
    setSelectedBrand(brand)
    setFormData({ name: brand.name, code: brand.code, status: brand.status || 'ACTIVE' })
    setErrors({})
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrand) return
    if (!validate()) return

    try {
      await brandService.updateBrand(selectedBrand.id, {
        name: formData.name,
        code: formData.code,
        status: formData.status
      })
      setIsEditOpen(false)
      showToast('Brand updated successfully!', 'success')
      loadBrands()
    } catch (err: any) {
      showToast(err.message || 'Failed to update brand', 'error')
    }
  }

  const openDelete = (brand: Brand) => {
    setSelectedBrand(brand)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedBrand) return
    try {
      await brandService.deleteBrand(selectedBrand.id)
      showToast(`Brand "${selectedBrand.name}" removed.`, 'info')
      loadBrands()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete brand', 'error')
    }
    setIsDeleteOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/20 border border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pharmaceutical Brands</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage product manufacturer and brand profiles</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 font-medium">
          <Plus className="w-4 h-4" /> Add Brand
        </Button>
      </div>

      {/* Modern Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search brands by name or code..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Full Width Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl overflow-hidden shadow-sm w-full transition-all duration-200">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full relative">
          <table className="w-full text-left text-sm sm:text-base text-slate-800 dark:text-slate-200 min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm text-slate-700 dark:text-slate-300 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Brand Name</th>
                <th className="px-6 py-4">Code</th>
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
                    Loading brands...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No Brands Found"
                  description="No pharmaceutical brands match your search criteria. Click Add Brand to create new brand profiles."
                  actionLabel="Add Brand"
                  onAction={handleOpenAdd}
                  colSpan={5}
                />
              ) : (
                paginated.map(brand => (
                  <tr key={brand.id} className="hover:bg-orbit-primary/50/[0.04] dark:hover:bg-orbit-primary/10 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-slate-900 dark:text-slate-100 text-base">{brand.name}</td>
                    <td className="px-6 py-4.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20/80 dark:bg-orbit-primary/15 dark:text-orbit-primary-light dark:border-orbit-primary/30">{brand.code}</span>
                    </td>
                    <td className="px-6 py-4.5 font-bold text-slate-700 dark:text-slate-200">{brand.productsCount} items</td>
                    <td className="px-6 py-4.5">
                      <ToggleSwitch
                        checked={brand.status === 'ACTIVE'}
                        onChange={() => handleToggleBrandStatus(brand)}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(brand)}
                          title="Edit Brand"
                          className="p-2 text-slate-500 hover:text-orbit-primary-light dark:text-slate-400 dark:hover:text-orbit-primary-light hover:bg-orbit-primary/10 rounded-xl transition-colors"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => openDelete(brand)}
                          title="Delete Brand"
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

        {/* Step Pagination */}
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
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="2xl" title="Add Manufacturer Brand" subtitle="Create brand record for catalog mapping">
        <form noValidate onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              placeholder="e.g. Pfizer"
              required
            />
            <Input label="Brand Code" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="e.g. PFZ" />
          </div>
          <div className="pt-2 border-t border-orbit-border">
            <ToggleSwitch
              label="Brand Active Status"
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              activeText="Active"
              inactiveText="Inactive"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Save Brand</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="2xl" title="Edit Brand" subtitle={`Updating details for ${selectedBrand?.name}`}>
        <form noValidate onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              required
            />
            <Input label="Brand Code" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} required />
          </div>
          <div className="pt-2 border-t border-orbit-border">
            <ToggleSwitch
              label="Brand Active Status"
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              activeText="Active"
              inactiveText="Inactive"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Update Brand</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Brand Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Delete Manufacturer Brand" subtitle="Confirm brand removal">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete manufacturer brand <strong className="text-slate-900 dark:text-slate-100">{selectedBrand?.name}</strong> (<span className="font-mono font-bold text-orbit-primary-light">{selectedBrand?.code}</span>)?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2"><Trash2 className="w-4 h-4" /> Delete Brand</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
