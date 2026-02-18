"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Trash2, X } from "lucide-react";
import { LogEntry, LogSeverity, parseLogLine, parseChunks } from "@/lib/monitoring/parsers";
import { cn } from "@/lib/utils";

interface LogTableProps {
  output: string[];
  isRunning: boolean;
  onClear: () => void;
}

const MAX_ENTRIES = 2000;

const SEVERITY_STYLES: Record<LogSeverity, string> = {
  emergency: "bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-400",
  alert:     "bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-400",
  critical:  "bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-400",
  error:     "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  warning:   "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  notice:    "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  info:      "bg-blue-500/5 text-blue-600 border-blue-500/15 dark:text-blue-400",
  debug:     "bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400",
  unknown:   "bg-muted text-muted-foreground border-border",
};

const SEVERITY_ORDER: LogSeverity[] = [
  "emergency", "alert", "critical", "error", "warning", "notice", "info", "debug", "unknown",
];

function SeverityBadge({ severity }: { severity: LogSeverity }) {
  const style = SEVERITY_STYLES[severity];
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium capitalize", style)}>
      {severity}
    </Badge>
  );
}

interface ContextMenuState { x: number; y: number; value: string }

export function LogTable({ output, isRunning, onClear }: LogTableProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<LogSeverity | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const parsedOffsetRef = useRef(0);
  const idCounterRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const newChunks = output.slice(parsedOffsetRef.current);
    parsedOffsetRef.current = output.length;
    if (newChunks.length === 0) return;

    const newEntries = parseChunks(newChunks, (line, id) => parseLogLine(line, id), idCounterRef.current);
    idCounterRef.current += newChunks.reduce((acc, c) => acc + c.split("\n").length, 0);
    if (newEntries.length === 0) return;

    setEntries((prev) => {
      const combined = [...prev, ...newEntries];
      return combined.length > MAX_ENTRIES ? combined.slice(-MAX_ENTRIES) : combined;
    });
  }, [output]);

  useEffect(() => {
    if (scrollRef.current && autoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent, value: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, value });
  }, []);

  const addToFilter = (value: string) => {
    setSearch((prev) => (prev ? `${prev} ${value}` : value));
    setContextMenu(null);
  };

  // Severity counts for quick filters
  const severityCounts = useMemo(() => {
    const counts: Partial<Record<LogSeverity, number>> = {};
    for (const e of entries) {
      counts[e.severity] = (counts[e.severity] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (severityFilter) result = result.filter((e) => e.severity === severityFilter);
    if (search.trim()) {
      const terms = search.trim().toLowerCase().split(/\s+/);
      result = result.filter((e) => {
        const haystack = `${e.timestamp} ${e.process} ${e.message} ${e.severity}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
    }
    return result;
  }, [entries, severityFilter, search]);

  const errorCount = useMemo(
    () =>
      (severityCounts.emergency ?? 0) +
      (severityCounts.alert ?? 0) +
      (severityCounts.critical ?? 0) +
      (severityCounts.error ?? 0),
    [severityCounts]
  );

  const exportCSV = () => {
    const headers = ["Timestamp", "Severity", "Hostname", "Process", "PID", "Message"];
    const rows = filteredEntries.map((e) => [
      e.timestamp, e.severity, e.hostname, e.process, e.pid,
      `"${e.message.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleClear = () => {
    setEntries([]);
    parsedOffsetRef.current = output.length;
    setSelectedEntry(null);
    onClear();
  };

  const activeSeverities = SEVERITY_ORDER.filter((s) => severityCounts[s]);

  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/30 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
          <span className="text-xs font-medium text-muted-foreground">
            {entries.length.toLocaleString()} entries
          </span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Severity filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {activeSeverities.map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(severityFilter === sev ? null : sev)}
              className={cn(
                "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize transition-colors",
                severityFilter === sev
                  ? SEVERITY_STYLES[sev]
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {sev} {severityCounts[sev]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter entries…"
              className="h-7 pl-6 pr-2 text-xs w-44"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={exportCSV} disabled={entries.length === 0} title="Export CSV">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={handleClear} disabled={entries.length === 0} title="Clear">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div ref={scrollRef} onScroll={handleScroll} className="overflow-auto" style={{ maxHeight: 480 }}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[150px] text-xs py-2">Timestamp</TableHead>
              <TableHead className="w-[90px] text-xs py-2">Severity</TableHead>
              <TableHead className="w-[110px] text-xs py-2">Process</TableHead>
              <TableHead className="text-xs py-2">Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center text-muted-foreground text-sm">
                  {isRunning ? "Waiting for log entries…" : entries.length > 0 ? "No entries match filter" : "Start monitoring to view logs"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;
                return (
                  <TableRow
                    key={entry.id}
                    onClick={() => setSelectedEntry(isSelected ? null : entry)}
                    onContextMenu={(e) => handleContextMenu(e, entry.message)}
                    className={cn("cursor-pointer text-xs", isSelected && "bg-muted/60")}
                  >
                    <TableCell className="font-mono py-1.5 text-muted-foreground whitespace-nowrap">
                      {entry.timestamp}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <SeverityBadge severity={entry.severity} />
                    </TableCell>
                    <TableCell
                      className="py-1.5 font-mono"
                      onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, entry.process); }}
                    >
                      <span className="text-xs">
                        {entry.process}
                        {entry.pid && <span className="text-muted-foreground">[{entry.pid}]</span>}
                      </span>
                    </TableCell>
                    <TableCell
                      className="py-1.5 max-w-0"
                      onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, entry.message); }}
                    >
                      <p className="truncate text-xs">{entry.message}</p>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Panel */}
      {selectedEntry && (
        <div className="border-t bg-muted/20">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <span className="text-xs font-medium text-muted-foreground">Log Entry Details</span>
            <button onClick={() => setSelectedEntry(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {[
                { label: "Timestamp", value: selectedEntry.timestamp },
                { label: "Severity", value: selectedEntry.severity },
                { label: "Hostname", value: selectedEntry.hostname || "—" },
                { label: "Process", value: selectedEntry.pid ? `${selectedEntry.process}[${selectedEntry.pid}]` : selectedEntry.process },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-mono">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Message</p>
              <p className="text-xs font-mono break-all">{selectedEntry.message}</p>
            </div>
            <div className="space-y-0.5 border-t border-border/50 pt-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Raw Line</p>
              <p className="text-[11px] font-mono text-muted-foreground break-all bg-muted/50 rounded p-2">{selectedEntry.raw}</p>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 min-w-[200px] rounded-lg border bg-popover shadow-lg p-1" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="px-2 py-1 mb-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Value</p>
              <p className="text-xs font-mono truncate max-w-[200px]">{contextMenu.value}</p>
            </div>
            <div className="h-px bg-border mb-1" />
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left" onClick={() => addToFilter(contextMenu.value)}>
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              Add to filter
            </button>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left" onClick={() => { navigator.clipboard.writeText(contextMenu.value).catch(() => {}); setContextMenu(null); }}>
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              Copy value
            </button>
          </div>
        </>
      )}
    </div>
  );
}
