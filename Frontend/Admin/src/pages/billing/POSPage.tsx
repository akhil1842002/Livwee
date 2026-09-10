import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ShoppingCart,
  Search,
  CreditCard,
  Banknote,
  Plus,
  Minus,
  Trash2,
  Smartphone,
  UserCheck,
  PauseCircle,
  PlayCircle,
  Printer,
  X,
  CheckCircle2,
  Tag,
  Percent,
  Receipt,
  RotateCcw,
  Sparkles,
  Building2,
  Layers,
  ArrowRight,
  Maximize2,
  Info,
  Lightbulb,
  Download,
} from 'lucide-react'
import { Button, Input, Select, Modal, SearchableCustomerSelect, CustomerOption } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { CATALOG_PRODUCTS, WAREHOUSES, DEFAULT_WAREHOUSE, addPOSInvoiceRecord, POSInvoiceRecord, getStoredProducts } from '@/data/sharedData'
import { posService } from '@/services/posService'
import { productService } from '@/services/productService'
import { customerService } from '@/services/customerService'
import { batchService } from '@/services/batchService'
import { downloadThermalReceiptPDF, downloadInvoicePDF } from '@/utils/pdfGenerator'

export interface POSItem {
  id: string
  sku: string
  name: string
  category: string
  brand: string
  unit: string
  batchNumber: string
  expiryDate: string
  price: number
  costPrice: number
  stock: number
  totalStock?: number
  reservedStock?: number
  taxRate: number
}

interface CartEntry {
  item: POSItem
  qty: number
  discountPercent: number
}

interface HeldOrder {
  id: string
  customer: string
  items: CartEntry[]
  timestamp: string
  subtotal: number
  grandTotal: number
}

function toWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (n === 0) return 'Zero'
  const convert = (num: number): string => {
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '')
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '')
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '')
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '')
  }
  const [rupees, paise] = n.toFixed(2).split('.').map(Number)
  return convert(rupees) + ' Rupees' + (paise > 0 ? ' and ' + convert(paise) + ' Paise' : '') + ' Only'
}

