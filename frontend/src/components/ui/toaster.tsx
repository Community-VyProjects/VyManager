"use client";

import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToastStore } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-top-5",
            "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            toast.variant === "destructive" && "border-red-500/50 bg-red-50 dark:bg-red-950/30",
            toast.variant === "success" && "border-green-500/50 bg-green-50 dark:bg-green-950/30",
            toast.variant === "default" && "border-border"
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.variant === "success" && (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            {toast.variant === "destructive" && (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            {toast.variant === "default" && (
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{toast.title}</p>
            {toast.description && (
              <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
