"use client";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  /**
   * Whether to show the card header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether to show the card description
   * @default false
   */
  showDescription?: boolean;
  /**
   * Whether to show action button in header
   * @default false
   */
  showAction?: boolean;
  /**
   * Number of content lines
   * @default 3
   */
  contentLines?: number;
  /**
   * Additional class name
   */
  className?: string;
}

export function CardSkeleton({
  showHeader = true,
  showDescription = false,
  showAction = false,
  contentLines = 3,
  className,
}: CardSkeletonProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              {showDescription && <Skeleton className="h-4 w-48" />}
            </div>
            {showAction && <Skeleton className="h-9 w-24" />}
          </div>
        </CardHeader>
      )}
      <CardContent>
        <SkeletonText lines={contentLines} />
      </CardContent>
    </Card>
  );
}

/**
 * Stats card skeleton (for dashboard metrics)
 */
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-2 w-full mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Grid of card skeletons
 */
export function CardSkeletonGrid({
  count = 3,
  columns = 3,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridClasses[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Panel skeleton with title and content
 */
export function PanelSkeleton({
  showTitle = true,
  children,
  className,
}: {
  showTitle?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
      )}
      {children || <SkeletonText lines={5} />}
    </div>
  );
}
