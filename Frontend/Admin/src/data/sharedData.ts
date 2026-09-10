export interface SharedProduct {
  id: string
  sku: string
  name: string
  category: string
  brand: string
  unit: string
  purchasePrice: number
  sellingPrice: number
  taxRate: number
  taxName: string
  stock: number
  status: 'ACTIVE' | 'INACTIVE'
  batchNumber?: string
  expiryDate?: string
}

export interface WarehouseOption {
  id: string
  code: string
  name: string
  location: string
  isDefault: boolean
}

export interface CatalogProduct {
  id: string
  sku: string
  name: string
  category?: string
  brand?: string
  unit?: string
  purchasePrice?: number
  sellingPrice: number
  taxRate?: number
  taxName?: string
  stock?: number
}

export const INITIAL_SEED_PRODUCTS: SharedProduct[] = []

export const CATALOG_PRODUCTS: CatalogProduct[] = []

export const getStoredProducts = (): SharedProduct[] => {
  return []
}

export const saveStoredProducts = (_products: SharedProduct[]) => {}

export const addStoredProduct = (product: SharedProduct) => {
  return [product]
}

export const updateStoredProduct = (product: SharedProduct) => {
  return [product]
}

export const deleteStoredProduct = (_id: string) => {
  return []
}

export const WAREHOUSES: WarehouseOption[] = [
  { id: 'wh-1', code: 'WH-CENTRAL', name: 'Main Pharmacy Store', location: 'Central Pharmacy Storage', isDefault: true }
]

export const DEFAULT_WAREHOUSE: WarehouseOption = WAREHOUSES[0]

// ─── Shared POS Sales & Invoice History ───────────────────────────────────────

export interface POSInvoiceRecord {
  id: string
  invoiceNumber: string
  customer: string
  customerAddress: string
  customerGST: string
  customerPhone: string
  paymentMethod: string
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID'
  issuedAt: string
  dueDate: string
  paidAmount: number
  shippingCost?: number
  notes: string
  items: Array<{
    id: string
    product: string
    hsn: string
    batch: string
    qty: number
    unit: string
    unitPrice: number
    discount: number
    gstRate: number
  }>
}

export const RECENT_POS_INVOICES: POSInvoiceRecord[] = []

export function addPOSInvoiceRecord(inv: POSInvoiceRecord) {
  RECENT_POS_INVOICES.unshift(inv)
}

export const SHARED_INVOICES_DB: POSInvoiceRecord[] = []

export function getAllInvoices(): POSInvoiceRecord[] {
  return [...RECENT_POS_INVOICES, ...SHARED_INVOICES_DB]
}

export function getInvoicesForCustomer(customerName: string): POSInvoiceRecord[] {
  const nameLower = customerName.toLowerCase().trim()
  return getAllInvoices().filter(inv => inv.customer.toLowerCase().trim().includes(nameLower))
}

export function getUnpaidInvoicesForCustomer(customerName: string): POSInvoiceRecord[] {
  return getInvoicesForCustomer(customerName).filter(inv => inv.paymentStatus === 'PARTIAL' || inv.paymentStatus === 'UNPAID')
}

export function calcInvoiceGrandTotal(inv: POSInvoiceRecord): number {
  const itemsTotal = inv.items.reduce((acc, item) => {
    const gross = item.qty * item.unitPrice
    const discAmt = gross * (item.discount / 100)
    const taxable = gross - discAmt
    const gstAmt = taxable * (item.gstRate / 100)
    return acc + taxable + gstAmt
  }, 0)
  return itemsTotal + (inv.shippingCost || 0)
}

export function settleInvoicePayment(invoiceNumber: string, amountCollected: number): POSInvoiceRecord | null {
  const all = getAllInvoices()
  const target = all.find(i => i.invoiceNumber === invoiceNumber)
  if (!target) return null

  const grand = calcInvoiceGrandTotal(target)
  const newPaid = target.paidAmount + amountCollected
  const newStatus: 'PAID' | 'PARTIAL' = newPaid >= grand - 0.01 ? 'PAID' : 'PARTIAL'

  target.paidAmount = newPaid
  target.paymentStatus = newStatus

  return target
}

// ─── Payment Receipt Vouchers Registry ───────────────────────────────────────

export interface PaymentReceiptRecord {
  id: string
  receiptNumber: string
  invoiceNumber: string
  customer: string
  amountCollected: number
  paymentMethod: string
  timestamp: string
  notes?: string
}

export const PAYMENT_RECEIPTS_DB: PaymentReceiptRecord[] = []

export function addPaymentReceiptRecord(receipt: PaymentReceiptRecord) {
  const existingIdx = PAYMENT_RECEIPTS_DB.findIndex(
    r => r.receiptNumber === receipt.receiptNumber ||
         (r.invoiceNumber !== 'ACCOUNT-CREDIT' && r.invoiceNumber === receipt.invoiceNumber && Math.abs(r.amountCollected - receipt.amountCollected) < 0.01)
  )
  if (existingIdx !== -1) {
    PAYMENT_RECEIPTS_DB[existingIdx] = receipt
  } else {
    PAYMENT_RECEIPTS_DB.unshift(receipt)
  }
}

export function getReceiptsForCustomer(customerName: string): PaymentReceiptRecord[] {
  const nameLower = customerName.toLowerCase().trim()
  const customerReceipts = PAYMENT_RECEIPTS_DB.filter(r => r.customer.toLowerCase().trim().includes(nameLower))

  const uniqueMap = new Map<string, PaymentReceiptRecord>()
  customerReceipts.forEach(r => {
    const key = r.invoiceNumber && r.invoiceNumber !== 'ACCOUNT-CREDIT'
      ? `${r.invoiceNumber}_${r.amountCollected.toFixed(2)}`
      : `${r.receiptNumber}`
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r)
    }
  })
  return Array.from(uniqueMap.values())
}

export function getReceiptsForInvoice(invoiceNumber: string): PaymentReceiptRecord[] {
  return PAYMENT_RECEIPTS_DB.filter(r => r.invoiceNumber === invoiceNumber)
}

export function syncBackendInvoicesToSharedDB(invoices: POSInvoiceRecord[]) {
  const existingNumbers = new Set(RECENT_POS_INVOICES.map(i => i.invoiceNumber))
  invoices.forEach(inv => {
    if (!existingNumbers.has(inv.invoiceNumber)) {
      const idx = SHARED_INVOICES_DB.findIndex(i => i.invoiceNumber === inv.invoiceNumber)
      if (idx !== -1) {
        SHARED_INVOICES_DB[idx] = inv
      } else {
        SHARED_INVOICES_DB.push(inv)
      }
    }
  })
}

export function syncBackendReceiptsToSharedDB(receipts: PaymentReceiptRecord[]) {
  receipts.forEach(r => {
    const idx = PAYMENT_RECEIPTS_DB.findIndex(
      existing => existing.receiptNumber === r.receiptNumber ||
                  (existing.invoiceNumber !== 'ACCOUNT-CREDIT' && existing.invoiceNumber === r.invoiceNumber && Math.abs(existing.amountCollected - r.amountCollected) < 0.01)
    )
    if (idx !== -1) {
      PAYMENT_RECEIPTS_DB[idx] = r
    } else {
      PAYMENT_RECEIPTS_DB.push(r)
    }
  })
}
