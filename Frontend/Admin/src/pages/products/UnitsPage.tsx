import { useState, useEffect } from 'react'
import { Scale, Plus, Search, Edit, Trash2, Save, Loader2 } from 'lucide-react'
import { Button, Input, Modal, Pagination, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { unitService } from '@/services/unitService'

interface Unit {
  id: string
  name: string
  code: string
  description: string
}

export function UnitsPage() {
  const { showToast } = useToast()

  const [units, setUnits] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '', description: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const unitSchema: ValidationSchema<typeof formData> = {
    name: { required: 'Unit name is required' },
  }

  const loadUnits = async () => {
    try {
      setIsLoading(true)
      const data = await unitService.fetchUnits()
      setUnits(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch units', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, unitSchema)
    setErrors(newErrors)
    return isValid
  }

  const filtered = units.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.code.toLowerCase().includes(searchTerm.toLowerCase()) || u.description.toLowerCase().includes(searchTerm.toLowerCase()))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleOpenAdd = () => {
    setFormData({ name: '', code: '', description: '' })
    setErrors({})
    setIsAddOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await unitService.createUnit({
        name: formData.name,
        code: formData.code || formData.name.substring(0, 3).toUpperCase(),
        description: formData.description || ''
      })
      setIsAddOpen(false)
      showToast(`Unit "${formData.name}" created successfully!`, 'success')
      loadUnits()
    } catch (err: any) {
      showToast(err.message || 'Failed to create unit', 'error')
    }
  }

  const handleOpenEdit = (unit: Unit) => {
    setSelectedUnit(unit)
    setFormData({ name: unit.name, code: unit.code, description: unit.description })
    setErrors({})
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnit) return
    if (!validate()) return

    try {
      await unitService.updateUnit(selectedUnit.id, {
        name: formData.name,
        code: formData.code,
        description: formData.description
      })
      setIsEditOpen(false)
      showToast('Unit details updated!', 'success')
      loadUnits()
    } catch (err: any) {
      showToast(err.message || 'Failed to update unit', 'error')
    }
  }

  const openDelete = (unit: Unit) => {
    setSelectedUnit(unit)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedUnit) return
    try {
      await unitService.deleteUnit(selectedUnit.id)
      showToast(`Unit "${selectedUnit.name}" deleted.`, 'info')
      loadUnits()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete unit', 'error')
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
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Measurement Units</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Packaging and measurement unit master records</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 font-medium">
          <Plus className="w-4 h-4" /> Add Unit
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
            placeholder="Search units by name, code or description..."
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
                <th className="px-6 py-4">Unit Name</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
                    Loading units...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <EmptyState
                  icon={Scale}
                  title="No Measurement Units Found"
                  description="No packaging units match your search query. Click Add Unit to define new units."
                  actionLabel="Add Unit"
                  onAction={handleOpenAdd}
                  colSpan={4}
                />
              ) : (
                paginated.map(unit => (
                  <tr key={unit.id} className="hover:bg-orbit-primary/50/[0.04] dark:hover:bg-orbit-primary/10 transition-colors">
                    <td className="px-6 py-4.5 font-bold text-slate-900 dark:text-slate-100 text-base">{unit.name}</td>
                    <td className="px-6 py-4.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/20/80 dark:bg-orbit-primary/15 dark:text-orbit-primary-light dark:border-orbit-primary/30">{unit.code}</span>
                    </td>
                    <td className="px-6 py-4.5 text-slate-600 dark:text-slate-400">{unit.description}</td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(unit)}
                          title="Edit Unit"
                          className="p-2 text-slate-500 hover:text-orbit-primary-light dark:text-slate-400 dark:hover:text-orbit-primary-light hover:bg-orbit-primary/10 rounded-xl transition-colors"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => openDelete(unit)}
                          title="Delete Unit"
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
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="2xl" title="Add Measurement Unit" subtitle="Configure packaging unit code for inventory items">
        <form noValidate onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Unit Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              placeholder="e.g. Strip"
              required
            />
            <Input label="Unit Code" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="e.g. STP" />
          </div>
          <Input label="Description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="e.g. Blister strip of 10 tablets" />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Save Unit</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="2xl" title="Edit Measurement Unit" subtitle={`Updating unit: ${selectedUnit?.name}`}>
        <form noValidate onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Unit Name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }))
                setErrors(prev => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
              required
            />
            <Input label="Unit Code" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} required />
          </div>
          <Input label="Description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 px-6 font-medium shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Update Unit</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Unit Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Delete Measurement Unit" subtitle="Confirm unit removal">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete unit <strong className="text-slate-900 dark:text-slate-100">{selectedUnit?.name}</strong> (<span className="font-mono font-bold text-orbit-primary-light">{selectedUnit?.code}</span>)?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2"><Trash2 className="w-4 h-4" /> Delete Unit</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
