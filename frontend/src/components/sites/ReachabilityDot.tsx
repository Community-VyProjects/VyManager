"use client";

import { useTranslations } from "next-intl";
import { ReachabilityState } from "@/lib/api/system-updates";
import { cn } from "@/lib/utils";

interface ReachabilityDotProps {
  state: ReachabilityState;
  showLabel?: boolean;
  className?: string;
}

const META: Record<
  ReachabilityState,
  { dot: string; text: string; pulse: boolean }
> = {
  reachable: {
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    pulse: false,
  },
  unreachable: {
    dot: "bg-destructive",
    text: "text-destructive",
    pulse: false,
  },
  inactive: {
    dot: "bg-gray-400",
    text: "text-muted-foreground",
    pulse: false,
  },
  unknown: {
    dot: "bg-gray-400",
    text: "text-muted-foreground",
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
  const t = useTranslations("sites");
  const m = META[state];
  const label = t(`reachability.${state}`);
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={t("reachability.title", { label })}
    >
      <span
        className={cn("h-2 w-2 rounded-full shrink-0", m.dot, m.pulse && "animate-pulse")}
      />
      {showLabel && (
        <span className={cn("text-xs font-medium", m.text)}>{label}</span>
      )}
    </span>
  );
}
