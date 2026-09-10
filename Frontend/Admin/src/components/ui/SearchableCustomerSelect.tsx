import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, User, ChevronDown, X, Phone, Mail, Check, UserCheck } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface CustomerOption {
  label: string
  value: string
  phone?: string
  email?: string
  category?: string
}

export interface SearchableCustomerSelectProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  value: string
  onChange: (value: string, customerObj?: CustomerOption | null) => void
  options: CustomerOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchableCustomerSelect({
  label,
  required,
  error,
  hint,
  value,
  onChange,
  options,
  placeholder = 'Search & select customer profile...',
  disabled,
  className,
}: SearchableCustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find currently selected customer option
  const selectedOption = useMemo(() => {
    return options.find(o => o.value === value) || (value ? { label: value, value } : null)
  }, [options, value])

  // Filter options dynamically by name, phone, email, or label
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(opt =>
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.phone && opt.phone.toLowerCase().includes(q)) ||
      (opt.email && opt.email.toLowerCase().includes(q))
    )
  }, [options, query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    if (disabled) return
    setIsOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (option: CustomerOption) => {
    onChange(option.value, option)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div className={cn('w-full relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger Box */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpen}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleOpen()}
        className={cn(
          'flex items-center gap-2.5 h-10 rounded-xl border px-3.5 cursor-pointer transition-all duration-150 shadow-sm select-none',
          'bg-slate-50/80 dark:bg-orbit-surface',
          'border-slate-200 dark:border-orbit-border hover:border-slate-300 dark:hover:border-orbit-border2',
          isOpen && 'border-orbit-primary dark:border-orbit-primary ring-2 ring-orbit-primary/20 bg-white dark:bg-orbit-surface',
          error && 'border-rose-500 ring-2 ring-rose-500/20',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
        )}
      >
        <UserCheck className="w-4 h-4 text-orbit-primary-light flex-shrink-0" />

        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          {selectedOption ? (
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 truncate">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 text-orbit-primary-light'
          )}
        />
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-orbit-border bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border focus-within:ring-2 focus-within:ring-orbit-primary/20 focus-within:border-orbit-primary">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search customer name, phone, or email..."
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none min-w-0 font-medium"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Customer Options List */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-4 text-xs text-slate-400 text-center">
                No customer found matching "{query}"
              </li>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value
                return (
                  <li
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors group',
                      isSelected && 'bg-orbit-primary/10 dark:bg-orbit-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs transition-colors',
                        isSelected
                          ? 'bg-orbit-primary text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-orbit-primary/10 group-hover:text-orbit-primary-light'
                      )}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          'text-xs font-semibold truncate',
                          isSelected ? 'text-orbit-primary dark:text-orbit-primary-light font-bold' : 'text-slate-900 dark:text-slate-100'
                        )}>
                          {opt.label}
                        </p>
                        {(opt.phone || opt.email) && (
                          <p className="text-[10.5px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            {opt.phone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{opt.phone}</span>}
                            {opt.email && <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{opt.email}</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-orbit-primary dark:text-orbit-primary-light flex-shrink-0" />
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}

      {(error || hint) && (
        <p className={cn('text-xs mt-1.5 font-medium', error ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

SearchableCustomerSelect.displayName = 'SearchableCustomerSelect'
