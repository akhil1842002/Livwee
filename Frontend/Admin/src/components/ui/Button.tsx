import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-primary focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-bg disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-orbit-primary text-white hover:bg-orbit-primary-light shadow-sm shadow-orbit-primary/20 hover:shadow-orbit-primary/30 hover:shadow-md active:scale-[0.98]',
        secondary:
          'bg-orbit-surface3 text-slate-800 dark:text-slate-200 hover:bg-orbit-border2 border border-orbit-border active:scale-[0.98]',
        ghost:
          'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-orbit-surface2 active:scale-[0.98]',
        outline:
          'border border-orbit-border text-slate-700 dark:text-slate-300 hover:border-orbit-border2 hover:bg-orbit-surface2 active:scale-[0.98]',
        destructive:
          'bg-orbit-danger/10 text-orbit-danger border border-orbit-danger/20 hover:bg-orbit-danger/20 active:scale-[0.98]',
        accent:
          'bg-orbit-accent text-orbit-bg font-semibold hover:bg-orbit-accent-light shadow-sm shadow-orbit-accent/20 active:scale-[0.98]',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-sm',
        xl: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, iconPosition = 'left', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && (
          <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
