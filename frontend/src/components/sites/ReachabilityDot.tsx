"use client";

import { ReachabilityState } from "@/lib/api/system-updates";
import { cn } from "@/lib/utils";

interface ReachabilityDotProps {
  state: ReachabilityState;
  showLabel?: boolean;
  className?: string;
}

const META: Record<
  ReachabilityState,
  { dot: string; text: string; label: string; pulse: boolean }
> = {
  reachable: {
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    label: "Online",
    pulse: false,
  },
  unreachable: {
    dot: "bg-destructive",
    text: "text-destructive",
    label: "Unreachable",
    pulse: false,
  },
  inactive: {
    dot: "bg-gray-400",
    text: "text-muted-foreground",
    label: "Inactive",
    pulse: false,
  },
  unknown: {
    dot: "bg-gray-400",
    text: "text-muted-foreground",
    label: "Checking…",
    pulse: true,
  },
};

/**
 * Small colored status dot indicating whether an instance is reachable via the
 * VyOS API with its stored credentials. Driven by the site-updates fan-out.
 */
export function ReachabilityDot({
  state,
  showLabel = false,
  className,
}: ReachabilityDotProps) {
  const m = META[state];
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={`API: ${m.label}`}
    >
      <span
        className={cn("h-2 w-2 rounded-full shrink-0", m.dot, m.pulse && "animate-pulse")}
      />
      {showLabel && (
        <span className={cn("text-xs font-medium", m.text)}>{m.label}</span>
      )}
    </span>
  );
}
