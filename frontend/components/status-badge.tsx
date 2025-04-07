import { cn } from "@/lib/utils"

type StatusType = "connected" | "disconnected" | "error" | "warning"

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    connected: {
      color: "bg-green-500",
      text: "Connected"
    },
    disconnected: {
      color: "bg-red-500",
      text: "Disconnected"
    },
    error: {
      color: "bg-red-500",
      text: "Error"
    },
    warning: {
      color: "bg-yellow-500",
      text: "Warning"
    }
  }

  const config = statusConfig[status]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("flex h-2 w-2 rounded-full", config.color)} />
      <span className="text-xs font-medium">{config.text}</span>
    </div>
  )
} 