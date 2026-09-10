import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, Search, PlusCircle, Save, RefreshCw, AlertTriangle, Info, ArrowRight, Lightbulb, Loader2, Bookmark, Lock, Unlock } from 'lucide-react'
import { Button, Input, Modal, Pagination, SearchableProductSelect, WarehouseSelect, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { WAREHOUSES } from '@/data/sharedData'
import type { CatalogProduct, WarehouseOption } from '@/data/sharedData'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { productService } from '@/services/productService'
import { warehouseService } from '@/services/warehouseService'
import { stockTransactionService } from '@/services/stockTransactionService'

// ─── Form field wrapper shared style ─────────────────────────────────────────
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
    {children}
    {required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
)

type StockItem = {
  id: string
  productId: string
  name: string
  sku: string
  warehouseId: string
  warehouse: string
  currentStock: number
  reservedStock: number
  minAlert: number
  status: string
}

const defaultItems: StockItem[] = []

type AdjustForm = {
  productId: string
  warehouseId: string
  qty: number | ''
  reservedStock: number | ''
  reason: string
  note: string
}

type ReserveForm = {
  productId: string
  action: 'RESERVE' | 'RELEASE'
  qty: number | ''
  reason: string
}

const REASONS = [
  'Physical Count Discrepancy',
  'Damaged / Spoiled Stock',
  'Expired Product Disposal',
  'Internal Store Transfer',
  'Sample / Demo Usage',
  'Supplier Return',
  'Other Adjustment',
]

export function InventoryPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [items, setItems] = useState<StockItem[]>(defaultItems)
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [availableWarehouses, setAvailableWarehouses] = useState<WarehouseOption[]>(WAREHOUSES)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [isReserveOpen, setIsReserveOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [prodRes, whRes] = await Promise.all([
        productService.fetchProducts().catch(() => null),
        warehouseService.fetchWarehouses().catch(() => null)
      ])

      let whList: WarehouseOption[] = WAREHOUSES
      if (whRes) {
        const whArray = Array.isArray(whRes) ? whRes : (Array.isArray(whRes?.data) ? whRes.data : [])
        if (whArray.length > 0) {
          whList = whArray.map((w: any) => ({
            id: w._id || w.id,
            code: w.code || `WH-${(w._id || w.id || '').slice(-4)}`,
            name: w.name,
            location: w.location || 'Main Storage',
            isDefault: w.isDefault || false
          }))
        }
      }
      setAvailableWarehouses(whList)

      const defaultWh = whList.find(w => w.isDefault) || whList[0] || { id: 'wh-1', name: 'Main Pharmacy Store' }

      if (prodRes) {
        const prodArray = Array.isArray(prodRes) ? prodRes : (Array.isArray(prodRes?.data) ? prodRes.data : [])
        const activeOnly = prodArray.filter((p: any) => p.status !== 'INACTIVE' && p.status !== 'BLOCKED' && p.visibility !== false)

        const formattedProds: CatalogProduct[] = activeOnly.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          sku: p.sku || 'SKU-001',
          unit: p.unit || 'Box',
          category: p.category || 'General',
          taxName: 'GST 12%',
          purchasePrice: Number(p.cost_price || p.purchasePrice || p.price || 0),
          sellingPrice: Number(p.price || 0),
          stock: p.stock || 0
        }))
        setCatalogProducts(formattedProds)

        const fetchedStock: StockItem[] = prodArray.map((p: any) => {
          const isBlocked = p.status === 'INACTIVE' || p.status === 'BLOCKED' || p.visibility === false
          return {
            id: p._id || p.id,
            productId: p._id || p.id,
            name: p.name,
            sku: p.sku || 'SKU-001',
            warehouseId: defaultWh.id,
            warehouse: defaultWh.name,
            currentStock: p.stock || 0,
            reservedStock: p.reserved_stock || p.reservedStock || 0,
            minAlert: 10,
            status: isBlocked ? 'BLOCKED' : ((p.stock || 0) <= 10 ? 'LOW_STOCK' : 'IN_STOCK')
          }
        })
        setItems(fetchedStock)
      }
    } catch (err) {
      console.warn('Could not fetch inventory stock from backend:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const [errors, setErrors] = useState<Partial<Record<keyof AdjustForm, string>>>({})

  const [form, setForm] = useState<AdjustForm>({
    productId: '',
    warehouseId: '',
    qty: '',
    reservedStock: '',
    reason: REASONS[0],
    note: '',
  })

  const selectedProduct = catalogProducts.find(p => p.id === form.productId) ?? null
  const selectedStockItem = items.find(i => i.productId === form.productId) ?? null

  const filtered = items.filter(i =>
    (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const [reserveForm, setReserveForm] = useState<ReserveForm>({
    productId: '',
    action: 'RESERVE',
    qty: '',
    reason: 'Order Hold / VIP Reservation'
  })

  const reserveSelectedStockItem = items.find(i => i.productId === reserveForm.productId) ?? null

  const openReserveFor = (item?: StockItem) => {
    setReserveForm({
      productId: item?.productId || '',
      action: 'RESERVE',
      qty: '',
      reason: 'Order Hold / VIP Reservation'
    })
    setIsReserveOpen(true)
  }

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reserveForm.productId) {
      showToast('Please select a product to reserve/release stock', 'warning')
      return
    }
    const numQty = Number(reserveForm.qty)
    if (!numQty || numQty <= 0) {
      showToast('Please enter a valid quantity greater than 0', 'warning')
      return
    }

    const targetItem = items.find(i => i.productId === reserveForm.productId)
    if (!targetItem) return

    const currentReserved = targetItem.reservedStock || 0
    let newReserved = currentReserved
    if (reserveForm.action === 'RESERVE') {
      newReserved = currentReserved + numQty
    } else {
      newReserved = Math.max(0, currentReserved - numQty)
    }

    try {
      await stockTransactionService.createTransaction({
        productId: reserveForm.productId,
        type: reserveForm.action === 'RESERVE' ? 'RESERVATION' : 'RELEASE',
        qty: reserveForm.action === 'RESERVE' ? numQty : -numQty,
        reservedStock: newReserved,
        ref: reserveForm.reason || (reserveForm.action === 'RESERVE' ? 'Manual Stock Reservation' : 'Stock Release Hold')
      })

      setItems(prev => prev.map(item => {
        if (item.productId === reserveForm.productId) {
          return { ...item, reservedStock: newReserved }
        }
        return item
      }))

      showToast(
        reserveForm.action === 'RESERVE'
          ? `Successfully reserved ${numQty} units of ${targetItem.name}! (Total Reserved: ${newReserved})`
          : `Successfully released ${numQty} units of ${targetItem.name} back to available stock!`,
        'success'
      )
      setIsReserveOpen(false)
    } catch (err: any) {
      console.error('Failed reserving stock:', err)
      showToast('Failed to update stock reservation in database', 'error')
    }
  }

  const openAdjustFor = (item?: StockItem) => {
    const targetProduct = item?.productId || ''
    setForm({
      productId: targetProduct,
      warehouseId: item?.warehouseId || '',
      qty: '',
      reservedStock: item ? item.reservedStock : '',
      reason: REASONS[0],
      note: '',
    })
    setErrors({})
    setIsAdjustOpen(true)
  }

  const adjustSchema: ValidationSchema<AdjustForm> = {
    productId: { required: 'Please select a product' },
    warehouseId: { required: 'Please select a warehouse' },
    qty: { required: 'Adjustment quantity is required', nonZero: 'Adjustment quantity cannot be zero' },
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(form, adjustSchema)
    setErrors(newErrors)
    return isValid
  }

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const targetItem = items.find(i => i.productId === form.productId)
    const currentQty = targetItem ? targetItem.currentStock : (catalogProducts.find(p => p.id === form.productId)?.stock || 0)
    const numQty = Number(form.qty) || 0
    const newQty = Math.max(0, currentQty + numQty)
    const newReserved = form.reservedStock !== '' ? Math.max(0, Number(form.reservedStock)) : (targetItem?.reservedStock || 0)

    try {
      await stockTransactionService.createTransaction({
        productId: form.productId,
        type: 'ADJUSTMENT',
        qty: numQty,
        reservedStock: newReserved,
        ref: `ADJ-${Date.now().toString().slice(-6)}`
      } as any).catch(async () => {
        await productService.updateProduct(form.productId, { stock: newQty })
      })

      showToast(`Stock adjustment recorded (${numQty > 0 ? '+' : ''}${numQty}) & Reserved Stock updated to ${newReserved}`, 'success')

      setItems(prev => {
        const exists = prev.some(i => i.productId === form.productId)
        if (exists) {
          return prev.map(item => {
            if (item.productId === form.productId) {
              return { ...item, currentStock: newQty, reservedStock: newReserved, status: newQty <= item.minAlert ? 'LOW_STOCK' : 'IN_STOCK' }
            }
            return item
          })
        } else {
          const pName = selectedProduct?.name || 'Product'
          const pSku = selectedProduct?.sku || 'SKU-001'
          const whName = availableWarehouses.find(w => w.id === form.warehouseId)?.name || 'Main Pharmacy Store'
          return [...prev, {
            id: form.productId,
            productId: form.productId,
            name: pName,
            sku: pSku,
            warehouseId: form.warehouseId,
            warehouse: whName,
            currentStock: newQty,
            reservedStock: newReserved,
            minAlert: 10,
            status: newQty <= 10 ? 'LOW_STOCK' : 'IN_STOCK'
          }]
        }
      })

      setCatalogProducts(prev => prev.map(p => p.id === form.productId ? { ...p, stock: newQty } : p))

      showToast(`Stock updated for ${selectedProduct?.name || 'product'}: ${form.qty >= 0 ? '+' : ''}${form.qty} units`, 'success')
      setIsAdjustOpen(false)
    } catch (err: any) {
      console.error('Failed to update stock in database:', err)
      showToast('Failed to adjust stock in database', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-orbit-primary-light dark:text-orbit-primary-light" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock Levels &amp; Inventory</h1>
            <button
              onClick={() => setIsGuideOpen(true)}
              title="How to Manage Inventory - Guide"
              className="p-1.5 px-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:text-orbit-primary-light hover:bg-orbit-primary/10 border border-slate-200 dark:border-orbit-border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm ml-1"
            >
              <Info className="w-4 h-4 text-orbit-primary-light" />
              <span>Inventory Guide</span>
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time stock ledger, warehouse allocations, and low-stock alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openReserveFor()} variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 gap-1.5 font-semibold">
            <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Reserve Stock
          </Button>
          <Button onClick={() => openAdjustFor()} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
            <PlusCircle className="w-4 h-4" /> Adjust Stock
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search by product name, SKU, or warehouse..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">Product / SKU</th>
                <th className="px-6 py-4">Warehouse Location</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Reserved Stock</th>
                <th className="px-6 py-4">Available Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Boxes}
                  title="No Stock Items Found"
                  description="No inventory items match your search query."
                  colSpan={7}
                />
              ) : paginated.map(item => {
                const availStock = Math.max(0, item.currentStock - item.reservedStock)
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                      <p>{item.name}</p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.warehouse}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{item.currentStock} units</td>
                    <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-mono font-semibold">{item.reservedStock} units</td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-mono font-bold">{availStock} units</td>
                    <td className="px-6 py-4">
                      {item.status === 'BLOCKED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                          Blocked / Inactive
                        </span>
                      ) : item.status === 'LOW_STOCK' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock ({item.currentStock})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openReserveFor(item)}
                          className="text-xs text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 gap-1">
                          <Bookmark className="w-3.5 h-3.5" /> Reserve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAdjustFor(item)}
                          className="text-xs text-orbit-primary dark:text-orbit-primary-light border-orbit-primary/20 dark:border-orbit-primary/30 hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 gap-1">
                          <RefreshCw className="w-3.5 h-3.5" /> Adjust
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-orbit-border">
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            pageSizeOptions={[25, 50, 75, 100]}
          />
        </div>
      </div>

      {/* Reserve / Release Stock Modal */}
      <Modal isOpen={isReserveOpen} onClose={() => setIsReserveOpen(false)} size="md"
        title="Reserve or Release Stock" subtitle="Lock units for pending orders or release held inventory back to available stock">
        <form noValidate onSubmit={handleReserveSubmit} className="space-y-4">
          <SearchableProductSelect
            label="Select Product"
            required
            products={catalogProducts}
            selectedId={reserveForm.productId}
            onSelect={p => {
              setReserveForm(prev => ({ ...prev, productId: p?.id ?? '' }))
            }}
          />

          {reserveSelectedStockItem && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Stock</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{reserveSelectedStockItem.currentStock}</span>
              </div>
              <div className="border-x border-amber-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Reserved</span>
                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{reserveSelectedStockItem.reservedStock}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Available</span>
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {Math.max(0, reserveSelectedStockItem.currentStock - reserveSelectedStockItem.reservedStock)}
                </span>
              </div>
            </div>
          )}

          {/* Action Choice */}
          <div>
            <FieldLabel required>Action Mode</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReserveForm(p => ({ ...p, action: 'RESERVE' }))}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  reserveForm.action === 'RESERVE'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                    : 'border-slate-200 dark:border-orbit-border hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Lock className="w-4 h-4" /> Reserve (Lock Units)
              </button>
              <button
                type="button"
                onClick={() => setReserveForm(p => ({ ...p, action: 'RELEASE' }))}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  reserveForm.action === 'RELEASE'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-slate-200 dark:border-orbit-border hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Unlock className="w-4 h-4" /> Release (Unlock Units)
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <FieldLabel required>
              {reserveForm.action === 'RESERVE' ? 'Quantity to Reserve' : 'Quantity to Release'}
            </FieldLabel>
            <Input
              type="number"
              min={1}
              value={reserveForm.qty}
              onChange={e => {
                const val = e.target.value
                setReserveForm(p => ({ ...p, qty: val === '' ? '' : Math.max(1, Number(val)) }))
              }}
              placeholder="e.g. 5"
            />
          </div>

          {/* Reason / Reference */}
          <div>
            <FieldLabel>Reason / Reference Note</FieldLabel>
            <Input
              value={reserveForm.reason}
              onChange={e => setReserveForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="e.g., Customer Hold for Order #1004"
            />
          </div>

          {/* Live Preview */}
          {reserveSelectedStockItem && reserveForm.qty !== '' && Number(reserveForm.qty) > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-orbit-border text-xs flex justify-between items-center font-mono">
              <span className="text-slate-500">New Reserved Total:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {reserveForm.action === 'RESERVE'
                  ? reserveSelectedStockItem.reservedStock + Number(reserveForm.qty)
                  : Math.max(0, reserveSelectedStockItem.reservedStock - Number(reserveForm.qty))} units
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsReserveOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white gap-2 shadow-lg shadow-amber-600/30">
              <Save className="w-4 h-4" /> Save Reservation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} size="md"
        title="Adjust Stock Quantity" subtitle="Manually increase or decrease inventory for a specific catalog product">
        <form noValidate onSubmit={handleAdjust} className="space-y-4">

          {/* Product */}
          <SearchableProductSelect
            label="Select Product"
            required
            products={catalogProducts}
            selectedId={form.productId}
            onSelect={p => {
              setForm(prev => ({ ...prev, productId: p?.id ?? '' }))
              setErrors(prev => ({ ...prev, productId: undefined }))
            }}
            error={errors.productId}
          />

          {/* Live info card */}
          {selectedStockItem && (
            <div className="p-3 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 dark:border-orbit-primary/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{selectedStockItem.name}</p>
                <p className="text-[11px] font-mono text-slate-500">SKU: {selectedStockItem.sku}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Stock</span>
                <span className="font-bold text-sm text-orbit-primary-light dark:text-orbit-primary-light">{selectedStockItem.currentStock} units</span>
              </div>
            </div>
          )}

          {/* Warehouse */}
          <WarehouseSelect
            label="Warehouse"
            required
            warehouses={availableWarehouses}
            value={form.warehouseId}
            onChange={id => {
              setForm(prev => ({ ...prev, warehouseId: id }))
              setErrors(prev => ({ ...prev, warehouseId: undefined }))
            }}
            error={errors.warehouseId}
          />

          {/* Quantity */}
          <Input
            label="Quantity Adjustment (+ to add, − to reduce)"
            type="number"
            value={form.qty}
            onChange={e => {
              const val = e.target.value
              setForm(p => ({ ...p, qty: val === '' ? '' : Number(val) }))
              setErrors(prev => ({ ...prev, qty: undefined }))
            }}
            placeholder="e.g. 25 or -10"
            error={errors.qty}
            required
          />

          {/* Reserved Stock */}
          <Input
            label="Set Reserved Stock (Units locked for orders / VIP hold)"
            type="number"
            value={form.reservedStock}
            onChange={e => {
              const val = e.target.value
              setForm(p => ({ ...p, reservedStock: val === '' ? '' : Math.max(0, Number(val)) }))
            }}
            placeholder="e.g. 5 (units held for order/client)"
            hint="Reserved units are locked and excluded from POS sales"
          />

          {/* Stock calculation preview */}
          {selectedStockItem && form.qty !== '' && Number(form.qty) !== 0 && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-orbit-border flex items-center justify-between font-mono">
              <span className="text-slate-500 text-[11px]">After Adjustment:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {selectedStockItem.currentStock} {Number(form.qty) >= 0 ? `+ ${form.qty}` : `- ${Math.abs(Number(form.qty))}`}
                {' = '}
                <strong className="text-orbit-primary-light dark:text-orbit-primary-light font-extrabold">
                  {Math.max(0, selectedStockItem.currentStock + Number(form.qty))} units
                </strong>
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <FieldLabel>Adjustment Reason</FieldLabel>
            <select
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
            >
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Note */}
          <Input
            label="Additional Notes (optional)"
            value={form.note}
            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
            placeholder="e.g. Physical inventory audit discrepancy"
          />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Apply Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inventory Step-by-Step Guide Modal */}
      <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} size="2xl" title="How to Manage Inventory & FEFO Stock - Setup Guide" subtitle="Learn how warehouses, batches, stock adjustments, and low-stock alerts work">
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-orbit-primary/10 border border-orbit-primary/20 rounded-xl flex items-start gap-3 text-slate-800 dark:text-slate-200">
            <Lightbulb className="w-5 h-5 text-orbit-primary-light flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Inventory &amp; Stock Ledger Workflow</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Keep stock counts synchronized across multiple store warehouses and track low-stock &amp; expiry warnings in real time.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 1: Setup Warehouses &amp; Branches</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Go to Warehouses page to register store storage rooms, cold-chain rooms, and retail branches.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/inventory/warehouses') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Warehouses <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 2: Assign Product Batches &amp; Expiry Dates</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Go to Product Batches page to assign batch numbers (e.g. #BAT-2026-001), expiry dates, and warehouse quantities.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/inventory/batches') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Batches <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 3: Monitor Low-Stock &amp; Expiry Alerts</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Yellow warnings highlight items with &lt; 5 units left. Near-expiry badges alert items expiring soon.</p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">4</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 4: Perform Manual Stock Adjustments</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click "Adjust Stock" to add inventory (+), record damaged stock (-), or conduct physical stock audits.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => { setIsGuideOpen(false); openAdjustFor() }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 flex-shrink-0 font-semibold">
                Adjust Stock Now <PlusCircle className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 5 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">5</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 5: View Stock Movements &amp; Transfers</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Go to Stock Movements page to audit full inventory transfer transactions and movement logs.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/inventory/transactions') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Movements <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-orbit-border">
            <Button variant="outline" onClick={() => setIsGuideOpen(false)}>Close Guide</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
