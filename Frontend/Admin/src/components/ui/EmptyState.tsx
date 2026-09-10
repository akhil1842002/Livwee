import React from 'react'
import { FolderOpen, LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  colSpan?: number
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No Data Found',
  description = 'There are currently no records to display in this table.',
  actionLabel,
  onAction,
  colSpan
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center my-2">
      <div className="w-14 h-14 rounded-2xl bg-orbit-primary/10 border border-orbit-primary/20 flex items-center justify-center text-orbit-primary-light mb-3 shadow-inner">
        <Icon className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-orbit-primary hover:bg-orbit-primary-light text-white shadow-md shadow-orbit-primary/30 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          {content}
        </td>
      </tr>
    )
  }

  return content
}
