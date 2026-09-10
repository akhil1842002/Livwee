import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Save,
  Trash2,
  Calendar,
  XCircle,
  FileText,
  Building2,
  X,
  PackageCheck,
  AlertTriangle,
  Printer,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Download,
  Filter,
  RefreshCw,
  Edit3,
  CreditCard,
  IndianRupee,
  UserCheck,
  History,
  User,
  ShieldCheck,
  Lock,
  Info,
  Lightbulb
} from 'lucide-react'
import { Button, Input, Modal, Pagination, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { purchaseOrderService } from '@/services/purchaseOrderService'
import { productService } from '@/services/productService'
import { supplierService } from '@/services/supplierService'
import { warehouseService } from '@/services/warehouseService'
import { batchService } from '@/services/batchService'
import { getStoredProducts } from '@/data/sharedData'

// ─── Types & Models ───────────────────────────────────────────────────────────

export type POStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED'

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'

export type POLineItem = {
  id: string
  productId: string
  productName: string
  unitCost: number
  qtyOrdered: number
  qtyReceived: number
  taxRate: number
  unit: string
  lineTotal: number
}

export type POAuditLog = {
  id: string
  timestamp: string
  updatedBy: string
  userRole: string
  action: string
  previousStatus: POStatus
  newStatus: POStatus
  previousAmountPaid: number
  newAmountPaid: number
  remarks?: string
}

export type PurchaseOrder = {
  id: string
  poNumber: string
  quotationNo: string
  supplier: string
  warehouse: string
  orderDate: string
  expectedDeliveryDate: string
  paymentTerms: string
  status: POStatus
  items: POLineItem[]
  subTotal: number
  taxAmount: number
  shippingCost: number
  grandTotal: number
  amountPaid: number
  paymentStatus: PaymentStatus
  createdBy: string
  lastUpdatedBy: string
  lastUpdatedAt: string
  auditLogs: POAuditLog[]
  notes: string
}

export type SupplierOption = {
  id: string
  code: string
  name: string
  category: string
  paymentTerms?: string
}

export const AVAILABLE_SUPPLIERS: SupplierOption[] = []

export type WarehouseOption = {
  id: string
  code: string
  name: string
  type: string
  location: string
}

const AVAILABLE_WAREHOUSES: WarehouseOption[] = []

export type CatalogProduct = {
  id: string
  name: string
  sku: string
  category: string
  defaultCostPrice: number
  taxRate: number
  unit: string
}

// ─── Available Product Catalog ────────────────────────────────────────────────

const AVAILABLE_PRODUCTS: CatalogProduct[] = []

// ─── Seed Purchase Orders & Audit Logs ────────────────────────────────────────

const seedPOs: PurchaseOrder[] = []

// ─── Main Page Component ──────────────────────────────────────────────────────

export function PurchasesPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  
  // Current Active User Name
  const currentUserDisplay = user?.name ? `${user.name} (${user.type || 'ADMIN'})` : 'Super Admin (Akhil)'
  const currentUserRole = user?.type || 'SUPER_ADMIN'

  const [orders, setOrders] = useState<PurchaseOrder[]>(seedPOs)

  const loadOrders = async () => {
    try {
      const res = await purchaseOrderService.fetchPurchaseOrders()
      const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
      if (rawList && rawList.length > 0) {
        const fetched: PurchaseOrder[] = rawList.map((po: any) => ({
          id: po._id || po.id,
          poNumber: po.po_number || po.poNumber || 'PO-2026-001',
          quotationNo: po.quotation_no || po.quotationNo || 'QT-2026-001',
          supplier: po.supplier_name || po.supplier || 'Cipla Pharmaceuticals',
          warehouse: po.warehouse_name || po.warehouse || 'Main Warehouse',
          orderDate: po.order_date ? po.order_date.substring(0, 10) : (po.createdAt ? po.createdAt.substring(0, 10) : '2026-09-09'),
          expectedDeliveryDate: po.expected_delivery ? po.expected_delivery.substring(0, 10) : (po.expected_delivery_date ? po.expected_delivery_date.substring(0, 10) : '2026-09-15'),
          paymentTerms: po.payment_terms || po.paymentTerms || 'Net 30',
          status: (po.status as any) || 'ORDERED',
          items: (po.items || []).map((i: any, idx: number) => ({
            id: String(idx + 1),
            productId: i.product_id?._id || i.product_id || `p-${idx + 1}`,
            productName: i.product_name || i.productName || i.product_id?.name || 'Product ' + (idx + 1),
            unitCost: i.unit_price ?? i.unit_cost ?? i.unitCost ?? 0,
            qtyOrdered: i.qty_ordered ?? i.qtyOrdered ?? 1,
            qtyReceived: po.status === 'CLOSED' || po.status === 'RECEIVED' ? (i.qty_ordered ?? i.qtyOrdered ?? 1) : (i.qty_received ?? i.qtyReceived ?? 0),
            taxRate: 18,
            unit: i.unit || 'Box',
            lineTotal: i.total ?? i.total_cost ?? i.lineTotal ?? 0
          })),
          subTotal: po.subtotal ?? po.subTotal ?? 0,
          taxAmount: po.tax_amount ?? po.taxAmount ?? po.tax ?? 0,
          shippingCost: po.shipping_cost ?? po.shippingCost ?? po.shipping ?? 0,
          grandTotal: po.total_amount ?? po.grandTotal ?? 0,
          amountPaid: po.paid_amount ?? po.amount_paid ?? po.amountPaid ?? 0,
          paymentStatus: po.payment_status === 'PAID' ? 'FULLY_PAID' : (po.payment_status === 'PARTIAL' ? 'PARTIALLY_PAID' : (po.payment_status === 'UNPAID' ? 'UNPAID' : (po.paymentStatus || (po.status === 'CLOSED' ? 'FULLY_PAID' : 'UNPAID')))),
          createdBy: po.createdBy || 'Admin',
          lastUpdatedBy: po.lastUpdatedBy || 'Admin',
          lastUpdatedAt: po.updatedAt ? po.updatedAt.substring(0, 16).replace('T', ' ') : '2026-09-09',
          auditLogs: (po.audit_logs || po.auditLogs || []).map((log: any) => ({
            id: log.id || log._id || `log-${Date.now()}`,
            timestamp: log.timestamp || '',
            updatedBy: log.updatedBy || log.updated_by || 'Admin',
            userRole: log.userRole || log.user_role || 'SUPER_ADMIN',
            action: log.action || '',
            previousStatus: log.previousStatus || log.previous_status,
            newStatus: log.newStatus || log.new_status,
            previousAmountPaid: log.previousAmountPaid || log.previous_amount_paid,
            newAmountPaid: log.newAmountPaid || log.new_amount_paid,
            remarks: log.remarks || ''
          })),
          notes: po.notes || ''
        }))
        setOrders(fetched)
      }
    } catch (err) {
      console.warn('Could not fetch backend POs:', err)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | POStatus>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  // Status & Partial Update Modal State
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false)
  const [showStatusGuide, setShowStatusGuide] = useState(false)
  const [statusUpdatePO, setStatusUpdatePO] = useState<PurchaseOrder | null>(null)
  const [newStatusInput, setNewStatusInput] = useState<POStatus>('ORDERED')
  const [statusNoteInput, setStatusNoteInput] = useState('')
  const [amountPaidInput, setAmountPaidInput] = useState<number | string>('')
  const [itemQtyReceivedMap, setItemQtyReceivedMap] = useState<{ [itemId: string]: number }>({})

  // Open Status & Partial Update Modal
  const handleOpenStatusUpdate = (po: PurchaseOrder) => {
    if (po.status === 'CANCELLED') {
      showToast(`PO ${po.poNumber} is Cancelled. Editing is disabled.`, 'info')
      return
    }
    if (po.status === 'CLOSED' && po.amountPaid >= po.grandTotal) {
      showToast(`PO ${po.poNumber} is officially Closed & Fully Paid. Editing is disabled.`, 'info')
      return
    }

    setStatusUpdatePO(po)
    setShowStatusGuide(false)
    setNewStatusInput(po.status)
    setAmountPaidInput('')
    setStatusNoteInput('')
    setItemQtyReceivedMap({})
    setIsStatusUpdateOpen(true)
  }

  // Save Status & Partial Receipt/Payment Update with Audit Logging
  const handleSaveStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusUpdatePO) return

    if (statusUpdatePO.status === 'CANCELLED') {
      showToast('Cancelled orders cannot be edited or modified.', 'error')
      setIsStatusUpdateOpen(false)
      setStatusUpdatePO(null)
      return
    }

    if (statusUpdatePO.status === 'CLOSED' && statusUpdatePO.amountPaid >= statusUpdatePO.grandTotal) {
      showToast('This order is closed and fully paid.', 'info')
      setIsStatusUpdateOpen(false)
      setStatusUpdatePO(null)
      return
    }

    // Validation: Prevent newly received from exceeding remaining pending quantity
    for (const item of statusUpdatePO.items) {
      const newlyReceived = itemQtyReceivedMap[item.id] || 0
      const prevReceived = item.qtyReceived || 0
      const pendingQty = Math.max(0, item.qtyOrdered - prevReceived)

      if (newlyReceived > pendingQty) {
        showToast(
          `Validation Error: Newly received quantity for "${item.productName}" (${newlyReceived} ${item.unit}) exceeds remaining pending quantity of ${pendingQty} ${item.unit}`,
          'error'
        )
        return
      }
    }

    const newPayment = Math.max(0, Number(amountPaidInput) || 0)
    let totalPaid = Math.min(statusUpdatePO.grandTotal, (statusUpdatePO.amountPaid || 0) + newPayment)

    // If order status is set to RECEIVED or CLOSED and input left blank, auto-settle remaining balance
    if ((newStatusInput === 'RECEIVED' || newStatusInput === 'CLOSED') && newPayment === 0 && amountPaidInput === '') {
      totalPaid = statusUpdatePO.grandTotal
    }

    let computedPayStatus: PaymentStatus = 'UNPAID'
    if (totalPaid >= statusUpdatePO.grandTotal) {
      computedPayStatus = 'FULLY_PAID'
    } else if (totalPaid > 0) {
      computedPayStatus = 'PARTIALLY_PAID'
    }

    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16)
    let finalStatus = newStatusInput
    const updatedItemsList: POLineItem[] = (statusUpdatePO.items || []).map(item => {
      const newlyReceived = itemQtyReceivedMap[item.id] || 0
      const prevReceived = item.qtyReceived || 0
      const rQty =
        newStatusInput === 'RECEIVED'
          ? item.qtyOrdered
          : Math.min(item.qtyOrdered, prevReceived + newlyReceived)
      return { ...item, qtyReceived: rQty }
    })

    // Determine status recommendation if items received / completed
    const totalOrdered = updatedItemsList.reduce((sum, i) => sum + i.qtyOrdered, 0)
    const totalReceived = updatedItemsList.reduce((sum, i) => sum + i.qtyReceived, 0)

    if (newStatusInput !== 'CANCELLED' && newStatusInput !== 'DRAFT' && newStatusInput !== 'QUOTATION') {
      if (newStatusInput === 'CLOSED' || (totalReceived >= totalOrdered && totalPaid >= statusUpdatePO.grandTotal)) {
        finalStatus = 'CLOSED'
      } else if (totalReceived >= totalOrdered) {
        finalStatus = 'RECEIVED'
      } else if (totalReceived > 0) {
        finalStatus = 'PARTIALLY_RECEIVED'
      }
    }

    const auditEntry: POAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      updatedBy: currentUserDisplay,
      userRole: currentUserRole,
      action: `Updated status to ${finalStatus} | Added Payment: ₹${newPayment.toLocaleString('en-IN')}`,
      previousStatus: statusUpdatePO.status,
      newStatus: finalStatus,
      previousAmountPaid: statusUpdatePO.amountPaid,
      newAmountPaid: totalPaid,
      remarks: statusNoteInput.trim() || 'Updated order status & payments'
    }

    const noteSuffix = statusNoteInput.trim() ? ` [Updated by ${currentUserDisplay}: ${statusNoteInput.trim()}]` : ''

    setOrders(prev =>
      prev.map(o => {
        if (o.id === statusUpdatePO.id) {
          return {
            ...o,
            status: finalStatus,
            items: updatedItemsList,
            amountPaid: totalPaid,
            paymentStatus: computedPayStatus,
            lastUpdatedBy: currentUserDisplay,
            lastUpdatedAt: timestampStr,
            auditLogs: [auditEntry, ...(o.auditLogs || [])],
            notes: o.notes ? `${o.notes}${noteSuffix}` : statusNoteInput
          }
        }
        return o
      })
    )

    // Call Backend API to update Purchase Order
    try {
      const updatedAuditLogs = [
        {
          id: `log-${Date.now()}`,
          timestamp: timestampStr,
          updatedBy: currentUserDisplay,
          userRole: currentUserRole,
          action: `Updated status to ${finalStatus} | Added Payment: ₹${newPayment.toLocaleString('en-IN')}`,
          previousStatus: statusUpdatePO.status,
          newStatus: finalStatus,
          previousAmountPaid: statusUpdatePO.amountPaid,
          newAmountPaid: totalPaid,
          remarks: statusNoteInput.trim() || 'Updated order status & payments'
        },
        ...(statusUpdatePO.auditLogs || [])
      ]
      const targetId = statusUpdatePO.id || statusUpdatePO.poNumber
      await purchaseOrderService.updatePurchaseOrder(targetId, {
        status: finalStatus,
        notes: statusNoteInput.trim() || 'Updated status & payments',
        paid_amount: totalPaid,
        payment_status: computedPayStatus === 'FULLY_PAID' ? 'PAID' : (computedPayStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : 'UNPAID'),
        audit_logs: updatedAuditLogs,
        items: updatedItemsList.map(i => ({
          product_name: i.productName,
          qty_ordered: i.qtyOrdered,
          qty_received: i.qtyReceived,
          unit_price: i.unitCost,
          total: i.lineTotal
        }))
      }).catch(async () => {
        if (statusUpdatePO.poNumber && statusUpdatePO.poNumber !== targetId) {
          await purchaseOrderService.updatePurchaseOrder(statusUpdatePO.poNumber, {
            status: finalStatus,
            notes: statusNoteInput.trim() || 'Updated status & payments',
            paid_amount: totalPaid,
            payment_status: computedPayStatus === 'FULLY_PAID' ? 'PAID' : (computedPayStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : 'UNPAID'),
            audit_logs: updatedAuditLogs
          })
        }
      })
      await loadOrders()
    } catch (apiErr) {
      console.warn('Backend update order call warning:', apiErr)
    }

    // Auto-Generate Batches & Sync Product Stock for Received Quantities
    try {
      const receiveDate = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const batchNo = `BAT-${statusUpdatePO.poNumber}-${receiveDate}`
      const expDateStr = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
      const fetchedProds = await productService.fetchProducts().catch(() => null)
      const prodArray = Array.isArray(fetchedProds) ? fetchedProds : (Array.isArray(fetchedProds?.data) ? fetchedProds.data : [])

      for (const item of updatedItemsList) {
        const newlyReceived = itemQtyReceivedMap[item.id] || 0
        const prevReceived = statusUpdatePO.items.find(i => i.id === item.id)?.qtyReceived || 0
        const recQty = newlyReceived > 0
          ? newlyReceived
          : (newStatusInput === 'RECEIVED' || newStatusInput === 'CLOSED' ? Math.max(0, item.qtyOrdered - prevReceived) : 0)
        if (recQty > 0) {
          // Find the real product from DB to get accurate _id and SKU
          const match = prodArray.find((p: any) => (p.name || '').toLowerCase() === (item.productName || '').toLowerCase())
          const realProductId = match?._id || match?.id || ''
          const realSku = match?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`

          // 1. Create or Update Batch with real productId
          await batchService.createBatch({
            productId: realProductId,
            product: item.productName,
            sku: realSku,
            batchNumber: batchNo,
            warehouse: statusUpdatePO.warehouse || 'Main Pharmacy Store',
            expiryDate: expDateStr,
            purchasePrice: item.unitCost,
            sellingPrice: Number((item.unitCost * 1.3).toFixed(2)),
            quantity: recQty,
            status: 'ACTIVE'
          }).catch(err => console.warn('Failed auto batch creation:', err))

          // 2. Sync Product Stock using real _id
          if (match) {
            await productService.updateProduct(realProductId, {
              stock: (match.stock || 0) + recQty
            }).catch(() => null)
          } else {
            await productService.createProduct({
              name: item.productName,
              sku: realSku,
              price: Number(item.unitCost * 1.3),
              cost_price: item.unitCost,
              stock: recQty,
              unit: item.unit || 'Box',
              status: 'ACTIVE'
            }).catch(() => null)
          }
        }
      }
    } catch (batchSyncErr) {
      console.warn('Batch/Stock sync warning:', batchSyncErr)
    }

    showToast(
      `PO ${statusUpdatePO.poNumber} updated by ${currentUserDisplay}: Status = ${finalStatus}, Total Paid = ₹${totalPaid.toLocaleString('en-IN')}`,
      'success'
    )
    setAmountPaidInput('')
    setItemQtyReceivedMap({})
    setStatusNoteInput('')
    setIsStatusUpdateOpen(false)
    setStatusUpdatePO(null)
  }

  // Dynamic Available Suppliers, Products, and Warehouses
  const [availableSuppliers, setAvailableSuppliers] = useState<SupplierOption[]>([])
  const [availableProducts, setAvailableProducts] = useState<CatalogProduct[]>([])
  const [availableWarehouses, setAvailableWarehouses] = useState<WarehouseOption[]>([])

  const loadDynamicOptions = async () => {
    try {
      const [supRes, prodRes, whRes] = await Promise.all([
        supplierService.fetchSuppliers().catch(() => null),
        productService.fetchProducts().catch(() => null),
        warehouseService.fetchWarehouses().catch(() => null)
      ])

      // 1. Suppliers
      if (supRes) {
        const supArray = Array.isArray(supRes) ? supRes : (Array.isArray(supRes?.data) ? supRes.data : [])
        const activeSups = supArray.filter((s: any) => {
          const st = String(s.status || '').trim().toUpperCase()
          return st !== 'INACTIVE' && st !== 'BLOCKED' && st !== 'DISABLED'
        })
        const mappedSups: SupplierOption[] = activeSups.map((s: any) => ({
          id: s._id || s.id,
          code: s.code || s.supplier_code || `SUP-${(s._id || s.id || '').slice(-4)}`,
          name: s.name,
          category: s.category || 'General',
          paymentTerms: s.payment_terms || s.paymentTerms || 'Net 30',
          status: s.status || 'ACTIVE'
        }))
        setAvailableSuppliers(mappedSups)
      }

      // 2. Products (from backend API or local storage fallback)
      const apiProdArray = Array.isArray(prodRes) ? prodRes : (Array.isArray(prodRes?.data) ? prodRes.data : [])
      const localProds = getStoredProducts()
      const combinedProds = apiProdArray.length > 0 ? apiProdArray : localProds

      const activeOnly = combinedProds.filter((p: any) => {
        const st = String(p.status || '').trim().toUpperCase()
        return st !== 'INACTIVE' && st !== 'BLOCKED' && st !== 'DISABLED' && p.visibility !== false
      })

      const mappedProds: CatalogProduct[] = activeOnly.map((p: any) => ({
        id: p._id || p.id,
        name: p.name || 'Unnamed Product',
        sku: p.sku || `SKU-${(p._id || p.id || '').slice(-4)}`,
        category: typeof p.category === 'string' ? p.category : (p.category_id?.name || p.category?.name || 'General'),
        defaultCostPrice: Number(p.cost_price || p.purchasePrice || p.price || 0),
        taxRate: Number(p.tax_rate || p.taxRate || 12),
        unit: p.unit || 'Pcs',
        status: 'ACTIVE'
      }))
      setAvailableProducts(mappedProds)

      // 3. Warehouses
      if (whRes) {
        const whArray = Array.isArray(whRes) ? whRes : (Array.isArray(whRes?.data) ? whRes.data : [])
        const mappedWHs: WarehouseOption[] = whArray.map((w: any) => ({
          id: w._id || w.id,
          code: w.code || `WH-${(w._id || w.id || '').slice(-4)}`,
          name: w.name,
          type: w.isDefault ? 'Primary Central Store' : 'Branch Store',
          location: w.location || 'Main Storage'
        }))
        setAvailableWarehouses(mappedWHs)
      }
    } catch (err) {
      console.warn('Failed loading dynamic PO options:', err)
    }
  }

  useEffect(() => {
    loadDynamicOptions()
  }, [])

  // New Order / Quotation Form State
  const [formType, setFormType] = useState<'PO' | 'QUOTATION'>('PO')
  const [supplierName, setSupplierName] = useState('')
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('')
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false)
  const [quotationNoInput, setQuotationNoInput] = useState('')

  const activeSupplierList = availableSuppliers.length > 0 ? availableSuppliers : AVAILABLE_SUPPLIERS
  const activeProductList = availableProducts
  const activeWarehouseList = availableWarehouses

  const filteredSupplierOptions = useMemo(() => {
    return activeSupplierList.filter(s => {
      const st = String((s as any).status || '').trim().toUpperCase()
      if (st === 'INACTIVE' || st === 'BLOCKED' || st === 'DISABLED') return false
      const q = supplierSearchQuery.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      )
    })
  }, [activeSupplierList, supplierSearchQuery])

  const [targetWarehouse, setTargetWarehouse] = useState('')
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('')
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false)

  const filteredWarehouseOptions = useMemo(() => {
    return activeWarehouseList.filter(
      w =>
        w.name.toLowerCase().includes(warehouseSearchQuery.toLowerCase()) ||
        w.code.toLowerCase().includes(warehouseSearchQuery.toLowerCase()) ||
        w.type.toLowerCase().includes(warehouseSearchQuery.toLowerCase()) ||
        w.location.toLowerCase().includes(warehouseSearchQuery.toLowerCase())
    )
  }, [activeWarehouseList, warehouseSearchQuery])

  // Searchable Product Dropdown State for Line Items
  const [openProductDropdownIdx, setOpenProductDropdownIdx] = useState<number | null>(null)
  const [productSearchQuery, setProductSearchQuery] = useState('')

  const filteredProductOptions = useMemo(() => {
    return activeProductList.filter(p => {
      const st = String((p as any).status || '').trim().toUpperCase()
      if (st === 'INACTIVE' || st === 'BLOCKED' || st === 'DISABLED' || (p as any).visibility === false) return false
      const q = productSearchQuery.toLowerCase()
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      )
    })
  }, [activeProductList, productSearchQuery])

  const [paymentTermsInput, setPaymentTermsInput] = useState('')
  const [expectedDateInput, setExpectedDateInput] = useState(new Date().toISOString().split('T')[0])
  const [shippingCostInput, setShippingCostInput] = useState<number>(0)
  const [notesInput, setNotesInput] = useState('')

  // Line items state in form
  const [formItems, setFormItems] = useState<POLineItem[]>([])

  // Calculated totals for form
  const formTotals = useMemo(() => {
    const subTotal = formItems.reduce((acc, item) => acc + item.unitCost * item.qtyOrdered, 0)
    const taxAmount = formItems.reduce((acc, item) => acc + (item.unitCost * item.qtyOrdered * item.taxRate) / 100, 0)
    const grandTotal = subTotal + taxAmount + (Number(shippingCostInput) || 0)
    return { subTotal, taxAmount, grandTotal }
  }, [formItems, shippingCostInput])

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = orders.length
    const received = orders.filter(o => o.status === 'RECEIVED' || o.status === 'CLOSED').length
    const closed = orders.filter(o => o.status === 'CLOSED').length
    const pending = orders.filter(o => o.status === 'ORDERED' || o.status === 'PARTIALLY_RECEIVED').length
    const quotations = orders.filter(o => o.status === 'QUOTATION').length
    const cancelled = orders.filter(o => o.status === 'CANCELLED').length
    const totalValue = orders.reduce((acc, o) => acc + (o.status !== 'CANCELLED' ? o.grandTotal : 0), 0)
    const totalPaid = orders.reduce((acc, o) => acc + (o.status !== 'CANCELLED' ? Math.min(o.grandTotal, o.amountPaid || 0) : 0), 0)
    const totalDue = orders.reduce((acc, o) => {
      if (o.status === 'CANCELLED') return acc
      return acc + Math.max(0, o.grandTotal - (o.amountPaid || 0))
    }, 0)
    return { total, received, closed, pending, quotations, cancelled, totalValue, totalPaid, totalDue }
  }, [orders])

  // Filtered List
  const filteredOrders = useMemo(() => {
    return orders.filter(po => {
      const matchesSearch =
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.lastUpdatedBy.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter
      const matchesDate = (!startDate || po.orderDate >= startDate) && (!endDate || po.orderDate <= endDate)

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [orders, searchTerm, statusFilter, startDate, endDate])

  // Pagination
  const PAGE_SIZE = 6
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredOrders.slice(start, start + PAGE_SIZE)
  }, [filteredOrders, currentPage])

  // Handlers for Form Line Items
  const handleAddLineItem = () => {
    // Start with a blank item — user must select a product explicitly
    const newItem: POLineItem = {
      id: `item-${Date.now()}`,
      productId: '',
      productName: '',
      unitCost: 0,
      qtyOrdered: 1,
      qtyReceived: 0,
      taxRate: 12,
      unit: 'Pcs',
      lineTotal: 0
    }
    setFormItems(prev => [...prev, newItem])
  }

  const handleProductSelect = (index: number, productId: string) => {
    const selectedProd = activeProductList.find(p => p.id === productId)
    if (!selectedProd) return

    setFormItems(prev => {
      const copy = [...prev]
      const current = copy[index]
      const qty = current.qtyOrdered || 1
      const lineTotal = selectedProd.defaultCostPrice * qty * (1 + selectedProd.taxRate / 100)
      copy[index] = {
        ...current,
        productId: selectedProd.id,
        productName: selectedProd.name,
        unitCost: selectedProd.defaultCostPrice,
        taxRate: selectedProd.taxRate,
        unit: selectedProd.unit,
        lineTotal
      }
      return copy
    })
  }

  const handleItemFieldChange = (index: number, field: 'unitCost' | 'qtyOrdered', val: number) => {
    setFormItems(prev => {
      const copy = [...prev]
      const item = { ...copy[index], [field]: val }
      item.lineTotal = item.unitCost * item.qtyOrdered * (1 + item.taxRate / 100)
      copy[index] = item
      return copy
    })
  }

  const handleRemoveLineItem = (index: number) => {
    if (formItems.length <= 1) {
      showToast('Purchase Order must contain at least 1 product item', 'error')
      return
    }
    setFormItems(prev => prev.filter((_, i) => i !== index))
  }

  // Create Order / Quotation Submit
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (!supplierName || !supplierName.trim()) {
      errs.supplier = 'Please select a valid supplier/vendor'
    }
    if (!targetWarehouse || !targetWarehouse.trim()) {
      errs.warehouse = 'Please select a target warehouse'
    }
    if (!expectedDateInput || !expectedDateInput.trim()) {
      errs.expectedDate = 'Expected delivery date is required'
    }
    if (shippingCostInput < 0 || isNaN(shippingCostInput)) {
      errs.shippingCost = 'Shipping charge cannot be negative'
    }

    if (!formItems || formItems.length === 0) {
      errs.items = 'Purchase Order must contain at least 1 product item'
    } else {
      formItems.forEach((item, idx) => {
        if (!item.productName) {
          errs[`item_product_${idx}`] = `Item #${idx + 1}: Select a valid product`
        }
        if (item.qtyOrdered <= 0 || isNaN(item.qtyOrdered)) {
          errs[`item_qty_${idx}`] = `Qty must be greater than 0 for ${item.productName || 'Item #' + (idx + 1)}`
        }
        if (item.unitCost < 0 || isNaN(item.unitCost)) {
          errs[`item_cost_${idx}`] = `Unit cost cannot be negative for ${item.productName || 'Item #' + (idx + 1)}`
        }
      })
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      const firstErr = Object.values(errs)[0]
      showToast(firstErr, 'error')
      return
    }

    setFormErrors({})

    const nextPONum = `PO-2026-${String(orders.length + 15).padStart(3, '0')}`
    const nextQTNum = quotationNoInput.trim() || `QT-2026-${String(orders.length + 30).padStart(3, '0')}`

    const payload = {
      po_number: nextPONum,
      supplier_name: supplierName,
      warehouse_name: targetWarehouse,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: expectedDateInput,
      payment_terms: paymentTermsInput,
      items: formItems.map(item => ({
        product_name: item.productName,
        qty_ordered: item.qtyOrdered,
        qty_received: item.qtyReceived || 0,
        unit_price: item.unitCost,
        total: item.lineTotal
      })),
      subtotal: formTotals.subTotal,
      tax_amount: formTotals.taxAmount,
      shipping_cost: Number(shippingCostInput) || 0,
      total_amount: formTotals.grandTotal,
      status: formType === 'QUOTATION' ? 'QUOTATION' : 'ORDERED',
      notes: notesInput || 'Standard pharmaceutical order'
    }

    try {
      await purchaseOrderService.createPurchaseOrder(payload)
      showToast(
        formType === 'QUOTATION'
          ? `Quotation ${nextQTNum} generated by ${currentUserDisplay}`
          : `Purchase Order ${nextPONum} created by ${currentUserDisplay}!`,
        'success'
      )
      await loadOrders()
      // Reset ALL form fields after successful creation
      setSupplierName('')
      setTargetWarehouse('')
      setPaymentTermsInput('')
      setQuotationNoInput('')
      setExpectedDateInput(new Date().toISOString().split('T')[0])
      setShippingCostInput(0)
      setNotesInput('')
      setFormItems([])
      setFormErrors({})
      setIsAddOpen(false)
    } catch (err: any) {
      console.error('Failed to create purchase order:', err)
      showToast(err?.message || 'Failed to create purchase order', 'error')
    }
  }

  // Status Action Handlers
  const handleMarkReceived = async (po: PurchaseOrder) => {
    if (po.status === 'CLOSED') {
      showToast(`PO ${po.poNumber} is already Closed & Completed.`, 'info')
      return
    }
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16)
    const updatedItems = po.items.map(item => ({ ...item, qtyReceived: item.qtyOrdered }))
    
    // Check if payment is partial or unpaid
    const isFullyPaid = po.amountPaid >= po.grandTotal
    const finalPaymentStatus: PaymentStatus = isFullyPaid ? 'FULLY_PAID' : po.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'
    const finalAmountPaid = isFullyPaid ? po.grandTotal : po.amountPaid
    const dueBalance = Math.max(0, po.grandTotal - finalAmountPaid)

    if (!isFullyPaid) {
      showToast(
        `PO ${po.poNumber} closed but payment is PARTIAL. Outstanding due: ₹${dueBalance.toLocaleString('en-IN')}. Please record the remaining payment separately.`,
        'warning'
      )
    }

    const auditEntry: POAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      updatedBy: currentUserDisplay,
      userRole: currentUserRole,
      action: isFullyPaid ? 'Marked FULLY RECEIVED, PAID & CLOSED Order' : `Marked RECEIVED & CLOSED (Partial Payment — Due: ₹${dueBalance.toLocaleString('en-IN')})`,
      previousStatus: po.status,
      newStatus: 'CLOSED',
      previousAmountPaid: po.amountPaid,
      newAmountPaid: finalAmountPaid,
      remarks: isFullyPaid ? 'All items stocked & order completed' : `Closed with outstanding balance of ₹${dueBalance.toLocaleString('en-IN')}`
    }

    setOrders(prev =>
      prev.map(o => (o.id === po.id ? {
        ...o,
        status: 'CLOSED',
        items: updatedItems,
        amountPaid: finalAmountPaid,
        paymentStatus: finalPaymentStatus,
        lastUpdatedBy: currentUserDisplay,
        lastUpdatedAt: timestampStr,
        auditLogs: [auditEntry, ...(o.auditLogs || [])]
      } : o))
    )

    // Call backend API to persist the change
    try {
      await purchaseOrderService.updatePurchaseOrder(po.id, {
        status: 'CLOSED',
        items: updatedItems.map(i => ({
          product_name: i.productName,
          qty_ordered: i.qtyOrdered,
          qty_received: i.qtyReceived,
          unit_price: i.unitCost,
          total: i.lineTotal
        }))
      })
    } catch (apiErr) {
      console.warn('Backend mark-received API warning:', apiErr)
    }

    if (isFullyPaid) {
      showToast(`PO ${po.poNumber} marked RECEIVED & CLOSED by ${currentUserDisplay}`, 'success')
    }
    setSelectedPO(null)
  }

  const handleClosePO = async (po: PurchaseOrder) => {
    if (po.status === 'CLOSED') {
      showToast(`PO ${po.poNumber} is already Closed & Completed.`, 'info')
      return
    }
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16)
    const updatedItems = po.items.map(item => ({ ...item, qtyReceived: item.qtyOrdered }))

    const isFullyPaid = po.amountPaid >= po.grandTotal
    const finalPaymentStatus: PaymentStatus = isFullyPaid ? 'FULLY_PAID' : po.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'
    const finalAmountPaid = isFullyPaid ? po.grandTotal : po.amountPaid
    const dueBalance = Math.max(0, po.grandTotal - finalAmountPaid)

    if (!isFullyPaid) {
      showToast(
        `PO ${po.poNumber} closed but payment is PARTIAL. Outstanding due: ₹${dueBalance.toLocaleString('en-IN')}. Please record the remaining payment separately.`,
        'warning'
      )
    }
    
    const auditEntry: POAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      updatedBy: currentUserDisplay,
      userRole: currentUserRole,
      action: isFullyPaid ? 'Officially CLOSED & COMPLETED Purchase Order' : `Closed with outstanding balance of ₹${dueBalance.toLocaleString('en-IN')}`,
      previousStatus: po.status,
      newStatus: 'CLOSED',
      previousAmountPaid: po.amountPaid,
      newAmountPaid: finalAmountPaid,
      remarks: isFullyPaid ? 'All items stocked & order officially closed' : `Closed with partial payment — due ₹${dueBalance.toLocaleString('en-IN')}`
    }

    const updatedAuditLogs = [auditEntry, ...(po.auditLogs || [])]

    setOrders(prev =>
      prev.map(o => (o.id === po.id ? {
        ...o,
        status: 'CLOSED',
        items: updatedItems,
        amountPaid: finalAmountPaid,
        paymentStatus: finalPaymentStatus,
        lastUpdatedBy: currentUserDisplay,
        lastUpdatedAt: timestampStr,
        auditLogs: updatedAuditLogs
      } : o))
    )

    if (selectedPO?.id === po.id) {
      setSelectedPO(prev => prev ? {
        ...prev,
        status: 'CLOSED',
        items: updatedItems,
        amountPaid: finalAmountPaid,
        paymentStatus: finalPaymentStatus,
        lastUpdatedBy: currentUserDisplay,
        lastUpdatedAt: timestampStr,
        auditLogs: updatedAuditLogs
      } : null)
    }

    // Call backend API to persist
    try {
      const targetId = po.id || po.poNumber
      await purchaseOrderService.updatePurchaseOrder(targetId, {
        status: 'CLOSED',
        paid_amount: finalAmountPaid,
        payment_status: isFullyPaid ? 'PAID' : (finalAmountPaid > 0 ? 'PARTIAL' : 'UNPAID'),
        audit_logs: updatedAuditLogs,
        items: updatedItems.map(i => ({
          product_name: i.productName,
          qty_ordered: i.qtyOrdered,
          qty_received: i.qtyReceived,
          unit_price: i.unitCost,
          total: i.lineTotal
        }))
      }).catch(async () => {
        if (po.poNumber && po.poNumber !== targetId) {
          await purchaseOrderService.updatePurchaseOrder(po.poNumber, {
            status: 'CLOSED',
            paid_amount: finalAmountPaid,
            payment_status: isFullyPaid ? 'PAID' : (finalAmountPaid > 0 ? 'PARTIAL' : 'UNPAID'),
            audit_logs: updatedAuditLogs
          })
        }
      })
      await loadOrders()
    } catch (apiErr) {
      console.warn('Backend close PO API warning:', apiErr)
    }

    if (isFullyPaid) {
      showToast(`PO ${po.poNumber} officially Closed & Completed!`, 'success')
    } else {
      showToast(`PO ${po.poNumber} closed by ${currentUserDisplay}`, 'success')
    }
    setSelectedPO(null)
  }

  const handleConvertQuotationToPO = (po: PurchaseOrder) => {
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16)
    const auditEntry: POAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      updatedBy: currentUserDisplay,
      userRole: currentUserRole,
      action: `Converted RFQ Quotation ${po.quotationNo} to Active PO`,
      previousStatus: 'QUOTATION',
      newStatus: 'ORDERED',
      previousAmountPaid: po.amountPaid,
      newAmountPaid: po.amountPaid,
      remarks: 'Quotation approved and order issued'
    }

    setOrders(prev =>
      prev.map(o => (o.id === po.id ? {
        ...o,
        status: 'ORDERED',
        lastUpdatedBy: currentUserDisplay,
        lastUpdatedAt: timestampStr,
        auditLogs: [auditEntry, ...(o.auditLogs || [])]
      } : o))
    )
    showToast(`Quotation ${po.quotationNo} converted to active PO by ${currentUserDisplay}`, 'success')
    setSelectedPO(null)
  }

  const handleCancelPO = () => {
    if (!selectedPO) return
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16)
    const auditEntry: POAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timestampStr,
      updatedBy: currentUserDisplay,
      userRole: currentUserRole,
      action: `Cancelled Purchase Order ${selectedPO.poNumber}`,
      previousStatus: selectedPO.status,
      newStatus: 'CANCELLED',
      previousAmountPaid: selectedPO.amountPaid,
      newAmountPaid: selectedPO.amountPaid,
      remarks: 'Order cancelled by user'
    }

    setOrders(prev =>
      prev.map(o => (o.id === selectedPO.id ? {
        ...o,
        status: 'CANCELLED',
        lastUpdatedBy: currentUserDisplay,
        lastUpdatedAt: timestampStr,
        auditLogs: [auditEntry, ...(o.auditLogs || [])]
      } : o))
    )
    showToast(`PO ${selectedPO.poNumber} cancelled by ${currentUserDisplay}`, 'info')
    setIsCancelConfirmOpen(false)
    setSelectedPO(null)
  }

  // Order Status Badge Renderer
  const statusBadge = (status: POStatus) => {
    switch (status) {
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Closed &amp; Completed
          </span>
        )
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Fully Received
          </span>
        )
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Partial Delivery
          </span>
        )
      case 'ORDERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orbit-primary/5 text-orbit-primary border border-orbit-primary/20 dark:bg-orbit-primary/10 dark:text-orbit-primary-light dark:border-orbit-primary/30">
            <Truck className="w-3.5 h-3.5 text-orbit-primary-light" /> PO Issued / Sent
          </span>
        )
      case 'QUOTATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30">
            <FileText className="w-3.5 h-3.5 text-blue-500" /> Supplier RFQ / Quote
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Order Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        )
    }
  }

  // Payment Status Badge Renderer
  const paymentBadge = (paymentStatus: PaymentStatus, amountPaid: number, grandTotal: number, poStatus?: POStatus) => {
    if (poStatus === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
          <XCircle className="w-3 h-3 text-slate-400" /> Void / Cancelled (₹0 Due)
        </span>
      )
    }
    const due = Math.max(0, grandTotal - amountPaid)
    if (paymentStatus === 'FULLY_PAID' || (poStatus === 'CLOSED' && due <= 0)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CreditCard className="w-3 h-3" /> Fully Paid (₹{amountPaid.toLocaleString('en-IN')})
        </span>
      )
    }
    if (paymentStatus === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300">
          <CreditCard className="w-3 h-3 text-amber-600" /> Paid: ₹{amountPaid.toLocaleString('en-IN')} | Due: ₹{due.toLocaleString('en-IN')}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400">
        <CreditCard className="w-3 h-3 text-rose-500" /> Unpaid (Due ₹{grandTotal.toLocaleString('en-IN')})
      </span>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <Truck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Purchase Orders &amp; Supplier Quotations</h1>
            <button
              onClick={() => setIsGuideOpen(true)}
              title="How to Use Purchasing - Setup Guide"
              className="p-1.5 px-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:text-orbit-primary-light hover:bg-orbit-primary/10 border border-slate-200 dark:border-orbit-border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm ml-1"
            >
              <Info className="w-4 h-4 text-orbit-primary-light" />
              <span>Purchasing Guide</span>
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage RFQ quotations, purchase orders, searchable suppliers &amp; products, partial receipts/payments, and complete audit history logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              loadDynamicOptions()
              setFormType('QUOTATION')
              setFormErrors({})
              setSupplierName('')
              setTargetWarehouse('')
              setPaymentTermsInput('')
              setQuotationNoInput('')
              setExpectedDateInput(new Date().toISOString().split('T')[0])
              setShippingCostInput(0)
              setNotesInput('')
              setFormItems([{ id: `item-${Date.now()}`, productId: '', productName: '', unitCost: 0, qtyOrdered: 1, qtyReceived: 0, taxRate: 12, unit: 'Pcs', lineTotal: 0 }])
              setIsAddOpen(true)
            }}
            variant="outline"
            className="text-sm font-semibold gap-2 border-orbit-primary/20 text-orbit-primary hover:bg-orbit-primary/5 dark:border-orbit-primary/30 dark:text-orbit-primary-light"
          >
            <FileText className="w-4 h-4" /> Create Quotation / RFQ
          </Button>
          <Button
            onClick={() => {
              loadDynamicOptions()
              setFormType('PO')
              setFormErrors({})
              setSupplierName('')
              setTargetWarehouse('')
              setPaymentTermsInput('')
              setQuotationNoInput('')
              setExpectedDateInput(new Date().toISOString().split('T')[0])
              setShippingCostInput(0)
              setNotesInput('')
              setFormItems([{ id: `item-${Date.now()}`, productId: '', productName: '', unitCost: 0, qtyOrdered: 1, qtyReceived: 0, taxRate: 12, unit: 'Pcs', lineTotal: 0 }])
              setIsAddOpen(true)
            }}
            className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 text-sm font-semibold py-2.5 px-5"
          >
            <Plus className="w-4 h-4" /> Issue New PO
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Orders</span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Received &amp; Stocked</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.received}</p>
        </div>
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-orbit-primary-light dark:text-orbit-primary-light uppercase tracking-wider block">Pending Delivery</span>
          <p className="text-xl font-bold text-orbit-primary-light dark:text-orbit-primary-light mt-1">{metrics.pending}</p>
        </div>
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-3.5 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Quotations / RFQs</span>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{metrics.quotations}</p>
        </div>
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-3.5 rounded-xl shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Outstanding Payables</span>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">₹{metrics.totalDue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        
        {/* Compact Search Input */}
        <div className="relative w-full sm:w-64">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search PO #, supplier, updated by..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs Dropdown */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1) }}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses ({metrics.total})</option>
            <option value="QUOTATION">Quotations / RFQs ({metrics.quotations})</option>
            <option value="ORDERED">PO Issued / Sent ({metrics.pending})</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received &amp; Stocked ({metrics.received})</option>
            <option value="CLOSED">Closed &amp; Completed ({metrics.closed})</option>
            <option value="CANCELLED">Cancelled ({metrics.cancelled})</option>
          </select>

          {/* Date Pickers */}
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

          {/* Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0]
              setStartDate(todayStr)
              setEndDate(todayStr)
              setCurrentPage(1)
              showToast("Filtered by Today's Date", 'info')
            }}
            className="text-xs h-8 px-2.5 bg-orbit-primary/5 text-orbit-primary border-orbit-primary/20 dark:bg-orbit-primary/10 dark:text-orbit-primary-light dark:border-orbit-primary/30 hover:bg-orbit-primary/10"
          >
            Today
          </Button>

          {/* Clear Button */}
          {(searchTerm || statusFilter !== 'ALL' || startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setStartDate('')
                setEndDate('')
                setCurrentPage(1)
                showToast("Cleared filters", 'info')
              }}
              className="text-xs gap-1 border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Orders & Quotations Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[980px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">PO / Quote #</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Target Warehouse</th>
                <th className="px-6 py-4">Line Items</th>
                <th className="px-6 py-4">Grand Total &amp; Payments</th>
                <th className="px-6 py-4">Status &amp; Audit Log</th>
                <th className="px-6 py-4">Order / Delivery Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-mono text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light">{po.poNumber}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Ref: {po.quotationNo}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                    {po.supplier}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                    {po.warehouse}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium">
                    {po.items.length} Product Line(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-1">{paymentBadge(po.paymentStatus, po.amountPaid, po.grandTotal, po.status)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>{statusBadge(po.status)}</div>
                    <div className="flex items-center gap-1 text-[10.5px] text-slate-400 font-medium mt-1">
                      <UserCheck className="w-3 h-3 text-orbit-primary-light shrink-0" />
                      <span className="truncate max-w-[150px]">{po.lastUpdatedBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap">
                    <span className="font-mono block text-slate-800 dark:text-slate-200">{po.orderDate}</span>
                    <span className="text-[10px] text-slate-400 block">Due: {po.expectedDeliveryDate}</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedPO(po)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors"
                        title="View & Process Purchase Order"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {po.status === 'CANCELLED' ? (
                        null
                      ) : po.status !== 'CLOSED' ? (
                        <button
                          onClick={() => handleOpenStatusUpdate(po)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors"
                          title="Update Status, Partial Receipt & Payments"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      ) : po.amountPaid < po.grandTotal ? (
                        <button
                          onClick={() => handleOpenStatusUpdate(po)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          title="Record Vendor Payment (Payable Due)"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60"
                          title="Order is Closed & Fully Paid"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <EmptyState
                  icon={Truck}
                  title="No Purchase Orders Found"
                  description="No purchase orders or quotations match your criteria. Create a new purchase order or RFQ to get started."
                  colSpan={8}
                />
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-orbit-border flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {paginatedOrders.length} of {filteredOrders.length} purchase orders &amp; quotations
          </span>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* ─── Create Purchase Order / Supplier Quotation Modal ──────────────── */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        size="3xl"
        title={formType === 'QUOTATION' ? 'Create Supplier Quotation / RFQ' : 'Issue New Purchase Order'}
        subtitle="Select supplier, target warehouse, delivery dates, and add product lines with quantities and cost prices"
      >
        <form noValidate onSubmit={handleCreateOrder} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

          {/* Supplier & Warehouse Metadata */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Supplier &amp; Order Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Searchable Supplier Selector */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => setIsSupplierDropdownOpen(prev => !prev)}
                  className={`w-full h-10 px-3 rounded-xl border bg-white dark:bg-orbit-surface text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between cursor-pointer hover:border-orbit-primary transition-colors shadow-sm ${
                    formErrors.supplier ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-orbit-border'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-orbit-primary-light shrink-0" />
                    <span className="truncate">{supplierName || 'Search & select a supplier...'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
                {formErrors.supplier && (
                  <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.supplier}</p>
                )}

                {isSupplierDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl shadow-2xl z-50 p-2 space-y-2 max-h-64 overflow-y-auto">
                    {/* Inline Search Box */}
                    <div className="relative">
                      <input
                        type="text"
                        value={supplierSearchQuery}
                        onChange={e => setSupplierSearchQuery(e.target.value)}
                        placeholder="Search supplier by name or code (e.g. Cipla, SUP-001)..."
                        className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                        autoFocus
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    {/* Filtered Options List */}
                    <div className="divide-y divide-slate-100 dark:divide-orbit-border">
                      {filteredSupplierOptions.length > 0 ? (
                        filteredSupplierOptions.map(sup => (
                          <button
                            key={sup.id}
                            type="button"
                            onClick={() => {
                              setSupplierName(sup.name)
                              if (sup.paymentTerms) {
                                setPaymentTermsInput(sup.paymentTerms)
                              }
                              setIsSupplierDropdownOpen(false)
                              setSupplierSearchQuery('')
                              setFormErrors(prev => ({ ...prev, supplier: '' }))
                            }}
                            className={`w-full text-left p-2 hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 rounded-lg transition-colors flex items-center justify-between text-xs ${
                              supplierName === sup.name ? 'bg-orbit-primary/5/80 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light font-bold' : ''
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{sup.name}</p>
                              <p className="text-[10px] text-slate-400">{sup.category}</p>
                            </div>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {sup.code}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="p-3 text-center text-xs text-slate-400">No matching suppliers found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Input
                label="Quotation Reference #"
                value={quotationNoInput}
                onChange={e => setQuotationNoInput(e.target.value)}
                placeholder="e.g. QT-2026-042 (optional)"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Searchable Target Warehouse Selector */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Warehouse / Location <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => setIsWarehouseDropdownOpen(prev => !prev)}
                  className={`w-full h-10 px-3 rounded-xl border bg-white dark:bg-orbit-surface text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between cursor-pointer hover:border-orbit-primary transition-colors shadow-sm ${
                    formErrors.warehouse ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-orbit-border'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-orbit-primary-light shrink-0" />
                    <span className="truncate">{targetWarehouse || 'Select target warehouse...'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
                {formErrors.warehouse && (
                  <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.warehouse}</p>
                )}

                {isWarehouseDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl shadow-2xl z-50 p-2 space-y-2 max-h-60 overflow-y-auto">
                    {/* Inline Search */}
                    <div className="relative">
                      <input
                        type="text"
                        value={warehouseSearchQuery}
                        onChange={e => setWarehouseSearchQuery(e.target.value)}
                        placeholder="Search warehouse name, code, or location..."
                        className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                        autoFocus
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    {/* Options List */}
                    <div className="divide-y divide-slate-100 dark:divide-orbit-border">
                      {filteredWarehouseOptions.length > 0 ? (
                        filteredWarehouseOptions.map(wh => (
                          <button
                            key={wh.id}
                            type="button"
                            onClick={() => {
                              setTargetWarehouse(wh.name)
                              setIsWarehouseDropdownOpen(false)
                              setWarehouseSearchQuery('')
                              setFormErrors(prev => ({ ...prev, warehouse: '' }))
                            }}
                            className={`w-full text-left p-2 hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 rounded-lg transition-colors flex items-center justify-between text-xs ${
                              targetWarehouse === wh.name ? 'bg-orbit-primary/5/80 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light font-bold' : ''
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{wh.name}</p>
                              <p className="text-[10px] text-slate-400">{wh.location}</p>
                            </div>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {wh.code}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="p-3 text-center text-xs text-slate-400">No matching warehouses found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Input
                label="Payment Terms"
                value={paymentTermsInput}
                onChange={e => setPaymentTermsInput(e.target.value)}
                placeholder="e.g. Net 30, COD"
              />
              <Input
                label="Expected Delivery Date"
                type="date"
                value={expectedDateInput}
                onChange={e => {
                  setExpectedDateInput(e.target.value)
                  setFormErrors(prev => ({ ...prev, expectedDate: '' }))
                }}
                error={formErrors.expectedDate}
                required
              />
            </div>
          </div>

          {/* Product Items Selector Section */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Product Selection &amp; Quantities
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
                className="text-xs gap-1 py-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Item
              </Button>
            </div>

            {formErrors.items && (
              <p className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50">
                {formErrors.items}
              </p>
            )}

            {/* Line Item Table Header */}
            <div className="space-y-2">
              {formItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-orbit-surface p-2.5 rounded-lg border border-slate-200 dark:border-orbit-border text-xs"
                >
                  {/* Searchable Product Line Item Selector */}
                  <div className="col-span-5 relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Product Item</label>
                    <div
                      onClick={() => {
                        setOpenProductDropdownIdx(openProductDropdownIdx === idx ? null : idx)
                        setProductSearchQuery('')
                      }}
                      className="w-full h-8 px-2.5 rounded-md border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-xs font-medium flex items-center justify-between cursor-pointer hover:border-orbit-primary transition-colors shadow-sm"
                    >
                      <span className="truncate text-slate-900 dark:text-slate-100 font-semibold">
                        {item.productName} <span className="text-slate-400 text-[10px]">({item.unit})</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </div>

                    {openProductDropdownIdx === idx && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl shadow-2xl z-50 p-2 space-y-2 max-h-56 overflow-y-auto">
                        <div className="relative">
                          <input
                            type="text"
                            value={productSearchQuery}
                            onChange={e => setProductSearchQuery(e.target.value)}
                            placeholder="Search product name, SKU, or category..."
                            className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orbit-primary"
                            autoFocus
                          />
                          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-orbit-border">
                          {filteredProductOptions.length > 0 ? (
                            filteredProductOptions.map(prod => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => {
                                  handleProductSelect(idx, prod.id)
                                  setOpenProductDropdownIdx(null)
                                  setProductSearchQuery('')
                                  setFormErrors(prev => ({ ...prev, [`item_cost_${idx}`]: '', [`item_qty_${idx}`]: '' }))
                                }}
                                className={`w-full text-left p-1.5 hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 rounded-md transition-colors flex items-center justify-between text-xs ${
                                  item.productId === prod.id ? 'bg-orbit-primary/5/80 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light font-bold' : ''
                                }`}
                              >
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">{prod.name}</p>
                                  <p className="text-[10px] text-slate-400">{prod.unit} • ₹{prod.defaultCostPrice.toFixed(2)}</p>
                                </div>
                                <span className="font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {prod.sku}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="p-2 text-center text-[11px] text-slate-400">No products match search</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unit Cost */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Unit Cost (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={item.unitCost === 0 ? '' : item.unitCost}
                      placeholder="0.00"
                      onChange={e => {
                        handleItemFieldChange(idx, 'unitCost', parseFloat(e.target.value) || 0)
                        setFormErrors(prev => ({ ...prev, [`item_cost_${idx}`]: '' }))
                      }}
                      className={`w-full h-8 px-2 rounded-md border text-xs font-mono focus:outline-none ${
                        formErrors[`item_cost_${idx}`]
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                          : 'border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                      }`}
                    />
                    {formErrors[`item_cost_${idx}`] && (
                      <p className="text-[9px] font-medium text-rose-500 mt-0.5">{formErrors[`item_cost_${idx}`]}</p>
                    )}
                  </div>

                  {/* Qty Ordered */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.qtyOrdered === 0 ? '' : item.qtyOrdered}
                      placeholder="1"
                      onChange={e => {
                        handleItemFieldChange(idx, 'qtyOrdered', parseInt(e.target.value) || 0)
                        setFormErrors(prev => ({ ...prev, [`item_qty_${idx}`]: '' }))
                      }}
                      className={`w-full h-8 px-2 rounded-md border text-xs font-mono focus:outline-none ${
                        formErrors[`item_qty_${idx}`]
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                          : 'border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                      }`}
                    />
                    {formErrors[`item_qty_${idx}`] && (
                      <p className="text-[9px] font-medium text-rose-500 mt-0.5">{formErrors[`item_qty_${idx}`]}</p>
                    )}
                  </div>

                  {/* Line Total */}
                  <div className="col-span-2 text-right">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Total (+GST)</label>
                    <span className="font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light block pt-1">
                      ₹{item.lineTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Remove Item */}
                  <div className="col-span-1 text-center pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove Item Line"
                    >
                      <X className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing & Financial Summary */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Shipping / Freight Charge (₹)"
                type="number"
                value={shippingCostInput === 0 ? '' : shippingCostInput}
                placeholder="0 (Free Delivery)"
                onChange={e => {
                  setShippingCostInput(parseFloat(e.target.value) || 0)
                  setFormErrors(prev => ({ ...prev, shippingCost: '' }))
                }}
                error={formErrors.shippingCost}
              />
              <Input
                label="Order Notes / Instructions"
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                placeholder="e.g. Include batch quality certificate"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-orbit-border space-y-1 font-mono text-right text-slate-600 dark:text-slate-300">
              <p>Subtotal: ₹{formTotals.subTotal.toFixed(2)}</p>
              <p>Total Included GST: ₹{formTotals.taxAmount.toFixed(2)}</p>
              <p className="text-sm font-bold text-orbit-primary-light dark:text-orbit-primary-light pt-1 border-t border-slate-200 dark:border-orbit-border">
                Grand Total Amount: ₹{formTotals.grandTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-orbit-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30">
              <Save className="w-4 h-4" /> {formType === 'QUOTATION' ? 'Save Quotation' : 'Issue Purchase Order'}
            </Button>
          </div>

        </form>
      </Modal>

      {/* ─── Detailed PO / Quotation Document Modal ──────────────────────────── */}
      {selectedPO && (
        <Modal
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          size="3xl"
          title={`Purchase Document: ${selectedPO.poNumber}`}
          subtitle={`Supplier: ${selectedPO.supplier} | Ref Quote: ${selectedPO.quotationNo}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

            {/* Document Strip with Audit Meta */}
            <div className="bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 dark:border-orbit-primary/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orbit-primary-light dark:text-orbit-primary-light font-bold uppercase tracking-wider">STATUS &amp; PAYMENTS</p>
                  <div className="flex items-center gap-2 mt-1">
                    {statusBadge(selectedPO.status)}
                    {paymentBadge(selectedPO.paymentStatus, selectedPO.amountPaid, selectedPO.grandTotal)}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="text-slate-500">Order Date: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPO.orderDate}</span></p>
                  <p className="text-slate-500 mt-0.5">Expected Delivery: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPO.expectedDeliveryDate}</span></p>
                </div>
              </div>

              {/* Audit Last Modified Banner */}
              <div className="pt-2 border-t border-orbit-primary/20 dark:border-orbit-primary/30/60 flex items-center justify-between text-xs text-orbit-primary dark:text-orbit-primary-light">
                <div className="flex items-center gap-1.5 font-medium">
                  <UserCheck className="w-4 h-4 text-orbit-primary-light" />
                  <span>Last Updated By: <strong>{selectedPO.lastUpdatedBy || selectedPO.createdBy}</strong></span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">Timestamp: {selectedPO.lastUpdatedAt}</span>
              </div>
            </div>

            {/* Closed Order Status Notice */}
            {selectedPO.status === 'CLOSED' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">Order Officially Closed &amp; Completed</span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">All line items have been received into inventory and payments are settled.</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded font-mono font-bold uppercase">CLOSED</span>
              </div>
            )}

            {/* Vendor & Delivery Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Vendor</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedPO.supplier}</p>
                <p className="text-slate-500">Payment Terms: {selectedPO.paymentTerms}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Receiving Warehouse</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedPO.warehouse}</p>
                <p className="text-slate-500">Stock Location &amp; Inventory Register</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-orbit-border">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5 text-right">Unit Cost</th>
                    <th className="px-4 py-2.5 text-center">Ordered Qty</th>
                    <th className="px-4 py-2.5 text-center">Received Qty</th>
                    <th className="px-4 py-2.5 text-right">GST %</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
                  {selectedPO.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {item.productName}
                        <span className="text-[10px] font-normal text-slate-400 block">{item.unit}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right">₹{item.unitCost.toFixed(2)}</td>
                      <td className="px-4 py-2.5 font-mono text-center font-bold">{item.qtyOrdered}</td>
                      <td className="px-4 py-2.5 font-mono text-center">
                        <span className={item.qtyReceived >= item.qtyOrdered ? 'text-emerald-600 font-bold' : (item.qtyReceived > 0 ? 'text-amber-600 font-bold' : 'text-slate-400')}>
                          {item.qtyReceived} / {item.qtyOrdered}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right">{item.taxRate}%</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-right text-orbit-primary-light dark:text-orbit-primary-light">
                        ₹{item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total & Payment Balance Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1.5 text-xs text-right font-mono">
              <p className="text-slate-500">Subtotal: ₹{selectedPO.subTotal.toFixed(2)}</p>
              <p className="text-slate-500">Tax (GST): ₹{selectedPO.taxAmount.toFixed(2)}</p>
              <p className="text-slate-500">Shipping: ₹{selectedPO.shippingCost.toFixed(2)}</p>
              <div className="pt-2 border-t border-slate-200 dark:border-orbit-border grid grid-cols-2 gap-2 text-left font-sans">
                <div className="bg-white dark:bg-orbit-surface p-2.5 rounded-lg border border-slate-200 dark:border-orbit-border font-mono">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Amount Paid to Vendor</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{selectedPO.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white dark:bg-orbit-surface p-2.5 rounded-lg border border-slate-200 dark:border-orbit-border font-mono text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Balance Due</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                    ₹{Math.max(0, selectedPO.grandTotal - selectedPO.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <p className="text-base font-extrabold text-orbit-primary-light dark:text-orbit-primary-light pt-2 border-t border-slate-200 dark:border-orbit-border">
                Grand Total Amount: ₹{selectedPO.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Audit Trail Activity Timeline */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Activity History &amp; Audit Trail
              </h4>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {selectedPO.auditLogs && selectedPO.auditLogs.length > 0 ? (
                  selectedPO.auditLogs.map((log) => (
                    <div key={log.id} className="bg-white dark:bg-orbit-surface p-2.5 rounded-lg border border-slate-200 dark:border-orbit-border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <User className="w-3 h-3 text-orbit-primary-light" /> {log.updatedBy}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                      </div>
                      <p className="text-orbit-primary-light dark:text-orbit-primary-light font-semibold text-[11.5px]">{log.action}</p>
                      {log.remarks && <p className="text-[11px] text-slate-500 italic">"{log.remarks}"</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No activity logs recorded yet.</p>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-orbit-border">
              {/* Left Side Actions */}
              <div>
                {selectedPO.status !== 'CANCELLED' && selectedPO.status !== 'CLOSED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel Order
                  </Button>
                )}
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                {selectedPO.status !== 'CLOSED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const po = selectedPO
                      setSelectedPO(null)
                      handleOpenStatusUpdate(po)
                    }}
                    className="text-xs text-orbit-primary border-orbit-primary/20 hover:bg-orbit-primary/5 dark:border-orbit-primary/30 dark:text-orbit-primary-light"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Update Status &amp; Partial Amounts
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={() => setSelectedPO(null)}>
                  Close Window
                </Button>

                {selectedPO.status === 'QUOTATION' && (
                  <Button
                    size="sm"
                    onClick={() => handleConvertQuotationToPO(selectedPO)}
                    className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 shadow-md"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Convert to Active PO
                  </Button>
                )}

                {selectedPO.amountPaid < selectedPO.grandTotal && selectedPO.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const poToPay = selectedPO
                      setSelectedPO(null)
                      handleOpenStatusUpdate(poToPay)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-md font-semibold"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Record Vendor Payment (Due ₹{(selectedPO.grandTotal - selectedPO.amountPaid).toLocaleString('en-IN')})
                  </Button>
                )}

                {selectedPO.status !== 'CLOSED' && selectedPO.status !== 'CANCELLED' && selectedPO.status !== 'QUOTATION' && (
                  <Button
                    size="sm"
                    onClick={() => handleClosePO(selectedPO)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-md font-semibold"
                  >
                    <Lock className="w-3.5 h-3.5" /> Close &amp; Complete Order
                  </Button>
                )}
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* ─── Status, Partial Delivery & Partial Payment Modal ──────────────── */}
      {isStatusUpdateOpen && statusUpdatePO && (
        <Modal
          isOpen={isStatusUpdateOpen}
          onClose={() => setIsStatusUpdateOpen(false)}
          size="lg"
          title={`Update Status & Partial Quantities: ${statusUpdatePO.poNumber}`}
          subtitle={`Supplier: ${statusUpdatePO.supplier} | Updating User: ${currentUserDisplay}`}
        >
          <form onSubmit={handleSaveStatusUpdate} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">

            {/* User Info Strip */}
            <div className="bg-orbit-primary/5 dark:bg-orbit-primary/10 p-2.5 rounded-xl border border-orbit-primary/20 dark:border-orbit-primary/30 flex items-center justify-between text-orbit-primary dark:text-orbit-primary-light">
              <div className="flex items-center gap-1.5 font-bold">
                <UserCheck className="w-4 h-4 text-orbit-primary-light" />
                <span>Logged-in User: {currentUserDisplay}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Role: {currentUserRole}</span>
            </div>

            {/* Status Select */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Order Status <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowStatusGuide(prev => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orbit-primary dark:text-orbit-primary-light hover:underline bg-orbit-primary/10 dark:bg-orbit-primary/20 px-2 py-0.5 rounded-md transition-colors"
                  title="Click to view status definitions guide"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Status Guide (i)</span>
                </button>
              </div>

              {showStatusGuide && (
                <div className="p-3 bg-white dark:bg-orbit-surface rounded-xl border border-orbit-primary/30 text-xs space-y-2 shadow-md animate-fadeIn mb-2">
                  <h5 className="font-bold text-orbit-primary dark:text-orbit-primary-light flex items-center gap-1.5 border-b border-slate-100 dark:border-orbit-border pb-1.5">
                    <Info className="w-4 h-4" /> Purchase Order Status Definitions
                  </h5>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <li>
                      <strong className="text-orbit-primary dark:text-orbit-primary-light">ORDERED:</strong> Purchase order issued and sent to vendor; awaiting delivery.
                    </li>
                    <li>
                      <strong className="text-amber-600 dark:text-amber-400">PARTIALLY RECEIVED:</strong> Partial shipment received into warehouse stock; remaining items still pending.
                    </li>
                    <li>
                      <strong className="text-emerald-600 dark:text-emerald-400">RECEIVED:</strong> All ordered items have arrived and been received into store stock inventory.
                    </li>
                    <li>
                      <strong className="text-emerald-700 dark:text-emerald-300">CLOSED:</strong> Order is fully received AND vendor payment is settled (or order officially completed).
                    </li>
                    <li>
                      <strong className="text-rose-600 dark:text-rose-400">CANCELLED:</strong> Order was cancelled before delivery; no inventory or financial updates applied.
                    </li>
                  </ul>
                </div>
              )}
              <select
                value={newStatusInput}
                onChange={e => {
                  const s = e.target.value as POStatus
                  setNewStatusInput(s)
                  if (statusUpdatePO && (s === 'RECEIVED' || s === 'CLOSED')) {
                    const fullQtyMap: { [itemId: string]: number } = {}
                    statusUpdatePO.items.forEach(item => {
                      const pQty = Math.max(0, item.qtyOrdered - (item.qtyReceived || 0))
                      fullQtyMap[item.id] = pQty
                    })
                    setItemQtyReceivedMap(fullQtyMap)
                  }
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              >
                {statusUpdatePO.status === 'DRAFT' || statusUpdatePO.status === 'QUOTATION' ? (
                  <>
                    <option value="DRAFT">DRAFT (Initial Draft Quote)</option>
                    <option value="QUOTATION">QUOTATION (Supplier RFQ Received)</option>
                    <option value="ORDERED">ORDERED (PO Issued to Vendor)</option>
                    <option value="CANCELLED">CANCELLED (Order Cancelled)</option>
                  </>
                ) : (
                  <>
                    <option value="ORDERED">ORDERED (PO Issued to Vendor)</option>
                    <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED (Partial Delivery Received)</option>
                    <option value="RECEIVED">RECEIVED (Fully Received &amp; Stocked)</option>
                    <option value="CLOSED">CLOSED (Completed &amp; Closed Order)</option>
                    <option value="CANCELLED">CANCELLED (Order Cancelled)</option>
                  </>
                )}
              </select>
            </div>

            {/* Partial Line Item Quantities Received Table */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-orbit-border space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Update Partial Item Deliveries (Received Qty)
              </h4>
              <div className="space-y-2">
                {statusUpdatePO.items.map(item => {
                  const newlyReceived = itemQtyReceivedMap[item.id] || 0
                  const prevReceived = item.qtyReceived || 0
                  const pendingQty = Math.max(0, item.qtyOrdered - prevReceived)
                  const isOverOrdered = newlyReceived > pendingQty

                  return (
                    <div key={item.id} className="space-y-1">
                      <div
                        className={`flex items-center justify-between bg-white dark:bg-orbit-surface p-2.5 rounded-lg border text-xs gap-3 transition-colors ${
                          isOverOrdered
                            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-orbit-border'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.productName}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                            <span>Ordered: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.qtyOrdered} {item.unit}</strong></span>
                            <span>•</span>
                            <span>Already Received: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{prevReceived} {item.unit}</strong></span>
                            <span>•</span>
                            <span>Pending: <strong className="font-mono text-amber-600 dark:text-amber-400">{pendingQty} {item.unit}</strong></span>
                          </div>
                        </div>

                        <div className="w-48 flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">New Qty Received:</span>
                          <input
                            type="number"
                            min="0"
                            value={itemQtyReceivedMap[item.id] === undefined || itemQtyReceivedMap[item.id] === 0 ? '' : itemQtyReceivedMap[item.id]}
                            placeholder="0"
                            onChange={e => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0)
                              setItemQtyReceivedMap(prev => ({ ...prev, [item.id]: val }))
                            }}
                            className={`w-full h-8 px-2 rounded-md border text-xs font-mono font-bold text-center focus:outline-none ${
                              isOverOrdered
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-600 focus:ring-1 focus:ring-rose-500'
                                : 'border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-slate-900 text-orbit-primary-light dark:text-orbit-primary-light focus:ring-1 focus:ring-orbit-primary'
                            }`}
                          />
                        </div>
                      </div>

                      {isOverOrdered && (
                        <div className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5 shadow-sm animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Validation Error: Newly received quantity ({newlyReceived} {item.unit}) exceeds remaining pending quantity of <strong>{pendingQty} {item.unit}</strong>.</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Partial Payments Section */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-orbit-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Update Partial Payment / Balance
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      New Payment Amount to Vendor (₹)
                    </label>
                    {statusUpdatePO.grandTotal > statusUpdatePO.amountPaid && (
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, statusUpdatePO.grandTotal - statusUpdatePO.amountPaid)
                          setAmountPaidInput(rem)
                        }}
                        className="text-[10px] font-bold text-orbit-primary hover:underline"
                      >
                        Pay Full Balance (₹{Math.max(0, statusUpdatePO.grandTotal - statusUpdatePO.amountPaid).toFixed(2)})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="1"
                    value={amountPaidInput === 0 ? '' : amountPaidInput}
                    onChange={e => setAmountPaidInput(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                  />
                </div>

                <div className="bg-white dark:bg-orbit-surface p-3 rounded-lg border border-slate-200 dark:border-orbit-border font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grand Total:</span>
                    <span className="font-bold">₹{statusUpdatePO.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Already Paid:</span>
                    <span className="font-bold">₹{statusUpdatePO.amountPaid.toFixed(2)}</span>
                  </div>
                  {(Number(amountPaidInput) || 0) > 0 && (
                    <div className="flex justify-between text-orbit-primary-light dark:text-orbit-primary-light">
                      <span>New Payment:</span>
                      <span className="font-bold">₹{(Number(amountPaidInput) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold pt-1 border-t border-slate-100 dark:border-orbit-border">
                    <span>Remaining Balance:</span>
                    <span>₹{Math.max(0, statusUpdatePO.grandTotal - (statusUpdatePO.amountPaid + (Number(amountPaidInput) || 0))).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <Input
              label="Status &amp; Payment Update Remarks / Logistics Note"
              value={statusNoteInput}
              onChange={e => setStatusNoteInput(e.target.value)}
              placeholder="e.g. Paid partial ₹15,000 via UPI; balance Net 30"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-orbit-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsStatusUpdateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 shadow-md">
                <RefreshCw className="w-3.5 h-3.5" /> Save Updates &amp; Record Audit Log
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Cancel Order Confirmation Modal ───────────────────────────────── */}
      {isCancelConfirmOpen && selectedPO && (
        <Modal
          isOpen={isCancelConfirmOpen}
          onClose={() => setIsCancelConfirmOpen(false)}
          size="sm"
          title="Confirm Order Cancellation"
          subtitle={`PO Number: ${selectedPO.poNumber}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Are you sure you want to cancel purchase order <span className="font-bold text-slate-900 dark:text-slate-100">{selectedPO.poNumber}</span> from vendor <span className="font-semibold">{selectedPO.supplier}</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-orbit-border">
              <Button variant="outline" size="sm" onClick={() => setIsCancelConfirmOpen(false)}>
                Go Back
              </Button>
              <Button size="sm" onClick={handleCancelPO} className="bg-rose-600 hover:bg-rose-500 text-white gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Cancel PO
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Purchasing Step-by-Step Guide Modal */}
      <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} size="2xl" title="How to Use Purchasing & Supplier POs - Setup Guide" subtitle="Learn how to register suppliers, issue purchase orders, receive inventory, and log payments">
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-orbit-primary/10 border border-orbit-primary/20 rounded-xl flex items-start gap-3 text-slate-800 dark:text-slate-200">
            <Lightbulb className="w-5 h-5 text-orbit-primary-light flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Procurement &amp; Purchasing Workflow</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Purchasing connects suppliers to your store inventory. Receiving a PO automatically adds stock items, batch numbers, and expiry dates into your warehouse stock.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 1: Register Suppliers &amp; Vendors</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Go to Suppliers directory to register wholesale vendors, contact details, GST numbers, and payment terms.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/purchases/suppliers') }} className="text-xs gap-1.5 flex-shrink-0">
                Go to Suppliers <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 2: Create Quotation / RFQ or Issue PO</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click "Issue New PO", select supplier, target warehouse, order items, unit cost prices, and expected delivery date.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => { setIsGuideOpen(false); setFormType('PO'); setFormErrors({}); setIsAddOpen(true) }} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white text-xs gap-1.5 flex-shrink-0">
                Issue PO Now <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 3: Mark PO as ORDERED &amp; Send to Vendor</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Send the generated purchase order PDF/summary to your supplier to confirm shipment details.</p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">4</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 4: Receive Shipment &amp; Auto-Update Stock</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">When truck arrives at warehouse, click "Receive PO". Received item quantities, batch numbers, and expiry dates auto-populate inventory.</p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">5</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 5: Record Supplier Payments &amp; Audit Logs</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Log full or partial vendor payments. All status changes and payments are stored in the immutable Audit History Log.</p>
                </div>
              </div>
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
