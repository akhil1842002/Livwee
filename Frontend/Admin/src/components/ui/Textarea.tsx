import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, required, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
        )}
        <div className={cn(
          'relative rounded-xl border bg-white dark:bg-orbit-surface transition-all duration-150 shadow-sm',
          'border-slate-200 dark:border-orbit-border hover:border-slate-300 dark:hover:border-orbit-border2',
          'focus-within:border-orbit-primary focus-within:ring-2 focus-within:ring-orbit-primary/20 focus-within:bg-white dark:focus-within:bg-orbit-surface',
          error && 'border-rose-500 focus-within:border-rose-500 ring-2 ring-rose-500/20',
          props.disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
        )}>
          <textarea
            ref={ref}
            id={textareaId}
            className={cn(
              'w-full bg-transparent p-3 text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500 outline-none min-w-0 text-xs sm:text-sm resize-y',
              props.disabled && 'cursor-not-allowed',
              className
            )}
            {...props}
          />
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

Textarea.displayName = 'Textarea'
