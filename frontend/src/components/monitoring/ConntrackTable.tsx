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
import {
  ConntrackEntry,
  ConntrackEvent,
  parseConntrackLine,
  parseChunks,
} from "@/lib/monitoring/parsers";
import { cn } from "@/lib/utils";

interface ConntrackTableProps {
  output: string[];
  isRunning: boolean;
  onClear: () => void;
}

const MAX_ENTRIES = 1000;

const EVENT_STYLES: Record<ConntrackEvent, string> = {
  NEW:     "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  UPDATE:  "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  DESTROY: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  unknown: "bg-muted text-muted-foreground border-border",
};

const PROTO_STYLES: Record<string, string> = {
  TCP:   "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  UDP:   "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  ICMP:  "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
};

function EventBadge({ event }: { event: ConntrackEvent }) {
  const style = EVENT_STYLES[event] ?? EVENT_STYLES.unknown;
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", style)}>
      {event}
    </Badge>
  );
}

function ProtoBadge({ proto }: { proto: string }) {
  const style = PROTO_STYLES[proto.toUpperCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-mono", style)}>
      {proto}
    </Badge>
  );
}

interface ContextMenuState { x: number; y: number; value: string }

export function ConntrackTable({ output, isRunning, onClear }: ConntrackTableProps) {
  const [entries, setEntries] = useState<ConntrackEntry[]>([]);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<ConntrackEvent | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ConntrackEntry | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const parsedOffsetRef = useRef(0);
  const idCounterRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const newChunks = output.slice(parsedOffsetRef.current);
    parsedOffsetRef.current = output.length;
    if (newChunks.length === 0) return;

    const newEntries = parseChunks(newChunks, (line, id) => parseConntrackLine(line, id), idCounterRef.current);
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

  const eventCounts = useMemo(() => {
    const counts: Partial<Record<ConntrackEvent, number>> = {};
    for (const e of entries) {
      counts[e.event] = (counts[e.event] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (eventFilter) result = result.filter((e) => e.event === eventFilter);
    if (search.trim()) {
      const terms = search.trim().toLowerCase().split(/\s+/);
      result = result.filter((e) => {
        const haystack = `${e.srcIp} ${e.srcPort} ${e.dstIp} ${e.dstPort} ${e.proto} ${e.state} ${e.event}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
    }
    return result;
  }, [entries, eventFilter, search]);

  const exportCSV = () => {
    const headers = ["Time", "Event", "Protocol", "State", "Src IP", "Src Port", "Dst IP", "Dst Port", "Reply Src", "Reply Dst"];
    const rows = filteredEntries.map((e) => [
      e.timestamp, e.event, e.proto, e.state,
      e.srcIp, e.srcPort, e.dstIp, e.dstPort,
      `${e.replySrcIp}:${e.replySrcPort}`, `${e.replyDstIp}:${e.replyDstPort}`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conntrack-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
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

  const activeEvents: ConntrackEvent[] = (["NEW", "UPDATE", "DESTROY"] as ConntrackEvent[]).filter(
    (e) => eventCounts[e]
  );

  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/30 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
          <span className="text-xs font-medium text-muted-foreground">
            {entries.length.toLocaleString()} events
          </span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {activeEvents.map((ev) => (
            <button
              key={ev}
              onClick={() => setEventFilter(eventFilter === ev ? null : ev)}
              className={cn(
                "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                eventFilter === ev
                  ? EVENT_STYLES[ev]
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {ev} {eventCounts[ev]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter events…"
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
              <TableHead className="w-[80px] text-xs py-2">Time</TableHead>
              <TableHead className="w-[90px] text-xs py-2">Event</TableHead>
              <TableHead className="w-[70px] text-xs py-2">Proto</TableHead>
              <TableHead className="text-xs py-2">Source</TableHead>
              <TableHead className="text-xs py-2">Destination</TableHead>
              <TableHead className="w-[130px] text-xs py-2">State</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-muted-foreground text-sm">
                  {isRunning ? "Waiting for connection events…" : entries.length > 0 ? "No events match filter" : "Start monitoring to view connections"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;
                return (
                  <TableRow
                    key={entry.id}
                    onClick={() => setSelectedEntry(isSelected ? null : entry)}
                    onContextMenu={(e) => handleContextMenu(e, entry.srcIp)}
                    className={cn("cursor-pointer text-xs", isSelected && "bg-muted/60")}
                  >
                    <TableCell className="font-mono py-1.5 text-muted-foreground text-[11px] whitespace-nowrap">
                      {entry.timestamp}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <EventBadge event={entry.event} />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <ProtoBadge proto={entry.proto} />
                    </TableCell>
                    <TableCell
                      className="py-1.5 font-mono text-xs"
                      onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, `${entry.srcIp}:${entry.srcPort}`); }}
                    >
                      <span>{entry.srcIp}</span>
                      {entry.srcPort && <span className="text-muted-foreground">:{entry.srcPort}</span>}
                    </TableCell>
                    <TableCell
                      className="py-1.5 font-mono text-xs"
                      onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, `${entry.dstIp}:${entry.dstPort}`); }}
                    >
                      <span>{entry.dstIp}</span>
                      {entry.dstPort && <span className="text-muted-foreground">:{entry.dstPort}</span>}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {entry.state ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono border-border text-muted-foreground">
                          {entry.state}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
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
            <span className="text-xs font-medium text-muted-foreground">Connection Details</span>
            <button onClick={() => setSelectedEntry(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {[
                { label: "Timestamp", value: selectedEntry.timestamp },
                { label: "Event", value: selectedEntry.event },
                { label: "Protocol", value: selectedEntry.proto },
                { label: "State", value: selectedEntry.state || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-mono">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Forward Flow</p>
                <p className="text-xs font-mono">
                  {selectedEntry.srcIp}:{selectedEntry.srcPort} <span className="text-muted-foreground">→</span> {selectedEntry.dstIp}:{selectedEntry.dstPort}
                </p>
              </div>
              {(selectedEntry.replySrcIp || selectedEntry.replyDstIp) && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reply Flow</p>
                  <p className="text-xs font-mono">
                    {selectedEntry.replySrcIp}:{selectedEntry.replySrcPort} <span className="text-muted-foreground">→</span> {selectedEntry.replyDstIp}:{selectedEntry.replyDstPort}
                  </p>
                </div>
              )}
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
