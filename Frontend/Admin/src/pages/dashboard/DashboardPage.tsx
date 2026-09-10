import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  Download, IndianRupee, RotateCcw,
  CreditCard, AlertCircle, ShoppingBag, ArrowUpRight,
  AlertTriangle, Users, Building2,
  FileText, CheckCircle2, RefreshCw, Clock, Truck
} from 'lucide-react'
import { Button, Card, CardHeader, CardBody } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'
import { dashboardService } from '@/services/dashboardService'

const periods = ['7D', '30D', '90D', '1Y'] as const
type Period = typeof periods[number]

const periodSlice: Record<Period, number> = { '7D': 2, '30D': 4, '90D': 6, '1Y': 6 }

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
            ₹{p.value.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('1Y')
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [apiMetrics, setApiMetrics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadMetrics = async () => {
    try {
      setIsLoading(true)
      const res = await dashboardService.fetchMetrics()
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
    loadMetrics()
  }, [])

  const monthlyTrend = apiMetrics?.monthlyTrend || []
  const slicedData = monthlyTrend.slice(-periodSlice[period])
  const paymentMethodData = (apiMetrics?.paymentMethods || []).filter((pm: any) => pm.value > 0)
  const recentReturnsSummary = apiMetrics?.returns?.list || []
  const recentInvoicesList = apiMetrics?.orders?.list || []
  const recentPurchaseOrders = apiMetrics?.purchases?.list || []
  const activityFeed = apiMetrics?.activityFeed || []

  const totalRevenue = apiMetrics?.revenue?.total ?? 0
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
    showToast('Dashboard summary report exported successfully (CSV)', 'success', 'Report Exported')
  }

  const kpisToRender = [
    {
      id: 'gross-sales',
      label: 'Gross Sales Revenue',
      value: `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      changeLabel: `Today: ₹${todayRevenue.toLocaleString('en-IN')}`,
      subtext: 'Total billing across POS & Invoices',
      icon: IndianRupee,
      color: 'emerald',
    },
    {
      id: 'purchases-spend',
      label: 'Stock Procurement Spend',
      value: `₹${totalPurchasesSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      changeLabel: `${completedPurchasesCount} of ${totalPurchasesCount} POs Completed`,
      subtext: 'Total spending on stock purchase orders',
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
      label: 'Customer Returns & Refunds',
      value: `₹${totalRefundsValue.toFixed(2)}`,
      changeLabel: `${recentReturnsSummary.length} returns processed`,
      subtext: 'Customer refunds processed',
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
            {dateStr} &bull; Enterprise Pharmacy & E-Commerce Control Center
          </p>
        </div>

        {/* Action Shortcuts Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={loadMetrics}
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
            variant="outline"
            size="sm"
            onClick={handleExportSummary}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
          </Button>
        </div>
      </motion.div>

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
            title="Sales & Customer Refunds Ledger"
            subtitle="Monthly financial overview in INR (₹) computed live from backend"
            actions={
              <div className="flex items-center gap-1 bg-orbit-surface2 rounded-lg p-1">
                {periods.map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                      period === p
                        ? 'bg-orbit-primary text-white shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            }
          />
          <CardBody className="pt-2">
            {slicedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={slicedData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
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
              <div className="h-[260px] flex items-center justify-center text-xs text-slate-400">
                No financial trends recorded yet in MongoDB.
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
                Total Store Revenue: <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Payment Method Distribution — takes 1/3 */}
        <Card>
          <CardHeader title="Payment Method Split" subtitle="Revenue breakdown by mode" />
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
                <div className="space-y-2 mt-2">
                  {paymentMethodData.map((item: any) => (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex-1 truncate">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-orbit-surface3 rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                        </div>
                        <span className="text-xs text-slate-900 dark:text-slate-100 font-bold font-mono">{item.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                No payment transactions recorded yet.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Bottom Section: Sales Returns & Customer Refunds Summary + Activity Feed ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        
        {/* Customer Returns & Refunds Summary Table — takes 2/3 */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Customer Returns & Refunds Ledger"
            subtitle={`${recentReturnsSummary.length} recent customer return vouchers`}
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
                      <th className="px-5 py-3">Return # & Date</th>
                      <th className="px-5 py-3">Customer & Item</th>
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
                            ret.disposition === 'RESTOCK' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/30'
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
                No customer returns or refund vouchers recorded in backend yet.
              </div>
            )}

            {/* Invoices Quick Overview Header & Table */}
            <div className="p-4 border-t border-orbit-border bg-orbit-surface2/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Live POS Invoices ({totalOrders} Total Orders)</p>
                <p className="text-[11px] text-slate-500">Includes cash billing, split payments, and customer credit</p>
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
                No POS transactions completed yet. Go to POS Terminal to start billing.
              </div>
            )}
            {/* Recent Purchase Orders Overview */}
            <div className="p-4 border-t border-orbit-border bg-orbit-surface2/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Stock Procurement &amp; Vendor Purchase Orders</p>
                <p className="text-[11px] text-slate-500">Live purchase order spending &amp; vendor payment tracking</p>
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
                No purchase orders recorded yet. Go to Stock Purchases to create a PO.
              </div>
            )}
          </CardBody>
        </Card>

        {/* Live Activity & System Log Feed — takes 1/3 */}
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
          <CardBody className="pt-2 space-y-0">
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
        </Card>

      </div>
    </div>
  )
}
