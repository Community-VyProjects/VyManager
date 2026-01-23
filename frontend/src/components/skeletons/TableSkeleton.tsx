"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  /**
   * Number of rows to display
   * @default 5
   */
  rows?: number;
  /**
   * Number of columns to display
   * @default 4
   */
  columns?: number;
  /**
   * Whether to show the table header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether to show actions column (last column narrower)
   * @default false
   */
  showActions?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  showActions = false,
  className,
}: TableSkeletonProps) {
  const actualColumns = showActions ? columns + 1 : columns;

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array.from({ length: actualColumns }).map((_, i) => (
                <TableHead
                  key={i}
                  className={cn(
                    showActions && i === actualColumns - 1 && "w-[100px]"
                  )}
                >
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: actualColumns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {showActions && colIndex === actualColumns - 1 ? (
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  ) : (
                    <Skeleton
                      className={cn(
                        "h-4",
                        colIndex === 0 ? "w-32" : "w-24"
                      )}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Compact table skeleton for smaller tables
 */
export function TableSkeletonCompact({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
