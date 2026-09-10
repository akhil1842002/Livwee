import { TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import type { StatCardData } from '@/types'

const colorMap = {
  primary: {
    icon: 'bg-orbit-primary/15 text-orbit-primary-light',
    chart: '#7C3AED',
    gradient: 'rgba(124, 58, 237, 0.15)',
    positive: 'text-orbit-primary-light',
  },
  accent: {
    icon: 'bg-orbit-accent/15 text-orbit-accent-light',
    chart: '#06B6D4',
    gradient: 'rgba(6, 182, 212, 0.15)',
    positive: 'text-cyan-400',
  },
  success: {
    icon: 'bg-orbit-success/15 text-emerald-400',
    chart: '#10B981',
    gradient: 'rgba(16, 185, 129, 0.15)',
    positive: 'text-emerald-400',
  },
  warning: {
    icon: 'bg-orbit-warning/15 text-amber-400',
    chart: '#F59E0B',
    gradient: 'rgba(245, 158, 11, 0.15)',
    positive: 'text-amber-400',
  },
}

interface StatCardProps {
  data: StatCardData
  index?: number
}

export function StatCard({ data, index = 0 }: StatCardProps) {
  const colors = colorMap[data.color]
  const isPositive = data.change >= 0
  const isNegativeGood = data.id === 'churn'
  const changeIsGood = isNegativeGood ? !isPositive : isPositive

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="bg-orbit-surface rounded-xl border border-orbit-border hover:border-orbit-border2 transition-colors overflow-hidden group"
    >
      <div className="p-5">
        {/* Top row: icon + change badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-2 rounded-lg', colors.icon)}>
            <data.icon className="w-4 h-4" />
          </div>
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              changeIsGood
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {changeIsGood ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(data.change)}%
          </div>
        </div>

        {/* Label + Value */}
        <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">{data.label}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{data.value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{data.changeLabel}</p>
      </div>

      {/* Sparkline */}
      <div className="h-14 -mb-0.5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${data.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.chart} stopOpacity={0.3} />
                <stop offset="100%" stopColor={colors.chart} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.chart}
              strokeWidth={2}
              fill={`url(#spark-${data.id})`}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
