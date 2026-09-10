import { motion } from 'framer-motion'
import { Check, Download, CreditCard, Zap, Building2, ArrowUpRight } from 'lucide-react'
import { Button, Badge, Card, CardHeader, CardBody } from '@/components/ui'
import { currentPlan, plans, invoices } from '@/data/billing'
import { cn } from '@/utils/cn'
import type { Invoice } from '@/types'

function UsageMeter({ label, used, limit, unit = '' }: { label: string; used: number; limit: number | null; unit?: string }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0
  const isHigh = pct > 80

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-700 dark:text-slate-300">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {typeof used === 'number' && used > 999 ? used.toLocaleString() : used}{unit}
          {limit ? ` / ${limit.toLocaleString()}${unit}` : ' (Unlimited)'}
        </p>
      </div>
      {limit && (
        <div className="h-1.5 bg-slate-200 dark:bg-orbit-surface3 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              isHigh
                ? 'bg-gradient-to-r from-orbit-warning to-orbit-danger'
                : 'bg-gradient-to-r from-orbit-primary to-orbit-accent'
            )}
          />
        </div>
      )}
      {limit && isHigh && (
        <p className="text-[11px] text-amber-500 mt-1">
          {Math.round(pct)}% used — consider upgrading
        </p>
      )}
    </div>
  )
}

function invoiceStatusConfig(status: Invoice['status']) {
  return {
    paid:    { label: 'Paid',    variant: 'success' as const },
    pending: { label: 'Pending', variant: 'warning' as const },
    overdue: { label: 'Overdue', variant: 'danger'  as const },
    draft:   { label: 'Draft',   variant: 'neutral' as const },
  }[status]
}

export function BillingPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Billing</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your plan, usage, and invoices</p>
        </div>
        <Button variant="outline" icon={<CreditCard className="w-3.5 h-3.5" />}>
          Update Payment Method
        </Button>
      </div>

      {/* Current plan + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current plan card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-border"
        >
          <Card className="p-5 bg-gradient-to-br from-orbit-primary/5 to-orbit-accent/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-orbit-primary-light" />
                  <span className="text-xs font-semibold text-orbit-primary-light uppercase tracking-wider">Current Plan</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currentPlan.name}</h2>
              </div>
              <Badge variant="primary">Active</Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">${currentPlan.price}</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">/{currentPlan.period}</span>
            </div>
            <div className="space-y-2 mb-5">
              {currentPlan.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Check className="w-3.5 h-3.5 text-orbit-primary-light flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-orbit-border">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Renews on <span className="text-slate-800 dark:text-slate-200 font-medium">{currentPlan.renewsAt}</span>
              </p>
              <Button variant="outline" size="sm" className="mt-3 w-full">
                Manage Subscription
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Usage meters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Resource Usage</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Current billing period</p>
              </div>
              <Button variant="ghost" size="sm" icon={<ArrowUpRight className="w-3.5 h-3.5" />} iconPosition="right">
                Details
              </Button>
            </div>
            <div className="space-y-6">
              <UsageMeter
                label={currentPlan.usage.apiCalls.label}
                used={currentPlan.usage.apiCalls.used}
                limit={currentPlan.usage.apiCalls.limit}
              />
              <UsageMeter
                label={currentPlan.usage.storage.label}
                used={currentPlan.usage.storage.used}
                limit={currentPlan.usage.storage.limit}
                unit=" GB"
              />
              <UsageMeter
                label={currentPlan.usage.seats.label}
                used={currentPlan.usage.seats.used}
                limit={currentPlan.usage.seats.limit}
              />
              <UsageMeter
                label={currentPlan.usage.projects.label}
                used={currentPlan.usage.projects.used}
                limit={currentPlan.usage.projects.limit}
              />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(plan.highlight && 'gradient-border')}
            >
              <Card className={cn(
                'p-5 relative',
                plan.highlight && 'bg-gradient-to-b from-orbit-primary/5 to-transparent'
              )}>
                {plan.highlight && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-orbit-primary text-white text-[10px] font-semibold px-3 py-0.5 rounded-b-lg">
                    CURRENT
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  {plan.id === 'starter' && <Zap className="w-4 h-4 text-slate-400" />}
                  {plan.id === 'pro' && <Zap className="w-4 h-4 text-orbit-primary-light" />}
                  {plan.id === 'enterprise' && <Building2 className="w-4 h-4 text-orbit-accent" />}
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">${plan.price}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">/{plan.period}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{plan.description}</p>
                <div className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Check className={cn(
                        'w-3.5 h-3.5 flex-shrink-0 mt-0.5',
                        plan.highlight ? 'text-orbit-primary-light' : 'text-slate-500'
                      )} />
                      {f}
                    </div>
                  ))}
                </div>
                <Button
                  variant={plan.highlight ? 'secondary' : plan.id === 'enterprise' ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full"
                  disabled={plan.highlight}
                >
                  {plan.cta}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <Card>
        <CardHeader
          title="Invoice History"
          subtitle={`${invoices.length} invoices`}
          actions={
            <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
              Download All
            </Button>
          }
        />
        <CardBody className="p-0 pt-2">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-orbit-border">
                {['Invoice', 'Date', 'Due Date', 'Description', 'Amount', 'Status', ''].map(col => (
                  <th key={col} className="text-left text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-5 pb-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-orbit-border">
              {invoices.map((inv, i) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">{inv.number}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">{inv.date}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">{inv.dueDate}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">{inv.description}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">${inv.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={invoiceStatusConfig(inv.status).variant} dot>
                      {invoiceStatusConfig(inv.status).label}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 text-xs">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  )
}
