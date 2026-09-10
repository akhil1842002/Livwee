import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-medium text-[11px] px-2 py-0.5',
  {
    variants: {
      variant: {
        success: 'bg-orbit-success/15 text-emerald-400',
        warning: 'bg-orbit-warning/15 text-amber-400',
        danger:  'bg-orbit-danger/15 text-red-400',
        info:    'bg-orbit-info/15 text-blue-400',
        primary: 'bg-orbit-primary/15 text-orbit-primary-light',
        accent:  'bg-orbit-accent/15 text-cyan-400',
        neutral: 'bg-orbit-surface3 text-slate-400 border border-orbit-border',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            {
              success: 'bg-emerald-400',
              warning: 'bg-amber-400',
              danger: 'bg-red-400',
              info: 'bg-blue-400',
              primary: 'bg-orbit-primary',
              accent: 'bg-cyan-400',
              neutral: 'bg-slate-400',
            }[variant ?? 'neutral']
          )}
        />
      )}
      {children}
    </span>
  )
}
