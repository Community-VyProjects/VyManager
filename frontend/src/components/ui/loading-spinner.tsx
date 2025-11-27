import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  message = "Loading...",
  className,
  size = "md"
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("flex items-center justify-center h-full", className)}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={cn(sizeClasses[size], "animate-spin text-muted-foreground")} />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
