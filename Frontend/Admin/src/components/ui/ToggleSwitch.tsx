import React from 'react'
import { cn } from '@/utils/cn'

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  activeText?: string
  inactiveText?: string
  className?: string
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  activeText = 'Active',
  inactiveText = 'Inactive',
  className,
}: ToggleSwitchProps) {
  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange(!checked)
  }

  const sizes = {
    sm: { track: 'w-8 h-4.5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-3.5' },
    md: { track: 'w-11 h-6', thumb: 'w-4.5 h-4.5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7.5', thumb: 'w-6 h-6', translate: 'translate-x-6.5' },
  }

  const currentSize = sizes[size]

  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleToggle(e)}
        className={cn(
          'relative inline-flex flex-shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orbit-primary/40',
          currentSize.track,
          checked
            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
            : 'bg-slate-300 dark:bg-slate-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            currentSize.thumb,
            checked ? currentSize.translate : 'translate-x-0'
          )}
        />
      </button>

      {(label || activeText) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>}
          <span className={cn(
            'text-[11px] font-semibold transition-colors',
            checked ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'
          )}>
            {checked ? activeText : inactiveText}
          </span>
          {description && <span className="text-[10px] text-slate-400">{description}</span>}
        </div>
      )}
    </div>
  )
}

ToggleSwitch.displayName = 'ToggleSwitch'
