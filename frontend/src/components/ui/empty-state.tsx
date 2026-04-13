import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  message?: string
  action?: React.ReactNode
  className?: string
}

function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <div className="text-center max-w-md">
        {icon && (
          <div className="mx-auto mb-4 text-muted-foreground/30">{icon}</div>
        )}
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        {message && (
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
        )}
        {action}
      </div>
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
