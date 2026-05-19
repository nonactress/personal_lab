import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono border',
  {
    variants: {
      variant: {
        critical: 'bg-red-500/10 text-red-400 border-red-500/20',
        warning:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
        info:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
        default:  'bg-slate-800 text-slate-300 border-slate-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
