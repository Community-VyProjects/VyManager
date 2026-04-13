import * as React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("p-4 sm:p-6 space-y-6", className)}>
      {children}
    </div>
  )
}

export { PageContainer }
export type { PageContainerProps }
