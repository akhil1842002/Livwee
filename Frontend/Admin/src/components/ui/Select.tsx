import { forwardRef, useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, Plus, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  prefix?: React.ReactNode
  options?: SelectOption[]
  required?: boolean
  placeholder?: string
  searchable?: boolean
  onQuickAdd?: () => void
  quickAddLabel?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, prefix, options = [], children, id, required, placeholder, value, onChange, disabled, name, searchable = true, onQuickAdd, quickAddLabel, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Close on click outside & reset search
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
          setSearchTerm('')
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Focus search input when popover opens
    useEffect(() => {
      if (isOpen && searchable) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus()
        }, 50)
        return () => clearTimeout(timer)
      }
    }, [isOpen, searchable])

    const selectedOption = options?.find(o => String(o.value) === String(value))
    const displayLabel = selectedOption ? selectedOption.label : (value !== '' && value !== undefined && value !== null ? String(value) : placeholder || 'Select option')
    const cleanQuickAddLabel = (quickAddLabel || 'Add New').replace(/^\+\s*/, '')

    const filteredOptions = (options || []).filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSelect = (optValue: string | number) => {
      if (disabled) return
      setIsOpen(false)
      setSearchTerm('')
      if (onChange) {
        const syntheticEvent = {
          target: {
            name: name || selectId,
            value: optValue
          }
        } as React.ChangeEvent<HTMLSelectElement>
        onChange(syntheticEvent)
      }
    }

    return (
      <div className="w-full relative" ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
        )}

        {/* Custom Trigger Button */}
        <div
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className={cn(
            'relative flex items-center justify-between h-10 px-3.5 rounded-xl border bg-white dark:bg-orbit-surface transition-all duration-150 shadow-sm cursor-pointer select-none group',
            'border-slate-200 dark:border-orbit-border hover:border-slate-300 dark:hover:border-orbit-border2',
            isOpen && 'border-orbit-primary ring-2 ring-orbit-primary/20 bg-white dark:bg-orbit-surface',
            error && 'border-rose-500 ring-2 ring-rose-500/20',
            disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {prefix && (
              <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">
                {prefix}
              </span>
            )}
            <span className={cn(
              'font-medium text-xs sm:text-sm truncate',
              !selectedOption && (value === '' || value === undefined || value === null)
                ? 'text-slate-400 dark:text-slate-500 font-normal'
                : 'text-slate-900 dark:text-slate-100'
            )}>
              {displayLabel}
            </span>
          </div>

          <ChevronDown className={cn(
            'w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-200 ml-2',
            isOpen && 'rotate-180 text-orbit-primary-light'
          )} />
        </div>

        {/* Custom Floating Popover Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-72 flex flex-col rounded-xl bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border shadow-2xl py-1 text-xs sm:text-sm animate-in fade-in-50 zoom-in-95 duration-100">
            {/* Search Input inside Dropdown Menu */}
            {searchable && (
              <div className="p-2 border-b border-slate-100 dark:border-orbit-border bg-slate-50/50 dark:bg-slate-900/50">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search option..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orbit-primary/40"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSearchTerm('')
                      }}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-52 py-1">
              {placeholder && !searchTerm && (
                <div
                  onClick={() => handleSelect('')}
                  className={cn(
                    'px-3.5 py-2 font-medium cursor-pointer text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
                    value === '' && 'font-semibold text-orbit-primary-light'
                  )}
                >
                  {placeholder}
                </div>
              )}

              {/* Listed Quick Add Item at Top if provided */}
              {onQuickAdd && (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                    setSearchTerm('')
                    onQuickAdd()
                  }}
                  className="px-3.5 py-2 font-bold text-orbit-primary-light hover:bg-orbit-primary/10 dark:hover:bg-orbit-primary/20 flex items-center gap-2 cursor-pointer transition-colors border-b border-slate-100 dark:border-orbit-border/50 text-xs"
                >
                  <Plus className="w-4 h-4 text-orbit-primary-light flex-shrink-0" />
                  <span>{cleanQuickAddLabel}</span>
                </div>
              )}

              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value)
                  return (
                    <div
                      key={opt.value}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={cn(
                        'px-3.5 py-2.5 font-medium flex items-center justify-between cursor-pointer transition-colors',
                        opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-orbit-primary/10 dark:hover:bg-orbit-primary/20 text-slate-800 dark:text-slate-100',
                        isSelected && 'bg-orbit-primary/10 dark:bg-orbit-primary/20 text-orbit-primary-light dark:text-orbit-primary-light font-bold'
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-orbit-primary-light flex-shrink-0 ml-2" />}
                    </div>
                  )
                })
              ) : (
                <div className="px-3.5 py-3 text-xs text-slate-400 dark:text-slate-500 text-center font-medium italic">
                  No matching options found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden Native Select for standard form submission / ref support */}
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          tabIndex={-1}
          className="sr-only pointer-events-none"
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {(error || hint) && (
          <p className={cn('text-xs mt-1.5 font-medium', error ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400')}>
            {error ?? hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

