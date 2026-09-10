import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Download, Search, FileText, CheckCircle2, Clock, X, IndianRupee, AlertCircle, Building2, Calendar, Info, Lightbulb, ArrowRight } from 'lucide-react'
import { Input, Pagination, Button, Modal, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { RECENT_POS_INVOICES, addPaymentReceiptRecord, getReceiptsForInvoice } from '@/data/sharedData'
import { invoiceService } from '@/services/invoiceService'
import { downloadInvoicePDF, buildPaymentReceiptVoucherHTML } from '@/utils/pdfGenerator'

// ─── Types ──────────────────────────────────────────────────────────────────

type LineItem = {
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

type Invoice = {
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
  items: LineItem[]
  paidAmount: number
  shippingCost?: number
  notes: string
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seed: Invoice[] = []

// ─── Calc helpers ─────────────────────────────────────────────────────────────

function calcLine(item: LineItem) {
  const gross = item.qty * item.unitPrice
  const discAmt = gross * (item.discount / 100)
  const taxable = gross - discAmt
  const gstAmt = taxable * (item.gstRate / 100)
  return { gross, discAmt, taxable, gstAmt, total: taxable + gstAmt }
}

function calcTotals(inv: Invoice) {
  let subTotal = 0, disc = 0, tax = 0, grand = 0
  for (const item of inv.items) {
    const c = calcLine(item)
    subTotal += c.gross
    disc += c.discAmt
    tax += c.gstAmt
    grand += c.total
  }
  grand += (inv.shippingCost || 0)
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

// ─── Print HTML template ──────────────────────────────────────────────────────

function buildPrintHTML(inv: Invoice): string {
  const { subTotal, disc, tax, grand } = calcTotals(inv)
  const isFullyPaid = inv.paymentStatus === 'PAID'
  const actualPaid = isFullyPaid ? grand : Math.min(grand, inv.paidAmount || 0)
  const due = isFullyPaid ? 0 : Math.max(0, grand - actualPaid)

  const rateMap = new Map<number, { taxable: number; gst: number }>()
  for (const item of inv.items) {
    const c = calcLine(item)
    const ex = rateMap.get(item.gstRate) ?? { taxable: 0, gst: 0 }
    rateMap.set(item.gstRate, { taxable: ex.taxable + c.taxable, gst: ex.gst + c.gstAmt })
  }

  const itemRows = inv.items.map((item, i) => {
    const c = calcLine(item)
    return `<tr class="${i % 2 === 0 ? 'even' : ''}">
      <td class="sl">${i + 1}</td>
      <td class="desc">
        <div class="prod-name">${item.product}</div>
        <div class="prod-meta">HSN: ${item.hsn} &nbsp;|&nbsp; Batch: ${item.batch} &nbsp;|&nbsp; ${item.qty} × ${item.unit}</div>
      </td>
      <td class="num">${item.qty}</td>
      <td class="num">${item.unit}</td>
      <td class="num">₹${item.unitPrice.toFixed(2)}</td>
      <td class="num">${item.discount > 0 ? item.discount + '%' : '—'}</td>
      <td class="num">₹${c.taxable.toFixed(2)}</td>
      <td class="num">${item.gstRate}%</td>
      <td class="num">₹${(c.gstAmt / 2).toFixed(2)}</td>
      <td class="num">₹${(c.gstAmt / 2).toFixed(2)}</td>
      <td class="num bold">₹${c.total.toFixed(2)}</td>
    </tr>`
  }).join('')

  const gstRows = Array.from(rateMap.entries()).map(([rate, v]) =>
    `<tr><td>${rate}%</td><td>₹${v.taxable.toFixed(2)}</td><td>₹${(v.gst / 2).toFixed(2)}</td><td>₹${(v.gst / 2).toFixed(2)}</td><td>₹${v.gst.toFixed(2)}</td></tr>`
  ).join('')

  const statusColor = inv.paymentStatus === 'PAID' ? '#16a34a' : inv.paymentStatus === 'PARTIAL' ? '#d97706' : '#dc2626'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>${inv.invoiceNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @page { size: A4 portrait; margin: 5mm 8mm; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;font-size:11px;color:#1e293b;background:#fff;padding:12px 16px}
  .page{max-width:840px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:none;border:none}
  .top-bar{background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:14px 20px;display:flex;justify-content:space-between;align-items:flex-start;color:#fff;border-radius:8px;margin-bottom:12px}
  .brand{font-size:22px;font-weight:800;letter-spacing:-0.5px}
  .brand-tag{font-size:10px;color:#c4b5fd;margin-top:1px;font-weight:500}
  .seller-info{font-size:10px;color:#ddd6fe;margin-top:4px;line-height:1.4}
  .inv-right{text-align:right}
  .inv-label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#c4b5fd;font-weight:600}
  .inv-num{font-size:18px;font-weight:800;font-family:monospace;margin-top:2px}
  .inv-date{font-size:10px;color:#ddd6fe;margin-top:2px}
  .status-chip{display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;margin-top:4px;letter-spacing:.5px;border:1px solid ${statusColor}40;background:${statusColor}15;color:${statusColor === '#16a34a' ? '#15803d' : statusColor}}
  .body{padding:0}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .party{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}
  .party-label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7c3aed;margin-bottom:4px}
  .party-name{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px}
  .party-detail{font-size:10px;color:#64748b;line-height:1.5}
  .meta-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
  .meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px}
  .meta-box .ml{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:2px}
  .meta-box .mv{font-size:11.5px;font-weight:600;color:#1e293b}
  table.items{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10.5px}
  table.items thead tr{background:#7c3aed;color:#fff}
  table.items thead th{padding:6px 8px;text-align:right;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  table.items thead th:first-child{text-align:center;width:24px}
  table.items thead th.desc{text-align:left}
  table.items tbody tr{border-bottom:1px solid #f1f5f9;page-break-inside:avoid}
  table.items tbody tr.even{background:#fafbff}
  table.items tbody td{padding:6px 8px;vertical-align:top;text-align:right;color:#374151}
  table.items tbody td.sl{text-align:center;color:#94a3b8;font-weight:600}
  table.items tbody td.desc{text-align:left}
  .prod-name{font-weight:600;color:#1e293b;font-size:11px}
  .prod-meta{font-size:9px;color:#94a3b8;margin-top:1px;font-family:monospace}
  .num{font-family:'Inter',sans-serif;font-weight:500}
  .bold{font-weight:700;color:#1e293b}
  .bottom{display:grid;grid-template-columns:1fr 230px;gap:12px;margin-bottom:12px;page-break-inside:avoid;align-items:start}
  .gst-table{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
  .gst-title{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;background:#f1f5f9;padding:6px 10px;border-bottom:1px solid #e2e8f0}
  .gst-table table{width:100%;border-collapse:collapse;font-size:10px}
  .gst-table table thead tr{background:#ffffff}
  .gst-table table thead th{padding:6px 10px;text-align:right;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;border-bottom:1px solid #e2e8f0}
  .gst-table table thead th:first-child{text-align:left}
  .gst-table table tbody td{padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#374151;font-family:'Inter',sans-serif}
  .gst-table table tbody td:first-child{text-align:left;font-weight:700;color:#7c3aed}
  .totals-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}
  .t-row{display:flex;justify-content:space-between;padding:3px 0;font-size:10.5px;color:#475569;border-bottom:1px solid #f1f5f9}
  .t-row:last-child{border:none}
  .t-label{font-weight:500}
  .t-val{font-family:'Inter',sans-serif;font-weight:600}
  .t-grand{font-size:14px;font-weight:800;color:#7c3aed;padding:6px 0 2px;border-top:2px solid #7c3aed;margin-top:4px}
  .t-paid{color:#16a34a}
  .t-due{color:#dc2626;font-weight:700}
  .t-disc{color:#dc2626}
  .words{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;font-size:10px;color:#475569;margin-bottom:10px;page-break-inside:avoid}
  .words strong{color:#1e293b}
  .note{border-left:3px solid #7c3aed;padding:6px 10px;background:#faf5ff;font-size:10px;color:#475569;border-radius:0 6px 6px 0;margin-bottom:10px}
  .note strong{color:#7c3aed}
  .footer{text-align:center;font-size:9px;color:#94a3b8;padding:8px;border-top:1px solid #f1f5f9;margin-top:6px}
  @media print{
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body{width:210mm;height:297mm;background:#fff;padding:0;margin:0}
    .page{box-shadow:none;border-radius:0;border:none;width:100%;padding:4mm 6mm}
  }
</style>
</head>
<body>
<div class="page">
  <div class="top-bar">
    <div>
      <div class="brand">Livwee</div>
      <div class="brand-tag">Pharmacy Management System</div>
      <div class="seller-info">
        Ground Floor, Livwee Building, Mumbai – 400001, Maharashtra<br/>
        GSTIN: 27AABCL1234A1Z9 &nbsp;|&nbsp; PAN: AABCL1234A<br/>
        Phone: +91 22 1234 5678 &nbsp;|&nbsp; Email: billing@livwee.io
      </div>
    </div>
    <div class="inv-right">
      <div class="inv-label">Tax Invoice</div>
      <div class="inv-num">${inv.invoiceNumber}</div>
      <div class="inv-date">Date: ${inv.issuedAt} &nbsp;|&nbsp; Due: ${inv.dueDate}</div>
      <div class="status-chip">${inv.paymentStatus}</div>
    </div>
  </div>

  <div class="body">
    <div class="parties">
      <div class="party">
        <div class="party-label">Bill From</div>
        <div class="party-name">Livwee Pharmacy</div>
        <div class="party-detail">
          Ground Floor, Livwee Building<br/>Mumbai – 400001, Maharashtra<br/>
          GSTIN: 27AABCL1234A1Z9<br/>Drug Lic: MH-MUM-12345 | DL-67890
        </div>
      </div>
      <div class="party">
        <div class="party-label">Bill To</div>
        <div class="party-name">${inv.customer}</div>
        <div class="party-detail">
          ${inv.customerAddress !== 'N/A' ? inv.customerAddress + '<br/>' : ''}
          Phone: ${inv.customerPhone}<br/>
          ${inv.customerGST !== '—' ? 'GSTIN: ' + inv.customerGST : '(No GSTIN — B2C)'}
        </div>
      </div>
    </div>

    <div class="meta-strip">
      <div class="meta-box"><div class="ml">Invoice No</div><div class="mv">${inv.invoiceNumber}</div></div>
      <div class="meta-box"><div class="ml">Invoice Date</div><div class="mv">${inv.issuedAt}</div></div>
      <div class="meta-box"><div class="ml">Due Date</div><div class="mv">${inv.dueDate}</div></div>
      <div class="meta-box"><div class="ml">Payment</div><div class="mv">${inv.paymentMethod}</div></div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>#</th>
          <th class="desc">Product Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th>Disc.</th>
          <th>Taxable</th>
          <th>GST%</th>
          <th>CGST</th>
          <th>SGST</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="bottom">
      <div class="gst-table">
        <div class="gst-title">GST Summary</div>
        <table>
          <thead><tr><th>Rate</th><th>Taxable Amt</th><th>CGST</th><th>SGST</th><th>Total GST</th></tr></thead>
          <tbody>${gstRows}</tbody>
        </table>
      </div>
      <div class="totals-box">
        <div class="t-row"><span class="t-label">Sub Total</span><span class="t-val">₹${subTotal.toFixed(2)}</span></div>
        ${disc > 0 ? `<div class="t-row t-disc"><span class="t-label">Discount</span><span class="t-val">−₹${disc.toFixed(2)}</span></div>` : ''}
        <div class="t-row"><span class="t-label">Total GST</span><span class="t-val">₹${tax.toFixed(2)}</span></div>
        ${inv.shippingCost && inv.shippingCost > 0 ? `<div class="t-row"><span class="t-label">Delivery Fee</span><span class="t-val">₹${inv.shippingCost.toFixed(2)}</span></div>` : ''}
        <div class="t-row t-grand"><span>Grand Total</span><span>₹${grand.toFixed(2)}</span></div>
        <div class="t-row t-paid"><span class="t-label">Paid Amount</span><span class="t-val">₹${inv.paidAmount.toFixed(2)}</span></div>
        ${due > 0.01 ? `<div class="t-row t-due"><span class="t-label">Balance Due</span><span class="t-val">₹${due.toFixed(2)}</span></div>` : ''}
      </div>
    </div>

    <div class="words"><strong>Amount in Words:</strong> ${toWords(grand)} (₹${grand.toFixed(2)})</div>

    ${inv.notes ? `<div class="note"><strong>Note:</strong> ${inv.notes}</div>` : ''}

    <div class="footer">
      This is a system-generated tax invoice. No manual signature required. &nbsp;|&nbsp;
      Subject to Mumbai jurisdiction. &nbsp;|&nbsp; Livwee Pharmacy Management System
    </div>
  </div>
</div>
</body></html>`
}

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────

function InvoiceModal({ inv, onClose, onPrint, onDownload, onReceivePayment }: {
  inv: Invoice; onClose: () => void; onPrint: () => void; onDownload: () => void; onReceivePayment?: () => void
}) {
  const { subTotal, disc, tax, grand } = calcTotals(inv)
  const isFullyPaid = inv.paymentStatus === 'PAID'
  const actualPaid = isFullyPaid ? grand : Math.min(grand, inv.paidAmount || 0)
  const due = isFullyPaid ? 0 : Math.max(0, grand - actualPaid)

  const rateMap = new Map<number, { taxable: number; gst: number }>()
  for (const item of inv.items) {
    const c = calcLine(item)
    const ex = rateMap.get(item.gstRate) ?? { taxable: 0, gst: 0 }
    rateMap.set(item.gstRate, { taxable: ex.taxable + c.taxable, gst: ex.gst + c.gstAmt })
  }

  const statusMap = {
    PAID: { cls: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    PARTIAL: { cls: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40', icon: <Clock className="w-3.5 h-3.5" /> },
    UNPAID: { cls: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40', icon: <Clock className="w-3.5 h-3.5" /> },
  }
  const { cls: statusCls, icon: statusIcon } = statusMap[inv.paymentStatus]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-5xl">

        {/* Paper card */}
        <div className="bg-white dark:bg-[#16161f] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden border border-slate-200 dark:border-slate-800">

          {/* ── Header bar ── */}
          <div className="relative bg-gradient-to-br from-orbit-primary via-orbit-primary-light to-orbit-primary pl-6 sm:pl-8 pr-16 sm:pr-20 py-7">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 p-2.5 rounded-xl bg-white/15 hover:bg-white/30 border border-white/25 text-white transition-all shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              {/* Brand */}
              <div>
                <div className="text-white font-black text-3xl tracking-tight" style={{ letterSpacing: '-1px' }}>Livwee</div>
                <div className="text-white/80 text-xs mt-0.5 font-medium">Pharmacy Management System</div>
                <div className="mt-3 space-y-0.5 text-[11px] text-white/80/80 leading-relaxed">
                  <p>Ground Floor, Livwee Building, Mumbai – 400001</p>
                  <p>GSTIN: 27AABCL1234A1Z9 &nbsp;·&nbsp; +91 22 1234 5678</p>
                  <p>Drug Lic: MH-MUM-12345 / DL-67890</p>
                </div>
              </div>

              {/* Invoice identity */}
              <div className="sm:text-right">
                <div className="text-orbit-primary-light text-[9px] font-bold uppercase tracking-[3px]">Tax Invoice</div>
                <div className="text-white text-2xl font-extrabold font-mono mt-1.5 tracking-wide">{inv.invoiceNumber}</div>
                <div className="flex sm:justify-end items-center gap-3 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCls}`}>
                    {statusIcon} {inv.paymentStatus}
                  </span>
                </div>
                <div className="text-white/60 text-[11px] mt-2 space-y-0.5">
                  <p>Date: <span className="font-semibold text-white/80">{inv.issuedAt}</span></p>
                  <p>Due: <span className="font-semibold text-white/80">{inv.dueDate}</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-7 space-y-6">

            {/* ── Bill From / Bill To ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                <p className="text-[9px] font-black uppercase tracking-[2.5px] text-orbit-primary-light dark:text-orbit-primary-light mb-3">Bill From</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">Livwee Pharmacy</p>
                <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-0.5 leading-relaxed">
                  <p>Ground Floor, Livwee Building, Mumbai – 400001</p>
                  <p className="font-mono">GSTIN: 27AABCL1234A1Z9</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                <p className="text-[9px] font-black uppercase tracking-[2.5px] text-orbit-primary-light dark:text-orbit-primary-light mb-3">Bill To</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{inv.customer}</p>
                <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-0.5 leading-relaxed">
                  {inv.customerAddress !== 'N/A' && <p>{inv.customerAddress}</p>}
                  <p>{inv.customerPhone}</p>
                  {inv.customerGST !== '—'
                    ? <p className="font-mono">GSTIN: {inv.customerGST}</p>
                    : <p className="italic text-slate-400">Unregistered (B2C)</p>}
                </div>
              </div>
            </div>

            {/* ── Meta strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Invoice #', inv.invoiceNumber],
                ['Invoice Date', inv.issuedAt],
                ['Due Date', inv.dueDate],
                ['Payment Method', inv.paymentMethod],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{l}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 break-all">{v}</p>
                </div>
              ))}
            </div>

            {/* ── Line Items ── */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9)' }}>
                      {['#', 'Product / Batch', 'Qty', 'Unit', 'Unit Price', 'Disc.', 'Taxable', 'GST%', 'CGST', 'SGST', 'Total'].map((h, i) => (
                        <th key={h} className="px-3 py-3.5 text-white font-bold text-[9.5px] uppercase tracking-wide whitespace-nowrap" style={{ textAlign: i === 0 || i === 1 ? 'left' : 'right' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item, i) => {
                      const c = calcLine(item)
                      return (
                        <tr key={item.id} className={`border-b border-slate-100 dark:border-slate-800 ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}`}>
                          <td className="px-3 py-3 text-slate-400 dark:text-slate-500 font-semibold text-xs text-left">{i + 1}</td>
                          <td className="px-3 py-3 text-left">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.product}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">HSN: {item.hsn}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-orbit-primary/5 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light border border-orbit-primary/20/70 dark:border-orbit-primary/20">{item.batch}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">{item.qty}</td>
                          <td className="px-3 py-3 text-right text-[11px] text-slate-500 dark:text-slate-400">{item.unit}</td>
                          <td className="px-3 py-3 text-right font-mono text-slate-700 dark:text-slate-300">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right">
                            {item.discount > 0 ? (
                              <div>
                                <span className="font-bold text-rose-500 dark:text-rose-400">{item.discount}%</span>
                                <span className="block text-[10px] font-mono text-rose-400/70">−₹{c.discAmt.toFixed(2)}</span>
                              </div>
                            ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-600 dark:text-slate-400">₹{c.taxable.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20">{item.gstRate}%</span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">₹{(c.gstAmt / 2).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">₹{(c.gstAmt / 2).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-slate-100">₹{c.total.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── GST Summary + Amount Totals ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GST breakdown */}
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[9px] font-black uppercase tracking-[2.5px] text-slate-400">GST Breakup</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500">
                      {['Rate', 'Taxable', 'CGST', 'SGST', 'Total GST'].map((h, i) => (
                        <th key={h} className="px-4 py-2 font-bold text-[9px] uppercase tracking-wide" style={{ textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(rateMap.entries()).map(([rate, v]) => (
                      <tr key={rate} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-2.5 font-bold text-orbit-primary-light dark:text-orbit-primary-light">{rate}%</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">₹{v.taxable.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">₹{(v.gst / 2).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">₹{(v.gst / 2).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">₹{v.gst.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Amount summary */}
              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 flex flex-col justify-between">
                <p className="text-[9px] font-black uppercase tracking-[2.5px] text-slate-400 mb-3">Amount Summary</p>
                <div className="space-y-2 flex-1">
                  {[
                    { label: 'Sub Total', val: `₹${subTotal.toFixed(2)}`, cls: 'text-slate-600 dark:text-slate-400' },
                    ...(disc > 0 ? [{ label: 'Total Discount', val: `−₹${disc.toFixed(2)}`, cls: 'text-rose-500 dark:text-rose-400' }] : []),
                    { label: 'Total GST (CGST+SGST)', val: `₹${tax.toFixed(2)}`, cls: 'text-slate-600 dark:text-slate-400' },
                    ...(inv.shippingCost && inv.shippingCost > 0 ? [{ label: 'Delivery / Home Delivery Fee', val: `+₹${inv.shippingCost.toFixed(2)}`, cls: 'text-orbit-primary-light dark:text-orbit-primary-light font-bold' }] : []),
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{r.label}</span>
                      <span className={`font-mono font-semibold ${r.cls}`}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t-2 border-orbit-primary/20 dark:border-orbit-primary/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">Grand Total</span>
                    <span className="font-black text-xl text-orbit-primary-light dark:text-orbit-primary-light font-mono">₹{grand.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Paid</span>
                    <span className="font-mono">₹{inv.paidAmount.toFixed(2)}</span>
                  </div>
                  {due > 0.01 && (
                    <div className="flex justify-between text-sm font-bold text-rose-600 dark:text-rose-400">
                      <span>Balance Due</span>
                      <span className="font-mono">₹{due.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Amount in words ── */}
            <div className="bg-orbit-primary/5 dark:bg-orbit-primary/50/5 border border-orbit-primary/15 dark:border-orbit-primary/20 rounded-xl px-5 py-3.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-orbit-primary-light dark:text-orbit-primary-light">Amount in Words: </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{toWords(grand)}</span>
            </div>

            {/* ── Notes ── */}
            {inv.notes && (
              <div className="border-l-4 border-orbit-primary bg-orbit-primary/5/50 dark:bg-orbit-primary/50/5 pl-4 pr-5 py-3.5 rounded-r-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-orbit-primary-light dark:text-orbit-primary-light mb-1">Note</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{inv.notes}</p>
              </div>
            )}

            {/* Payment Receipts History */}
            {getReceiptsForInvoice(inv.invoiceNumber).length > 0 && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] tracking-wider flex items-center justify-between">
                  <span>Payment Receipt Vouchers Issued</span>
                  <span>({getReceiptsForInvoice(inv.invoiceNumber).length} Receipts)</span>
                </p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {getReceiptsForInvoice(inv.invoiceNumber).map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-white dark:bg-orbit-surface p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.receiptNumber}</span>
                        <span className="text-slate-400 text-[10px] ml-2 font-sans">{r.timestamp} • {r.paymentMethod}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">₹{r.amountCollected.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <div>
                <p className="font-medium text-slate-600 dark:text-slate-400">Computer-generated invoice — no signature required.</p>
                <p>Subject to Mumbai jurisdiction. E.&O.E.</p>
              </div>
            </div>

            {/* ── Action bar ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/60">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Livwee Pharmacy Management System · {inv.invoiceNumber}</p>
              <div className="flex items-center gap-2">
                {due > 0.01 && onReceivePayment && (
                  <Button
                    size="sm"
                    onClick={onReceivePayment}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-lg shadow-emerald-600/30 font-semibold"
                  >
                    <IndianRupee className="w-3.5 h-3.5" /> Receive Payment (₹{due.toFixed(2)})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">Close</Button>
                <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
                <Button size="sm" onClick={onDownload} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 shadow-lg shadow-orbit-primary/30">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  // Invoices List state
  const [invoicesList, setInvoicesList] = useState<Invoice[]>(seed)

  useEffect(() => {
    invoiceService.fetchInvoices().then(res => {
      if (res && res.data && res.data.length > 0) {
        const fetched: Invoice[] = res.data.map((inv: any) => {
          const gTotal = inv.total_amount || 0
          const pAmount = inv.paid_amount !== undefined ? inv.paid_amount : (inv.payment_status === 'PAID' ? gTotal : 0)
          const calcDiscPercent = inv.discount && inv.subtotal ? Math.round((inv.discount / inv.subtotal) * 100) : 0
          const issuedDate = inv.issuedAt || (inv.createdAt ? inv.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10))
          const computedGstRate = inv.subtotal && inv.tax ? Math.round((inv.tax / inv.subtotal) * 100) : 12

          return {
            id: inv._id || inv.id,
            invoiceNumber: inv.order_number || inv.invoiceNumber,
            customer: inv.customer_name || inv.customer || 'Walk-in Customer',
            customerAddress: inv.shipping_address ? `${inv.shipping_address.address_line}, ${inv.shipping_address.city}` : 'N/A',
            customerGST: '—',
            customerPhone: '+91 98765 43210',
            paymentMethod: inv.payment_method || 'Cash',
            paymentStatus: inv.payment_status === 'PAID' ? 'PAID' : (inv.payment_status === 'PARTIAL' ? 'PARTIAL' : 'UNPAID'),
            issuedAt: issuedDate,
            dueDate: issuedDate,
            paidAmount: pAmount,
            shippingCost: inv.shipping_cost || 0,
            notes: inv.notes || '',
            items: (inv.items || []).map((item: any, idx: number) => ({
              id: String(idx + 1),
              product: item.product_id?.name || item.product || 'Item ' + (idx + 1),
              hsn: '30049099',
              batch: item.batch || 'BAT-2026-001',
              qty: item.qty || 1,
              unit: item.unit || 'Pcs',
              unitPrice: Number(item.unit_price || item.product_id?.price || 0),
              discount: item.discount !== undefined ? item.discount : calcDiscPercent,
              gstRate: item.gstRate !== undefined ? item.gstRate : computedGstRate
            }))
          }
        })
        setInvoicesList(fetched)
      }
    }).catch(err => console.warn('Could not fetch backend invoices:', err))
  }, [])

  // Receive Payment Modal state
  const [payModalInvoice, setPayModalInvoice] = useState<Invoice | null>(null)
  const [payAmountInput, setPayAmountInput] = useState<number>(0)
  const [payMethodInput, setPayMethodInput] = useState<string>('Cash')
  const [payRefInput, setPayRefInput] = useState<string>('')

  const [settlementReceiptModal, setSettlementReceiptModal] = useState<{
    receiptNumber: string
    invoiceNumber: string
    customer: string
    customerPhone?: string
    amountCollected: number
    paymentMethod: string
    timestamp: string
    remainingDue?: number
    notes?: string
  } | null>(null)

  const allInvoices = useMemo(() => {
    return invoicesList
  }, [invoicesList])

  const filtered = allInvoices.filter(inv => {
    if (startDate && inv.issuedAt < startDate) return false
    if (endDate && inv.issuedAt > endDate) return false
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [filtered, currentPage, pageSize])

  const handleOpenReceivePayment = (inv: Invoice) => {
    const { grand } = calcTotals(inv)
    const due = grand - inv.paidAmount
    setPayModalInvoice(inv)
    setPayAmountInput(Math.max(0, parseFloat(due.toFixed(2))))
    setPayMethodInput('Cash')
    setPayRefInput(`REC-2026-${Math.floor(100 + Math.random() * 900)}`)
  }

  const handleConfirmReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payModalInvoice) return

    const { grand } = calcTotals(payModalInvoice)
    const collected = Math.max(0, Number(payAmountInput) || 0)
    if (collected <= 0) {
      showToast('Please enter a valid payment amount greater than 0', 'error')
      return
    }

    const newPaidTotal = payModalInvoice.paidAmount + collected
    const newStatus: 'PAID' | 'PARTIAL' = newPaidTotal >= grand - 0.01 ? 'PAID' : 'PARTIAL'

    let realReceiptNumber = payRefInput

    try {
      const res = await invoiceService.receivePayment(payModalInvoice.invoiceNumber, collected, payMethodInput, payRefInput)
      if (res && res.data && (res.data.receipt?.receipt_number || res.data.receipt_number)) {
        realReceiptNumber = res.data.receipt?.receipt_number || res.data.receipt_number
      }
    } catch (err) {
      console.warn('Backend payment record warning:', err)
    }

    setInvoicesList(prev =>
      prev.map(i => {
        if (i.id === payModalInvoice.id || i.invoiceNumber === payModalInvoice.invoiceNumber) {
          return {
            ...i,
            paidAmount: newPaidTotal,
            paymentStatus: newStatus
          }
        }
        return i
      })
    )

    const posIdx = RECENT_POS_INVOICES.findIndex(i => i.invoiceNumber === payModalInvoice.invoiceNumber)
    if (posIdx !== -1) {
      RECENT_POS_INVOICES[posIdx].paidAmount = newPaidTotal
      RECENT_POS_INVOICES[posIdx].paymentStatus = newStatus
    }

    const receiptObj = {
      receiptNumber: realReceiptNumber || payRefInput || `REC-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: payModalInvoice.invoiceNumber,
      customer: payModalInvoice.customer,
      customerPhone: payModalInvoice.customerPhone,
      amountCollected: collected,
      paymentMethod: payMethodInput,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      remainingDue: Math.max(0, grand - newPaidTotal),
      notes: `Balance payment recorded via ${payMethodInput}`
    }

    addPaymentReceiptRecord({
      id: Date.now().toString(),
      receiptNumber: receiptObj.receiptNumber,
      invoiceNumber: receiptObj.invoiceNumber,
      customer: receiptObj.customer,
      amountCollected: collected,
      paymentMethod: payMethodInput,
      timestamp: receiptObj.timestamp,
      notes: receiptObj.notes
    })

    showToast(
      `Received ₹${collected.toLocaleString('en-IN')} for ${payModalInvoice.invoiceNumber}! Status updated to ${newStatus}. Receipt Ref: ${receiptObj.receiptNumber}`,
      'success',
      'Payment Received'
    )
    setPayModalInvoice(null)
    setSettlementReceiptModal(receiptObj)

    if (viewInvoice && viewInvoice.invoiceNumber === payModalInvoice.invoiceNumber) {
      setViewInvoice({
        ...viewInvoice,
        paidAmount: newPaidTotal,
        paymentStatus: newStatus
      })
    }
  }

  const handlePrint = (inv: Invoice) => {
    const w = window.open('', '_blank')
    if (w) { w.document.write(buildPrintHTML(inv)); w.document.close(); setTimeout(() => w.print(), 600) }
    showToast('Opening print preview…', 'info')
  }

  const handleDownload = async (inv: Invoice) => {
    showToast(`Generating 1-page PDF for ${inv.invoiceNumber}…`, 'info')
    await downloadInvoicePDF(buildPrintHTML(inv), `${inv.invoiceNumber}.pdf`)
    showToast(`${inv.invoiceNumber}.pdf downloaded successfully!`, 'success')
  }

  const kpiMetrics = useMemo(() => {
    let totalInvoiced = 0
    let totalCollected = 0
    let totalDue = 0
    const activeCustomers = new Set<string>()

    allInvoices.forEach(inv => {
      const { grand } = calcTotals(inv)
      const isFullyPaid = inv.paymentStatus === 'PAID'
      const actualPaid = isFullyPaid ? grand : Math.min(grand, inv.paidAmount || 0)
      const due = isFullyPaid ? 0 : Math.max(0, grand - actualPaid)

      totalInvoiced += grand
      totalCollected += actualPaid
      totalDue += due
      if (due > 0 && inv.customer && inv.customer !== 'Walk-in Customer') {
        activeCustomers.add(inv.customer)
      }
    })

    return {
      totalInvoiced,
      totalCollected,
      totalDue,
      activeAccounts: activeCustomers.size
    }
  }, [allInvoices])

  const statusMap: Record<string, string> = {
    PAID: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25',
    PARTIAL: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25',
    UNPAID: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/25',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tax Invoices &amp; Billing</h1>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-orbit-primary/10 text-orbit-primary hover:bg-orbit-primary/20 dark:bg-orbit-primary/20 dark:text-orbit-primary-light transition-all border border-orbit-primary/30 shadow-sm"
              title="How to manage Invoices & Billing"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Invoices Guide</span>
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            B2B Credit &amp; GST Tax Invoices, accounts receivable, balance due tracking, and formal billing
          </p>
        </div>
      </div>

      {/* B2B Billing KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total Invoiced</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ₹{kpiMetrics.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Amount Collected</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ₹{kpiMetrics.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Balance Due</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              ₹{kpiMetrics.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Credit Accounts</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {kpiMetrics.activeAccounts} Active
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
            placeholder="Search invoice or customer..."
            prefix={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Date Range Inputs & Clear Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-orbit-primary-light" />
            <span>Invoice Date:</span>
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

      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[780px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 uppercase text-[10.5px] font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Taxable</th>
                <th className="px-6 py-4">GST</th>
                <th className="px-6 py-4">Grand Total</th>
                <th className="px-6 py-4">Paid / Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {filtered.length > 0 ? (
                paginated.map(inv => {
                const { subTotal, disc, tax, grand } = calcTotals(inv)
                const taxable = subTotal - disc
                const isFullyPaid = inv.paymentStatus === 'PAID'
                const actualPaid = isFullyPaid ? grand : Math.min(grand, inv.paidAmount || 0)
                const due = isFullyPaid ? 0 : Math.max(0, grand - actualPaid)
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{inv.customer}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{inv.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">{inv.items.length} items</td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400 text-xs">₹{taxable.toFixed(2)}</td>
                    <td className="px-6 py-4 font-mono text-blue-600 dark:text-blue-400 text-xs">₹{tax.toFixed(2)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">₹{grand.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">✓ ₹{actualPaid.toFixed(2)}</span>
                      {due > 0.01 && <span className="text-rose-600 dark:text-rose-400 font-semibold block">• ₹{due.toFixed(2)} due</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMap[inv.paymentStatus]}`}>
                        {inv.paymentStatus === 'PAID' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {due > 0.01 && (
                          <button
                            title="Receive Payment / Settle Balance"
                            onClick={() => handleOpenReceivePayment(inv)}
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          >
                            <IndianRupee className="w-4 h-4" />
                          </button>
                        )}
                        <button title="View Invoice" onClick={() => setViewInvoice(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-orbit-primary-light dark:hover:text-orbit-primary-light hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button title="Print" onClick={() => handlePrint(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button title="Download" onClick={() => handleDownload(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No Invoices Found"
                  description="No tax invoices match your search or date filter. Perform a checkout in POS Terminal to generate invoices."
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

      {viewInvoice && (
        <InvoiceModal
          inv={viewInvoice}
          onClose={() => setViewInvoice(null)}
          onPrint={() => handlePrint(viewInvoice)}
          onDownload={() => handleDownload(viewInvoice)}
          onReceivePayment={() => {
            const currentInv = viewInvoice
            setViewInvoice(null)
            handleOpenReceivePayment(currentInv)
          }}
        />
      )}

      {payModalInvoice && (
        <Modal
          isOpen={!!payModalInvoice}
          onClose={() => setPayModalInvoice(null)}
          title={`Receive Payment — ${payModalInvoice.invoiceNumber}`}
          subtitle={`Customer: ${payModalInvoice.customer}`}
          size="md"
        >
          <form onSubmit={handleConfirmReceivePayment} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-orbit-border space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Grand Total:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">₹{calcTotals(payModalInvoice).grand.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount Paid So Far:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">₹{payModalInvoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-orbit-border font-bold text-xs">
                <span className="text-rose-600 dark:text-rose-400">Current Balance Due:</span>
                <span className="text-rose-600 dark:text-rose-400 font-mono">₹{(calcTotals(payModalInvoice).grand - payModalInvoice.paidAmount).toFixed(2)}</span>
              </div>
            </div>

            <Input
              label="Payment Amount Received Today (₹)"
              type="number"
              step="0.01"
              value={payAmountInput}
              onChange={e => setPayAmountInput(parseFloat(e.target.value) || 0)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={payMethodInput}
                onChange={e => setPayMethodInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
              </select>
            </div>

            <Input
              label="Payment Receipt / Reference #"
              value={payRefInput}
              onChange={e => setPayRefInput(e.target.value)}
              placeholder="e.g. REC-2026-088"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-orbit-border">
              <Button type="button" variant="outline" onClick={() => setPayModalInvoice(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-semibold shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-4 h-4" /> Record Payment &amp; Settle
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* How to Use Invoices & Billing Step-by-Step Guide Modal */}
      <Modal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="How to Use Tax Invoices & Sales Billing Guide"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 border border-orbit-primary/20 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-orbit-primary shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Tax Invoices & Billing Workflow</p>
              Follow these simple steps to issue GST tax invoices, manage customer credit & accounts receivable, record customer payments, and print thermal or PDF tax receipts.
            </div>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Generating Invoices from POS or B2B Sales</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setIsGuideOpen(false); navigate('/billing') }} className="text-xs gap-1.5 text-orbit-primary hover:text-orbit-primary">
                  Go to POS Billing <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Invoices are generated automatically when completing sales at the POS terminal or by creating B2B credit orders. Ensure products have valid HSN codes and tax rates assigned.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Tracking Outstanding Credit & Balance Due</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Filter & Status</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Use the payment status filter tabs (<span className="font-medium text-amber-600">PARTIAL</span>, <span className="font-medium text-rose-600">UNPAID</span>) to monitor overdue client balances and upcoming payment due dates.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Recording Payments & Customer Receipts</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Actions Menu</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                Click the <span className="font-medium text-emerald-600 font-mono">₹ Record Payment</span> button on any partial or unpaid invoice to log incoming Cash, UPI, or Bank transfers and update balance due instantly.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-orbit-surface/50 border border-slate-200 dark:border-orbit-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orbit-primary text-white text-xs font-bold flex items-center justify-center">4</span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Printing & Exporting Tax Invoices</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">PDF & Print</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                View detailed invoice break-ups showing CGST, SGST, IGST, and itemized batch numbers. Use the built-in Print or Download PDF tools for formal client delivery.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsGuideOpen(false)} className="bg-orbit-primary text-white font-semibold">
              Got It, Thanks!
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Settlement Receipt Voucher Modal ── */}
      {settlementReceiptModal && (
        <Modal
          isOpen={!!settlementReceiptModal}
          onClose={() => setSettlementReceiptModal(null)}
          size="lg"
          title={`Payment Receipt Voucher: ${settlementReceiptModal.receiptNumber}`}
          subtitle={`Official proof of payment for ${settlementReceiptModal.customer} against Invoice ${settlementReceiptModal.invoiceNumber}`}
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Amount Collected &amp; Paid</span>
              <span className="font-mono font-black text-3xl text-emerald-600 dark:text-emerald-400 block my-1">
                ₹{settlementReceiptModal.amountCollected.toFixed(2)}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Payment Method: <strong>{settlementReceiptModal.paymentMethod}</strong> • {settlementReceiptModal.timestamp}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">CUSTOMER</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{settlementReceiptModal.customer}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">INVOICE REF</span>
                <span className="font-mono font-bold text-orbit-primary-light">{settlementReceiptModal.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">REMAINING DUE</span>
                <span className={`font-mono font-bold ${(settlementReceiptModal.remainingDue || 0) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{(settlementReceiptModal.remainingDue || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">SETTLEMENT STATUS</span>
                <span className={`font-bold ${(settlementReceiptModal.remainingDue || 0) > 0.01 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(settlementReceiptModal.remainingDue || 0) > 0.01 ? 'PARTIAL SETTLEMENT' : 'FULLY SETTLED'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const html = buildPaymentReceiptVoucherHTML(settlementReceiptModal)
                  const w = window.open('', '_blank')
                  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600) }
                }}
                className="gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const html = buildPaymentReceiptVoucherHTML(settlementReceiptModal)
                  await downloadInvoicePDF(html, `${settlementReceiptModal.receiptNumber}.pdf`)
                  showToast(`Receipt ${settlementReceiptModal.receiptNumber}.pdf downloaded!`, 'success')
                }}
                className="bg-orbit-primary text-white gap-1.5"
              >
                <Download className="w-4 h-4" /> Download PDF Receipt
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSettlementReceiptModal(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
