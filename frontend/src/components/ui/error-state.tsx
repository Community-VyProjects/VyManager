import * as React from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex items-center justify-center h-96", className)}>
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive/60 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

export { ErrorState }
export type { ErrorStateProps }
