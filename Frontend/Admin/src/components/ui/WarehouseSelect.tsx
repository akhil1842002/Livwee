import { Warehouse } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { WarehouseOption } from '@/data/sharedData'

export interface WarehouseSelectProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  warehouses: WarehouseOption[]
  value: string
  onChange: (warehouseId: string, warehouse: WarehouseOption) => void
  disabled?: boolean
  className?: string
}

export function WarehouseSelect({
  label,
  required,
  error,
  hint,
  warehouses,
  value,
  onChange,
  disabled,
  className,
}: WarehouseSelectProps) {
  const selected = warehouses.find(w => w.id === value)

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div className={cn(
        'relative flex items-center h-10 rounded-xl border bg-white dark:bg-orbit-surface transition-all duration-150 shadow-sm group',
        'border-slate-200 dark:border-orbit-border hover:border-slate-300 dark:hover:border-orbit-border2',
        'focus-within:border-orbit-primary dark:focus-within:border-orbit-primary focus-within:ring-2 focus-within:ring-orbit-primary/20 focus-within:bg-white dark:focus-within:bg-orbit-surface',
        error && 'border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500/20',
        disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
      )}>
        <span className="pl-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0 pointer-events-none">
          <Warehouse className="w-4 h-4" />
        </span>

        <select
          value={value}
          disabled={disabled}
          onChange={e => {
            const wh = warehouses.find(w => w.id === e.target.value)
            if (wh) onChange(e.target.value, wh)
          }}
          className={cn(
            'w-full h-full pl-2 pr-10 appearance-none bg-transparent font-medium outline-none text-xs sm:text-sm cursor-pointer',
            value === '' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100',
            disabled && 'cursor-not-allowed'
          )}
        >
          <option value="" disabled className="bg-white dark:bg-orbit-surface text-slate-400 dark:text-slate-500">
            Select Warehouse...
          </option>
          {warehouses.map(wh => (
            <option key={wh.id} value={wh.id} className="bg-white dark:bg-orbit-surface text-slate-900 dark:text-slate-100">
              {wh.name}{wh.isDefault ? ' (Default)' : ''}
            </option>
          ))}
        </select>

        <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none transition-transform duration-200 group-focus-within:text-orbit-primary-light dark:group-focus-within:text-orbit-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Selected warehouse info badge */}
      {selected && (
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <span className="font-mono font-bold text-orbit-primary-light">{selected.code}</span>
          <span>·</span>
          <span>{selected.location}</span>
          {selected.isDefault && (
            <span className="ml-1 px-1 rounded text-[9px] font-bold bg-orbit-primary/10 dark:bg-orbit-primary/15 text-orbit-primary-light dark:text-orbit-primary-light">DEFAULT</span>
          )}
        </p>
      )}

      {(error || hint) && (
        <p className={cn('text-xs mt-1.5 font-medium', error ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

WarehouseSelect.displayName = 'WarehouseSelect'
