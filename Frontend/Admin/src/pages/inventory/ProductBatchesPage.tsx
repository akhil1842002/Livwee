import { useState, useEffect } from 'react'
import { Calendar, Plus, Search, AlertCircle, CheckCircle2, Save, Edit, Trash2, Loader2 } from 'lucide-react'
import { Button, Input, Modal, Pagination, SearchableProductSelect, WarehouseSelect, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import type { CatalogProduct, WarehouseOption } from '@/data/sharedData'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { batchService } from '@/services/batchService'
import { productService } from '@/services/productService'
import { warehouseService } from '@/services/warehouseService'

interface Batch {
  id: string
  productId: string
  product: string
  sku: string
  batchNumber: string
  warehouseId: string
  warehouse: string
  expiryDate: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  status: 'ACTIVE' | 'EXPIRING_SOON'
}

type BatchForm = {
  productId: string
  batchNumber: string
  warehouseId: string
  expiryDate: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
}

const emptyForm = (): BatchForm => ({
  productId: '',
  batchNumber: '',
  warehouseId: '',
  expiryDate: '',
  purchasePrice: '' as any,
  sellingPrice: '' as any,
  quantity: '' as any,
})

export function ProductBatchesPage() {
  const { showToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const [isLoading, setIsLoading] = useState(true)
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [availableWarehouses, setAvailableWarehouses] = useState<WarehouseOption[]>([])
  const [batches, setBatches] = useState<Batch[]>([])

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [formData, setFormData] = useState<BatchForm>(emptyForm())
  const [errors, setErrors] = useState<Partial<Record<keyof BatchForm, string>>>({})

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [batchData, prodData, whData] = await Promise.all([
        batchService.fetchBatches().catch(() => null),
        productService.fetchProducts().catch(() => null),
        warehouseService.fetchWarehouses().catch(() => null)
      ])
      const rawBatches = Array.isArray(batchData) ? batchData : (Array.isArray(batchData?.data) ? batchData.data : [])
      setBatches(rawBatches)

      if (prodData) {
        const prodArray = Array.isArray(prodData) ? prodData : (Array.isArray(prodData?.data) ? prodData.data : [])
        const activeProds = prodArray.filter((p: any) => p.status !== 'INACTIVE' && p.status !== 'BLOCKED' && p.visibility !== false)
        const formattedProds = activeProds.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          sku: p.sku || 'N/A',
          unit: p.unit || 'Box',
          taxName: 'GST 12%',
          purchasePrice: Number(p.cost_price || p.purchasePrice || p.price || 0),
          sellingPrice: Number(p.price || 0)
        }))
        setCatalogProducts(formattedProds)
      }

      if (whData) {
        const whArray = Array.isArray(whData) ? whData : (Array.isArray(whData?.data) ? whData.data : [])
        if (whArray.length > 0) {
          const mappedWHs: WarehouseOption[] = whArray.map((w: any) => ({
            id: w._id || w.id,
            code: w.code || `WH-${(w._id || w.id || '').slice(-4)}`,
            name: w.name,
            location: w.location || 'Main Storage',
            isDefault: w.isDefault || false
          }))
          setAvailableWarehouses(mappedWHs)
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch batch data', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = batches.filter(b =>
    (b.product || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.batchNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  const paginatedBatches = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const selectedProduct = catalogProducts.find(p => p?.id === formData.productId) ?? null

  const handleProductSelect = (product: CatalogProduct | null) => {
    if (product) {
      setFormData(prev => ({
        ...prev,
        productId: product.id,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
      }))
    } else {
      setFormData(prev => ({ ...prev, productId: '' }))
    }
    setErrors(prev => ({ ...prev, productId: undefined }))
  }

  const batchSchema: ValidationSchema<BatchForm> = {
    productId: { required: 'Product is required' },
    batchNumber: { required: 'Batch number is required' },
    expiryDate: { required: 'Expiry date is required' },
    warehouseId: { required: 'Warehouse is required' },
    quantity: { required: 'Quantity is required', positive: 'Quantity must be greater than 0' },
    purchasePrice: { required: 'Purchase price is required', positive: 'Purchase price must be greater than 0' },
    sellingPrice: { required: 'Selling price is required', positive: 'Selling price must be greater than 0' },
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(formData, batchSchema)
    setErrors(newErrors)
    return isValid
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const wh = WAREHOUSES.find(w => w.id === formData.warehouseId)
    const prod = catalogProducts.find(p => p.id === formData.productId)

    try {
      await batchService.createBatch({
        productId: formData.productId,
        product: prod?.name || 'Medicine Product',
        sku: prod?.sku || '',
        batchNumber: formData.batchNumber,
        warehouseId: formData.warehouseId,
        warehouse: wh?.name || 'Main Warehouse',
        expiryDate: formData.expiryDate,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        quantity: Number(formData.quantity)
      })
      setIsAddOpen(false)
      showToast(`Batch "${formData.batchNumber}" created successfully!`, 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to create batch', 'error')
    }
  }

  const openAdd = () => {
    setFormData({
      ...emptyForm(),
      productId: '',
      warehouseId: availableWarehouses[0]?.id || ''
    })
    setErrors({})
    setIsAddOpen(true)
  }

  const openEdit = (batch: Batch) => {
    setSelectedBatch(batch)
    setFormData({
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      warehouseId: batch.warehouseId,
      expiryDate: batch.expiryDate,
      purchasePrice: batch.purchasePrice,
      sellingPrice: batch.sellingPrice,
      quantity: batch.quantity,
    })
    setErrors({})
    setIsEditOpen(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBatch) return
    if (!validate()) return
    const wh = WAREHOUSES.find(w => w.id === formData.warehouseId)
    const prod = catalogProducts.find(p => p.id === formData.productId)

    try {
      await batchService.updateBatch(selectedBatch.id, {
        productId: formData.productId,
        product: prod?.name,
        sku: prod?.sku,
        batchNumber: formData.batchNumber,
        warehouseId: formData.warehouseId,
        warehouse: wh?.name,
        expiryDate: formData.expiryDate,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        quantity: Number(formData.quantity)
      })
      showToast(`Batch "${formData.batchNumber}" updated`, 'success')
      setIsEditOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to update batch', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selectedBatch) return
    try {
      await batchService.deleteBatch(selectedBatch.id)
      showToast(`Batch "${selectedBatch.batchNumber}" deleted`, 'info')
      setIsDeleteOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete batch', 'error')
    }
  }

  // Shared form fields for Add and Edit modals
  const BatchFormFields = () => (
    <div className="space-y-5">
      {/* Product & Batch Identification */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3">
          Product &amp; Batch Identification
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <SearchableProductSelect
              label="Select Catalog Product"
              required
              products={catalogProducts}
              selectedId={formData.productId}
              onSelect={handleProductSelect}
              error={errors.productId}
            />
          </div>

          {/* Auto-filled SKU */}
          {selectedProduct && (
            <div className="sm:col-span-2 flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-orbit-border">
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">SKU (Auto-filled)</span>
                <span className="font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light text-sm">{selectedProduct.sku}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Unit</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedProduct.unit}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tax</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedProduct.taxName}</span>
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Batch Number"
                  value={formData.batchNumber}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, batchNumber: e.target.value }))
                    setErrors(prev => ({ ...prev, batchNumber: undefined }))
                  }}
                  placeholder="e.g. BAT-2026-099"
                  required
                  error={errors.batchNumber}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const year = new Date().getFullYear()
                  const seq = String(batches.length + 1).padStart(3, '0')
                  const generated = `BAT-${year}-${seq}`
                  setFormData(prev => ({ ...prev, batchNumber: generated }))
                  setErrors(prev => ({ ...prev, batchNumber: undefined }))
                }}
                className="mb-0.5 h-10 px-3 text-xs font-bold rounded-xl border border-orbit-primary/40 bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light hover:bg-orbit-primary/20 transition-colors whitespace-nowrap"
                title="Auto-generate a sequential batch number"
              >
                Auto-Generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Expiry Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={e => {
                setFormData(prev => ({ ...prev, expiryDate: e.target.value }))
                setErrors(prev => ({ ...prev, expiryDate: undefined }))
              }}
              className={`w-full h-10 px-3.5 rounded-xl border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:border-orbit-primary transition-all shadow-sm ${errors.expiryDate ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-orbit-border focus:ring-orbit-primary/20'}`}
              required
            />
            {errors.expiryDate && <p className="text-xs mt-1.5 font-medium text-rose-500">{errors.expiryDate}</p>}
          </div>
        </div>
      </div>

      {/* Stock Details */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light mb-3">
          Stock &amp; Pricing Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Received Quantity"
            type="number"
            value={formData.quantity}
            onChange={e => {
              setFormData(prev => ({ ...prev, quantity: e.target.value === '' ? '' as any : Number(e.target.value) }))
              setErrors(prev => ({ ...prev, quantity: undefined }))
            }}
            required
            error={errors.quantity}
          />
          <Input
            label="Purchase Price (₹)"
            type="number"
            value={formData.purchasePrice}
            onChange={e => {
              setFormData(prev => ({ ...prev, purchasePrice: e.target.value === '' ? '' as any : Number(e.target.value) }))
              setErrors(prev => ({ ...prev, purchasePrice: undefined }))
            }}
            required
            error={errors.purchasePrice}
          />
          <Input
            label="Selling Price (₹)"
            type="number"
            value={formData.sellingPrice}
            onChange={e => {
              setFormData(prev => ({ ...prev, sellingPrice: e.target.value === '' ? '' as any : Number(e.target.value) }))
              setErrors(prev => ({ ...prev, sellingPrice: undefined }))
            }}
            required
            error={errors.sellingPrice}
          />
        </div>
      </div>

      {/* Warehouse */}
      <WarehouseSelect
        label="Target Warehouse"
        required
        warehouses={availableWarehouses}
        value={formData.warehouseId}
        onChange={id => {
          setFormData(prev => ({ ...prev, warehouseId: id }))
          setErrors(prev => ({ ...prev, warehouseId: undefined }))
        }}
        error={errors.warehouseId}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/20 border border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">FEFO Product Batches</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Batch-level stock tracking and expiry date monitoring</p>
        </div>
        <Button onClick={openAdd} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 font-medium">
          <Plus className="w-4 h-4" /> Add New Batch
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search by product name, SKU or batch number..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span> batch records
        </p>
      </div>

      {/* Batches Directory Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Batch #</th>
                <th className="px-6 py-4">Warehouse</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4">Unit Prices</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8">
                    <EmptyState
                      title="No Product Batches Found"
                      description="No batch records match your search query or catalog filter."
                    />
                  </td>
                </tr>
              ) : (
                paginatedBatches.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{batch.product}</p>
                        <p className="text-[11px] font-mono text-slate-400">{batch.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-orbit-primary-light">{batch.batchNumber}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{batch.warehouse}</td>
                    <td className="px-6 py-4 font-mono text-xs">{batch.expiryDate}</td>
                    <td className="px-6 py-4 text-xs">
                      <p className="font-bold text-slate-900 dark:text-slate-100">Sell: ₹{(batch.sellingPrice || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">Buy: ₹{(batch.purchasePrice || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{batch.quantity}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${batch.status === 'EXPIRING_SOON' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                        {batch.status === 'EXPIRING_SOON' ? 'Expiring Soon' : 'Active Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(batch)} className="p-1.5 text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { setSelectedBatch(batch); setIsDeleteOpen(true) }} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1) }} />
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="3xl" title="Add Product Batch" subtitle="Select catalog product to autofill SKU, cost & prices">
        <form noValidate onSubmit={handleCreate} className="space-y-1">
          <BatchFormFields />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border mt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 px-6 font-semibold text-sm">
              <Save className="w-4 h-4" /> Save Product Batch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="3xl" title="Edit Product Batch" subtitle={`Updating batch: ${selectedBatch?.batchNumber}`}>
        <form noValidate onSubmit={handleEdit} className="space-y-1">
          <BatchFormFields />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 px-6 font-semibold text-sm">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" title="Delete Batch" subtitle="This action cannot be undone">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete batch <strong className="text-slate-900 dark:text-slate-100">{selectedBatch?.batchNumber}</strong>?
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500 text-white gap-2 shadow-lg shadow-rose-600/30 px-6 font-semibold text-sm">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
