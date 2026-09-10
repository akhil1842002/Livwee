import { cn } from '@/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  gradient?: boolean
}

export function Card({ className, glass, gradient, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-orbit-border bg-orbit-surface',
        glass && 'glass',
        gradient && 'gradient-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function CardHeader({ title, subtitle, actions, className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between px-5 pt-5', className)} {...props}>
      {(title || subtitle) ? (
        <div>
          {title && <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      ) : children}
      {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 pb-5 pt-0 border-t border-orbit-border mt-2 pt-4', className)} {...props}>
      {children}
    </div>
  )
}
