import * as React from 'react'
import { cn } from '@/lib/utils'

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400',
        className
      )}
      {...props}
    />
  )
)
Alert.displayName = 'Alert'

export { Alert }
