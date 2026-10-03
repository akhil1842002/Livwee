import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, IndianRupee, RotateCcw,
  AlertCircle, ShoppingBag, ArrowUpRight,
  AlertTriangle, Users, Building2,
  FileText, CheckCircle2, RefreshCw, Clock, Truck,
  Calendar, Filter, Sparkles, ChevronDown, X, Check
} from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'
import { dashboardService, DashboardFilterParams } from '@/services/dashboardService'
import { downloadInvoicePDF } from '@/utils/pdfGenerator'
import { getAllInvoices, calcInvoiceGrandTotal } from '@/data/sharedData'

const DATE_PRESETS = [
  { id: 'today', label: 'Today', icon: '⚡' },
  { id: 'yesterday', label: 'Yesterday', icon: '🌅' },
  { id: '7d', label: 'Last 7 Days', icon: '🗓️' },
  { id: '30d', label: 'Last 30 Days', icon: '📅' },
  { id: 'this_month', label: 'This Month', icon: '📊' },
  { id: 'last_month', label: 'Last Month', icon: '📑' },
  { id: 'all', label: 'All Time', icon: '♾️' },
  { id: 'custom', label: 'Custom Range', icon: '✏️' },
] as const

function getTodayIso(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CustomChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-3 shadow-lg text-xs space-y-1.5 z-50">
      <p className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-orbit-border pb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600 dark:text-slate-400 capitalize">{p.name}:</span>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            ₹{(p.value || 0).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

function buildPaymentReportHTML(data: {
  dateLabel: string
  totalRev: number
  walkIn: { amount: number; count: number; percent: number }
  hospital: { amount: number; count: number; percent: number }
  distributor: { amount: number; count: number; percent: number }
  paymentModes: { cash: number; upi: number; card: number; credit: number }
  invoices: any[]
}): string {
  const invRows = (data.invoices || []).slice(0, 30).map((inv: any, i: number) => `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td style="text-align:center;padding:6px;border-bottom:1px solid #f1f5f9;color:#64748b;">${i + 1}</td>
      <td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:700;">${inv.invoiceNumber || inv.orderNumber || inv.id}</td>
      <td style="padding:6px;border-bottom:1px solid #f1f5f9;">${inv.customer || inv.customerName}</td>
      <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:center;">${inv.paymentMethod || 'CASH'}</td>
      <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:center;">
        <span style="padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;${inv.paymentStatus === 'PAID' ? 'background:#dcfce7;color:#15803d;' : 'background:#fef3c7;color:#b45309;'}">
          ${inv.paymentStatus || 'PAID'}
        </span>
      </td>
      <td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;">₹${(inv.amount || inv.total_amount || 0).toFixed(2)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Payment & Revenue Collection Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 8mm 10mm; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;font-size:10.5px;color:#1e293b;background:#fff;padding:12px}
    .page{max-width:800px;margin:0 auto;background:#fff;}
    .top-bar{background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px 22px;display:flex;justify-content:space-between;align-items:center;color:#fff;border-radius:10px;margin-bottom:14px}
    .brand{font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#38bdf8}
    .brand-tag{font-size:10px;color:#94a3b8;margin-top:2px}
    .rep-right{text-align:right}
    .rep-label{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;font-weight:700}
    .rep-date{font-size:11px;color:#f8fafc;font-weight:700;margin-top:2px}
    .sec-head{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;margin:14px 0 6px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;display:flex;justify-content:space-between}
    .grid-3{display:flex;margin-bottom:12px}
    .grid-3 > div{flex:1;min-width:0;margin-right:10px}
    .grid-3 > div:last-child{margin-right:0}
    .grid-4{display:flex;margin-bottom:12px}
    .grid-4 > div{flex:1;min-width:0;margin-right:10px}
    .grid-4 > div:last-child{margin-right:0}
    .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
    .c-label{font-size:8.5px;font-weight:700;text-transform:uppercase;color:#64748b}
    .c-val{font-size:15px;font-weight:800;color:#0f172a;margin-top:2px}
    .c-sub{font-size:9px;color:#64748b;margin-top:1px}
    table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10px}
    thead tr{background:#0f172a;color:#fff}
    th{padding:7px 8px;text-align:left;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
    tbody tr{border-bottom:1px solid #f1f5f9}
    tbody tr.even{background:#fafbff}
    .footer{text-align:center;font-size:9px;color:#94a3b8;padding-top:12px;border-top:1px solid #e2e8f0;margin-top:14px;display:flex;justify-content:space-between}
    @media print{
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html, body{width:210mm;height:297mm;background:#fff;padding:0;margin:0}
      .page{width:100%;padding:4mm 6mm}
    }
  </style>
</head>
<body>
<div class="page">
  <div class="top-bar">
    <div>
      <div class="brand">Livwee Pharmacy & Medical Store</div>
      <div class="brand-tag">Daily Payment & Revenue Collection Audit Report</div>
    </div>
    <div class="rep-right">
      <div class="rep-label">REPORT PERIOD</div>
      <div class="rep-date">${data.dateLabel}</div>
      <div style="font-size:9px;color:#cbd5e1;margin-top:2px;">Generated: ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="sec-head">
    <span>1. Revenue Collection by Customer Entity</span>
    <span>Total Period Revenue: ₹${data.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  </div>
  <div class="grid-3">
    <div class="card">
      <div class="c-label">🚶 Walk-in Customers</div>
      <div class="c-val">₹${data.walkIn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      <div class="c-sub">${data.walkIn.count} orders (${data.walkIn.percent}% of total)</div>
    </div>
    <div class="card">
      <div class="c-label">🏥 Hospital & Doctor</div>
      <div class="c-val">₹${data.hospital.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      <div class="c-sub">${data.hospital.count} orders (${data.hospital.percent}% of total)</div>
    </div>
    <div class="card">
      <div class="c-label">🚚 Distributors</div>
      <div class="c-val">₹${data.distributor.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      <div class="c-sub">${data.distributor.count} orders (${data.distributor.percent}% of total)</div>
    </div>
  </div>

  <div class="sec-head">
    <span>2. Revenue Collection by Payment Method</span>
  </div>
  <div class="grid-4">
    <div class="card" style="border-left:3px solid #7c3aed;">
      <div class="c-label">💵 Cash POS</div>
      <div class="c-val">₹${data.paymentModes.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card" style="border-left:3px solid #10b981;">
      <div class="c-label">📱 UPI / QR Code</div>
      <div class="c-val">₹${data.paymentModes.upi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card" style="border-left:3px solid #06b6d4;">
      <div class="c-label">💳 Cards</div>
      <div class="c-val">₹${data.paymentModes.card.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card" style="border-left:3px solid #ef4444;">
      <div class="c-label">📜 On Credit (Due)</div>
      <div class="c-val" style="color:#dc2626;">₹${data.paymentModes.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
  </div>

  <div class="sec-head">
    <span>3. Payment Transaction Ledger</span>
    <span>Recent Recorded Invoices</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">#</th>
        <th>Invoice #</th>
        <th>Customer Name / Entity</th>
        <th style="text-align:center;">Mode</th>
        <th style="text-align:center;">Status</th>
        <th style="text-align:right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${invRows.length > 0 ? invRows : '<tr><td colspan="6" style="text-align:center;padding:12px;color:#94a3b8;">No invoices recorded for this period.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <span>Livwee Pharmacy Audit & Operations System</span>
    <span>Computer Generated Financial Audit Report</span>
    <span>Authorised Signatory: __________________</span>
  </div>
</div>
</body>
</html>`
}

export function DashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // Date Filter State — Default is TODAY
  const [preset, setPreset] = useState<string>('today')
  const [startDate, setStartDate] = useState<string>(getTodayIso())
  const [endDate, setEndDate] = useState<string>(getTodayIso())

  // Custom Date Range Picker state
  const [customStart, setCustomStart] = useState<string>(getTodayIso())
  const [customEnd, setCustomEnd] = useState<string>(getTodayIso())
  const [showCustomPopover, setShowCustomPopover] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)

  const [apiMetrics, setApiMetrics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  const loadMetrics = async (p = preset, sDate = startDate, eDate = endDate) => {
    try {
      setIsLoading(true)
      const filterParams: DashboardFilterParams = {
        preset: p,
        startDate: p === 'custom' ? sDate : undefined,
        endDate: p === 'custom' ? eDate : undefined,
      }
      const res = await dashboardService.fetchMetrics(filterParams)
      if (res) {
        setApiMetrics(res)
      }
    } catch (err) {
      console.warn('Could not fetch backend dashboard metrics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics(preset, startDate, endDate)
  }, [preset, startDate, endDate])

  // Close custom popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowCustomPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePresetSelect = (presetId: string) => {
    if (presetId === 'custom') {
      setShowCustomPopover(!showCustomPopover)
    } else {
      setShowCustomPopover(false)
      setPreset(presetId)
    }
  }

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) {
      showToast('Please select valid start and end dates', 'error', 'Invalid Date Range')
      return
    }
    if (new Date(customStart) > new Date(customEnd)) {
      showToast('Start date cannot be after end date', 'error', 'Invalid Date Range')
      return
    }
    setStartDate(customStart)
    setEndDate(customEnd)
    setPreset('custom')
    setShowCustomPopover(false)
    showToast(`Filtered metrics from ${formatDateDisplay(customStart)} to ${formatDateDisplay(customEnd)}`, 'success', 'Date Filter Applied')
  }

  const handleResetToToday = () => {
    const todayStr = getTodayIso()
    setPreset('today')
    setStartDate(todayStr)
    setEndDate(todayStr)
    setCustomStart(todayStr)
    setCustomEnd(todayStr)
    setShowCustomPopover(false)
  }

  const monthlyTrend = apiMetrics?.monthlyTrend || []
  const paymentMethodData = (apiMetrics?.paymentMethods || []).filter((pm: any) => pm.value > 0)
  const recentReturnsSummary = apiMetrics?.returns?.list || []
  const recentInvoicesList = apiMetrics?.orders?.list || []
  const recentPurchaseOrders = apiMetrics?.purchases?.list || []
  const activityFeed = apiMetrics?.activityFeed || []

  const activeFilterInfo = apiMetrics?.filter || {
    preset,
    startDate,
    endDate,
    label: preset === 'today' ? 'Today' : `${startDate} to ${endDate}`
  }

  const totalRevenue = apiMetrics?.revenue?.total ?? 0
  const allTimeRevenue = apiMetrics?.revenue?.allTime ?? totalRevenue
  const todayRevenue = apiMetrics?.revenue?.today ?? 0
  const totalRefundsValue = apiMetrics?.revenue?.refunds ?? 0
  const totalOrders = apiMetrics?.orders?.total ?? 0
  const lowStockCount = apiMetrics?.inventory?.lowStockCount ?? 0
  const outOfStockCount = apiMetrics?.inventory?.outOfStockCount ?? 0
  const nearExpiryBatchesCount = apiMetrics?.inventory?.nearExpiryBatchesCount ?? 0
  const totalCustomersCount = apiMetrics?.customers?.total ?? 0

  const totalPurchasesSpend = apiMetrics?.purchases?.totalSpend ?? 0
  const completedPurchasesCount = apiMetrics?.purchases?.completedCount ?? 0
  const totalPurchasesCount = apiMetrics?.purchases?.totalCount ?? 0
  const supplierPayables = apiMetrics?.purchases?.supplierPayables ?? 0

  const now = new Date()
  const greeting =
    now.getHours() < 12 ? 'Good morning' :
      now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const handleExportSummary = () => {
    showToast(`Dashboard summary report exported for ${activeFilterInfo.label} (CSV)`, 'success', 'Report Exported')
  }

  const activePresetLabel = DATE_PRESETS.find(p => p.id === preset)?.label || 'Today'

  const categoryData = useMemo(() => {
    let walkIn = apiMetrics?.categoryBreakdown?.walkIn?.revenue || 0
    let walkInCount = apiMetrics?.categoryBreakdown?.walkIn?.count || 0
    let walkInPay = apiMetrics?.categoryBreakdown?.walkIn?.payments || { cash: 0, upi: 0, card: 0, credit: 0 }

    let hospital = apiMetrics?.categoryBreakdown?.hospital?.revenue || 0
    let hospitalCount = apiMetrics?.categoryBreakdown?.hospital?.count || 0
    let hospitalPay = apiMetrics?.categoryBreakdown?.hospital?.payments || { cash: 0, upi: 0, card: 0, credit: 0 }

    let distributor = apiMetrics?.categoryBreakdown?.distributor?.revenue || 0
    let distributorCount = apiMetrics?.categoryBreakdown?.distributor?.count || 0
    let distributorPay = apiMetrics?.categoryBreakdown?.distributor?.payments || { cash: 0, upi: 0, card: 0, credit: 0 }

    const allLocalInvoices = getAllInvoices()
    if (allLocalInvoices.length > 0 && (!walkIn && !hospital && !distributor)) {
      walkInPay = { cash: 0, upi: 0, card: 0, credit: 0 }
      hospitalPay = { cash: 0, upi: 0, card: 0, credit: 0 }
      distributorPay = { cash: 0, upi: 0, card: 0, credit: 0 }

      allLocalInvoices.forEach(inv => {
        const amt = calcInvoiceGrandTotal(inv)
        const pm = (inv.paymentMethod || 'CASH').toUpperCase()
        const cName = inv.customer.toLowerCase()

        let paid = inv.paidAmount || 0
        let due = Math.max(0, amt - paid)

        let targetPay: { cash: number; upi: number; card: number; credit: number }

        if (cName.includes('hospital') || cName.includes('doctor') || cName.includes('dr.') || cName.includes('clinic')) {
          hospital += amt
          hospitalCount += 1
          targetPay = hospitalPay
        } else if (cName.includes('distributor') || cName.includes('pharma') || cName.includes('agency')) {
          distributor += amt
          distributorCount += 1
          targetPay = distributorPay
        } else {
          walkIn += amt
          walkInCount += 1
          targetPay = walkInPay
        }

        if (pm === 'UPI') targetPay.upi += paid
        else if (pm === 'CARD') targetPay.card += paid
        else if (pm === 'CREDIT') targetPay.credit += (due + paid)
        else targetPay.cash += paid

        if (pm !== 'CREDIT' && due > 0) {
          targetPay.credit += due
        }
      })
    }

    const totalCatRev = (walkIn + hospital + distributor) || 1
    return {
      walkIn: { amount: walkIn, count: walkInCount, percent: Math.round((walkIn / totalCatRev) * 100), payments: walkInPay },
      hospital: { amount: hospital, count: hospitalCount, percent: Math.round((hospital / totalCatRev) * 100), payments: hospitalPay },
      distributor: { amount: distributor, count: distributorCount, percent: Math.round((distributor / totalCatRev) * 100), payments: distributorPay },
      total: walkIn + hospital + distributor
    }
  }, [apiMetrics])

  const paymentBreakdownData = useMemo(() => {
    let cash = apiMetrics?.paymentBreakdown?.cash || 0
    let upi = apiMetrics?.paymentBreakdown?.upi || 0
    let card = apiMetrics?.paymentBreakdown?.card || 0
    let credit = apiMetrics?.paymentBreakdown?.credit || 0

    const allLocalInvoices = getAllInvoices()
    if (allLocalInvoices.length > 0 && (!cash && !upi && !card && !credit)) {
      allLocalInvoices.forEach(inv => {
        const amt = calcInvoiceGrandTotal(inv)
        const pm = (inv.paymentMethod || 'CASH').toUpperCase()
        if (pm === 'CASH') cash += amt
        else if (pm === 'UPI') upi += amt
        else if (pm === 'CARD') card += amt
        else if (pm === 'CREDIT' || inv.paymentStatus === 'PARTIAL' || inv.paymentStatus === 'UNPAID') {
          const paid = inv.paidAmount || 0
          const due = Math.max(0, amt - paid)
          credit += due
          if (pm === 'CASH') cash += paid
          else if (pm === 'UPI') upi += paid
          else if (pm === 'CARD') card += paid
        } else {
          cash += amt
        }
      })
    }

    const totalPay = (cash + upi + card + credit) || 1
    return {
      cash: { amount: cash, percent: Math.round((cash / totalPay) * 100) },
      upi: { amount: upi, percent: Math.round((upi / totalPay) * 100) },
      card: { amount: card, percent: Math.round((card / totalPay) * 100) },
      credit: { amount: credit, percent: Math.round((credit / totalPay) * 100) },
      total: cash + upi + card + credit
    }
  }, [apiMetrics])

  const handleDownloadPDFReport = async () => {
    try {
      showToast('Generating official Payment & Collections PDF Report...', 'info', 'Generating PDF')
      const html = buildPaymentReportHTML({
        dateLabel: activeFilterInfo.label,
        totalRev: totalRevenue,
        walkIn: categoryData.walkIn,
        hospital: categoryData.hospital,
        distributor: categoryData.distributor,
        paymentModes: {
          cash: paymentBreakdownData.cash.amount,
          upi: paymentBreakdownData.upi.amount,
          card: paymentBreakdownData.card.amount,
          credit: paymentBreakdownData.credit.amount,
        },
        invoices: recentInvoicesList.length > 0 ? recentInvoicesList : getAllInvoices()
      })
      await downloadInvoicePDF(html, `Payment-Report-${preset}-${getTodayIso()}.pdf`)
      showToast('Payment & Collections Report downloaded successfully', 'success', 'PDF Ready')
    } catch (err) {
      console.warn('PDF generation warning:', err)
      showToast('Failed to build PDF report. Please try again.', 'error')
    }
  }

  const kpisToRender = [
    {
      id: 'gross-sales',
      label: preset === 'today' ? 'Today Gross Sales' : `Sales Revenue (${activePresetLabel})`,
      value: `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      changeLabel: preset === 'today' ? `All-time: ₹${allTimeRevenue.toLocaleString('en-IN')}` : `Today: ₹${todayRevenue.toLocaleString('en-IN')}`,
      subtext: `Total billing across POS & Invoices in period`,
      icon: IndianRupee,
      color: 'emerald',
    },
    {
      id: 'purchases-spend',
      label: preset === 'today' ? 'Today Stock Spend' : `Stock Procurement (${activePresetLabel})`,
      value: `₹${totalPurchasesSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      changeLabel: `${completedPurchasesCount} of ${totalPurchasesCount} POs in period`,
      subtext: `Procurement spend in ${activePresetLabel.toLowerCase()}`,
      icon: Truck,
      color: 'accent',
    },
    {
      id: 'supplier-payables',
      label: 'Supplier Dues & Payables',
      value: `₹${supplierPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      changeLabel: 'Outstanding Vendor Dues',
      subtext: 'Unpaid purchase order balance',
      icon: Building2,
      color: 'warning',
    },
    {
      id: 'returns-refunds',
      label: preset === 'today' ? 'Today Refunds Issued' : `Returns & Refunds (${activePresetLabel})`,
      value: `₹${totalRefundsValue.toFixed(2)}`,
      changeLabel: `${recentReturnsSummary.length} return vouchers`,
      subtext: `Refunds processed in ${activePresetLabel.toLowerCase()}`,
      icon: RotateCcw,
      color: 'purple',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto">
      {/* ── Top Header & Greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-orbit-surface p-5 rounded-2xl border border-slate-200 dark:border-orbit-border shadow-sm"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {greeting}, {user?.name || 'Super Admin'}
            </h1>
            <span className="text-xl">👋</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 font-medium">
            {dateStr} &bull; Enterprise Pharmacy &amp; E-Commerce Control Center
          </p>
        </div>

        {/* Action Shortcuts Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => loadMetrics(preset, startDate, endDate)}
            variant="outline"
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} /> Refresh Data
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/pos')}
            className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 shadow-md shadow-orbit-primary/20 font-bold text-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> POS Terminal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales/returns')}
            className="gap-1.5 text-xs font-semibold hover:border-orbit-primary hover:text-orbit-primary"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orbit-primary-light" /> Returns
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/billing/invoices')}
            className="gap-1.5 text-xs font-semibold"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Invoices
          </Button>
          <Button
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 shadow-md shadow-orbit-primary/20 font-bold text-xs"
          >
            <FileText className="w-3.5 h-3.5" /> Payments Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSummary}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* ── Premium Date Range Filter Card Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl p-4 shadow-sm space-y-3 relative"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filter Bar Header & Info */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orbit-primary/10 text-orbit-primary dark:text-orbit-primary-light flex items-center justify-center shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Dashboard Date Filter
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {preset === 'today'
                    ? `Today (${formatDateDisplay(startDate)})`
                    : preset === 'custom'
                      ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
                      : activePresetLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Metrics, revenue, orders &amp; financial ledgers are dynamically computed for this date range.
              </p>
            </div>
          </div>

          {/* Quick Action Reset Button if filter is not Today */}
          {preset !== 'today' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetToToday}
              className="self-start lg:self-auto gap-1.5 text-xs font-semibold text-orbit-primary dark:text-orbit-primary-light hover:bg-orbit-primary/10 border-orbit-primary/30"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filter to Today ⚡
            </Button>
          )}
        </div>

        {/* Preset Pills & Custom Date Popover Container */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-orbit-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            {DATE_PRESETS.map((p) => {
              const isActive = preset === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150',
                    isActive
                      ? 'bg-orbit-primary text-white shadow-md shadow-orbit-primary/25 font-bold scale-[1.02]'
                      : 'bg-slate-100 dark:bg-orbit-surface2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-orbit-border hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                  {isActive && <Check className="w-3 h-3 ml-0.5 text-white stroke-[3]" />}
                </button>
              )
            })}
          </div>

          {/* Custom Date Range Popover */}
          <div className="relative" ref={popoverRef}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCustomPopover(!showCustomPopover)}
              className={cn(
                'gap-2 text-xs font-semibold border-slate-200 dark:border-orbit-border',
                preset === 'custom' && 'border-orbit-primary text-orbit-primary dark:text-orbit-primary-light bg-orbit-primary/5'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{preset === 'custom' ? `${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}` : 'Select Custom Dates'}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCustomPopover && "rotate-180")} />
            </Button>

            <AnimatePresence>
              {showCustomPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl p-4 shadow-2xl z-50 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-orbit-border pb-2.5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-orbit-primary dark:text-orbit-primary-light" />
                      <span>Custom Date Range Selection</span>
                    </div>
                    <button
                      onClick={() => setShowCustomPopover(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-orbit-surface2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Start Date (From)
                      </label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface2 text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-orbit-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        End Date (To)
                      </label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface2 text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-orbit-primary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-orbit-border">
                    <button
                      onClick={handleResetToToday}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2"
                    >
                      Reset to Today
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCustomPopover(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplyCustom}
                        className="bg-orbit-primary hover:bg-orbit-primary/90 text-white font-bold text-xs gap-1.5 shadow-md shadow-orbit-primary/20"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply Range
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Revenue Collection Breakdown by Customer Entity ── */}
      <Card>
        <CardHeader
          title={`Revenue Collections by Customer Entity (${activePresetLabel})`}
          subtitle="Detailed breakdown of sales revenue received from Walk-in retail, Hospital & Doctor accounts, and Wholesale Distributors"
          actions={
            <Button
              size="sm"
              onClick={() => setIsReportModalOpen(true)}
              className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 font-bold text-xs shadow-md shadow-orbit-primary/20"
            >
              <FileText className="w-3.5 h-3.5" /> Generate Payments Report
            </Button>
          }
        />
        <CardBody className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Walk-in Customers Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orbit-primary/10 text-orbit-primary dark:text-orbit-primary-light">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Walk-in Customers</h4>
                      <span className="text-[11px] text-slate-500 font-medium">Unregistered Retail POS Sales</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-orbit-primary/10 text-orbit-primary dark:text-orbit-primary-light">
                    {categoryData.walkIn.percent}%
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    ₹{categoryData.walkIn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-orbit-primary rounded-full" style={{ width: `${categoryData.walkIn.percent}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                    {categoryData.walkIn.count} Total Orders Processed
                  </p>
                </div>
              </div>

              {/* Small Payment Method Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[10px] mt-2">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Modes:</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold">
                  Cash: ₹{categoryData.walkIn.payments.cash.toLocaleString('en-IN')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  UPI: ₹{categoryData.walkIn.payments.upi.toLocaleString('en-IN')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-mono font-bold">
                  Card: ₹{categoryData.walkIn.payments.card.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Hospital & Doctor Card */}
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200 uppercase tracking-wider">Hospital &amp; Doctors</h4>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Medical Institutions &amp; Clinics</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {categoryData.hospital.percent}%
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    ₹{categoryData.hospital.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="w-full h-1.5 bg-blue-100 dark:bg-blue-950/80 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${categoryData.hospital.percent}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                    {categoryData.hospital.count} Account Orders Processed
                  </p>
                </div>
              </div>

              {/* Small Payment Method Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-blue-200/80 dark:border-blue-900/50 text-[10px] mt-2">
                <span className="text-blue-500/70 dark:text-blue-400/60 font-bold uppercase text-[9px]">Modes:</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold">
                  Cash: ₹{categoryData.hospital.payments.cash.toLocaleString('en-IN')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  UPI: ₹{categoryData.hospital.payments.upi.toLocaleString('en-IN')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-mono font-bold">
                  Card: ₹{categoryData.hospital.payments.card.toLocaleString('en-IN')}
                </span>
                {categoryData.hospital.payments.credit > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold">
                    Credit: ₹{categoryData.hospital.payments.credit.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Distributor Card */}
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Distributors</h4>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Wholesale Stock Suppliers</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    {categoryData.distributor.percent}%
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    ₹{categoryData.distributor.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="w-full h-1.5 bg-amber-100 dark:bg-amber-950/80 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${categoryData.distributor.percent}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                    {categoryData.distributor.count} Wholesale Orders Processed
                  </p>
                </div>
              </div>

              {/* Small Payment Method Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200/80 dark:border-amber-900/50 text-[10px] mt-2">
                <span className="text-amber-500/70 dark:text-amber-400/60 font-bold uppercase text-[9px]">Modes:</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold">
                  Cash: ₹{categoryData.distributor.payments.cash.toLocaleString('en-IN')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  UPI: ₹{categoryData.distributor.payments.upi.toLocaleString('en-IN')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-mono font-bold">
                  Card: ₹{categoryData.distributor.payments.card.toLocaleString('en-IN')}
                </span>
                {categoryData.distributor.payments.credit > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold">
                    Credit: ₹{categoryData.distributor.payments.credit.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Main Financial & Operational Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpisToRender.map((kpi, i) => {
          const IconComponent = kpi.icon
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
                  kpi.color === 'emerald' && 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  kpi.color === 'purple' && 'bg-orbit-primary/5 dark:bg-orbit-primary/50/10 text-orbit-primary dark:text-orbit-primary-light',
                  kpi.color === 'accent' && 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
                  kpi.color === 'warning' && 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                )}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-3">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {kpi.value}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {kpi.changeLabel}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 border-t border-slate-100 dark:border-orbit-border/60 pt-2 font-medium">
                {kpi.subtext}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* ── Operational Quick Summary Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Near-Expiry Batches</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{nearExpiryBatchesCount} Batches</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/batches')} className="text-xs font-semibold text-orbit-primary-light">View</Button>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Out of Stock SKUs</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{outOfStockCount} Products</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/stock')} className="text-xs font-semibold text-orbit-primary-light">Restock</Button>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orbit-primary/5 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer Directory</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{totalCustomersCount} Accounts</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/people/customers')} className="text-xs font-semibold text-orbit-primary-light">Manage</Button>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Supplier Payables</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">₹{supplierPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchases/suppliers')} className="text-xs font-semibold text-orbit-primary-light">Payables</Button>
        </div>
      </div>


      {/* ── Main Charts Section: Sales, Expenses & Refunds vs Payment Methods ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales & Refunds Trend — takes 2/3 */}
        <Card className="xl:col-span-2">
          <CardHeader
            title={`Sales & Customer Refunds Ledger (${activePresetLabel})`}
            subtitle={
              preset === 'today'
                ? "Hourly financial breakdown for Today in INR (₹) computed live from backend"
                : preset === '7d' || preset === '30d' || preset === 'this_month'
                  ? "Daily financial breakdown for selected date range in INR (₹)"
                  : "Monthly financial trend overview in INR (₹)"
            }
          />
          <CardBody className="pt-2">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <defs>
                    <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-expenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-refunds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#7C3AED" strokeWidth={2.5} fill="url(#grad-revenue)" dot={false} />
                  <Area type="monotone" dataKey="expenses" name="Expenses (COGS)" stroke="#06B6D4" strokeWidth={2} fill="url(#grad-expenses)" dot={false} />
                  <Area type="monotone" dataKey="refunds" name="Refunds Issued" stroke="#F43F5E" strokeWidth={1.5} fill="url(#grad-refunds)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-xs text-slate-400 font-medium">
                No financial trends recorded in MongoDB for the selected date range.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-orbit-border">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-3 h-1 bg-orbit-primary rounded" /> Gross Revenue
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-3 h-1 bg-cyan-500 rounded" /> Expenses
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-3 h-1 bg-rose-500 rounded" /> Refunds
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Period Revenue: <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Payment Method Distribution — takes 1/3 */}
        <Card>
          <CardHeader title={`Payment Method Split (${activePresetLabel})`} subtitle="Revenue breakdown by mode" />
          <CardBody className="pt-2">
            {paymentMethodData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {paymentMethodData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 mt-2">
                  {paymentMethodData.map((item: any) => (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{item.name}</span>
                        {item.amount !== undefined && (
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 ml-1">
                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-slate-500 font-bold font-mono">{item.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 font-medium">
                No payment transactions recorded for selected date filter.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Bottom Section: Sales Returns & Customer Refunds Summary + Activity Feed ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        {/* Customer Returns & Refunds Summary Table — takes 2/3 */}
        <Card className="xl:col-span-2">
          <CardHeader
            title={`Customer Returns & Refunds Ledger (${activePresetLabel})`}
            subtitle={`${recentReturnsSummary.length} return vouchers in selected range`}
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/sales/returns')}
                icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                iconPosition="right"
                className="text-xs font-bold text-orbit-primary-light hover:text-orbit-primary-light"
              >
                All Returns
              </Button>
            }
          />
          <CardBody className="p-0 pt-2">
            {recentReturnsSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-orbit-border bg-orbit-surface2/50 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Return # &amp; Date</th>
                      <th className="px-5 py-3">Customer &amp; Item</th>
                      <th className="px-5 py-3">Disposition</th>
                      <th className="px-5 py-3">Refund Amount</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orbit-border text-xs">
                    {recentReturnsSummary.map((ret: any) => (
                      <tr key={ret.id} className="hover:bg-orbit-primary/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light">{ret.returnNumber}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{ret.date}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{ret.customer}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{ret.item} (Qty: {ret.qty})</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            ret.disposition === 'RESTOCK' || ret.disposition === 'RESTOCK_INVENTORY' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          )}>
                            {ret.disposition}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-orbit-primary dark:text-orbit-primary-light">
                          ₹{ret.refundAmount.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">({ret.method})</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> {ret.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No customer returns or refund vouchers recorded in this date range.
              </div>
            )}

            {/* Invoices Quick Overview Header & Table */}
            <div className="p-4 border-t border-orbit-border bg-orbit-surface2/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">POS Invoices in Period ({totalOrders} Orders)</p>
                <p className="text-[11px] text-slate-500">Includes cash billing, split payments, and customer credit in filter</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/billing/invoices')} className="text-xs font-semibold">
                Manage Invoices
              </Button>
            </div>

            {recentInvoicesList.length > 0 ? (
              <div className="overflow-x-auto border-t border-orbit-border">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-orbit-border bg-orbit-surface2/50 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-2.5">Invoice # &amp; Date</th>
                      <th className="px-5 py-2.5">Customer &amp; Mode</th>
                      <th className="px-5 py-2.5">Items</th>
                      <th className="px-5 py-2.5">Grand Total</th>
                      <th className="px-5 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orbit-border text-xs">
                    {recentInvoicesList.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-orbit-primary/5 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{inv.date}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{inv.customer}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{inv.paymentMethod}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                          {inv.itemsCount} {inv.itemsCount === 1 ? 'item' : 'items'}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{inv.amount.toFixed(2)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border',
                            inv.paymentStatus === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' :
                              inv.paymentStatus === 'PARTIAL' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/30' :
                                'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          )}>
                            {inv.paymentStatus === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 font-medium border-t border-orbit-border">
                No POS transactions found for the selected date filter.
              </div>
            )}
            {/* Recent Purchase Orders Overview */}
            <div className="p-4 border-t border-orbit-border bg-orbit-surface2/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Stock Procurement &amp; Vendor Purchase Orders</p>
                <p className="text-[11px] text-slate-500">Live purchase order spending &amp; vendor payment tracking in period</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/purchases/orders')} className="text-xs font-semibold">
                Manage Orders
              </Button>
            </div>

            {recentPurchaseOrders.length > 0 ? (
              <div className="overflow-x-auto border-t border-orbit-border">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-orbit-border bg-orbit-surface2/50 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-2.5">PO # &amp; Date</th>
                      <th className="px-5 py-2.5">Supplier &amp; Items</th>
                      <th className="px-5 py-2.5">PO Total</th>
                      <th className="px-5 py-2.5">Paid / Due</th>
                      <th className="px-5 py-2.5">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orbit-border text-xs">
                    {recentPurchaseOrders.map((po: any) => (
                      <tr key={po.id} className="hover:bg-orbit-primary/5 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light">{po.poNumber}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{po.date}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{po.supplierName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{po.itemsCount} line items</p>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{po.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px]">
                          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Paid: ₹{po.paidAmount.toFixed(2)}</p>
                          {po.dueAmount > 0.01 && <p className="text-rose-600 dark:text-rose-400 font-bold">Due: ₹{po.dueAmount.toFixed(2)}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border',
                            po.paymentStatus === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' :
                              po.paymentStatus === 'PARTIAL' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/30' :
                                'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          )}>
                            {po.paymentStatus === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {po.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 font-medium border-t border-orbit-border">
                No purchase orders recorded for the selected date filter.
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right Column Stack — Operations Hub, Health Radar & Activity Feed — takes 1/3 */}
        <div className="space-y-4">

          {/* 1. Quick Operations Hub Tile */}
          <Card>
            <CardHeader
              title="Quick Operations Hub"
              subtitle="Fast shortcuts for daily pharmacy workflows"
            />
            <CardBody className="pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => navigate('/pos')}
                  className="p-3 rounded-xl bg-orbit-primary/10 hover:bg-orbit-primary/20 border border-orbit-primary/20 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <ShoppingBag className="w-4 h-4 text-orbit-primary-light group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orbit-primary/20 text-orbit-primary-light">FEFO</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">POS Billing</p>
                  <p className="text-[10px] text-slate-500 font-medium">New sales ticket</p>
                </button>

                <button
                  onClick={() => navigate('/catalog/products')}
                  className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Add</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Add Product</p>
                  <p className="text-[10px] text-slate-500 font-medium">Create medicine</p>
                </button>

                <button
                  onClick={() => navigate('/purchases/orders')}
                  className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Truck className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">Stock</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Procure PO</p>
                  <p className="text-[10px] text-slate-500 font-medium">Vendor restock</p>
                </button>

                <button
                  onClick={() => navigate('/audit-logs')}
                  className="p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Clock className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">Audit</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Audit Trail</p>
                  <p className="text-[10px] text-slate-500 font-medium">View full logs</p>
                </button>
              </div>
            </CardBody>
          </Card>

          {/* 2. System Health & Inventory Status Card */}
          <Card>
            <CardHeader
              title="Inventory Risk Radar"
              subtitle="FEFO expiry risk & stock alerts"
            />
            <CardBody className="pt-2 space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Near-Expiry Batches</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{nearExpiryBatchesCount} batches expiring soon</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/inventory/batches')} className="text-xs font-bold text-amber-600 dark:text-amber-400">View</Button>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Critical Stockouts</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{outOfStockCount} items at zero stock</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/inventory/stock')} className="text-xs font-bold text-rose-600 dark:text-rose-400">Restock</Button>
              </div>
            </CardBody>
          </Card>

          {/* 3. Live Activity & Audit Log Feed */}
          <Card>
            <CardHeader
              title="Real-Time Activity Feed"
              subtitle="Live system events from Audit Log"
              actions={
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Live</span>
                </div>
              }
            />
            <CardBody className="pt-2 space-y-0 max-h-[360px] overflow-y-auto">
              {activityFeed.length > 0 ? (
                activityFeed.map((item: any, i: number) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 + 0.2 }}
                    className="flex items-start gap-3 py-3 border-b border-orbit-border last:border-0"
                  >
                    <div className="w-8 h-8 rounded-xl bg-orbit-primary/10 border border-orbit-primary/20 flex items-center justify-center text-orbit-primary-light dark:text-orbit-primary-light text-[10px] font-mono font-bold flex-shrink-0 shadow-sm">
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{item.text}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono">{item.time}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No recent activity logs recorded in audit trail.
                </div>
              )}
            </CardBody>

            <div className="p-3 border-t border-orbit-border bg-orbit-surface2/30 flex items-center justify-between rounded-b-2xl">
              <span className="text-xs text-slate-500 font-medium">Audit Trail System</span>
              <button
                onClick={() => navigate('/audit-logs')}
                className="text-xs font-bold text-orbit-primary-light hover:underline flex items-center gap-1"
              >
                View All Activity Logs <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>

        </div>

      </div>

      {/* ── Payments & Revenue Collection Audit Report Modal ── */}
      {isReportModalOpen && (
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          size="xl"
          title="Payment & Revenue Collection Report"
          subtitle={`Financial audit summary for period: ${activeFilterInfo.label}`}
        >
          <div className="space-y-5">
            {/* Header summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Period Sales</span>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Walk-in Retail</span>
                <p className="text-base font-bold text-orbit-primary-light font-mono">₹{categoryData.walkIn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <span className="text-[10px] text-slate-500 font-medium">{categoryData.walkIn.count} orders</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hospital &amp; Doctors</span>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">₹{categoryData.hospital.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <span className="text-[10px] text-slate-500 font-medium">{categoryData.hospital.count} orders</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distributors</span>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">₹{categoryData.distributor.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <span className="text-[10px] text-slate-500 font-medium">{categoryData.distributor.count} orders</span>
              </div>
            </div>

            {/* Payment Method Breakdown Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Payment Mode Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">💵 Cash Collections</span>
                  <span className="text-base font-extrabold font-mono text-purple-900 dark:text-purple-100">₹{paymentBreakdownData.cash.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">📱 UPI / QR Code</span>
                  <span className="text-base font-extrabold font-mono text-emerald-900 dark:text-emerald-100">₹{paymentBreakdownData.upi.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                  <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 block">💳 Card Payments</span>
                  <span className="text-base font-extrabold font-mono text-cyan-900 dark:text-cyan-100">₹{paymentBreakdownData.card.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">📜 On Credit (Due)</span>
                  <span className="text-base font-extrabold font-mono text-rose-900 dark:text-rose-100">₹{paymentBreakdownData.credit.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Invoices Preview Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Recorded Invoices in Period</h4>
              <div className="max-h-56 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5">Customer / Entity</th>
                      <th className="p-2.5 text-center">Mode</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {(recentInvoicesList.length > 0 ? recentInvoicesList : getAllInvoices()).slice(0, 15).map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                        <td className="p-2.5 font-mono font-bold text-orbit-primary-light">{inv.invoiceNumber || inv.id}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{inv.customer || 'Walk-in Customer'}</td>
                        <td className="p-2.5 text-center font-mono">{inv.paymentMethod || 'CASH'}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                            {inv.paymentStatus || 'PAID'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{(inv.amount || inv.total_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Close</Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownloadPDFReport}
                  className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-2 shadow-lg shadow-orbit-primary/30 text-xs font-bold py-2.5 px-4"
                >
                  <Download className="w-4 h-4" /> Download PDF Report
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

