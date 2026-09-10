import { useState, useEffect } from 'react'
import { Warehouse, Plus, Search, Edit, Trash2, CheckCircle, MapPin, Save, Loader2 } from 'lucide-react'
import { Button, Input, Modal, Pagination, EmptyState, ToggleSwitch } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { warehouseService } from '@/services/warehouseService'

type WH = { id: string; name: string; code: string; location: string; isDefault: boolean; status: 'ACTIVE' | 'INACTIVE' }

const emptyForm = { name: '', code: '', location: '', isDefault: false, status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' }

export function WarehousesPage() {
  const { showToast } = useToast()
  const [warehouses, setWarehouses] = useState<WH[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<WH | null>(null)
  const [form, setForm] = useState(emptyForm)

  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const whSchema: ValidationSchema<typeof emptyForm> = {
    name: { required: 'Warehouse name is required' },
    code: { required: 'Warehouse code is required' },
    location: { required: 'Location / address is required' },
  }

  const loadWarehouses = async () => {
    try {
      setIsLoading(true)
      const data = await warehouseService.fetchWarehouses()
      setWarehouses(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch warehouses', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWarehouses()
  }, [])

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(form, whSchema)
    setErrors(newErrors)
    return isValid
  }

  const filtered = warehouses.filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()) || w.code.toLowerCase().includes(searchTerm.toLowerCase()) || w.location.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleToggleWarehouseStatus = async (wh: WH) => {
    const newStatus = wh.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await warehouseService.updateWarehouse(wh.id, { ...wh, status: newStatus })
      showToast(`Warehouse "${wh.name}" status set to ${newStatus}`, 'success')
      loadWarehouses()
    } catch (err: any) {
      showToast(err.message || 'Failed to update warehouse status', 'error')
    }
  }

  const openAdd = () => { setForm(emptyForm); setErrors({}); setIsAddOpen(true) }
  const openEdit = (wh: WH) => { setSelected(wh); setForm({ name: wh.name, code: wh.code, location: wh.location, isDefault: wh.isDefault, status: wh.status }); setErrors({}); setIsEditOpen(true) }
  const openDelete = (wh: WH) => { setSelected(wh); setIsDeleteOpen(true) }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await warehouseService.createWarehouse({
        name: form.name,
        code: form.code,
        location: form.location,
        isDefault: form.isDefault,
        status: 'ACTIVE'
      })
      showToast(`Warehouse "${form.name}" created`, 'success')
      setIsAddOpen(false)
      loadWarehouses()
    } catch (err: any) {
      showToast(err.message || 'Failed to create warehouse', 'error')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (!validate()) return
    try {
      await warehouseService.updateWarehouse(selected.id, {
        name: form.name,
        code: form.code,
        location: form.location,
        isDefault: form.isDefault
      })
      showToast(`Warehouse "${form.name}" updated`, 'success')
      setIsEditOpen(false)
      loadWarehouses()
    } catch (err: any) {
      showToast(err.message || 'Failed to update warehouse', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await warehouseService.deleteWarehouse(selected.id)
      showToast(`Warehouse "${selected.name}" removed`, 'info')
      setIsDeleteOpen(false)
      loadWarehouses()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete warehouse', 'error')
    }
  }

  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Warehouse Name"
          value={form.name}
          onChange={e => {
            setForm(p => ({ ...p, name: e.target.value }))
            setErrors(p => ({ ...p, name: undefined }))
          }}
          error={errors.name}
          placeholder="e.g. Cold Storage Unit A"
          required
        />
        <Input
          label="Code"
          value={form.code}
          onChange={e => {
            setForm(p => ({ ...p, code: e.target.value }))
            setErrors(p => ({ ...p, code: undefined }))
          }}
          error={errors.code}
          placeholder="e.g. WH-COLD-04"
          required
        />
      </div>
      <Input
        label="Location / Address"
        value={form.location}
        onChange={e => {
          setForm(p => ({ ...p, location: e.target.value }))
          setErrors(p => ({ ...p, location: undefined }))
        }}
        error={errors.location}
        placeholder="Floor, building, or room"
        required
      />
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} className="rounded" />
          Set as default warehouse
        </label>
        <ToggleSwitch
          label="Status"
          checked={form.status !== 'INACTIVE'}
          onChange={val => setForm(p => ({ ...p, status: val ? 'ACTIVE' : 'INACTIVE' }))}
          activeText="Active"
          inactiveText="Inactive"
          size="sm"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-orbit-primary-light dark:text-orbit-primary-light" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Warehouse Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage physical storage facilities, cold storage, and inventory locations</p>
        </div>
        <Button onClick={openAdd} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
          <Plus className="w-4 h-4" /> Add Warehouse
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }} placeholder="Search warehouse..." prefix={<Search className="w-4 h-4 text-slate-400" />} />
        </div>
      </div>

      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
            <tr>
              <th className="px-6 py-4">Warehouse Name</th>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Default</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
                  Loading warehouses...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <EmptyState
                colSpan={6}
                title="No Warehouses Found"
                description="There are no storage facilities registered in the system."
                actionLabel="Add Warehouse"
                onAction={openAdd}
              />
            ) : (
              filtered.map(wh => (
              <tr key={wh.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{wh.name}</td>
                <td className="px-6 py-4 font-mono text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light">{wh.code}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  {wh.location}
                </td>
                <td className="px-6 py-4">
                  {wh.isDefault && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orbit-primary/5 dark:bg-orbit-primary/20 text-orbit-primary dark:text-orbit-primary-light border border-orbit-primary/20 dark:border-orbit-primary/30">DEFAULT</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <ToggleSwitch
                    checked={wh.status !== 'INACTIVE'}
                    onChange={() => handleToggleWarehouseStatus(wh)}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(wh)} className="p-1.5 text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => openDelete(wh)} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
        <div className="p-4 border-t border-slate-200 dark:border-orbit-border">
          <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={5} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Add */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="lg" title="Add Warehouse" subtitle="Create a new storage facility or room">
        <form noValidate onSubmit={handleAdd} className="space-y-5">
          {renderFormFields()}
          <div className="flex justify-end gap-3 pt-2 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Save Warehouse</Button>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="lg" title="Edit Warehouse" subtitle={`Updating: ${selected?.name}`}>
        <form noValidate onSubmit={handleEdit} className="space-y-5">
          {renderFormFields()}
          <div className="flex justify-end gap-3 pt-2 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30"><Save className="w-4 h-4" /> Update Warehouse</Button>
          </div>
        </form>
      </Modal>

      {/* Delete */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Delete Warehouse" subtitle="This action cannot be undone">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-slate-100">{selected?.name}</span>?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2"><Trash2 className="w-4 h-4" /> Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
