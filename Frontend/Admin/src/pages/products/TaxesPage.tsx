import { useState, useEffect } from 'react'
import { Percent, Plus, Search, Edit, Trash2, CheckCircle, Save, Loader2 } from 'lucide-react'
import { Button, Input, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { taxService } from '@/services/taxService'

interface Tax {
  id: string
  name: string
  percentage: number
  status: 'ACTIVE' | 'INACTIVE'
  description: string
}

export function TaxesPage() {
  const { showToast } = useToast()

  const [taxes, setTaxes] = useState<Tax[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null)
  const [formData, setFormData] = useState({ name: '', percentage: '' as any, description: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const taxSchema: ValidationSchema<typeof formData> = {
    name: { required: 'Tax name is required' },
    percentage: { required: 'Percentage is required', min: { value: 0, message: 'Percentage cannot be negative' } },
  }

  const loadTaxes = async () => {
    try {
      setIsLoading(true)
      const data = await taxService.fetchTaxes()
      setTaxes(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch taxes', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTaxes()
  }, [])

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, taxSchema)
    setErrors(newErrors)
    return isValid
  }

  const filtered = taxes.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleToggleStatus = async (tax: Tax) => {
    const newStatus = tax.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await taxService.updateTax(tax.id, { status: newStatus })
      showToast(`Tax rate "${tax.name}" status updated to ${newStatus}`, 'success')
      loadTaxes()
    } catch (err: any) {
      showToast(err.message || 'Failed to update tax status', 'error')
    }
  }

  const handleOpenAdd = () => {
    setFormData({ name: '', percentage: '', description: '', status: 'ACTIVE' })
    setErrors({})
    setIsAddOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await taxService.createTax({
        name: formData.name,
        percentage: Number(formData.percentage),
        status: formData.status,
        description: formData.description || ''
      })
      setIsAddOpen(false)
      showToast(`Tax rate "${formData.name}" added!`, 'success')
      loadTaxes()
    } catch (err: any) {
      showToast(err.message || 'Failed to add tax rate', 'error')
    }
  }

  const handleOpenEdit = (tax: Tax) => {
    setSelectedTax(tax)
    setFormData({ name: tax.name, percentage: tax.percentage, description: tax.description, status: tax.status || 'ACTIVE' })
    setErrors({})
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTax) return
    if (!validate()) return

    try {
      await taxService.updateTax(selectedTax.id, {
        name: formData.name,
        percentage: Number(formData.percentage),
        description: formData.description,
        status: formData.status
      })
      setIsEditOpen(false)
      showToast('Tax configuration updated!', 'success')
      loadTaxes()
    } catch (err: any) {
      showToast(err.message || 'Failed to update tax', 'error')
    }
  }

  const openDelete = (tax: Tax) => {
    setSelectedTax(tax)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedTax) return
    try {
      await taxService.deleteTax(selectedTax.id)
      showToast(`Tax rate "${selectedTax.name}" removed.`, 'info')
      loadTaxes()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete tax', 'error')
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
              <Percent className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tax Configurations</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure GST and sales tax percentages for medical products</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 font-medium">
          <Plus className="w-4 h-4" /> Add Tax Rate
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
            placeholder="Search tax rules or description..."
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
                <th className="px-6 py-4">Tax Name</th>
                <th className="px-6 py-4">Rate (%)</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
                    Loading tax configurations...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <EmptyState
                  icon={Percent}
                  title="No Tax Rates Configured"
                  description="No GST tax slabs match your search query. Click Add Tax Rate to configure new tax rates."
                  actionLabel="Add Tax Rate"
                  onAction={handleOpenAdd}
                  colSpan={5}
                />
              ) : (
                paginated.map(tax => (
                  <tr key={tax.id} className="hover:bg-orbit-primary/50/[0.04] dark:hover:bg-orbit-primary/10 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-slate-900 dark:text-slate-100 text-base">{tax.name}</td>
                    <td className="px-6 py-4.5">
                      <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20/80 dark:bg-orbit-primary/15 dark:text-orbit-primary-light dark:border-orbit-primary/30">{tax.percentage}%</span>
                    </td>
                    <td className="px-6 py-4.5 text-slate-600 dark:text-slate-400">{tax.description}</td>
                    <td className="px-6 py-4.5">
                      <ToggleSwitch
                        checked={tax.status === 'ACTIVE'}
                        onChange={() => handleToggleStatus(tax)}
                        label={tax.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        activeColor="emerald"
                      />
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(tax)}
                          title="Edit Tax Rate"
                          className="p-2 text-slate-500 hover:text-orbit-primary-light dark:text-slate-400 dark:hover:text-orbit-primary-light hover:bg-orbit-primary/10 rounded-xl transition-colors"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => openDelete(tax)}
                          title="Delete Tax Rate"
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
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="2xl" title="Add Tax Rate" subtitle="Configure GST slab for product catalog">
        <form noValidate onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tax Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              placeholder="e.g. GST 12%"
              required
            />
            <Input
              label="Percentage (%)"
              type="number"
              value={formData.percentage}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, percentage: e.target.value === '' ? '' : Number(e.target.value) }))
                setErrors(prev => ({ ...prev, percentage: undefined }))
              }}
              error={errors.percentage}
              required
            />
          </div>
          <Input label="Description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="e.g. Standard formulations" />
          <div className="pt-2">
            <ToggleSwitch
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              label={formData.status === 'ACTIVE' ? 'Active Tax Rate' : 'Inactive'}
              description="Inactive tax slabs will be disabled in POS billing calculation"
              activeColor="emerald"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Save Tax Rate</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="2xl" title="Edit Tax Rate" subtitle={`Updating slab: ${selectedTax?.name}`}>
        <form noValidate onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tax Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              required
            />
            <Input
              label="Percentage (%)"
              type="number"
              value={formData.percentage}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, percentage: e.target.value === '' ? '' : Number(e.target.value) }))
                setErrors(prev => ({ ...prev, percentage: undefined }))
              }}
              error={errors.percentage}
              required
            />
          </div>
          <Input label="Description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <div className="pt-2">
            <ToggleSwitch
              checked={formData.status === 'ACTIVE'}
              onChange={val => setFormData(prev => ({ ...prev, status: val ? 'ACTIVE' : 'INACTIVE' }))}
              label={formData.status === 'ACTIVE' ? 'Active Tax Rate' : 'Inactive'}
              description="Inactive tax slabs will be disabled in POS billing calculation"
              activeColor="emerald"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Update Tax</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Tax Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Delete Tax Rate" subtitle="Confirm GST slab removal">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete GST tax slab <strong className="text-slate-900 dark:text-slate-100">{selectedTax?.name}</strong> ({selectedTax?.percentage}%)?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2"><Trash2 className="w-4 h-4" /> Delete Tax Rate</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
