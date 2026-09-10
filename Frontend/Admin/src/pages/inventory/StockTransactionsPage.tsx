import { useState, useEffect } from 'react'
import { ArrowRightLeft, Search, TrendingUp, TrendingDown, Plus, Save, UserCheck, Loader2, Lock, Unlock } from 'lucide-react'
import { Button, Input, Modal, Pagination, SearchableProductSelect, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import type { CatalogProduct } from '@/data/sharedData'
import { validateForm, ValidationSchema } from '@/utils/validators'
import { stockTransactionService } from '@/services/stockTransactionService'
import { productService } from '@/services/productService'

type Tx = {
  id: string
  productId: string
  product: string
  batch: string
  type: string
  qty: number
  prevQty: number
  newQty: number
  prevReserved?: number
  newReserved?: number
  ref: string
  by: string
  time: string
}

const TX_TYPES = ['SALE', 'RESTOCK', 'RETURN', 'ADJUSTMENT', 'RESERVATION', 'RELEASE']

type TxForm = {
  productId: string
  batch: string
  type: string
  qty: number
  ref: string
}

export function StockTransactionsPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const activeUserName = user?.name || 'Super Admin (Akhil)'

  const [logs, setLogs] = useState<Tx[]>([])
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof TxForm, string>>>({})

  const [form, setForm] = useState<TxForm>({
    productId: '',
    batch: 'BAT-2026-001',
    type: TX_TYPES[0],
    qty: -10,
    ref: '',
  })

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [txData, prodData] = await Promise.all([
        stockTransactionService.fetchTransactions(),
        productService.fetchProducts()
      ])
      
      const prodList = Array.isArray(prodData) ? prodData : (prodData?.data || [])
      const prodMap = new Map<string, string>()
      prodList.forEach((p: any) => {
        const idKey = String(p._id || p.id || '')
        if (idKey && p.name) {
          prodMap.set(idKey, p.name)
        }
      })

      const rawTx = Array.isArray(txData) ? txData : []
      const mappedLogs: Tx[] = rawTx.map((t: any) => {
        const pObj = t.inventory_id?.product_id
        const pIdStr = String(pObj?._id || pObj || t.product_id || '')
        const pName = pObj?.name || t.product_name || t.productName || prodMap.get(pIdStr) || (prodList[0]?.name || 'Pharmaceutical Item')

        const prev = t.previous_stock ?? t.previousStock ?? t.prevQty ?? 0
        const next = t.new_stock ?? t.newStock ?? t.newQty ?? (prev + (t.qty || 0))
        let pRes = t.previous_reserved ?? t.prevReserved
        let nRes = t.new_reserved ?? t.newReserved

        if (pRes === undefined || nRes === undefined) {
          const absQty = Math.abs(t.qty || 0)
          if (t.type === 'RESERVATION') {
            nRes = nRes !== undefined ? nRes : (t.inventory_id?.reserved_stock || absQty)
            pRes = pRes !== undefined ? pRes : Math.max(0, nRes - absQty)
          } else if (t.type === 'RELEASE') {
            nRes = nRes !== undefined ? nRes : Math.max(0, (t.inventory_id?.reserved_stock || 0))
            pRes = pRes !== undefined ? pRes : (nRes + absQty)
          } else {
            pRes = pRes || 0
            nRes = nRes || 0
          }
        }
        let refStr = t.reference_id || t.ref || 'N/A'
        if (refStr !== 'N/A' && refStr.length === 24 && /^[0-9a-fA-F]+$/.test(refStr)) {
          refStr = `POS-${refStr.slice(-6).toUpperCase()}`
        }

        return {
          id: t._id || t.id,
          productId: pIdStr,
          product: pName,
          batch: t.batch_number || t.inventory_id?.variant_id || 'BAT-2026-001',
          type: t.type || 'ADJUSTMENT',
          qty: t.qty || 0,
          prevQty: prev,
          newQty: next,
          prevReserved: pRes,
          newReserved: nRes,
          ref: refStr,
          by: t.created_by?.name || t.by || 'Admin',
          time: t.createdAt ? new Date(t.createdAt).toLocaleString() : new Date().toLocaleString()
        }
      })
      setLogs(mappedLogs)

      if (prodList.length > 0) {
        const activeProds = prodList.filter((p: any) => p.status !== 'INACTIVE' && p.status !== 'BLOCKED' && p.visibility !== false)
        const formattedProds = activeProds.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          sku: p.sku || 'N/A',
          unit: p.unit || 'Strip',
          taxName: 'GST 12%',
          purchasePrice: p.cost_price || (p.price ? p.price * 0.7 : 0),
          sellingPrice: p.price || 0
        }))
        setCatalogProducts(formattedProds)
        if (formattedProds.length > 0 && !form.productId) {
          setForm(prev => ({ ...prev, productId: formattedProds[0].id }))
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch stock transactions', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = logs.filter(l =>
    l.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.by.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleProductSelect = (product: CatalogProduct | null) => {
    if (product) {
      setForm(p => ({ ...p, productId: product.id, batch: 'BAT-2026-001' }))
    } else {
      setForm(p => ({ ...p, productId: '', batch: '' }))
    }
    setErrors(prev => ({ ...prev, productId: undefined }))
  }

  const txSchema: ValidationSchema<TxForm> = {
    productId: { required: 'Please select a product' },
    batch: { required: 'Batch code is required' },
    qty: { required: 'Quantity is required', nonZero: 'Quantity cannot be zero' },
  }

  const validate = (): boolean => {
    const { errors: newErrors, isValid } = validateForm(form, txSchema)
    setErrors(newErrors)
    return isValid
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await stockTransactionService.createTransaction({
        productId: form.productId,
        batch: form.batch,
        type: form.type,
        qty: form.qty,
        ref: form.ref
      })
      showToast(`Transaction logged by ${activeUserName}`, 'success')
      setIsAddOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to record transaction', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-orbit-primary-light dark:text-orbit-primary-light" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock Transactions</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Full audit ledger of stock-in, stock-out, adjustments, and batch movements</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
          <Plus className="w-4 h-4" /> Record Transaction
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative max-w-md w-full">
          <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search by product, batch, type, or user..."
            prefix={<Search className="w-4 h-4 text-slate-400" />} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">Product / Batch</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Quantity Change</th>
                <th className="px-6 py-4">Stock Ledger</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Performed By</th>
                <th className="px-6 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orbit-primary" />
                    Loading stock transactions...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <EmptyState
                  icon={ArrowRightLeft}
                  title="No Stock Movements Logged"
                  description="No stock movement records match your search criteria."
                  colSpan={7}
                />
              ) : paginated.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                    <p>{log.product}</p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{log.batch}</p>
                  </td>
                  <td className="px-6 py-4">
                    {log.type === 'RESERVATION' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                        <Lock className="w-3 h-3" /> RESERVATION
                      </span>
                    ) : log.type === 'RELEASE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                        <Unlock className="w-3 h-3" /> RELEASE
                      </span>
                    ) : log.type === 'SALE' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                        SALE
                      </span>
                    ) : log.type === 'RESTOCK' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        RESTOCK
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {log.type}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {log.type === 'RESERVATION' ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1"><Lock className="w-3.5 h-3.5" />+{Math.abs(log.qty)} Reserved</span>
                    ) : log.type === 'RELEASE' ? (
                      <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Unlock className="w-3.5 h-3.5" />-{Math.abs(log.qty)} Released</span>
                    ) : log.qty > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />+{log.qty}</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" />{log.qty}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {log.type === 'RESERVATION' || log.type === 'RELEASE' ? (
                      <div>
                        <div className="text-slate-600 dark:text-slate-400">
                          Avail: <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.max(0, log.prevQty - (log.prevReserved || 0))} → {Math.max(0, log.newQty - (log.newReserved || 0))}</span>
                        </div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          Reserved: {log.prevReserved || 0} → {log.newReserved || 0}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">
                        {log.prevQty} → <span className="text-slate-900 dark:text-slate-100 font-bold">{log.newQty}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-orbit-primary-light dark:text-orbit-primary-light">{log.ref}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{log.by}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">{log.time}</td>
                </tr>
              ))}
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

      {/* Record Transaction Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="lg"
        title="Record Stock Transaction" subtitle="Manually log a stock movement with automatic user audit tracking">
        <form noValidate onSubmit={handleAdd} className="space-y-4">

          {/* Audit strip */}
          <div className="bg-orbit-primary/5 dark:bg-orbit-primary/10 p-2.5 rounded-xl border border-orbit-primary/20 dark:border-orbit-primary/30 flex items-center justify-between text-orbit-primary dark:text-orbit-primary-light">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <UserCheck className="w-4 h-4 text-orbit-primary-light" />
              <span>Logging User: {activeUserName}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Audit Active</span>
          </div>

          {/* Product */}
          <SearchableProductSelect
            label="Select Product"
            required
            products={catalogProducts}
            selectedId={form.productId}
            onSelect={handleProductSelect}
            error={errors.productId}
          />

          {/* Batch Code */}
          <Input
            label="Batch Code"
            value={form.batch}
            onChange={e => {
              setForm(p => ({ ...p, batch: e.target.value }))
              setErrors(prev => ({ ...prev, batch: undefined }))
            }}
            placeholder="e.g. BAT-2026-001"
            error={errors.batch}
            hint="Auto-filled from product — edit if needed"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Transaction type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Transaction Type</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 focus:border-orbit-primary transition-all shadow-sm"
              >
                {TX_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Quantity */}
            <Input
              label="Quantity (+ to add, − for dispatch)"
              type="number"
              value={form.qty}
              onChange={e => {
                setForm(p => ({ ...p, qty: Number(e.target.value) }))
                setErrors(prev => ({ ...prev, qty: undefined }))
              }}
              error={errors.qty}
              required
            />
          </div>

          {/* Reference */}
          <Input
            label="Reference Number (optional)"
            value={form.ref}
            onChange={e => setForm(p => ({ ...p, ref: e.target.value }))}
            placeholder="e.g. PO-2026-012 or SALE-0050"
            hint="Auto-generated if left blank"
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> Record Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
