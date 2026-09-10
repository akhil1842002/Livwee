import { useState, useEffect, useMemo } from 'react'
import { Receipt, Search, Eye, Printer, Download, CheckCircle2, Clock, X, Filter, IndianRupee, ShoppingBag, CreditCard, UserCheck, Calendar } from 'lucide-react'
import { Input, Button, Pagination, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { invoiceService } from '@/services/invoiceService'
import { RECENT_POS_INVOICES } from '@/data/sharedData'
import { downloadInvoicePDF } from '@/utils/pdfGenerator'

// ─── Types ──────────────────────────────────────────────────────────────────

export type SaleLineItem = {
  id: string
  product: string
  hsn: string
  batch: string
  qty: number
  unit: string
  unitPrice: number
  discount: number
  gstRate: number
}

export type SaleRecord = {
  id: string
  receiptNo: string
  counterNo: string
  channel: 'POS Counter' | 'Prescription Desk' | 'Express Checkout' | 'Online Delivery'
  customer: string
  customerPhone: string
  paymentMethod: string
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID'
  paidAmount: number
  dueAmount: number
  status: 'COMPLETED' | 'REFUNDED' | 'CANCELLED'
  date: string
  time: string
  salesOfficer: string
  deliveryFee?: number
  notes: string
  items: SaleLineItem[]
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedSales: SaleRecord[] = []

// ─── Math Calculations ────────────────────────────────────────────────────────

function calcLine(item: SaleLineItem) {
  const gross = item.qty * item.unitPrice
  const discAmt = gross * (item.discount / 100)
  const taxable = gross - discAmt
  const gstAmt = taxable * (item.gstRate / 100)
  return { gross, discAmt, taxable, gstAmt, total: taxable + gstAmt }
}

function calcTotals(sale: SaleRecord) {
  let subTotal = 0, disc = 0, tax = 0, grand = 0
  for (const item of sale.items) {
    const c = calcLine(item)
    subTotal += c.gross
    disc += c.discAmt
    tax += c.gstAmt
    grand += c.total
  }
  grand += (sale.deliveryFee || 0)
  return { subTotal, disc, tax, grand }
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

// ─── Print HTML Export ────────────────────────────────────────────────────────

function buildSalePrintHTML(sale: SaleRecord): string {
  const { subTotal, disc, tax, grand } = calcTotals(sale)
  const itemRows = sale.items.map((item, i) => {
    const c = calcLine(item)
    return `<tr class="${i % 2 === 0 ? 'even' : ''}">
      <td class="sl">${i + 1}</td>
      <td class="desc">
        <div class="prod-name">${item.product}</div>
        <div class="prod-meta">HSN: ${item.hsn} | Batch: ${item.batch}</div>
      </td>
      <td class="num">${item.qty} ${item.unit}</td>
      <td class="num">₹${item.unitPrice.toFixed(2)}</td>
      <td class="num">${item.discount > 0 ? item.discount + '%' : '—'}</td>
      <td class="num">${item.gstRate}%</td>
      <td class="num bold">₹${c.total.toFixed(2)}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>${sale.receiptNo} - Retail Cash Receipt</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;font-size:12px;color:#1e293b;background:#f1f5f9;padding:24px}
  .receipt{max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:24px}
  .header{text-align:center;border-bottom:2px dashed #e2e8f0;padding-bottom:16px;margin-bottom:16px}
  .logo{font-size:24px;font-weight:800;color:#7c3aed}
  .sub{font-size:11px;color:#64748b;margin-top:2px}
  .rec-title{font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:10px;color:#1e293b}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;color:#475569;margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
  th{text-align:right;padding:8px 4px;font-size:9.5px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0}
  th:first-child{text-align:left}
  th.desc{text-align:left}
  td{padding:8px 4px;vertical-align:top;text-align:right;color:#374151;border-bottom:1px border-slate-100}
  td:first-child{text-align:left;color:#94a3b8}
  td.desc{text-align:left}
  .prod-name{font-weight:600;color:#1e293b}
  .prod-meta{font-size:9.5px;color:#94a3b8;font-family:monospace}
  .bold{font-weight:700;color:#1e293b}
  .totals{border-top:2px dashed #e2e8f0;padding-top:12px;margin-bottom:16px}
  .t-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#475569}
  .t-grand{font-size:16px;font-weight:800;color:#7c3aed;padding-top:6px;border-top:1px solid #e2e8f0;margin-top:6px}
  .words{background:#faf5ff;border:1px solid #f3e8ff;border-radius:6px;padding:8px 10px;font-size:10.5px;color:#6b21a8;margin-bottom:16px;text-align:center}
  .footer{text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:12px}
  @media print{
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body{background:#fff;padding:0}
    .receipt{box-shadow:none;border:none}
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="logo">Livwee Pharmacy</div>
    <div class="sub">Ground Floor, Livwee Building, Mumbai – 400001</div>
    <div class="sub">Phone: +91 22 1234 5678 | DL: MH-MUM-12345</div>
    <div class="rec-title">Retail Sale Receipt</div>
  </div>

  <div class="meta">
    <div>Receipt #: <strong>${sale.receiptNo}</strong></div>
    <div>Date: <strong>${sale.date} ${sale.time}</strong></div>
    <div>Customer: <strong>${sale.customer}</strong></div>
    <div>Counter: <strong>${sale.counterNo}</strong></div>
    <div>Payment: <strong>${sale.paymentMethod}</strong></div>
    <div>Cashier: <strong>${sale.salesOfficer}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th class="desc">Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Disc</th>
        <th>GST</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="t-row"><span>Sub Total</span><span>₹${subTotal.toFixed(2)}</span></div>
    ${disc > 0 ? `<div class="t-row" style="color:#dc2626"><span>Discount</span><span>−₹${disc.toFixed(2)}</span></div>` : ''}
    <div class="t-row"><span>Included GST</span><span>₹${tax.toFixed(2)}</span></div>
    <div class="t-row t-grand"><span>Total Amount</span><span>₹${grand.toFixed(2)}</span></div>
  </div>

  <div class="words"><strong>Amount:</strong> ${toWords(grand)}</div>

  <div class="footer">
    Thank you for visiting Livwee Pharmacy!<br/>
    Returns accepted within 7 days with original receipt.<br/>
    System Generated POS Receipt
  </div>
</div>
</body></html>`
}

// ─── POS Sale Receipt Modal ──────────────────────────────────────────────────

function SaleDetailModal({ sale, onClose, onPrint, onDownload }: {
  sale: SaleRecord
  onClose: () => void
  onPrint: () => void
  onDownload: () => void
}) {
  const { subTotal, disc, tax, grand } = calcTotals(sale)

  const statusMap = {
    COMPLETED: { cls: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    REFUNDED: { cls: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40', icon: <Clock className="w-3.5 h-3.5" /> },
    CANCELLED: { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700', icon: <Clock className="w-3.5 h-3.5" /> },
  }
  const { cls: statusCls, icon: statusIcon } = statusMap[sale.status]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-4xl">
        <div className="bg-white dark:bg-[#16161f] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden border border-slate-200 dark:border-slate-800">

          {/* Header */}
          <div className="relative bg-gradient-to-br from-orbit-primary via-orbit-primary-light to-orbit-primary pl-6 sm:pl-8 pr-16 sm:pr-20 py-6">
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 p-2.5 rounded-xl bg-white/15 hover:bg-white/30 border border-white/25 text-white transition-all shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-white/80" />
                  <span className="text-white font-black text-2xl tracking-tight">Livwee Pharmacy POS</span>
                </div>
                <p className="text-white/80 text-xs mt-1">Point of Sale Transaction &amp; Retail Receipt</p>
              </div>

              <div className="sm:text-right">
                <span className="text-orbit-primary-light text-[9px] font-bold uppercase tracking-[2.5px]">POS Receipt</span>
                <div className="text-white text-xl font-extrabold font-mono mt-0.5">{sale.receiptNo}</div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border mt-1.5 ${statusCls}`}>
                  {statusIcon} {sale.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* POS Transaction Details Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Customer</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">{sale.customer}</span>
                <span className="text-[11px] text-slate-400">{sale.customerPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Register / Counter</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">{sale.counterNo}</span>
                <span className="text-[11px] text-orbit-primary-light dark:text-orbit-primary-light font-medium">{sale.channel}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Payment Mode</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">{sale.paymentMethod}</span>
                <span className="text-[11px] text-slate-400">{sale.date} at {sale.time}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Cashier / Staff</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block mt-0.5">{sale.salesOfficer}</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Verified</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orbit-primary text-white font-bold text-[10px] uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Product Name &amp; Batch</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Disc.</th>
                      <th className="px-4 py-3 text-right">GST %</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sale.items.map((item, i) => {
                      const c = calcLine(item)
                      return (
                        <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}>
                          <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{item.product}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                              <span>HSN: {item.hsn}</span>
                              <span>•</span>
                              <span className="text-orbit-primary-light dark:text-orbit-primary-light">Batch: {item.batch}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                            {item.qty} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-rose-500 font-semibold">{item.discount > 0 ? `${item.discount}%` : '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{item.gstRate}%</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">₹{c.total.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction Notes</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{sale.notes || 'No special notes.'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-center bg-orbit-primary/5 dark:bg-orbit-primary/10 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orbit-primary-light dark:text-orbit-primary-light">Words: </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{toWords(grand)}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Sub Total (Gross)</span>
                  <span className="font-mono font-semibold">₹{subTotal.toFixed(2)}</span>
                </div>
                {disc > 0 && (
                  <div className="flex justify-between text-xs text-rose-500 font-medium">
                    <span>Discount Applied</span>
                    <span className="font-mono">−₹{disc.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>GST Included</span>
                  <span className="font-mono">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total</span>
                  <span className="font-mono text-base">₹{grand.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Amount Paid ({sale.paymentMethod})</span>
                  <span className="font-mono font-bold">₹{(sale.paidAmount || grand).toFixed(2)}</span>
                </div>
                {(sale.dueAmount || 0) > 0.01 && (
                  <div className="flex justify-between items-center text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                    <span>BALANCE DUE / OUTSTANDING</span>
                    <span className="font-mono text-sm font-black">₹{sale.dueAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-400">Livwee Pharmacy POS Register System</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print Till Receipt
                </Button>
                <Button size="sm" onClick={onDownload} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 shadow-lg shadow-orbit-primary/30">
                  <Download className="w-3.5 h-3.5" /> Export Receipt
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CSV Export Function ──────────────────────────────────────────────────────

function exportCSV(data: SaleRecord[], start?: string, end?: string) {
  const header = 'Receipt No,Counter,Channel,Customer,Phone,Items Count,Items List,Total,Payment Method,Status,Date,Time,Cashier'
  const rows = data.map(s => {
    const { grand } = calcTotals(s)
    const itemList = s.items.map(i => `${i.product} (x${i.qty})`).join('; ')
    return `"${s.receiptNo}","${s.counterNo}","${s.channel}","${s.customer}","${s.customerPhone}",${s.items.length},"${itemList}",${grand.toFixed(2)},"${s.paymentMethod}","${s.status}","${s.date}","${s.time}","${s.salesOfficer}"`
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const rangeSuffix = start && end ? `_${start}_to_${end}` : `_${Date.now()}`
  a.download = `pos-sales-history${rangeSuffix}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export function SalesHistoryPage() {
  const { showToast } = useToast()
  const [salesList, setSalesList] = useState<SaleRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)

  useEffect(() => {
    invoiceService.fetchInvoices().then(res => {
      if (res && res.data && res.data.length > 0) {
        const fetched: SaleRecord[] = res.data.map((inv: any) => {
          const gTotal = inv.total_amount || 0
          const pAmount = inv.paid_amount !== undefined ? inv.paid_amount : (inv.payment_status === 'PAID' ? gTotal : 0)
          const dAmount = inv.due_amount !== undefined ? inv.due_amount : Math.max(0, gTotal - pAmount)
          const pStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = inv.payment_status === 'PAID' ? 'PAID' : (inv.payment_status === 'PARTIAL' || dAmount > 0.01 ? 'PARTIAL' : 'UNPAID')

          return {
            id: inv._id || inv.id,
            receiptNo: inv.order_number || inv.invoice_number || inv.invoiceNumber || 'INV-2026',
            counterNo: 'Counter #1',
            channel: 'POS Counter',
            customer: inv.customer_name || inv.customer || 'Walk-in Customer',
            customerPhone: '+91 98765 43210',
            paymentMethod: inv.payment_method || 'Cash',
            paymentStatus: pStatus,
            paidAmount: pAmount,
            dueAmount: dAmount,
            status: inv.payment_status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
            date: inv.createdAt ? inv.createdAt.substring(0, 10) : new Date().toISOString().split('T')[0],
            time: inv.createdAt ? inv.createdAt.substring(11, 16) : '10:00',
            salesOfficer: 'Akhil (Admin)',
            deliveryFee: inv.shipping_cost || 0,
            notes: inv.notes || 'POS Sale',
            items: (inv.items || []).map((i: any, idx: number) => ({
              id: String(idx + 1),
              product: i.product_id?.name || i.product_name || i.product || ('Item ' + (idx + 1)),
              hsn: '30049099',
              batch: i.batch || 'BAT-2026-001',
              qty: i.qty || 1,
              unit: i.unit || 'Pcs',
              unitPrice: Number(i.unit_price || i.price || i.product_id?.price || 0),
              discount: i.discount || 0,
              gstRate: i.tax_rate || 12
            }))
          }
        })
        setSalesList(fetched)
      }
    }).catch(err => console.warn('Could not fetch backend sales:', err))
  }, [])

  const allSales = useMemo(() => {
    const posRecords: SaleRecord[] = RECENT_POS_INVOICES.map(inv => {
      const itemsTotal = inv.items.reduce((acc, item) => {
        const gross = item.qty * item.unitPrice
        const discAmt = gross * (item.discount / 100)
        const taxable = gross - discAmt
        const gstAmt = taxable * (item.gstRate / 100)
        return acc + taxable + gstAmt
      }, 0)
      const grand = itemsTotal + (inv.shippingCost || 0)
      const pAmount = inv.paidAmount !== undefined ? inv.paidAmount : (inv.paymentStatus === 'PAID' ? grand : 0)
      const dAmount = Math.max(0, grand - pAmount)
      const pStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = inv.paymentStatus === 'PAID' ? 'PAID' : (dAmount > 0.01 ? 'PARTIAL' : 'UNPAID')

      return {
        id: inv.id,
        receiptNo: inv.invoiceNumber,
        counterNo: 'Counter #1',
        channel: 'POS Counter',
        customer: inv.customer,
        customerPhone: inv.customerPhone || '+91 98765 43210',
        paymentMethod: inv.paymentMethod || 'Cash',
        paymentStatus: pStatus,
        paidAmount: pAmount,
        dueAmount: dAmount,
        status: 'COMPLETED',
        date: inv.issuedAt || new Date().toISOString().split('T')[0],
        time: 'Just now',
        salesOfficer: 'Akhil (Admin)',
        deliveryFee: inv.shippingCost || 0,
        notes: inv.notes,
        items: inv.items.map(i => ({
          id: i.id,
          product: i.product,
          hsn: i.hsn,
          batch: i.batch,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          discount: i.discount,
          gstRate: i.gstRate
        }))
      }
    })
    const existing = new Set(salesList.map(s => s.receiptNo))
    const uniquePOS = posRecords.filter(r => !existing.has(r.receiptNo))
    return [...salesList, ...uniquePOS]
  }, [salesList])

  const filtered = allSales.filter(s => {
    if (startDate && s.date < startDate) return false
    if (endDate && s.date > endDate) return false
    const matchSearch =
      s.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.counterNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.salesOfficer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.items.some(i => i.product.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchSearch
  })

  const handleExport = () => {
    if (filtered.length === 0) {
      showToast('No sales records available to export for the selected filters', 'warning')
      return
    }
    exportCSV(filtered, startDate, endDate)
    showToast(`POS Sales exported for date range ${startDate} to ${endDate}`, 'success')
  }

  const handlePrint = (sale: SaleRecord) => {
    const w = window.open('', '_blank')
    if (w) { w.document.write(buildSalePrintHTML(sale)); w.document.close(); setTimeout(() => w.print(), 600) }
    showToast('Opening POS printer preview…', 'info')
  }

  const [pageSize, setPageSize] = useState(25)

  const handleDownload = async (sale: SaleRecord) => {
    showToast(`Generating 1-page PDF receipt for ${sale.receiptNo}…`, 'info')
    await downloadInvoicePDF(buildSalePrintHTML(sale), `${sale.receiptNo}-receipt.pdf`)
    showToast(`${sale.receiptNo}-receipt.pdf downloaded successfully!`, 'success')
  }

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Calculate dynamic POS summary metrics
  const posMetrics = useMemo(() => {
    let totalSales = 0
    let totalItemsSold = 0
    const modeCounts: Record<string, number> = {}

    allSales.forEach(s => {
      totalSales += calcTotals(s).grand
      s.items.forEach(i => { totalItemsSold += i.qty })
      const m = s.paymentMethod || 'Cash'
      modeCounts[m] = (modeCounts[m] || 0) + 1
    })

    let topMode = 'N/A'
    let maxCount = 0
    Object.entries(modeCounts).forEach(([mode, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt
        topMode = mode
      }
    })

    return {
      totalSales,
      completedOrdersCount: allSales.length,
      topPaymentMode: topMode,
      totalItemsSold
    }
  }, [allSales])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales History &amp; POS Logs</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time Point of Sale (POS) retail transaction logs, counter sales, and cashier till receipts
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2 text-xs border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Filter className="w-3.5 h-3.5" /> Export POS CSV
        </Button>
      </div>

      {/* POS Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total POS Sales</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ₹{posMetrics.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Completed Orders</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {posMetrics.completedOrdersCount} Transactions
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Top Payment Mode</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {posMetrics.topPaymentMode}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Items Quantity Sold</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {posMetrics.totalItemsSold} Units
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Date Range Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm">
        <div className="relative w-full sm:w-64">
          <Input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            placeholder="Search receipt #, customer..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Date Range Inputs & Clear Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-orbit-primary-light" />
            <span>Date Range:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setCurrentPage(1) }}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
          />
          <span className="text-slate-400 font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setCurrentPage(1) }}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setStartDate(today)
              setEndDate(today)
              setCurrentPage(1)
              showToast("Filtered by Today's Date", 'info')
            }}
            className="text-xs h-10 px-3 bg-orbit-primary/5 text-orbit-primary border-orbit-primary/20 dark:bg-orbit-primary/10 dark:text-orbit-primary-light dark:border-orbit-primary/30 hover:bg-orbit-primary/10 rounded-xl"
          >
            Today
          </Button>

          {(searchTerm || startDate !== '' || endDate !== '') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setStartDate('')
                setEndDate('')
                setCurrentPage(1)
                showToast("Cleared filters", 'info')
              }}
              className="gap-1 text-xs border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-50 h-10 px-3 rounded-xl ml-1"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[880px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">Receipt #</th>
                <th className="px-6 py-4">Counter &amp; Channel</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Products Sold</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Cashier</th>
                <th className="px-6 py-4">Time &amp; Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {paginated.length > 0 ? (
                paginated.map(sale => {
                  const { grand } = calcTotals(sale)
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light whitespace-nowrap">
                        {sale.receiptNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">{sale.counterNo}</span>
                        <span className="text-[11px] text-orbit-primary-light dark:text-orbit-primary-light font-medium">{sale.channel}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{sale.customer}</p>
                        <p className="text-[11px] text-slate-400">{sale.customerPhone}</p>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate">
                          {sale.items.map(i => i.product).join(', ')}
                        </p>
                        <span className="text-[10px] text-slate-400">{sale.items.length} product(s)</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-mono">
                        ₹{grand.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">{sale.paymentMethod}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold mt-0.5 ${
                          sale.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : sale.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}>
                          {sale.paymentStatus === 'PAID' ? '✓ FULLY PAID' : sale.paymentStatus === 'PARTIAL' ? `PARTIAL (Due ₹${sale.dueAmount.toFixed(2)})` : 'UNPAID'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {sale.salesOfficer}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {sale.date} <span className="text-[10px] text-slate-400">({sale.time})</span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Till Receipt"
                            onClick={() => setSelectedSale(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Print POS Receipt"
                            onClick={() => handlePrint(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            title="Download Receipt"
                            onClick={() => handleDownload(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="No Sales Transactions Found"
                  description="No Point of Sale transaction records match your search query or selected date filter."
                  colSpan={9}
                />
              )}
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

      {/* POS Till Receipt Modal */}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onPrint={() => handlePrint(selectedSale)}
          onDownload={() => handleDownload(selectedSale)}
        />
      )}
    </div>
  )
}
