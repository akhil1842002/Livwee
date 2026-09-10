import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefix, suffix, id, required, type, value, placeholder, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    const isNumber = type === 'number'
    const displayValue = value ?? ''
    const displayPlaceholder = placeholder ?? (isNumber ? '0.00' : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
        )}
        <div className={cn(
          'flex items-center gap-2.5 h-10 rounded-xl border bg-white dark:bg-orbit-surface px-3.5 text-sm transition-all duration-150 shadow-sm',
          'border-slate-200 dark:border-orbit-border hover:border-slate-300 dark:hover:border-orbit-border2',
          'focus-within:border-orbit-primary focus-within:ring-2 focus-within:ring-orbit-primary/20 focus-within:bg-white dark:focus-within:bg-orbit-surface',
          error && 'border-rose-500 focus-within:border-rose-500 ring-2 ring-rose-500/20',
          props.disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
        )}>
          {prefix && <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={displayValue}
            placeholder={displayPlaceholder}
            className={cn(
              'flex-1 bg-transparent text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500 outline-none min-w-0 text-xs sm:text-sm',
              props.disabled && 'cursor-not-allowed',
              className
            )}
            {...props}
          />
          {suffix && <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">{suffix}</span>}
        </div>
        {(error || hint) && (
          <p className={cn('text-xs mt-1.5 font-medium', error ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400')}>
            {error ?? hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