function buildPOSInvoiceA4HTML(r: any): string {
  if (!r) return ''
  const items = r.items || []

  const itemRows = items.map((entry: any, i: number) => {
    const name = entry.item?.name || entry.productName || entry.product || entry.name || 'Medicine Item'
    const qty = entry.qty || 1
    const price = entry.item?.price ?? entry.unitPrice ?? entry.unit_price ?? entry.price ?? 0
    const discount = entry.discountPercent || 0
    const gstRate = entry.item?.taxRate ?? 12
    const lineSubtotal = price * qty
    const discAmt = (lineSubtotal * discount) / 100
    const taxable = lineSubtotal - discAmt
    const gstAmt = (taxable * gstRate) / 100
    const total = taxable + gstAmt
    const hsn = entry.item?.hsn || '30049099'
    const batch = entry.item?.batchNumber || 'BAT-2026-001'

    return `<tr class="${i % 2 === 0 ? 'even' : ''}">
      <td style="text-align:center;padding:7px 8px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-weight:600;">${i + 1}</td>
      <td style="text-align:left;padding:7px 8px;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:700;color:#1e293b;font-size:11px;">${name}</div>
        <div style="font-size:9px;color:#94a3b8;font-family:monospace;margin-top:1px;">HSN: ${hsn} &nbsp;|&nbsp; Batch: ${batch}</div>
      </td>
      <td style="text-align:center;padding:7px 8px;border-bottom:1px solid #f1f5f9;">${qty}</td>
      <td style="text-align:right;padding:7px 8px;border-bottom:1px solid #f1f5f9;">₹${price.toFixed(2)}</td>
      <td style="text-align:right;padding:7px 8px;border-bottom:1px solid #f1f5f9;">${discount > 0 ? discount + '%' : '—'}</td>
      <td style="text-align:right;padding:7px 8px;border-bottom:1px solid #f1f5f9;">₹${taxable.toFixed(2)}</td>
      <td style="text-align:right;padding:7px 8px;border-bottom:1px solid #f1f5f9;">${gstRate}%</td>
      <td style="text-align:right;padding:7px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;">₹${total.toFixed(2)}</td>
    </tr>`
  }).join('')

  const subTotal = r.subtotal || 0
  const discountVal = r.discountVal || 0
  const taxVal = r.taxVal || 0
  const deliveryFee = r.deliveryFee || 0
  const grandTotal = r.grandTotal || 0
  const paidAmount = r.paidAmount || 0
  const remainingDue = r.remainingDue || 0
  const statusColor = remainingDue === 0 ? '#16a34a' : remainingDue < grandTotal ? '#d97706' : '#dc2626'
  const pStatus = remainingDue === 0 ? 'PAID' : remainingDue < grandTotal ? 'PARTIAL' : 'UNPAID'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Tax Invoice ${r.invNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 6mm 10mm; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;font-size:11px;color:#1e293b;background:#fff;padding:12px 16px}
    .page{max-width:820px;margin:0 auto;background:#fff;border:none}
    .top-bar{background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:16px 22px;display:flex;justify-content:space-between;align-items:flex-start;color:#fff;border-radius:10px;margin-bottom:14px}
    .brand{font-size:24px;font-weight:800;letter-spacing:-0.5px}
    .brand-tag{font-size:10px;color:#c4b5fd;margin-top:1px;font-weight:500}
    .seller-info{font-size:10px;color:#ddd6fe;margin-top:6px;line-height:1.4}
    .inv-right{text-align:right}
    .inv-label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#c4b5fd;font-weight:700}
    .inv-num{font-size:18px;font-weight:800;font-family:monospace;margin-top:2px}
    .inv-date{font-size:10px;color:#ddd6fe;margin-top:2px}
    .status-chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;margin-top:6px;letter-spacing:.5px;border:1px solid ${statusColor}40;background:${statusColor}20;color:#fff}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
    .party{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
    .party-label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7c3aed;margin-bottom:4px}
    .party-name{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px}
    .party-detail{font-size:10px;color:#64748b;line-height:1.5}
    table.items{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10.5px}
    table.items thead tr{background:#7c3aed;color:#fff}
    table.items thead th{padding:8px;text-align:right;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    table.items thead th:first-child{text-align:center;width:30px}
    table.items thead th.desc{text-align:left}
    table.items tbody tr{border-bottom:1px solid #f1f5f9}
    table.items tbody tr.even{background:#fafbff}
    .bottom{display:grid;grid-template-columns:1fr 240px;gap:14px;margin-bottom:14px;align-items:start}
    .totals-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
    .t-row{display:flex;justify-content:space-between;padding:4px 0;font-size:11px;color:#475569;border-bottom:1px solid #f1f5f9}
    .t-row:last-child{border:none}
    .t-grand{font-size:15px;font-weight:800;color:#7c3aed;padding:8px 0 4px;border-top:2px solid #7c3aed;margin-top:4px}
    .t-paid{color:#16a34a;font-weight:700}
    .t-due{color:#dc2626;font-weight:700}
    .words{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:10.5px;color:#475569;margin-bottom:12px}
    .footer{text-align:center;font-size:9.5px;color:#94a3b8;padding:10px;border-top:1px solid #f1f5f9;margin-top:8px}
    @media print{
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      html, body{width:210mm;height:297mm;background:#fff;padding:0;margin:0}
      .page{box-shadow:none;border-radius:0;border:none;width:100%;padding:4mm 6mm}
    }
  </style>
</head>
<body>
<div class="page">
  <div class="top-bar">
    <div>
      <div class="brand">Livwee Pharmacy</div>
      <div class="brand-tag">Retail POS GST Tax Invoice</div>
      <div class="seller-info">
        Ground Floor, Livwee Building, Mumbai – 400001, Maharashtra<br/>
        GSTIN: 27AAAAA0000A1Z5 &nbsp;|&nbsp; Ph: +91 22 2490 8000 &nbsp;|&nbsp; Email: billing@livwee.io
      </div>
    </div>
    <div class="inv-right">
      <div class="inv-label">${remainingDue > 0 ? 'PARTIAL PAYMENT TAX INVOICE' : 'GST Tax Invoice'}</div>
      <div class="inv-num">${r.invNo}</div>
      <div class="inv-date">Date: ${r.date}</div>
      <div class="status-chip" style="${pStatus === 'PARTIAL' ? 'background:#fef3c7;color:#b45309;border:1px solid #fcd34d' : ''}">${pStatus}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Billed To (Customer)</div>
      <div class="party-name">${r.customer}</div>
      <div class="party-detail">
        Payment Mode: ${r.paymentMethod} ${r.refNumber && r.refNumber !== 'N/A' ? ' | Ref: ' + r.refNumber : ''}<br/>
        Cashier: ${r.cashier}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Billing Summary</div>
      <div class="party-detail">
        Invoice Ref: <strong>${r.invNo}</strong><br/>
        Billing Date: <strong>${r.date}</strong><br/>
        Total Items: <strong>${items.length} Line Items</strong>
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>#</th>
        <th class="desc">Item &amp; Details</th>
        <th style="text-align:center">Qty</th>
        <th>Price</th>
        <th>Disc</th>
        <th>Taxable</th>
        <th>GST%</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="bottom">
    <div>
      <div class="words"><strong>Amount in Words:</strong> ${toWords(grandTotal)}</div>
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:8px 12px;font-size:10px;color:#6b21a8;margin-top:6px;">
        <strong>Pharmacy Notice:</strong> All medicines verified against active batch manufacturing and expiry dates. FEFO compliant stock issuance.
      </div>
    </div>
    <div class="totals-box">
      <div class="t-row"><span>Subtotal:</span><span>₹${subTotal.toFixed(2)}</span></div>
      ${discountVal > 0 ? `<div class="t-row" style="color:#dc2626"><span>Discount:</span><span>−₹${discountVal.toFixed(2)}</span></div>` : ''}
      <div class="t-row"><span>GST Tax (12%):</span><span>₹${taxVal.toFixed(2)}</span></div>
      ${deliveryFee > 0 ? `<div class="t-row"><span>Delivery:</span><span>₹${deliveryFee.toFixed(2)}</span></div>` : ''}
      <div class="t-row t-grand"><span>Grand Total:</span><span>₹${grandTotal.toFixed(2)}</span></div>
      <div class="t-row t-paid"><span>Amount Paid (${r.paymentMethod}):</span><span>₹${paidAmount.toFixed(2)}</span></div>
      ${remainingDue > 0 ? `<div class="t-row t-due" style="background:#fef2f2;border:1px solid #fecaca;padding:6px;border-radius:6px;margin-top:4px"><span style="color:#991b1b;font-weight:900">BALANCE DUE:</span><span style="color:#dc2626;font-weight:900;font-family:monospace">₹${remainingDue.toFixed(2)}</span></div>` : ''}
    </div>
  </div>

  <div class="footer">
    Thank you for visiting Livwee Pharmacy! &nbsp;|&nbsp; Computer Generated GST Tax Invoice &nbsp;|&nbsp; Authorised Signatory
  </div>
</div>
</body></html>`
}


function buildPOSReceiptHTML(r: any): string {
  if (!r) return ''
  const itemRows = (r.items || []).map((entry: any) => {
    const name = entry.item?.name || entry.productName || entry.product || entry.name || 'Medicine Item'
    const qty = entry.qty || 1
    const price = entry.item?.price ?? entry.unitPrice ?? entry.unit_price ?? entry.price ?? 0
    const itemTotal = (price * qty).toFixed(2)
    return `
    <tr>
      <td style="padding:3px 0;border-bottom:1px dotted #ddd">${name}</td>
      <td style="padding:3px 4px;border-bottom:1px dotted #ddd;text-align:center">${qty}</td>
      <td style="padding:3px 0;border-bottom:1px dotted #ddd;text-align:right">₹${itemTotal}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><title>POS Receipt</title>
<meta charset="utf-8">
<style>
  @page { size:80mm auto; margin:0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body, .receipt { font-family:'Courier New',Courier,monospace; font-size:11px; color:#111; background:#fff; width:76mm; padding:4mm 2mm; margin:0 auto; }
  .center { text-align:center; }
  .right { text-align:right; }
  .bold { font-weight:bold; }
  .header { text-align:center; border-bottom:2px dashed #333; padding-bottom:6px; margin-bottom:6px; }
  .header h1 { font-size:15px; font-weight:900; letter-spacing:0.5px; }
  .header p { font-size:9.5px; color:#555; margin-top:2px; }
  .meta { margin-bottom:6px; border-bottom:1px dashed #aaa; padding-bottom:6px; }
  .meta .row { display:flex; justify-content:space-between; font-size:10.5px; padding:1px 0; }
  table { width:100%; border-collapse:collapse; margin:6px 0; font-size:10.5px; }
  thead tr { border-bottom:2px solid #333; }
  th { font-size:9.5px; text-align:left; padding:3px 0; text-transform:uppercase; }
  th:last-child { text-align:right; }
  th:nth-child(2) { text-align:center; }
  tbody tr:last-child td { border-bottom:none; }
  .totals { border-top:2px dashed #333; margin-top:4px; padding-top:6px; }
  .totals .row { display:flex; justify-content:space-between; padding:2px 0; font-size:11px; }
  .totals .row.grand { font-size:13px; font-weight:900; border-top:1px solid #333; margin-top:4px; padding-top:4px; }
  .totals .row.paid { color:#166534; font-weight:bold; }
  .totals .row.due { color:#991b1b; font-weight:bold; }
  .totals .row.discount { color:#065f46; }
  .footer { text-align:center; border-top:2px dashed #333; margin-top:8px; padding-top:6px; font-size:9.5px; color:#555; }
  .footer p { margin:2px 0; }
  @media print { body, .receipt { width:76mm; } }
</style></head><body>
<div class="receipt">
<div class="header">
  <h1>LIVWEE PHARMACY</h1>
  <p>Ground Floor, Livwee Building, Mumbai</p>
  <p>GSTIN: 27AAAAA0000A1Z5 | Ph: +91 22 2490 8000</p>
</div>
<div class="meta">
  <div class="row"><span>Receipt #:</span><span class="bold">${r.invNo}</span></div>
  <div class="row"><span>Date:</span><span>${r.date}</span></div>
  <div class="row"><span>Customer:</span><span>${r.customer}</span></div>
  <div class="row"><span>Cashier:</span><span>${r.cashier}</span></div>
  <div class="row"><span>Payment:</span><span class="bold">${r.paymentMethod}${r.refNumber && r.refNumber !== 'N/A' ? ' | Ref: ' + r.refNumber : ''}</span></div>
</div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="totals">
  <div class="row"><span>Subtotal:</span><span>₹${(r.subtotal || 0).toFixed(2)}</span></div>
  ${r.discountVal > 0 ? `<div class="row discount"><span>Discount:</span><span>-₹${r.discountVal.toFixed(2)}</span></div>` : ''}
  <div class="row"><span>GST:</span><span>₹${(r.taxVal || 0).toFixed(2)}</span></div>
  ${r.deliveryFee > 0 ? `<div class="row"><span>Delivery:</span><span>₹${r.deliveryFee.toFixed(2)}</span></div>` : ''}
  <div class="row grand"><span>GRAND TOTAL:</span><span>₹${(r.grandTotal || 0).toFixed(2)}</span></div>
  <div class="row paid"><span>Paid (${r.paymentMethod}):</span><span>₹${(r.paidAmount || 0).toFixed(2)}</span></div>
  ${r.remainingDue > 0 ? `<div class="row due" style="background:#fef2f2;border:1px solid #fecaca;padding:4px;margin-top:3px"><span style="color:#991b1b;font-weight:bold">BALANCE DUE:</span><span style="color:#dc2626;font-weight:bold">₹${r.remainingDue.toFixed(2)}</span></div>` : ''}
  ${r.changeReturned > 0 ? `<div class="row paid"><span>Change Returned:</span><span>₹${r.changeReturned.toFixed(2)}</span></div>` : ''}
</div>
<div class="footer">
  <p class="bold">Thank you for visiting Livwee Pharmacy!</p>
  <p>Get well soon. FEFO Batch verified stock.</p>
  <p style="margin-top:6px;font-size:8.5px;color:#999">*** COMPUTER GENERATED RECEIPT ***</p>
</div>
</div>
</body></html>`
}

export function POSPage() {
  const { showToast } = useToast()

  // ─── POS Products & Customers from API ───────────────────────────────────────
  const [products, setProducts] = useState<POSItem[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([
    { label: 'Walk-in Customer (Retail)', value: 'Walk-in Customer' }
  ])

  // ─── Filter & Navigation States ─────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // ─── Active Cart & Order States ──────────────────────────────────────────────
  const [cart, setCart] = useState<CartEntry[]>([])
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [cartDiscountPercent, setCartDiscountPercent] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'CREDIT'>('CASH')
  const [refNumber, setRefNumber] = useState('')
  const [deliveryFee, setDeliveryFee] = useState<number>(0)

  // ─── Partial Payment States ──────────────────────────────────────────────────
  const [isPartial, setIsPartial] = useState(false)
  const [customPaidAmount, setCustomPaidAmount] = useState<string>('')

  // ─── Modals & Drawers ────────────────────────────────────────────────────────
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([])
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false)
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null)
  const [receiptFormatTab, setReceiptFormatTab] = useState<'A4' | 'THERMAL'>('A4')
  const [loading, setLoading] = useState(false)


  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch POS Products, Batches & Customers
  useEffect(() => {
    const loadPOSData = async () => {
      try {
        const [prodRes, custRes, batchRes] = await Promise.all([
          productService.fetchProducts(),
          customerService.fetchCustomers(),
          batchService.fetchBatches().catch(() => null)
        ])

        // Build FEFO batch map: productId → earliest-expiring active batch
        const batchList = Array.isArray(batchRes) ? batchRes : (Array.isArray(batchRes?.data) ? batchRes.data : [])
        const batchMap: Record<string, { batchNumber: string; expiryDate: string }> = {}
        for (const b of batchList) {
          if (!b.productId || b.status === 'EXPIRED') continue
          const existing = batchMap[b.productId]
          if (!existing || b.expiryDate < existing.expiryDate) {
            batchMap[b.productId] = { batchNumber: b.batchNumber, expiryDate: b.expiryDate }
          }
        }

        let apiMapped: POSItem[] = []
        const rawList = Array.isArray(prodRes) ? prodRes : (Array.isArray(prodRes?.data) ? prodRes.data : [])
        const mapPOSItem = (p: any): POSItem => {
          const cat = typeof p.category === 'string' && p.category ? p.category : (p.category_id?.name || (typeof p.category_id === 'string' ? p.category_id : ''))
          const brd = typeof p.brand === 'string' && p.brand ? p.brand : (p.brand_id?.name || (typeof p.brand_id === 'string' ? p.brand_id : ''))
          const unt = typeof p.unit === 'string' && p.unit ? p.unit : (p.unit_id?.name || p.unit_id?.code || (typeof p.unit_id === 'string' ? p.unit_id : ''))
          const productId = String(p._id || p.id)
          const batch = batchMap[productId]

          const totalStock = Number(p.stock ?? 0)
          const reservedStock = Number(p.reserved_stock ?? p.reservedStock ?? 0)
          const availableStock = Math.max(0, totalStock - reservedStock)

          return {
            id: productId,
            sku: p.sku || '',
            name: p.name || '',
            category: cat,
            brand: brd,
            unit: unt,
            batchNumber: batch?.batchNumber || p.batchNumber || p.batch_number || 'N/A',
            expiryDate: batch?.expiryDate || p.expiryDate || p.expiry_date || 'N/A',
            price: Number(p.sellingPrice ?? p.price ?? 0),
            costPrice: Number(p.purchasePrice ?? p.cost_price ?? 0),
            stock: availableStock,
            totalStock: totalStock,
            reservedStock: reservedStock,
            taxRate: Number(p.taxRate ?? p.tax_rate ?? 0)
          }
        }

        const filterActive = (p: any) => p.status !== 'INACTIVE' && p.status !== 'BLOCKED' && p.visibility !== false

        if (rawList.length > 0) {
          apiMapped = rawList.filter(filterActive).map(mapPOSItem)
        }

        const stored = getStoredProducts().filter(filterActive)
        const storedMapped: POSItem[] = stored.map(mapPOSItem)

        const seenIds = new Set(apiMapped.map(m => m.id))
        const combinedStored = storedMapped.filter(s => !seenIds.has(s.id))

        setProducts([...apiMapped, ...combinedStored])
        if (custRes && Array.isArray(custRes.data)) {
          const fetchedCusts = custRes.data.map((c: any) => ({
            label: `${c.name}${c.phone ? ` (${c.phone})` : ''}`,
            value: c.name,
            phone: c.phone,
            email: c.email,
            category: c.type || 'Individual'
          }))
          setCustomers([
            { label: 'Walk-in Customer (Retail)', value: 'Walk-in Customer' },
            ...fetchedCusts
          ])
        }
      } catch (err) {
        console.warn('Failed loading POS dynamic data:', err)
      }
    }
    loadPOSData()
  }, [])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
    return ['ALL', ...unique]
  }, [products])

  // ─── Filtered Products ───────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.batchNumber.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  // ─── Cart Calculations ───────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    return cart.reduce((sum, entry) => {
      const itemPrice = entry.item.price * (1 - entry.discountPercent / 100)
      return sum + itemPrice * entry.qty
    }, 0)
  }, [cart])

  const discountVal = (subtotal * cartDiscountPercent) / 100
  const discountedSubtotal = Math.max(0, subtotal - discountVal)
  const taxVal = discountedSubtotal * 0.12 // Average 12% GST
  const grandTotal = discountedSubtotal + taxVal + (deliveryFee || 0)

  // Partial Payment calculations
  const paidAmount = isPartial ? (parseFloat(customPaidAmount) || 0) : (paymentMethod === 'CREDIT' ? 0 : grandTotal)
  const remainingDue = Math.max(0, grandTotal - paidAmount)
  const changeReturned = Math.max(0, paidAmount - grandTotal)

  // ─── Cart Handler Functions ──────────────────────────────────────────────────
  const addToCart = (product: POSItem) => {
    if (product.stock <= 0) {
      const resMsg = product.reservedStock && product.reservedStock > 0 ? ` (${product.reservedStock} units locked in reservation)` : ''
      showToast(`Out of Available Stock: "${product.name}" has 0 sellable inventory!${resMsg}`, 'warning')
      return
    }

    const existingInCart = cart.find(c => c.item.id === product.id)
    if (existingInCart && existingInCart.qty >= product.stock) {
      const resMsg = product.reservedStock && product.reservedStock > 0 ? ` (${product.reservedStock} units reserved)` : ''
      showToast(`Stock limit reached: Maximum ${product.stock} available units for ${product.name}!${resMsg}`, 'warning')
      return
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(c => c.item.id === product.id)
      if (existingIndex > -1) {
        return prev.map((entry, idx) =>
          idx === existingIndex
            ? { ...entry, qty: entry.qty + 1 }
            : entry
        )
      }
      return [...prev, { item: product, qty: 1, discountPercent: 0 }]
    })
    // Removed toast notification for adding product as requested
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(c => {
          if (c.item.id === id) {
            const newQty = c.qty + delta
            if (delta > 0 && newQty > c.item.stock) {
              showToast(`Stock limit reached: Maximum ${c.item.stock} units available!`, 'warning')
              return c
            }
            return newQty > 0 ? { ...c, qty: newQty } : c
          }
          return c
        })
    )
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.item.id !== id))
  }

  const handleHoldOrder = () => {
    if (cart.length === 0) {
      showToast('Cannot hold an empty cart', 'warning')
      return
    }
    const newHeld: HeldOrder = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      customer: customerName,
      items: cart,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      subtotal,
      grandTotal,
    }
    setHeldOrders(prev => [newHeld, ...prev])
    setCart([])
    showToast(`Order ${newHeld.id} placed on HOLD`, 'info', 'Cart Saved')
  }

  const handleRecallOrder = (order: HeldOrder) => {
    setCart(order.items)
    setCustomerName(order.customer)
    setHeldOrders(prev => prev.filter(o => o.id !== order.id))
    setIsHeldModalOpen(false)
    showToast(`Restored Held Order ${order.id}`, 'success')
  }

  const handleQuickCash = (amount: number) => {
    setPaymentMethod('CASH')
    setIsPartial(true)
    setCustomPaidAmount(amount.toString())
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add products to proceed.', 'warning')
      return
    }
    if ((paymentMethod === 'UPI' || paymentMethod === 'CARD') && !refNumber) {
      showToast('Transaction reference ID is required for electronic payments.', 'error')
      return
    }
    if ((isPartial || paymentMethod === 'CREDIT') && remainingDue > 0 && customerName === 'Walk-in Customer') {
      showToast('Please select a registered customer account for partial or credit billing.', 'error')
      return
    }

    setLoading(true)
    const generatedInvNo = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`

    try {
      await posService.checkout({
        invoice_number: generatedInvNo,
        items: cart.map(c => ({
          product_id: c.item.id,
          product_name: c.item.name,
          qty: c.qty,
          unit_price: c.item.price
        })),
        customer_name: customerName,
        payment_method: paymentMethod,
        discount: discountVal,
        shipping_cost: deliveryFee,
        paid_amount: paidAmount
      })
    } catch (err) {
      console.warn('Backend POS checkout warning:', err)
    }

    // Deduct product stock in backend DB & update local POS products state
    for (const c of cart) {
      const newStock = Math.max(0, c.item.stock - c.qty)
      productService.updateProduct(c.item.id, { stock: newStock }).catch(err => console.warn('Failed updating product stock:', err))
    }

    setProducts(prev =>
      prev.map(p => {
        const cartEntry = cart.find(c => c.item.id === p.id)
        if (cartEntry) {
          return { ...p, stock: Math.max(0, p.stock - cartEntry.qty) }
        }
        return p
      })
    )

    const receiptData = {
      invNo: generatedInvNo,
      date: new Date().toLocaleString(),
      customer: customerName,
      cashier: 'Akhil (Admin)',
      paymentMethod,
      refNumber: paymentMethod !== 'CASH' ? refNumber : 'N/A',
      items: cart,
      subtotal,
      discountVal,
      taxVal,
      deliveryFee: deliveryFee || 0,
      grandTotal,
      paidAmount,
      remainingDue,
      changeReturned,
      isPartial,
    }

    const invRecord: POSInvoiceRecord = {
      id: Date.now().toString(),
      invoiceNumber: receiptData.invNo,
      customer: customerName,
      customerAddress: customerName === 'Walk-in Customer' ? 'N/A' : 'Registered Customer',
      customerGST: '—',
      customerPhone: customerName === 'Walk-in Customer' ? 'N/A' : '+91 98765 43210',
      paymentMethod: paymentMethod === 'CASH' ? 'Cash' : paymentMethod === 'UPI' ? 'UPI' : paymentMethod === 'CARD' ? 'Card' : 'Credit (Net 30)',
      paymentStatus: remainingDue > 0 ? 'PARTIAL' : 'PAID',
      issuedAt: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      paidAmount,
      shippingCost: deliveryFee || 0,
      notes: `POS Terminal Sale. Subtotal: ₹${subtotal.toFixed(2)}, Tax: ₹${taxVal.toFixed(2)}${deliveryFee > 0 ? `, Delivery: ₹${deliveryFee.toFixed(2)}` : ''}`,
      items: cart.map((c, i) => ({
        id: String(i + 1),
        product: c.item.name,
        hsn: '30049099',
        batch: c.item.batchNumber || 'BAT-2026-001',
        qty: c.qty,
        unit: c.item.unit || 'Unit',
        unitPrice: c.item.price,
        discount: c.discountPercent > 0 ? c.discountPercent : cartDiscountPercent,
        gstRate: c.item.taxRate ?? 0,
      }))
    }
    addPOSInvoiceRecord(invRecord)

    setCompletedReceipt(receiptData)
    setCart([])
    setDeliveryFee(0)
    setIsPartial(false)
    setCustomPaidAmount('')
    setCustomerName('Walk-in Customer')
    setCartDiscountPercent(0)
    setRefNumber('')
    setPaymentMethod('CASH')
    setIsBillingModalOpen(false)
    setLoading(false)

    if (remainingDue > 0) {
      showToast(
        `POS Sale Complete! Paid: ₹${paidAmount.toFixed(2)}. Due Balance ₹${remainingDue.toFixed(2)} recorded for ${customerName}.`,
        'success',
        'Partial Sale Logged'
      )
    } else {
      showToast(`Full POS Sale Completed! Thermal receipt generated.`, 'success', 'Transaction Settled')
    }
  }

  // ─── Global POS Keyboard Shortcuts Listener ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + F / Cmd + F -> Focus Search & Scan Input
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // F2 -> Hold Current Cart
      if (e.key === 'F2') {
        e.preventDefault()
        handleHoldOrder()
        return
      }

      // F4 -> Toggle Recall Orders Drawer
      if (e.key === 'F4') {
        e.preventDefault()
        setIsHeldModalOpen(prev => !prev)
        return
      }

      // F8 -> Toggle Fullscreen Billing Popup
      if (e.key === 'F8') {
        e.preventDefault()
        setIsBillingModalOpen(prev => !prev)
        return
      }

      // Escape -> Clear Search or Close Active Modals
      if (e.key === 'Escape') {
        if (search) {
          setSearch('')
        } else if (isHeldModalOpen) {
          setIsHeldModalOpen(false)
        } else if (isBillingModalOpen) {
          setIsBillingModalOpen(false)
        }
        return
      }

      // Ctrl + Enter -> Instant POS Checkout & Sale Settlement
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleCheckout()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [search, isHeldModalOpen, isBillingModalOpen, cart, customerName, paymentMethod, refNumber, customPaidAmount, remainingDue])

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-6.5rem)]">
      {/* ── Left Catalog & Controls Column ──────────────────────────────────── */}
      <div className="flex-1 space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Header & Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131522] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-orbit-primary-light dark:text-orbit-primary-light" /> POS Counter Terminal
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Register #01 Active
                </span>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  title="How to Use POS Terminal - Guide"
                  className="p-1.5 px-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:text-orbit-primary-light hover:bg-orbit-primary/10 border border-slate-200 dark:border-orbit-border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm ml-1"
                >
                  <Info className="w-4 h-4 text-orbit-primary-light" />
                  <span>How to Use POS Guide</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatic FEFO batch allocation &bull; Real-time inventory deduction &bull; Cashier: <strong className="text-slate-700 dark:text-slate-300">Akhil (Admin)</strong>
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBillingModalOpen(true)}
                className="gap-1.5 text-xs border-orbit-primary/30 dark:border-orbit-primary/30 text-orbit-primary dark:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10"
              >
                <Maximize2 className="w-4 h-4" /> Full Screen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHoldOrder}
                className="gap-1.5 text-xs border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <PauseCircle className="w-4 h-4" /> Hold Cart
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHeldModalOpen(true)}
                className="gap-1.5 text-xs border-orbit-primary/30 dark:border-orbit-primary/30 text-orbit-primary dark:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 relative"
              >
                <PlayCircle className="w-4 h-4" /> Recall Orders
                {heldOrders.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-orbit-primary text-white">
                    {heldOrders.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Search Bar & Fast Barcode Scan */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Scan Barcode or search SKU, drug name, or batch number..."
                prefix={<Search className="w-4 h-4 text-orbit-primary-light dark:text-orbit-primary-light" />}
                suffix={
                  search ? (
                    <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                      Ctrl + F
                    </span>
                  )
                }
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${selectedCategory === cat
                  ? 'bg-orbit-primary text-white shadow-md shadow-orbit-primary/20'
                  : 'bg-white dark:bg-[#131522] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-orbit-primary/30 dark:hover:border-slate-700'
                  }`}
              >
                {cat === 'ALL' ? '📦 All Medicine Catalog' : cat}
              </button>
            ))}
          </div>

          {/* Products Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[calc(100vh-21rem)] overflow-y-auto pr-1 custom-scrollbar">
            {filteredProducts.map(product => {
              const isOutOfStock = product.stock <= 0
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`bg-white dark:bg-[#131522] border rounded-2xl p-3.5 transition-all duration-200 shadow-sm relative overflow-hidden group flex flex-col justify-between ${
                    isOutOfStock
                      ? 'border-rose-200 dark:border-rose-900/40 opacity-70 bg-rose-50/20 dark:bg-rose-950/10 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-800/90 hover:border-orbit-primary/80 hover:shadow-xl hover:shadow-orbit-primary/10 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orbit-primary/5 dark:bg-orbit-primary/20 text-orbit-primary dark:text-orbit-primary-light border border-orbit-primary/20/80 dark:border-orbit-primary/30">
                        {product.category}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                          {product.reservedStock && product.reservedStock > 0 ? `Reserved (${product.reservedStock})` : 'Out of Stock (0)'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${product.stock < 30 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                            Stock: {product.stock}
                          </span>
                          {product.reservedStock && product.reservedStock > 0 ? (
                            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30" title={`${product.reservedStock} units reserved`}>
                              🔒 {product.reservedStock}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-orbit-primary-light dark:group-hover:text-orbit-primary-light transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400">{product.sku}</span>
                      <span className="text-[10px] font-semibold text-slate-500">&bull; {product.unit}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light">
                        {product.batchNumber}
                      </p>
                      <p className="text-[10px] text-slate-400">Exp: {product.expiryDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{product.price.toFixed(2)}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400">incl. GST {product.taxRate}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Interactive & Functional POS Keyboard Shortcuts Bar */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-orbit-primary-light animate-pulse" />
            <span className="text-orbit-primary-light dark:text-orbit-primary-light">POS FEFO Engine Active</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <button
              onClick={() => searchInputRef.current?.focus()}
              title="Focus search input (Shortcut: Ctrl+F)"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orbit-primary transition-all shadow-2xs"
            >
              <kbd className="font-extrabold text-orbit-primary-light dark:text-orbit-primary-light">Ctrl + F</kbd>
              <span>Scan/Search</span>
            </button>

            <button
              onClick={handleHoldOrder}
              title="Park active cart (Shortcut: F2)"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400 transition-all shadow-2xs"
            >
              <kbd className="font-extrabold text-amber-600 dark:text-amber-400">F2</kbd>
              <span>Hold</span>
            </button>

            <button
              onClick={() => setIsHeldModalOpen(true)}
              title="Recall held carts (Shortcut: F4)"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orbit-primary transition-all shadow-2xs"
            >
              <kbd className="font-extrabold text-orbit-primary-light dark:text-orbit-primary-light">F4</kbd>
              <span>Recall</span>
            </button>

            <button
              onClick={() => setIsBillingModalOpen(true)}
              title="Open Fullscreen Billing Modal (Shortcut: F8)"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orbit-primary transition-all shadow-2xs"
            >
              <kbd className="font-extrabold text-orbit-primary-light dark:text-orbit-primary-light">F8</kbd>
              <span>Fullscreen</span>
            </button>

            <button
              onClick={handleCheckout}
              title="Confirm & complete POS sale (Shortcut: Ctrl+Enter)"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orbit-primary text-white font-extrabold hover:bg-orbit-primary/50 transition-all shadow-sm"
            >
              <kbd className="font-black">Ctrl + Enter ↵</kbd>
              <span>Complete Sale</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Cart & Multi-Tender Checkout Sidebar ─────────────────────── */}
      <div className="w-full lg:w-[410px] bg-white dark:bg-[#131522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-xl space-y-4">
        <div className="space-y-3.5">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orbit-primary-light dark:text-orbit-primary-light" />
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">Current Order Cart</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBillingModalOpen(true)}
                title="Open Fullscreen Billing Modal"
                className="px-2 py-0.5 rounded-lg border border-orbit-primary/30 dark:border-orbit-primary/30 bg-orbit-primary/5 dark:bg-orbit-primary/10 text-orbit-primary dark:text-orbit-primary-light hover:bg-orbit-primary hover:text-white transition-all flex items-center gap-1 text-xs font-bold"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </button>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orbit-primary/10 text-orbit-primary dark:bg-orbit-primary/20 dark:text-orbit-primary-light border border-orbit-primary/20 dark:border-orbit-primary/30">
                {cart.length} Line Items
              </span>
            </div>
          </div>

          {/* Customer Account Selector */}
          <SearchableCustomerSelect
            label="Billed Customer Profile"
            value={customerName}
            onChange={(val) => setCustomerName(val)}
            options={customers}
          />

          {/* Cart Items List */}
          <div className="py-1 space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                <ShoppingCart className="w-9 h-9 mx-auto mb-2 opacity-30 text-orbit-primary-light" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">Your POS cart is currently empty</p>
                <p className="text-[11px] mt-0.5">Click any drug card from the catalog to add items</p>
              </div>
            ) : (
              cart.map(({ item, qty, discountPercent }) => {
                const itemFinalPrice = item.price * (1 - discountPercent / 100)
                return (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>{item.batchNumber}</span>
                        <span>&bull; ₹{itemFinalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                      <button onClick={() => updateQty(item.id, -1)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-0.5">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 w-4 text-center">{qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-0.5">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Calculations Ledger & Partial Payment Controls */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          {/* Order Calculations */}
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Items Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">₹{subtotal.toFixed(2)}</span>
            </div>
            {cartDiscountPercent > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount ({cartDiscountPercent}%):</span>
                <span className="font-mono font-semibold">-₹{discountVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST Tax (12% Avg):</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">₹{taxVal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Delivery Charge / Fee:</span>
              <div className="relative w-20">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={deliveryFee === 0 ? '' : deliveryFee}
                  onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="₹0.00"
                  className="w-full px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orbit-primary text-right"
                />
              </div>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Grand Total:</span>
              <span className="font-mono text-orbit-primary-light dark:text-orbit-primary-light text-lg">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Discount Selector & Manual Entry Input */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">Bill Discount:</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map(disc => (
                <button
                  key={disc}
                  onClick={() => setCartDiscountPercent(disc)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-all ${cartDiscountPercent === disc
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  {disc === 0 ? '0%' : `${disc}%`}
                </button>
              ))}
              <div className="relative w-16">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={cartDiscountPercent === 0 ? '' : cartDiscountPercent}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                    setCartDiscountPercent(val)
                  }}
                  placeholder="Custom %"
                  className="w-full px-1.5 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orbit-primary"
                />
              </div>
            </div>
          </div>

          {/* Partial Payment Toggle & Entry Box */}
          <div className="p-3 rounded-2xl bg-orbit-primary/5/50 dark:bg-orbit-primary/10 border border-orbit-primary/20/80 dark:border-orbit-primary/30/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPartial}
                  onChange={(e) => {
                    setIsPartial(e.target.checked)
                    if (e.target.checked && !customPaidAmount) {
                      setCustomPaidAmount((grandTotal * 0.5).toFixed(0))
                    }
                  }}
                  className="rounded border-slate-300 text-orbit-primary-light focus:ring-orbit-primary w-4 h-4"
                />
                Partial / Split Payment Mode
              </label>
              {isPartial && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300/50">
                  Partial Active
                </span>
              )}
            </div>

            {isPartial && (
              <div className="space-y-2 pt-1 border-t border-orbit-primary/20/60 dark:border-orbit-primary/30/40">
                <Input
                  label="Amount Received Now (₹)"
                  type="number"
                  step="0.01"
                  value={customPaidAmount}
                  onChange={(e) => setCustomPaidAmount(e.target.value)}
                  placeholder={`e.g. ${(grandTotal / 2).toFixed(2)}`}
                />
                <div className="flex items-center justify-between text-xs pt-1 font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Remaining Due Balance:</span>
                  <span className={`font-mono font-extrabold px-2 py-0.5 rounded ${remainingDue > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700'}`}>
                    ₹{remainingDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Cash Tender Buttons (if Cash mode) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Payment Method
              </p>
              {paymentMethod === 'CASH' && (
                <div className="flex items-center gap-1">
                  {[100, 500, 2000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => handleQuickCash(amt)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-orbit-primary/10"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { type: 'UPI', label: 'UPI / QR', icon: Smartphone },
                { type: 'CASH', label: 'Cash', icon: Banknote },
                { type: 'CARD', label: 'Card', icon: CreditCard },
                { type: 'CREDIT', label: 'On Credit', icon: Receipt },
              ].map(m => (
                <button
                  key={m.type}
                  onClick={() => setPaymentMethod(m.type as any)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold transition-all ${paymentMethod === m.type
                    ? 'bg-orbit-primary border-orbit-primary text-white shadow-md shadow-orbit-primary/20'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                  <m.icon className="w-3.5 h-3.5 mb-1" />
                  {m.label}
                </button>
              ))}
            </div>

            {paymentMethod !== 'CASH' && paymentMethod !== 'CREDIT' && (
              <Input
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="Transaction reference ID (Req)"
                className="mt-2 text-xs"
              />
            )}
          </div>

          <Button
            onClick={handleCheckout}
            loading={loading}
            className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white font-extrabold py-3.5 shadow-xl shadow-orbit-primary/30 rounded-xl text-sm"
          >
            {isPartial && remainingDue > 0
              ? `Collect ₹${paidAmount.toFixed(2)} & Record Due`
              : paymentMethod === 'CREDIT'
                ? `Log Credit Sale (₹${grandTotal.toFixed(2)})`
                : `Confirm & Complete POS Sale (₹${grandTotal.toFixed(2)})`}
          </Button>
        </div>
      </div>

      {/* ─── FULLSCREEN BILLING POPUP MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        size="2xl"
        title="POS Counter Billing & Multi-Tender Settlement"
        subtitle="Complete transaction, apply split payment, configure customer billing, or print thermal receipt"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-1">
          {/* Left Column: Cart Items & Profile */}
          <div className="lg:col-span-7 space-y-4">
            <SearchableCustomerSelect
              label="Billed Customer Profile"
              value={customerName}
              onChange={(val) => setCustomerName(val)}
              options={customers}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-orbit-primary-light" /> Cart Line Items ({cart.length})
                </h4>
                <span className="text-xs font-mono font-bold text-slate-500">
                  Subtotal: ₹{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Cart is empty. Add products from the catalog.
                  </div>
                ) : (
                  cart.map(({ item, qty, discountPercent }) => {
                    const itemFinalPrice = item.price * (1 - discountPercent / 100)
                    return (
                      <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {item.sku} &bull; Batch: {item.batchNumber} &bull; GST {item.taxRate}%
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-950 px-2 py-1 rounded-lg border">
                            <button onClick={() => updateQty(item.id, -1)} className="p-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-extrabold w-4 text-center">{qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="p-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 w-16 text-right">
                            ₹{(itemFinalPrice * qty).toFixed(2)}
                          </span>
                          <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-rose-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-100 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
              {cartDiscountPercent > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Bill Discount ({cartDiscountPercent}%):</span>
                  <span className="font-mono">-₹{discountVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated GST Tax (12%):</span>
                <span className="font-mono font-semibold">₹{taxVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 pt-2 border-t">
                <span>Grand Settlement Total:</span>
                <span className="font-mono text-orbit-primary-light dark:text-orbit-primary-light text-lg">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Tender Payment Pad */}
          <div className="lg:col-span-5 bg-white dark:bg-[#131522] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-500" /> Multi-Tender Settlement
                </h4>
                <span className="text-xs font-mono font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Discount Pills & Manual Entry Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 block">Apply Bill Discount:</label>
                  {cartDiscountPercent > 0 && (
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      -{discountVal.toFixed(2)} ₹ ({cartDiscountPercent}%)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 15].map(disc => (
                    <button
                      key={disc}
                      onClick={() => setCartDiscountPercent(disc)}
                      className={`flex-1 py-1 rounded text-xs font-extrabold transition-all ${
                        cartDiscountPercent === disc
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {disc === 0 ? '0%' : `${disc}%`}
                    </button>
                  ))}
                  <div className="relative w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={cartDiscountPercent === 0 ? '' : cartDiscountPercent}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        setCartDiscountPercent(val)
                      }}
                      placeholder="Manual %"
                      className="w-full px-2 py-1 rounded text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orbit-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Partial Payment Box */}
              <div className="p-3 rounded-xl bg-orbit-primary/5/70 dark:bg-orbit-primary/10 border border-orbit-primary/20 dark:border-orbit-primary/30 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPartial}
                    onChange={(e) => {
                      setIsPartial(e.target.checked)
                      if (e.target.checked && !customPaidAmount) {
                        setCustomPaidAmount((grandTotal * 0.5).toFixed(0))
                      }
                    }}
                    className="rounded border-slate-300 text-orbit-primary-light focus:ring-orbit-primary w-4 h-4"
                  />
                  Enable Split / Partial Payment
                </label>
                {isPartial && (
                  <div className="space-y-2 pt-1 border-t border-orbit-primary/20/80 dark:border-orbit-primary/30/80">
                    <Input
                      label="Amount Paid Now (₹)"
                      type="number"
                      step="0.01"
                      value={customPaidAmount}
                      onChange={(e) => setCustomPaidAmount(e.target.value)}
                    />
                    <div className="flex justify-between text-xs font-bold">
                      <span>Remaining Due:</span>
                      <span className={`font-mono px-2 py-0.5 rounded ${remainingDue > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700'}`}>
                        ₹{remainingDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Select Payment Mode:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'UPI', label: 'UPI / QR', icon: Smartphone },
                    { type: 'CASH', label: 'Cash', icon: Banknote },
                    { type: 'CARD', label: 'Card', icon: CreditCard },
                    { type: 'CREDIT', label: 'On Credit', icon: Receipt },
                  ].map(m => (
                    <button
                      key={m.type}
                      onClick={() => setPaymentMethod(m.type as any)}
                      className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all ${
                        paymentMethod === m.type
                          ? 'bg-orbit-primary border-orbit-primary text-white shadow'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod !== 'CASH' && paymentMethod !== 'CREDIT' && (
                <Input
                  label="Transaction Ref ID"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. UPI-9821-3341"
                />
              )}
            </div>

            <Button
              onClick={handleCheckout}
              loading={loading}
              className="w-full bg-orbit-primary hover:bg-orbit-primary/50 text-white font-extrabold py-3 shadow-lg shadow-orbit-primary/30 rounded-xl text-sm mt-3"
            >
              {isPartial && remainingDue > 0
                ? `Collect ₹${paidAmount.toFixed(2)} & Log Due`
                : paymentMethod === 'CREDIT'
                ? `Log Credit Sale (₹${grandTotal.toFixed(2)})`
                : `Confirm & Complete POS Sale (₹${grandTotal.toFixed(2)})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Held Orders Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={isHeldModalOpen}
        onClose={() => setIsHeldModalOpen(false)}
        size="lg"
        title="Held POS Orders"
        subtitle="Recall temporarily parked customer carts to restore item selection"
      >
        <div className="space-y-3">
          {heldOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <PauseCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No held orders right now</p>
              <p className="text-xs">Click "Hold Cart" on any active cart to park it</p>
            </div>
          ) : (
            heldOrders.map(order => (
              <div
                key={order.id}
                className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{order.id}</span>
                    <span className="text-xs text-slate-400">&bull; {order.timestamp}</span>
                  </div>
                  <p className="text-xs font-semibold text-orbit-primary-light dark:text-orbit-primary-light mt-0.5">{order.customer}</p>
                  <p className="text-xs text-slate-500 mt-1">{order.items.length} items &bull; Total: ₹{order.grandTotal.toFixed(2)}</p>
                </div>
                <Button onClick={() => handleRecallOrder(order)} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1 text-xs">
                  <PlayCircle className="w-3.5 h-3.5" /> Restore Cart
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ─── POS Completed Sale Invoice / Thermal Receipt Modal ───────────────── */}
      {completedReceipt && (
        <Modal
          isOpen={!!completedReceipt}
          onClose={() => setCompletedReceipt(null)}
          size="2xl"
          title="POS Counter Billing - Print / Download Invoice"
          subtitle={`Invoice #${completedReceipt.invNo} • ${completedReceipt.date}`}
        >
          <div className="space-y-4">
            {/* Format Selection Tabs */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-white/[0.04] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setReceiptFormatTab('A4')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    receiptFormatTab === 'A4'
                      ? 'bg-orbit-primary text-white shadow-md shadow-orbit-primary/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  📄 Full A4 GST Tax Invoice (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptFormatTab('THERMAL')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    receiptFormatTab === 'THERMAL'
                      ? 'bg-orbit-primary text-white shadow-md shadow-orbit-primary/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  🧾 80mm POS Thermal Receipt Slip
                </button>
              </div>
              <span className="text-[11px] font-mono font-semibold text-slate-400 hidden sm:inline">
                {receiptFormatTab === 'A4' ? 'Format: A4 Portrait (210mm)' : 'Format: Thermal Roll (80mm)'}
              </span>
            </div>

            {/* A4 Tax Invoice Card Visual */}
            {receiptFormatTab === 'A4' ? (
              <div className="bg-white dark:bg-[#121219] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                {/* Top Header */}
                <div className="bg-gradient-to-r from-orbit-primary via-orbit-primary-light to-orbit-primary p-4 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <h3 className="font-extrabold text-xl tracking-tight">Livwee Pharmacy</h3>
                    <p className="text-white/80 text-xs">Retail POS GST Tax Invoice • Ground Floor, Livwee Building, Mumbai</p>
                    <p className="text-white/70 text-[10.5px]">GSTIN: 27AAAAA0000A1Z5 | Ph: +91 22 2490 8000</p>
                  </div>
                  <div className="text-right sm:border-l sm:border-white/20 sm:pl-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">GST Tax Invoice</span>
                    <span className="font-mono font-bold text-lg">{completedReceipt.invNo}</span>
                    <p className="text-[10px] text-white/80">{completedReceipt.date}</p>
                  </div>
                </div>

                {/* Parties Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orbit-primary block mb-1">Billed To (Customer)</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{completedReceipt.customer}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Payment: {completedReceipt.paymentMethod} {completedReceipt.refNumber && completedReceipt.refNumber !== 'N/A' ? `| Ref: ${completedReceipt.refNumber}` : ''}</p>
                    <p className="text-slate-500 text-[11px]">Cashier: {completedReceipt.cashier}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orbit-primary block mb-1">Invoice Summary</span>
                    <p className="text-slate-700 dark:text-slate-300">Invoice Ref: <strong className="font-mono text-slate-900 dark:text-slate-100">{completedReceipt.invNo}</strong></p>
                    <p className="text-slate-700 dark:text-slate-300">Line Items: <strong className="text-slate-900 dark:text-slate-100">{completedReceipt.items.length} Items</strong></p>
                    <p className="text-slate-700 dark:text-slate-300">Payment Status: <strong className="text-emerald-600 font-bold">{completedReceipt.remainingDue === 0 ? 'PAID' : 'PARTIAL'}</strong></p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-orbit-primary text-white font-bold text-[10.5px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-center">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Disc</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {completedReceipt.items.map((entry: any, i: number) => {
                        const name = entry.item?.name || entry.productName || entry.name || 'Item'
                        const price = entry.item?.price ?? entry.unit_price ?? 0
                        const qty = entry.qty || 1
                        const total = price * qty
                        return (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            <td className="py-2 px-3 text-center text-slate-400 font-bold">{i + 1}</td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 block">{name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">HSN: 30049099 | Batch: {entry.item?.batchNumber || 'BAT-2026-001'}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{qty}</td>
                            <td className="py-2 px-3 text-right">₹{price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right">{entry.discountPercent > 0 ? `${entry.discountPercent}%` : '—'}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">₹{total.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Amount in Words & Totals Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
                  <div className="space-y-2">
                    <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Amount in Words</span>
                      <p className="font-bold text-orbit-primary mt-0.5">{toWords(completedReceipt.grandTotal)}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/50 text-[10.5px] text-purple-800 dark:text-purple-300">
                      <strong>FEFO Verification:</strong> All medicines verified for active expiry and batch compliance.
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-white/[0.02] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal:</span>
                      <span>₹{completedReceipt.subtotal.toFixed(2)}</span>
                    </div>
                    {completedReceipt.discountVal > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Discount:</span>
                        <span>-₹{completedReceipt.discountVal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>GST Tax (12%):</span>
                      <span>₹{completedReceipt.taxVal.toFixed(2)}</span>
                    </div>
                    {completedReceipt.deliveryFee > 0 && (
                      <div className="flex justify-between text-orbit-primary font-bold">
                        <span>Delivery Charge:</span>
                        <span>₹{completedReceipt.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span>Grand Total:</span>
                      <span>₹{completedReceipt.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600 pt-0.5">
                      <span>Paid ({completedReceipt.paymentMethod}):</span>
                      <span>₹{completedReceipt.paidAmount.toFixed(2)}</span>
                    </div>
                    {completedReceipt.remainingDue > 0 && (
                      <div className="flex justify-between font-bold text-rose-600">
                        <span>Balance Due:</span>
                        <span>₹{completedReceipt.remainingDue.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Thermal 80mm Paper Visual */
              <div id="pos-receipt-print-area" className="max-w-xs mx-auto bg-amber-50/40 dark:bg-slate-950 p-5 rounded-2xl border border-amber-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-3 shadow-inner">
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                  <h3 className="font-black text-base tracking-tight text-slate-900 dark:text-slate-100">LIVWEE PHARMACY POS</h3>
                  <p className="text-[10px] text-slate-500">Ground Floor, Livwee Building, Mumbai</p>
                  <p className="text-[10px] text-slate-500">GSTIN: 27AAAAA0000A1Z5 &bull; Ph: +91 22 2490 8000</p>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Receipt #: {completedReceipt.invNo}</span>
                    <span>{completedReceipt.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer: {completedReceipt.customer}</span>
                    <span>Cashier: {completedReceipt.cashier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment: {completedReceipt.paymentMethod}</span>
                    <span>Ref: {completedReceipt.refNumber}</span>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-[11px] py-2 border-t border-b border-dashed border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="border-b border-slate-300 dark:border-slate-700 text-slate-500">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {completedReceipt.items.map((entry: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1 max-w-[140px] truncate">{entry.item?.name || entry.productName || entry.name}</td>
                        <td className="py-1 text-center">{entry.qty}</td>
                        <td className="py-1 text-right">₹{((entry.item?.price || entry.unit_price || 0) * entry.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary Breakdown */}
                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{completedReceipt.subtotal.toFixed(2)}</span>
                  </div>
                  {completedReceipt.discountVal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount:</span>
                      <span>-₹{completedReceipt.discountVal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST Tax (12%):</span>
                    <span>₹{completedReceipt.taxVal.toFixed(2)}</span>
                  </div>
                  {completedReceipt.deliveryFee > 0 && (
                    <div className="flex justify-between text-orbit-primary-light font-bold">
                      <span>Delivery Charge:</span>
                      <span>₹{completedReceipt.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-300 dark:border-slate-700">
                    <span>Grand Total:</span>
                    <span>₹{completedReceipt.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-orbit-primary-light pt-1">
                    <span>Amount Paid ({completedReceipt.paymentMethod}):</span>
                    <span>₹{completedReceipt.paidAmount.toFixed(2)}</span>
                  </div>
                  {completedReceipt.remainingDue > 0 && (
                    <div className="flex justify-between font-bold text-rose-600">
                      <span>Remaining Due Balance:</span>
                      <span>₹{completedReceipt.remainingDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 text-[10px] text-slate-500">
                  <p className="font-bold">Thank you for visiting Livwee Pharmacy!</p>
                  <p>Get well soon. FEFO Batch verified stock.</p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setCompletedReceipt(null)} className="text-xs">
                Close
              </Button>

              <div className="flex items-center gap-2">
                {/* Download PDF Action */}
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!completedReceipt) return
                    const r = completedReceipt
                    showToast(`Generating ${receiptFormatTab === 'A4' ? 'A4 Tax Invoice' : 'Thermal'} PDF...`, 'info')
                    if (receiptFormatTab === 'A4') {
                      await downloadInvoicePDF(buildPOSInvoiceA4HTML(r), `${r.invNo}-tax-invoice.pdf`)
                    } else {
                      await downloadThermalReceiptPDF(buildPOSReceiptHTML(r), `${r.invNo}-thermal-receipt.pdf`)
                    }
                    showToast(`PDF downloaded successfully!`, 'success')
                  }}
                  className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 gap-1.5 text-xs font-bold"
                >
                  <Download className="w-4 h-4" /> Download PDF ({receiptFormatTab})
                </Button>

                {/* Print Action */}
                <Button
                  onClick={() => {
                    if (!completedReceipt) return
                    const printHTML = receiptFormatTab === 'A4' ? buildPOSInvoiceA4HTML(completedReceipt) : buildPOSReceiptHTML(completedReceipt)
                    const iframe = document.createElement('iframe')
                    Object.assign(iframe.style, { position:'fixed', right:'0', bottom:'0', width:'0', height:'0', border:'none', visibility:'hidden' })
                    document.body.appendChild(iframe)
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
                    if (iframeDoc) {
                      iframeDoc.open()
                      iframeDoc.write(printHTML)
                      iframeDoc.close()
                      setTimeout(() => {
                        iframe.contentWindow?.focus()
                        iframe.contentWindow?.print()
                        setTimeout(() => document.body.removeChild(iframe), 1500)
                      }, 300)
                    }
                    showToast(`Invoice sent to printer (${receiptFormatTab})!`, 'success')
                  }}
                  className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 text-xs font-bold shadow-md shadow-orbit-primary/20"
                >
                  <Printer className="w-4 h-4" /> Print {receiptFormatTab === 'A4' ? 'Full A4 Tax Invoice' : '80mm Thermal Receipt'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}


      {/* POS Step-by-Step Guide Modal */}
      <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} size="2xl" title="How to Use POS Terminal - Step-by-Step Guide" subtitle="Learn how to perform FEFO billing, customer balance tracking, and 1-click receipts">
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-orbit-primary/10 border border-orbit-primary/20 rounded-xl flex items-start gap-3 text-slate-800 dark:text-slate-200">
            <Lightbulb className="w-5 h-5 text-orbit-primary-light flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">POS Counter Billing Workflow</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                The POS terminal uses FEFO (First-Expired, First-Out) to automatically select the oldest expiring batch when selling medicines.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 1: Select or Scan Medicine</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Type medicine name, scan barcode, or press <kbd className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded text-[10px]">Ctrl + F</kbd> to search products.</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 2: Automatic FEFO Batch Allocation</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The system picks the earliest expiring batch (e.g., May 2026 before Dec 2026) to prevent stock expiration losses.</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 3: Select Customer (Optional)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Keep as Walk-in Customer or select a registered customer to track due balances and purchase history.</p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50/60 dark:bg-orbit-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orbit-primary/20 text-orbit-primary-light font-bold flex items-center justify-center text-xs flex-shrink-0">4</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 4: Select Payment Method &amp; Complete Sale</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose Cash, UPI QR Code, Card, or Partial / Due Payment. Click "Complete POS Sale" or press <kbd className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded text-[10px]">Ctrl + Enter</kbd>.</p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">5</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Step 5: Thermal Receipt &amp; Stock Deduction</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Stock is updated instantly, invoice record is logged, and a 1-click printable thermal receipt opens.</p>
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
