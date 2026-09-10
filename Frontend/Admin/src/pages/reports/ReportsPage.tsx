import { useState, useMemo, useEffect } from 'react'
import {
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  IndianRupee,
  PackageCheck,
  Calendar,
  Filter,
  Users,
  Percent,
  Receipt,
  FileText,
  X,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Button, Input, EmptyState } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { reportService, ReportItem } from '@/services/reportService'

// ─── Helpers for Dynamic Dates ────────────────────────────────────────────────

function getFormattedDate(offsetDays: number = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Master Seed Transactions List ──────────────────────────────────────────

type ReportItem = {
  id: string
  date: string
  invoiceNo: string
  customer: string
  itemsCount: number
  grossRevenue: number
  cogsCost: number
  discount: number
  gstAmount: number
  netProfit: number
  channel: string
}

const BASE_REPORTS: ReportItem[] = []

// ─── Printable HTML Builder ──────────────────────────────────────────────────

function buildPrintableReportHTML(
  title: string,
  startDate: string,
  endDate: string,
  data: ReportItem[]
): string {
  let gross = 0, cogs = 0, gst = 0, profit = 0
  data.forEach(t => {
    gross += t.grossRevenue
    cogs += t.cogsCost
    gst += t.gstAmount
    profit += t.netProfit
  })
  const margin = gross > 0 ? (profit / gross) * 100 : 0

  const rows = data.map((t, i) => `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td>${t.date}</td>
      <td class="bold">${t.invoiceNo}</td>
      <td>${t.customer}</td>
      <td>${t.channel}</td>
      <td class="num">${t.itemsCount}</td>
      <td class="num font-bold">₹${t.grossRevenue.toFixed(2)}</td>
      <td class="num">₹${t.cogsCost.toFixed(2)}</td>
      <td class="num">₹${t.gstAmount.toFixed(2)}</td>
      <td class="num profit font-bold">₹${t.netProfit.toFixed(2)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>${title} (${startDate} to ${endDate})</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;font-size:12px;color:#1e293b;background:#f8fafc;padding:24px}
  .page{max-width:960px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #7c3aed;padding-bottom:18px;margin-bottom:20px}
  .title{font-size:24px;font-weight:800;color:#7c3aed}
  .sub{font-size:11px;color:#64748b;margin-top:2px}
  .range-box{background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:8px 14px;font-size:11px;color:#6b21a8;font-weight:700}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
  .kpi .l{font-size:9.5px;font-weight:700;text-transform:uppercase;color:#94a3b8}
  .kpi .v{font-size:16px;font-weight:800;color:#1e293b;margin-top:2px;font-family:monospace}
  table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:11px}
  th{background:#7c3aed;color:#fff;padding:10px;text-align:right;font-size:9.5px;font-weight:700;text-transform:uppercase}
  th:first-child, th:nth-child(2), th:nth-child(3), th:nth-child(4){text-align:left}
  td{padding:9px 10px;text-align:right;border-bottom:1px solid #f1f5f9;color:#374151}
  td:first-child, td:nth-child(2), td:nth-child(3), td:nth-child(4){text-align:left}
  tr.even{background:#fafbff}
  .bold{font-weight:700;color:#1e293b}
  .profit{color:#16a34a}
  .footer{text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="title">Livwee Pharmacy</div>
      <div class="sub">${title} — Official Financial Ledger</div>
    </div>
    <div class="range-box">
      Date Range: ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="l">Gross Revenue</div><div class="v">₹${gross.toFixed(2)}</div></div>
    <div class="kpi"><div class="l">COGS Cost</div><div class="v">₹${cogs.toFixed(2)}</div></div>
    <div class="kpi"><div class="l">Net Profit</div><div class="v" style="color:#16a34a">₹${profit.toFixed(2)}</div></div>
    <div class="kpi"><div class="l">Margin %</div><div class="v" style="color:#7c3aed">${margin.toFixed(1)}%</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Invoice #</th>
        <th>Customer</th>
        <th>Channel</th>
        <th>Items</th>
        <th>Gross Revenue</th>
        <th>COGS Cost</th>
        <th>GST Tax</th>
        <th>Net Profit</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    Generated from Livwee Pharmacy ERP &nbsp;|&nbsp; Range: ${startDate} to ${endDate} &nbsp;|&nbsp; Total Records: ${data.length}
  </div>
</div>
</body></html>`
}

// ─── Report Modal Preview Component ──────────────────────────────────────────

function ReportPreviewModal({
  title,
  startDate,
  endDate,
  data,
  onClose
}: {
  title: string
  startDate: string
  endDate: string
  data: ReportItem[]
  onClose: () => void
}) {
  const { showToast } = useToast()

  let gross = 0, cogs = 0, gst = 0, profit = 0
  data.forEach(t => {
    gross += t.grossRevenue
    cogs += t.cogsCost
    gst += t.gstAmount
    profit += t.netProfit
  })
  const margin = gross > 0 ? (profit / gross) * 100 : 0

  const handlePrintNow = () => {
    if (data.length === 0) {
      showToast('No transaction data available to print for the selected period', 'warning')
      return
    }
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(buildPrintableReportHTML(title, startDate, endDate, data))
      w.document.close()
      setTimeout(() => w.print(), 600)
    }
    showToast('Opening print preview…', 'info')
  }

  const handleDownloadCSV = () => {
    if (data.length === 0) {
      showToast('No transaction data available to export as CSV', 'warning')
      return
    }
    const header = 'Date,Invoice No,Customer,Channel,Items Count,Gross Revenue,COGS Cost,Discount,GST Amount,Net Profit'
    const rows = data.map(t =>
      `"${t.date}","${t.invoiceNo}","${t.customer}","${t.channel}",${t.itemsCount},${t.grossRevenue.toFixed(2)},${t.cogsCost.toFixed(2)},${t.discount.toFixed(2)},${t.gstAmount.toFixed(2)},${t.netProfit.toFixed(2)}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${title} CSV downloaded`, 'success')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-5xl bg-white dark:bg-[#161622] rounded-2xl shadow-[0_32px_90px_rgba(0,0,0,0.4)] border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-orbit-primary via-orbit-primary-light to-orbit-primary p-6 pl-6 sm:pl-8 pr-16 sm:pr-20 text-white shrink-0">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 p-2.5 rounded-xl bg-white/15 hover:bg-white/30 border border-white/25 text-white transition-all shadow-lg cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-white/80" />
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{title}</h2>
              </div>
              <p className="text-white/70 text-xs sm:text-sm mt-1">
                Official Report Ledger &nbsp;·&nbsp; Date Bounds: <strong className="text-white font-mono">{startDate}</strong> to <strong className="text-white font-mono">{endDate}</strong>
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 px-3.5 py-2 rounded-xl text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">Total Records</span>
              <span className="text-lg font-bold text-white font-mono">{data.length} Ledger Entries</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Gross Revenue</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">₹{gross.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">COGS Cost</span>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300 font-mono">₹{cogs.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Net Profit</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{profit.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Profit Margin</span>
              <span className="text-lg font-bold text-orbit-primary-light dark:text-orbit-primary-light font-mono">{margin.toFixed(1)}%</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[780px]">
                <thead>
                  <tr className="bg-orbit-primary text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Invoice No</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Channel</th>
                    <th className="px-4 py-3 text-right">Items</th>
                    <th className="px-4 py-3 text-right">Gross Revenue</th>
                    <th className="px-4 py-3 text-right">COGS Cost</th>
                    <th className="px-4 py-3 text-right">GST Amount</th>
                    <th className="px-4 py-3 text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.length === 0 ? (
                    <EmptyState
                      colSpan={9}
                      title="No Data Found"
                      description="There are no transaction records available for the selected date range."
                    />
                  ) : (
                    data.map((t, i) => (
                    <tr key={t.id} className={i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{t.date}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light">{t.invoiceNo}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{t.customer}</td>
                      <td className="px-4 py-2.5 text-slate-500">{t.channel}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{t.itemsCount}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">₹{t.grossRevenue.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">₹{t.cogsCost.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400">₹{t.gstAmount.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{t.netProfit.toFixed(2)}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Action Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
          <span className="text-xs text-slate-400">Livwee Pharmacy ERP Report Generator</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Download CSV
            </Button>
            <Button size="sm" onClick={handlePrintNow} className="bg-orbit-primary hover:bg-orbit-primary/50 text-white gap-1.5 text-xs shadow-lg shadow-orbit-primary/30">
              <Printer className="w-3.5 h-3.5" /> Print Report Now
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export function ReportsPage() {
  const { showToast } = useToast()

  // Default dates: 30 days range ending today
  const [startDate, setStartDate] = useState(getFormattedDate(-30))
  const [endDate, setEndDate] = useState(getFormattedDate(0))
  const [activePreset, setActivePreset] = useState('Last 30 Days')
  const [previewReport, setPreviewReport] = useState<{ title: string; data: ReportItem[] } | null>(null)
  const [reports, setReports] = useState<ReportItem[]>(BASE_REPORTS)

  useEffect(() => {
    reportService.fetchReports().then(data => {
      if (data && data.length > 0) {
        setReports(data)
      }
    }).catch(err => console.warn('Could not fetch backend report ledger:', err))
  }, [])

  // Presets configuration
  const presets = [
    { label: 'Today', start: getFormattedDate(0), end: getFormattedDate(0) },
    { label: 'Yesterday', start: getFormattedDate(-1), end: getFormattedDate(-1) },
    { label: 'Last 7 Days', start: getFormattedDate(-7), end: getFormattedDate(0) },
    { label: 'Last 30 Days', start: getFormattedDate(-30), end: getFormattedDate(0) },
    { label: 'All Time', start: '2026-01-01', end: getFormattedDate(30) },
  ]

  const applyPreset = (label: string, start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setActivePreset(label)
    showToast(`Date range updated to ${label} (${start} to ${end})`, 'info')
  }

  // Filter records within date range
  const filteredData = useMemo(() => {
    return reports.filter(t => {
      if (startDate && t.date < startDate) return false
      if (endDate && t.date > endDate) return false
      return true
    })
  }, [reports, startDate, endDate])

  // Aggregates
  const totals = useMemo(() => {
    let gross = 0, cogs = 0, disc = 0, gst = 0, profit = 0
    filteredData.forEach(t => {
      gross += t.grossRevenue
      cogs += t.cogsCost
      disc += t.discount
      gst += t.gstAmount
      profit += t.netProfit
    })
    const margin = gross > 0 ? (profit / gross) * 100 : 0
    return { gross, cogs, disc, gst, profit, margin, count: filteredData.length }
  }, [filteredData])

  const handleExportCSVDirect = (reportTitle: string) => {
    if (filteredData.length === 0) {
      showToast('No transaction data available to export for the selected date range', 'warning')
      return
    }
    const header = 'Date,Invoice No,Customer,Channel,Items Count,Gross Revenue,COGS Cost,Discount,GST Amount,Net Profit'
    const rows = filteredData.map(t =>
      `"${t.date}","${t.invoiceNo}","${t.customer}","${t.channel}",${t.itemsCount},${t.grossRevenue.toFixed(2)},${t.cogsCost.toFixed(2)},${t.discount.toFixed(2)},${t.gstAmount.toFixed(2)},${t.netProfit.toFixed(2)}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${reportTitle} CSV exported (${startDate} to ${endDate})`, 'success')
  }

  const reportsList = [
    {
      id: 'sales',
      title: 'Sales & Profitability Ledger',
      desc: 'Calculates net profit margin by comparing gross revenue against batch purchase cost (COGS)',
      icon: IndianRupee,
    },
    {
      id: 'tax',
      title: 'GST Tax Summary & Filing',
      desc: 'Output CGST + SGST tax breakdown categorized by 5%, 12%, and 18% tax slabs',
      icon: TrendingUp,
    },
    {
      id: 'inventory',
      title: 'FEFO Stock Expiry & Valuation',
      desc: 'Batch-wise stock levels, valuation at cost price, and 30/60/90-day expiry breakdown',
      icon: PackageCheck,
    },
    {
      id: 'customer',
      title: 'Customer & Clinic Accounts Ledger',
      desc: 'Customer transaction volume, clinic credit statements, and patient purchase trends',
      icon: Users,
    }
  ]

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Date-Based Reports &amp; Analytics</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Filter financial ledgers, GST tax filings, and stock valuations by date range with instant preview &amp; print
          </p>
        </div>
      </div>

      {/* ── Date Range Filter Bar (Interactive) ── */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Start & End Date Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orbit-primary-light shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Select Date Range:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setActivePreset('Custom Range') }}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setActivePreset('Custom Range') }}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-orbit-border bg-slate-50 dark:bg-orbit-surface2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.label, p.start, p.end)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activePreset === p.label
                    ? 'bg-orbit-primary text-white shadow-md shadow-orbit-primary/30'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter Status Strip */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Active Filter: <strong className="text-slate-900 dark:text-slate-100 font-mono">{formatDateDisplay(startDate)}</strong> to <strong className="text-slate-900 dark:text-slate-100 font-mono">{formatDateDisplay(endDate)}</strong>
            </span>
          </div>
          <span className="font-mono text-orbit-primary-light dark:text-orbit-primary-light font-bold">
            {filteredData.length} records matching interval
          </span>
        </div>
      </div>

      {/* ── Summary KPI Cards for Selected Date Range ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Gross Revenue (Range)</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">₹{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/10 text-orbit-primary-light dark:text-orbit-primary-light">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Net Profit (Range)</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Profit Margin %</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">{totals.margin.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">GST Collected (Range)</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">₹{totals.gst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* ── Report Cards List ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportsList.map(rep => {
          const IconComponent = rep.icon
          return (
            <div
              key={rep.id}
              className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border hover:border-orbit-primary/40 rounded-2xl p-6 space-y-4 shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-orbit-primary/5 dark:bg-orbit-primary/20 border border-orbit-primary/20 dark:border-orbit-primary/30 text-orbit-primary-light dark:text-orbit-primary-light shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{rep.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{rep.desc}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-500">Active Date Interval:</span>
                <span className="font-mono font-bold text-orbit-primary-light dark:text-orbit-primary-light">
                  {formatDateDisplay(startDate)} → {formatDateDisplay(endDate)}
                </span>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-orbit-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCSVDirect(rep.title)}
                  className="w-full text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export Date CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (filteredData.length === 0) {
                      showToast('No transaction data available to print for the selected period', 'warning')
                      return
                    }
                    setPreviewReport({ title: rep.title, data: filteredData })
                  }}
                  className="w-full text-xs gap-1.5 bg-orbit-primary hover:bg-orbit-primary/50 text-white shadow-md shadow-orbit-primary/20"
                >
                  <Printer className="w-3.5 h-3.5" /> Preview &amp; Print PDF
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Date-Filtered Transactions Table Preview ── */}
      <div className="bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-2xl overflow-hidden shadow-sm space-y-4">
        <div className="p-5 border-b border-slate-200 dark:border-orbit-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orbit-primary-light" /> Transaction Ledger Preview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing date-scoped sales matching {formatDateDisplay(startDate)} to {formatDateDisplay(endDate)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (filteredData.length === 0) {
                  showToast('No transaction data available to print for the selected period', 'warning')
                  return
                }
                setPreviewReport({ title: 'Full Financial Ledger', data: filteredData })
              }}
              className="gap-1.5 text-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print Full Ledger
            </Button>
            <Button
              size="sm"
              onClick={() => handleExportCSVDirect('Full Financial Ledger')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs shadow-md shadow-emerald-600/20"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV ({filteredData.length})
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 min-w-[850px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200 dark:border-orbit-border">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Invoice No</th>
                <th className="px-6 py-3.5">Customer &amp; Channel</th>
                <th className="px-6 py-3.5 text-right">Gross Revenue</th>
                <th className="px-6 py-3.5 text-right">COGS Cost</th>
                <th className="px-6 py-3.5 text-right">GST Tax</th>
                <th className="px-6 py-3.5 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {filteredData.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  title="No Report Entries Found"
                  description="There are no sales transactions or invoices recorded in the selected date range."
                />
              ) : (
                filteredData.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{formatDateDisplay(t.date)}</td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-orbit-primary-light dark:text-orbit-primary-light">{t.invoiceNo}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{t.customer}</p>
                    <span className="text-[10px] text-slate-400">{t.channel}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">₹{t.grossRevenue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-500">₹{t.cogsCost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono text-blue-600 dark:text-blue-400">₹{t.gstAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{t.netProfit.toFixed(2)}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Report Preview & Print Modal ── */}
      {previewReport && (
        <ReportPreviewModal
          title={previewReport.title}
          startDate={startDate}
          endDate={endDate}
          data={previewReport.data}
          onClose={() => setPreviewReport(null)}
        />
      )}

    </div>
  )
}
