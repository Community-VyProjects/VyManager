"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FormSkeletonProps {
  /**
   * Number of form fields
   * @default 4
   */
  fields?: number;
  /**
   * Whether to show submit button
   * @default true
   */
  showSubmit?: boolean;
  /**
   * Whether to show cancel button
   * @default false
   */
  showCancel?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

export function FormSkeleton({
  fields = 4,
  showSubmit = true,
  showCancel = false,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
      {(showSubmit || showCancel) && (
        <div className="flex gap-2 pt-4">
          {showCancel && <Skeleton className="h-10 w-24" />}
          {showSubmit && <Skeleton className="h-10 w-28" />}
        </div>
      )}
    </div>
  );
}

/**
 * Single form field skeleton
 */
export function FormFieldSkeleton({
  labelWidth = "w-24",
  inputType = "text",
  className,
}: {
  labelWidth?: string;
  inputType?: "text" | "textarea" | "select" | "checkbox" | "switch";
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className={cn("h-4", labelWidth)} />
      {inputType === "textarea" ? (
        <Skeleton className="h-24 w-full" />
      ) : inputType === "checkbox" || inputType === "switch" ? (
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : inputType === "select" ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Skeleton className="h-10 w-full" />
      )}
    </div>
  );
}

/**
 * Two-column form skeleton
 */
export function FormSkeletonTwoColumn({
  rows = 3,
  showSubmit = true,
  className,
}: {
  rows?: number;
  showSubmit?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
      ))}
      {showSubmit && (
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      )}
    </div>
  );
}

/**
 * Modal/Dialog form skeleton
 */
export function ModalFormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Fields */}
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <FormFieldSkeleton key={i} />
        ))}
      </div>
      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
