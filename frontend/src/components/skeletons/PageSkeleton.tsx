"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeletonGrid, PanelSkeleton } from "./CardSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /**
   * Page layout type
   */
  layout?: "default" | "table" | "dashboard" | "form";
  /**
   * Whether to show page title
   * @default true
   */
  showTitle?: boolean;
  /**
   * Whether to show breadcrumb
   * @default false
   */
  showBreadcrumb?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

export function PageSkeleton({
  layout = "default",
  showTitle = true,
  showBreadcrumb = false,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Breadcrumb */}
      {showBreadcrumb && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <span className="text-muted-foreground">/</span>
          <Skeleton className="h-4 w-24" />
        </div>
      )}

      {/* Page Header */}
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {/* Content based on layout */}
      {layout === "table" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <TableSkeleton rows={8} columns={5} showActions />
        </>
      )}

      {layout === "dashboard" && (
        <>
          <CardSkeletonGrid count={4} columns={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PanelSkeleton>
              <Skeleton className="h-64 w-full" />
            </PanelSkeleton>
            <PanelSkeleton>
              <Skeleton className="h-64 w-full" />
            </PanelSkeleton>
          </div>
        </>
      )}

      {layout === "form" && (
        <PanelSkeleton>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </PanelSkeleton>
      )}

      {layout === "default" && (
        <PanelSkeleton>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </PanelSkeleton>
      )}
    </div>
  );
}

/**
 * Sidebar skeleton for navigation loading
 */
export function SidebarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Nav items */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}

      {/* Separator */}
      <Skeleton className="h-px w-full my-4" />

      {/* More nav items */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
