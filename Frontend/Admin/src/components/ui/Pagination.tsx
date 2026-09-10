import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50, 100]
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems)

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (safeCurrentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  const navBtnClass = 'p-1.5 rounded-lg border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-slate-500 dark:text-slate-400 hover:text-orbit-primary-light hover:border-orbit-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
  const navLabelBtnClass = 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-orbit-border bg-white dark:bg-orbit-surface text-slate-500 dark:text-slate-400 hover:text-orbit-primary-light hover:border-orbit-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-orbit-border bg-slate-50/80 dark:bg-orbit-surface2/60 text-xs transition-colors duration-200">
      {/* Items count & per-page selector */}
      <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400">
        <span>Showing</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">{startItem}</span>
        <span>to</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">{endItem}</span>
        <span>of</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems}</span>
        <span>entries</span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-orbit-border">
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">Per page:</span>
            <div className="relative flex items-center">
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value))
                  onPageChange(1)
                }}
                className="appearance-none bg-white dark:bg-orbit-surface border border-slate-200 dark:border-orbit-border text-slate-800 dark:text-slate-100 rounded-lg pl-2.5 pr-7 py-1 text-xs font-semibold focus:outline-none focus:border-orbit-primary focus:ring-2 focus:ring-orbit-primary/20 cursor-pointer transition-all shadow-sm"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size} className="bg-white text-slate-900 dark:bg-orbit-surface dark:text-slate-100">
                    {size} items
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={safeCurrentPage === 1} title="First Page" className={navBtnClass}>
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button onClick={() => onPageChange(safeCurrentPage - 1)} disabled={safeCurrentPage === 1} title="Previous Page" className={`${navLabelBtnClass} mr-1`}>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {typeof page === 'number' ? (
              <button
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
                  safeCurrentPage === page
                    ? 'bg-orbit-primary border-orbit-primary text-white shadow-md shadow-orbit-primary/30'
                    : 'bg-white dark:bg-orbit-surface border-slate-200 dark:border-orbit-border text-slate-700 dark:text-slate-400 hover:text-orbit-primary-light hover:border-orbit-primary/40 hover:bg-orbit-primary/5'
                }`}
              >
                {page}
              </button>
            ) : (
              <span className="px-1 text-slate-400 font-bold select-none">...</span>
            )}
          </React.Fragment>
        ))}

        <button onClick={() => onPageChange(safeCurrentPage + 1)} disabled={safeCurrentPage === totalPages} title="Next Page" className={`${navLabelBtnClass} ml-1`}>
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button onClick={() => onPageChange(totalPages)} disabled={safeCurrentPage === totalPages} title="Last Page" className={navBtnClass}>
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
