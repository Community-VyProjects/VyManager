"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowUpCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  MinusCircle,
  PackageSearch,
  Search,
} from "lucide-react";
import {
  InstanceUpdateStatus,
  SiteUpdatesSummary,
} from "@/lib/api/system-updates";
import { cn } from "@/lib/utils";

interface SiteUpdatesPanelProps {
  summary: SiteUpdatesSummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function statusBadge(inst: InstanceUpdateStatus) {
  switch (inst.status) {
    case "ok":
      return inst.update_available ? (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <ArrowUpCircle className="h-3 w-3" />
          {inst.available_version ?? "Update available"}
        </Badge>
      ) : (
        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Up to date
        </Badge>
      );
    case "not_configured":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <MinusCircle className="h-3 w-3" />
          Not configured
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <MinusCircle className="h-3 w-3" />
          Inactive
        </Badge>
      );
    default: // unreachable | error
      return (
        <Badge variant="secondary" className="bg-destructive/15 text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Unreachable
        </Badge>
      );
  }
}

export function SiteUpdatesPanel({
  summary,
  loading,
  error,
  onRefresh,
}: SiteUpdatesPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!summary) return [];
    const q = query.trim().toLowerCase();
    if (!q) return summary.instances;
    return summary.instances.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.host.toLowerCase().includes(q) ||
        (i.current_version ?? "").toLowerCase().includes(q) ||
        (i.available_version ?? "").toLowerCase().includes(q)
    );
  }, [summary, query]);

  // Nothing to show until we have a first result (avoid layout jump on empty sites).
  if (!summary && loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking for updates…
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Retry
        </Button>
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return null;
  }

  return (
    <>
      {/* Compact summary bar — opens the modal for the full, searchable list. */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
        <button
          className="flex items-center gap-3 text-left min-w-0"
          onClick={() => setOpen(true)}
        >
          <PackageSearch className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">
            {summary.with_updates > 0 ? (
              <>
                {summary.with_updates} of {summary.total}{" "}
                {summary.total === 1 ? "router" : "routers"} have updates available
              </>
            ) : (
              <>All routers up to date</>
            )}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {summary.with_updates > 0 && (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {summary.with_updates} update{summary.with_updates === 1 ? "" : "s"}
              </Badge>
            )}
            {summary.unreachable > 0 && (
              <Badge variant="secondary" className="bg-destructive/15 text-destructive">
                {summary.unreachable} unreachable
              </Badge>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            View all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Re-check all instances"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5" />
              Update status
            </DialogTitle>
            <DialogDescription>
              {summary.with_updates} of {summary.total} instances have updates
              available
              {summary.unreachable > 0 ? ` · ${summary.unreachable} unreachable` : ""}
              {summary.not_configured > 0
                ? ` · ${summary.not_configured} not configured`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search instances…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Scrollable list */}
          <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1 rounded-md border border-border divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No instances match “{query}”.
              </div>
            ) : (
              filtered.map((inst) => (
                <div
                  key={inst.instance_id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inst.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {inst.host}
                      {inst.current_version ? ` · v${inst.current_version}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(inst)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {summary.total} shown
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Re-check all
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
