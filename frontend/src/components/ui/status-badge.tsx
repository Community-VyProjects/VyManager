import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        success:
          "bg-success/10 text-success border border-success/20",
        warning:
          "bg-warning/10 text-warning-foreground border border-warning/20",
        error:
          "bg-destructive/10 text-destructive border border-destructive/20",
        info:
          "bg-primary/10 text-primary border border-primary/20",
        neutral:
          "bg-muted text-muted-foreground border border-border",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean
}

function StatusBadge({
  status,
  dot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-success": status === "success",
            "bg-warning": status === "warning",
            "bg-destructive": status === "error",
            "bg-primary": status === "info",
            "bg-muted-foreground": status === "neutral",
          })}
        />
      )}
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
export type { StatusBadgeProps }
