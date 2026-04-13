import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  className?: string
  fullPage?: boolean
}

function LoadingState({ message = "Loading...", className, fullPage }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullPage ? "h-screen" : "h-96",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export { LoadingState }
export type { LoadingStateProps }
