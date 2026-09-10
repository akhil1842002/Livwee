import { useState, useMemo, useEffect } from 'react'
import {
  RotateCcw,
  Plus,
  Search,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Printer,
  Download,
  X,
  ChevronDown,
  Check,
  Package,
  ArrowRight,
  ShieldAlert,
  FileText,
  Calendar
} from 'lucide-react'
import { Button, Input, Modal, Pagination, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { returnService } from '@/services/returnService'
import { invoiceService } from '@/services/invoiceService'
import { productService } from '@/services/productService'
import { getAllInvoices } from '@/data/sharedData'

// ─── Available Original Sales Registry ────────────────────────────────────────

export type OriginalSale = {
  saleNumber: string
  date: string
  customer: string
  customerPhone: string
  totalAmount: number
  items: {
    id: string
    product: string
    batch: string
    unitPrice: number
    purchasedQty: number
    unit: string
  }[]
}

const AVAILABLE_SALES: OriginalSale[] = []

// ─── Return Types & Seed ──────────────────────────────────────────────────────

export type ReturnRecord = {
  id: string
  returnNumber: string
  saleNumber: string
  customer: string
  customerPhone: string
  returnedItemName: string
  batchNo: string
  qtyReturned: number
  reason: string
  disposition: 'RESTOCK_INVENTORY' | 'DAMAGED_QUARANTINE' | 'EXPIRED_DESTROY'
  refundAmount: number
  refundMethod: 'Cash' | 'UPI' | 'Credit Note' | 'Bank Transfer'
  status: 'APPROVED' | 'INSPECTING' | 'REFUNDED'
  date: string
}

const seedReturns: ReturnRecord[] = []

// ─── Main Page Component ──────────────────────────────────────────────────────

export function ReturnsPage() {
  const { showToast } = useToast()
  const [returns, setReturns] = useState<ReturnRecord[]>(seedReturns)
  const [availableSales, setAvailableSales] = useState<OriginalSale[]>([])

  useEffect(() => {
    Promise.all([
      returnService.fetchReturns().catch(() => null),
      invoiceService.fetchInvoices().catch(() => null)
    ]).then(([retRes, invRes]) => {
      // 1. Process Returns
      if (retRes && retRes.data && retRes.data.length > 0) {
        const fetched: ReturnRecord[] = retRes.data.map((r: any) => ({
          id: r._id || r.id,
          returnNumber: r.return_number || r.returnNumber,
          saleNumber: r.order_number || r.saleNumber,
          customer: r.customer_name || r.customer || 'Customer',
          customerPhone: r.customer_phone || '+91 98765 43210',
          returnedItemName: r.returned_item_name || r.items?.[0]?.product_name || 'Returned Product',
          batchNo: r.batch_no || 'BAT-2026-001',
          qtyReturned: r.qty_returned || r.items?.[0]?.qty || 1,
          reason: r.reason || r.items?.[0]?.reason || r.notes || 'Customer Return',
          disposition: r.disposition || 'RESTOCK_INVENTORY',
          refundAmount: r.refund_amount || 0,
          refundMethod: r.refund_method || 'Cash',
          status: r.status || 'REFUNDED',
          date: r.date || (r.createdAt ? r.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10))
        }))
        setReturns(prev => {
          const existingIds = new Set(prev.map(item => item.returnNumber))
          const newItems = fetched.filter(item => !existingIds.has(item.returnNumber))
          return [...newItems, ...prev]
        })
      }

      // 2. Process Available Original Sales from POS & Invoices
      const posInvoices = getAllInvoices()
      const apiOrders = invRes && invRes.data && Array.isArray(invRes.data) ? invRes.data : []

      const salesMap = new Map<string, OriginalSale>()

      posInvoices.forEach(inv => {
        if (inv && inv.invoiceNumber) {
          salesMap.set(inv.invoiceNumber, {
            saleNumber: inv.invoiceNumber,
            date: inv.issuedAt || new Date().toISOString().split('T')[0],
            customer: inv.customer || 'Walk-in Customer',
            customerPhone: inv.customerPhone || '+91 98765 43210',
            totalAmount: inv.paidAmount || 0,
            items: (inv.items || []).map((i, idx) => ({
              id: i.id || String(idx + 1),
              product: i.product,
              batch: i.batch || 'BAT-2026-001',
              unitPrice: i.unitPrice || 0,
              purchasedQty: i.qty || 1,
              unit: i.unit || 'Pcs'
            }))
          })
        }
      })

      apiOrders.forEach((inv: any) => {
        const num = inv.order_number || inv.invoiceNumber || inv.po_number
        if (num && !salesMap.has(num)) {
          salesMap.set(num, {
            saleNumber: num,
            date: inv.issuedAt || (inv.createdAt ? inv.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10)),
            customer: inv.customer_name || inv.customer || 'Walk-in Customer',
            customerPhone: '+91 98765 43210',
            totalAmount: inv.total_amount || inv.paid_amount || 0,
            items: (inv.items || []).map((i: any, idx: number) => ({
              id: i._id || i.id || String(idx + 1),
              product: i.product_id?.name || i.product_name || i.product || `Item ${idx + 1}`,
              batch: i.batch || 'BAT-2026-001',
              unitPrice: Number(i.unit_price || i.product_id?.price || 0),
              purchasedQty: Number(i.qty || i.qty_ordered || 1),
              unit: i.unit || 'Pcs'
            }))
          })
        }
      })

      setAvailableSales(Array.from(salesMap.values()))
    }).catch(err => console.warn('Could not fetch returns or sales data:', err))
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [viewReturn, setViewReturn] = useState<ReturnRecord | null>(null)

  // ─── Form State with Searchable Sales Select Dropdown ────────────────────────
  const [selectedSaleNumber, setSelectedSaleNumber] = useState<string>('')
  const [saleSearchQuery, setSaleSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [qtyToReturn, setQtyToReturn] = useState<number>(1)
  const [reason, setReason] = useState('')
  const [disposition, setDisposition] = useState<'RESTOCK_INVENTORY' | 'DAMAGED_QUARANTINE' | 'EXPIRED_DESTROY'>('RESTOCK_INVENTORY')
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'UPI' | 'Credit Note' | 'Bank Transfer'>('UPI')

  // Find currently selected original sale object
  const currentSelectedSale = useMemo(() => {
    return availableSales.find(s => s.saleNumber === selectedSaleNumber) || null
  }, [availableSales, selectedSaleNumber])

  // Filter available sales in dropdown search
  const filteredSalesOptions = useMemo(() => {
    return availableSales.filter(s =>
      s.saleNumber.toLowerCase().includes(saleSearchQuery.toLowerCase()) ||
      s.customer.toLowerCase().includes(saleSearchQuery.toLowerCase()) ||
      s.items.some(i => i.product.toLowerCase().includes(saleSearchQuery.toLowerCase()))
    )
  }, [availableSales, saleSearchQuery])

  // Currently selected item object for return
  const currentSelectedItem = useMemo(() => {
    if (!currentSelectedSale) return null
    return currentSelectedSale.items.find(i => i.id === selectedItemId) || currentSelectedSale.items[0] || null
  }, [currentSelectedSale, selectedItemId])

  // Calculated refund amount
  const calculatedRefund = useMemo(() => {
    if (!currentSelectedItem) return 0
    return currentSelectedItem.unitPrice * qtyToReturn
  }, [currentSelectedItem, qtyToReturn])

  // Handle selecting a sale from dropdown
  const handleSelectSale = (sale: OriginalSale) => {
    setSelectedSaleNumber(sale.saleNumber)
    setSaleSearchQuery(`${sale.saleNumber} — ${sale.customer}`)
    setIsDropdownOpen(false)
    if (sale.items.length > 0) {
      setSelectedItemId(sale.items[0].id)
      setQtyToReturn(1)
    }
  }

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentSelectedSale || !currentSelectedItem) {
      showToast('Please select a valid original sale and product item', 'error')
      return
    }

    if (!reason.trim()) {
      showToast('Please specify a return reason', 'error')
      return
    }

    try {
      const res = await returnService.createReturn({
        order_id: currentSelectedSale.saleNumber,
        order_number: currentSelectedSale.saleNumber,
        customer_name: currentSelectedSale.customer,
        customer_phone: currentSelectedSale.customerPhone,
        returned_item_name: currentSelectedItem.product,
        batch_no: currentSelectedItem.batch || 'BAT-2026-001',
        qty_returned: qtyToReturn,
        reason,
        disposition,
        refund_amount: calculatedRefund,
        refund_method: refundMethod,
        items: [{
          product_id: currentSelectedItem.id,
          product_name: currentSelectedItem.product,
          qty: qtyToReturn,
          unit_price: currentSelectedItem.unitPrice,
          reason
        }],
        notes: `Disposition: ${disposition}`
      })

      const backendData = res && res.data ? res.data : null
      const createdRetNum = backendData?.return_number || `RET-2026-${String(returns.length + 1).padStart(3, '0')}`

      const newReturn: ReturnRecord = {
        id: backendData?._id || backendData?.id || Date.now().toString(),
        returnNumber: createdRetNum,
        saleNumber: currentSelectedSale.saleNumber,
        customer: currentSelectedSale.customer,
        customerPhone: currentSelectedSale.customerPhone,
        returnedItemName: currentSelectedItem.product,
        batchNo: currentSelectedItem.batch,
        qtyReturned: qtyToReturn,
        reason,
        disposition,
        refundAmount: calculatedRefund,
        refundMethod,
        status: 'REFUNDED',
        date: new Date().toISOString().split('T')[0]
      }

      setReturns(prev => [newReturn, ...prev])
      showToast(`Return ${createdRetNum} recorded! Stock & batch updated in MongoDB. Refund ₹${calculatedRefund.toFixed(2)} processed via ${refundMethod}.`, 'success')
      setIsAddOpen(false)

      // Reset Form
      setSelectedSaleNumber('')
      setSaleSearchQuery('')
      setReason('')
    } catch (err: any) {
      showToast(err.message || 'Error processing sales return', 'error')
    }
  }

  const filteredReturns = returns.filter(r => {
    const matchesSearch =
      r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.returnedItemName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDate = (startDate ? r.date >= startDate : true) && (endDate ? r.date <= endDate : true)
    return matchesSearch && matchesDate
  })

  const dispositionBadgeMap = {
    RESTOCK_INVENTORY: { label: '📦 Restocked to Inventory', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30' },
    DAMAGED_QUARANTINE: { label: '☣️ Damaged / Quarantined', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' },
    EXPIRED_DESTROY: { label: '🗑️ Expired / Destroyed', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30' }
  }

  const paginated = filteredReturns.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales Returns &amp; Customer Refunds</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Process customer returns against original sales invoices, manage stock disposition, and issue refunds
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 text-sm font-semibold py-2.5 px-5"
        >
          <Plus className="w-4 h-4" /> Record New Return
        </Button>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        {/* Compact Search Input */}
        <div className="relative w-full sm:w-64">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search return #, customer..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-orbit-border px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-orbit-primary-light" />
            <span className="text-slate-400 font-medium hidden md:inline">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1) }}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-orbit-border px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-orbit-primary-light" />
            <span className="text-slate-400 font-medium hidden md:inline">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1) }}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStartDate('2026-09-08')
              setEndDate('2026-09-08')
              setCurrentPage(1)
              showToast("Filtered by Today's Date", 'info')
            }}
            className="text-xs h-8 px-2.5 bg-orbit-primary/5 text-orbit-primary border-orbit-primary/20 dark:bg-orbit-primary/10 dark:text-orbit-primary-light dark:border-orbit-primary/30 hover:bg-orbit-primary/10"
          >
            Today
          </Button>

          {(searchTerm || startDate !== '2026-09-08' || endDate !== '2026-09-08') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setStartDate('2026-09-08')
                setEndDate('2026-09-08')
                setCurrentPage(1)
                showToast("Cleared and selected Today's date", 'info')
              }}
              className="text-xs gap-1 border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[880px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">Return #</th>
                <th className="px-6 py-4">Original Sale #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Returned Item &amp; Qty</th>
                <th className="px-6 py-4">Stock Disposition</th>
                <th className="px-6 py-4">Refund Amount</th>
                <th className="px-6 py-4">Method &amp; Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {paginated.length === 0 ? (
                <EmptyState
                  colSpan={8}
                  title="No Returns Found"
                  description="There are no sales return or refund records recorded."
                  actionLabel="Record New Return"
                  onAction={() => setIsAddOpen(true)}
                />
              ) : (
                paginated.map(ret => (
                <tr key={ret.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light whitespace-nowrap">
                    {ret.returnNumber}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {ret.saleNumber}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{ret.customer}</p>
                    <p className="text-[11px] text-slate-400">{ret.customerPhone}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{ret.returnedItemName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>Batch: {ret.batchNo}</span>
                      <span>•</span>
                      <span className="font-bold text-orbit-primary-light dark:text-orbit-primary-light">{ret.qtyReturned} Unit(s)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${dispositionBadgeMap[ret.disposition].cls}`}>
                      {dispositionBadgeMap[ret.disposition].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400 font-mono whitespace-nowrap">
                    ₹{ret.refundAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">{ret.refundMethod}</span>
                    <span className="text-[11px] font-mono text-slate-400">{ret.date}</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => setViewReturn(ret)}
                      title="View Return Receipt"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-orbit-border">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredReturns.length}
            pageSize={pageSize}
            pageSizeOptions={[25, 50, 75, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            }}
          />
        </div>
      </div>

      {/* ── Record New Return Modal (With Searchable Sales Dropdown) ── */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="xl" title="Record Sales Return &amp; Refund" subtitle="Select original sale number, choose item to return, and specify stock disposition">
        <form onSubmit={handleCreateReturn} className="space-y-5">

          {/* 1. SEARCHABLE ORIGINAL SALE DROPDOWN */}
          <div className="space-y-1.5 relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Original Sale Number <span className="text-rose-500">* (Searchable Dropdown)</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={saleSearchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={e => {
                  setSaleSearchQuery(e.target.value)
                  setIsDropdownOpen(true)
                }}
                placeholder="Click to search sale # (e.g. SALE-2026-0042), customer name, or medicine..."
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface text-slate-900 dark:text-slate-100 pl-10 pr-10 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Options Box */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-[#1a1a28] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSalesOptions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No matching sales records found for "{saleSearchQuery}"
                  </div>
                ) : (
                  filteredSalesOptions.map(sale => (
                    <div
                      key={sale.saleNumber}
                      onClick={() => handleSelectSale(sale)}
                      className={`p-3 cursor-pointer transition-colors hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 flex items-center justify-between gap-3 ${
                        selectedSaleNumber === sale.saleNumber ? 'bg-orbit-primary/5/80 dark:bg-orbit-primary/20' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light text-xs">{sale.saleNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({sale.date})</span>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{sale.customer}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-sm">
                          Items: {sale.items.map(i => i.product).join(', ')}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs block">₹{sale.totalAmount.toFixed(2)}</span>
                        {selectedSaleNumber === sale.saleNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. AUTO-FILLED SALE & ITEM SELECTION */}
          {currentSelectedSale && (
            <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Billed Customer</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{currentSelectedSale.customer}</span>
                  <span className="text-[11px] text-slate-400 block">{currentSelectedSale.customerPhone}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Original Total</span>
                  <span className="font-mono font-extrabold text-orbit-primary-light dark:text-orbit-primary-light text-base">₹{currentSelectedSale.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Item picker from original sale */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Item Being Returned *
                </label>
                <select
                  value={selectedItemId}
                  onChange={e => {
                    setSelectedItemId(e.target.value)
                    setQtyToReturn(1)
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-slate-900 dark:text-slate-100 px-3.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                >
                  {currentSelectedSale.items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.product} (Batch: {item.batch}) — ₹{item.unitPrice.toFixed(2)} / {item.unit} (Purchased: {item.purchasedQty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Qty & Auto Refund Calculation */}
              {currentSelectedItem && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Return Quantity (Max: {currentSelectedItem.purchasedQty}) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentSelectedItem.purchasedQty}
                      value={qtyToReturn}
                      onChange={e => setQtyToReturn(Math.min(Number(e.target.value) || 1, currentSelectedItem.purchasedQty))}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-slate-900 dark:text-slate-100 px-3.5 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                    />
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Calculated Refund</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {qtyToReturn} × ₹{currentSelectedItem.unitPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">
                      ₹{calculatedRefund.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. ADDITIONAL DETAILS (Disposition, Reason, Method) */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Stock Disposition / Action *
                </label>
                <select
                  value={disposition}
                  onChange={e => setDisposition(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface text-slate-900 dark:text-slate-100 px-3.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                >
                  <option value="RESTOCK_INVENTORY">📦 Restock to Active Batch Inventory</option>
                  <option value="DAMAGED_QUARANTINE">☣️ Move to Quarantine / Damaged Holding</option>
                  <option value="EXPIRED_DESTROY">🗑️ Mark Expired / Send for Destruction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Refund Payment Method *
                </label>
                <select
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface text-slate-900 dark:text-slate-100 px-3.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="Cash">Cash Return</option>
                  <option value="Credit Note">Issue Credit Note</option>
                  <option value="Bank Transfer">Direct Bank Refund</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Detailed Return Reason *
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain reason (e.g. Wrong dosage prescribed, unboxing damage, patient reaction)..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 resize-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 px-6">
              <Save className="w-4 h-4" /> Record Return &amp; Refund
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View Return Voucher Modal ── */}
      {viewReturn && (
        <Modal isOpen={!!viewReturn} onClose={() => setViewReturn(null)} size="md" title={`Return Slip: ${viewReturn.returnNumber}`} subtitle={`Original Sale: ${viewReturn.saleNumber}`}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">CUSTOMER</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{viewReturn.customer}</span>
                <span className="text-[11px] text-slate-400 block">{viewReturn.customerPhone}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">REFUND ISSUED</span>
                <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-lg">₹{viewReturn.refundAmount.toFixed(2)}</span>
                <span className="text-[11px] text-slate-400 block">{viewReturn.refundMethod}</span>
              </div>
            </div>

            <div className="bg-orbit-primary/5/50 dark:bg-orbit-primary/50/5 p-4 rounded-xl border border-orbit-primary/20 dark:border-orbit-primary/20 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light block">Returned Item Details</span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{viewReturn.returnedItemName}</p>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400 pt-1">
                <span>Batch: {viewReturn.batchNo}</span>
                <span>•</span>
                <span>Qty Returned: {viewReturn.qtyReturned} Unit(s)</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase mb-1">Return Reason &amp; Disposition</span>
              <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                {viewReturn.reason}
              </p>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${dispositionBadgeMap[viewReturn.disposition].cls}`}>
                  {dispositionBadgeMap[viewReturn.disposition].label}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setViewReturn(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
