import { useState, useRef, useEffect } from 'react'
import { Search, Package, ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { CatalogProduct } from '@/data/sharedData'

export interface SearchableProductSelectProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  products: CatalogProduct[]
  selectedId?: string
  onSelect: (product: CatalogProduct | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchableProductSelect({
  label,
  required,
  error,
  hint,
  products,
  selectedId,
  onSelect,
  placeholder = 'Search and select product...',
  disabled,
  className,
}: SearchableProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeProducts = products.filter(p => {
    const st = String((p as any).status || '').trim().toUpperCase()
    return st !== 'INACTIVE' && st !== 'BLOCKED' && st !== 'DISABLED' && (p as any).visibility !== false
  })

  const selected = products.find(p => p.id === selectedId) ?? null

  const filtered = query.trim()
    ? activeProducts.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(query.toLowerCase())
      )
    : activeProducts

  // Close on outside click
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

  const handleSelect = (product: CatalogProduct) => {
    onSelect(product)
    setIsOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(null)
  }

  return (
    <div className={cn('w-full relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpen}
        onKeyDown={e => e.key === 'Enter' && handleOpen()}
        className={cn(
          'flex items-center gap-2 h-10 overflow-hidden rounded-xl border px-3.5 cursor-pointer transition-all duration-150 shadow-sm select-none',
          'bg-white dark:bg-orbit-surface',
          'border-slate-200 dark:border-orbit-border hover:border-slate-300 dark:hover:border-orbit-border2',
          isOpen && 'border-orbit-primary dark:border-orbit-primary ring-2 ring-orbit-primary/20 bg-white dark:bg-orbit-surface',
          error && 'border-rose-500 ring-2 ring-rose-500/20',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
        )}
      >
        <Package className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />

        {selected ? (
          <>
            <span className="flex-1 min-w-0 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-none">
              {selected.name}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:inline-block">
              {selected.sku}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <>
            <span className="flex-1 text-xs sm:text-sm text-slate-400 dark:text-slate-500 truncate">
              {placeholder}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-200',
                isOpen && 'rotate-180 text-orbit-primary-light dark:text-orbit-primary-light'
              )}
            />
          </>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100 dark:border-orbit-border">
            <div className="flex items-center gap-2 px-2.5 h-9 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-orbit-border focus-within:ring-1 focus-within:ring-orbit-primary focus-within:border-orbit-primary">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search by name, SKU..."
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none min-w-0"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-slate-500 text-center">
                No products match "{query}"
              </li>
            ) : (
              filtered.map(product => (
                <li
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-orbit-primary/5 dark:hover:bg-orbit-primary/10 transition-colors group',
                    product.id === selectedId && 'bg-orbit-primary/5 dark:bg-orbit-primary/10'
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-orbit-primary/10 dark:bg-orbit-primary/15 flex items-center justify-center flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-orbit-primary-light dark:text-orbit-primary-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs font-semibold text-slate-900 dark:text-slate-100 truncate',
                      product.id === selectedId && 'text-orbit-primary dark:text-orbit-primary-light'
                    )}>
                      {product.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 leading-tight">
                      {product.sku} · {product.category}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">₹{product.sellingPrice}</p>
                    <p className="text-[10px] text-slate-400">{product.taxName}</p>
                  </div>
                </li>
              ))
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

SearchableProductSelect.displayName = 'SearchableProductSelect'
