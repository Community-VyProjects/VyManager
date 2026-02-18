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
import {
  Download,
  Pause,
  Play,
  Search,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TrafficEntry, parseTrafficLine, parseChunks } from "@/lib/monitoring/parsers";
import { cn } from "@/lib/utils";

// ─── PCAP binary export ───────────────────────────────────────────────────────

function parseIp4(ip: string): Uint8Array {
  const out = new Uint8Array(4);
  const parts = ip.split(".").map(Number);
  if (parts.length === 4) {
    for (let i = 0; i < 4; i++) out[i] = isNaN(parts[i]) ? 0 : parts[i] & 0xff;
  }
  return out;
}

function parsePortNum(port: string): number {
  const n = parseInt(port, 10);
  return isNaN(n) ? 0 : n & 0xffff;
}

function parseTcpFlagBits(flags: string): number {
  let bits = 0;
  if (flags.includes("F")) bits |= 0x01;
  if (flags.includes("S")) bits |= 0x02;
  if (flags.includes("R")) bits |= 0x04;
  if (flags.includes("P")) bits |= 0x08;
  if (flags.includes(".")) bits |= 0x10; // ACK
  if (flags.includes("U")) bits |= 0x20;
  if (flags.includes("E")) bits |= 0x40;
  if (flags.includes("W")) bits |= 0x80;
  return bits;
}

function ip4Checksum(dv: DataView, offset: number): number {
  let sum = 0;
  for (let i = 0; i < 20; i += 2) sum += dv.getUint16(offset + i);
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return (~sum) & 0xffff;
}

function buildPacketBytes(entry: TrafficEntry): Uint8Array {
  // Ethernet header (14 bytes) — zeroed MACs + ethertype
  const eth = new Uint8Array(14);

  if (entry.networkProto === "ARP") {
    eth[12] = 0x08; eth[13] = 0x06;
    const arp = new Uint8Array(28);
    const av = new DataView(arp.buffer);
    av.setUint16(0, 1);       // hw_type = Ethernet
    av.setUint16(2, 0x0800);  // proto_type = IPv4
    arp[4] = 6; arp[5] = 4;
    av.setUint16(6, 1);       // opcode = ARP request
    arp.set(parseIp4(entry.srcIp), 14);
    arp.set(parseIp4(entry.dstIp), 24);
    const pkt = new Uint8Array(42); pkt.set(eth); pkt.set(arp, 14);
    return pkt;
  }

  const payloadLen = Math.min(Math.max(0, parseInt(entry.length, 10) || 0), 1460);
  const srcPort = parsePortNum(entry.srcPort);
  const dstPort = parsePortNum(entry.dstPort);

  let transport: Uint8Array;
  if (entry.proto === "TCP") {
    transport = new Uint8Array(20 + payloadLen);
    const tv = new DataView(transport.buffer);
    tv.setUint16(0, srcPort); tv.setUint16(2, dstPort);
    tv.setUint32(4, 0); tv.setUint32(8, 0); // seq, ack
    transport[12] = 0x50;                    // data offset = 5 words
    transport[13] = parseTcpFlagBits(entry.flags);
    tv.setUint16(14, 65535);                 // window
    // checksum left as 0 (Wireshark will flag but still parse)
  } else if (entry.proto === "UDP") {
    transport = new Uint8Array(8 + payloadLen);
    const uv = new DataView(transport.buffer);
    uv.setUint16(0, srcPort); uv.setUint16(2, dstPort);
    uv.setUint16(4, 8 + payloadLen);
  } else if (entry.proto === "ICMP") {
    transport = new Uint8Array(8);
    transport[0] = 8; // echo request
  } else if (entry.proto === "ICMPv6") {
    transport = new Uint8Array(8);
    transport[0] = 128; // echo request (ICMPv6)
  } else {
    transport = new Uint8Array(0);
  }

  if (entry.networkProto === "IP6") {
    eth[12] = 0x86; eth[13] = 0xDD;
    const ipv6 = new Uint8Array(40);
    const iv6 = new DataView(ipv6.buffer);
    iv6.setUint32(0, 0x60000000);         // version=6
    iv6.setUint16(4, transport.length);   // payload length
    ipv6[6] = entry.proto === "TCP" ? 6 : entry.proto === "UDP" ? 17 : entry.proto === "ICMPv6" ? 58 : 59;
    ipv6[7] = 64; // hop limit — src/dst IPv6 addresses left as :: (zeros)
    const pkt = new Uint8Array(14 + 40 + transport.length);
    pkt.set(eth); pkt.set(ipv6, 14); pkt.set(transport, 54);
    return pkt;
  }

  // IPv4
  eth[12] = 0x08; eth[13] = 0x00;
  const ip = new Uint8Array(20);
  const iv = new DataView(ip.buffer);
  ip[0] = 0x45; // version=4, IHL=5
  iv.setUint16(2, 20 + transport.length);
  iv.setUint16(4, 0x1234);  // arbitrary ID
  iv.setUint16(6, 0x4000);  // DF flag
  ip[8] = 64;               // TTL
  ip[9] = entry.proto === "TCP" ? 6 : entry.proto === "UDP" ? 17 : entry.proto === "ICMP" ? 1 : 0;
  ip.set(parseIp4(entry.srcIp), 12);
  ip.set(parseIp4(entry.dstIp), 16);
  iv.setUint16(10, ip4Checksum(iv, 0));

  const pkt = new Uint8Array(14 + 20 + transport.length);
  pkt.set(eth); pkt.set(ip, 14); pkt.set(transport, 34);
  return pkt;
}

function buildPcap(entries: TrafficEntry[]): Uint8Array {
  // Global pcap header (24 bytes)
  const gh = new ArrayBuffer(24);
  const gv = new DataView(gh);
  gv.setUint32(0, 0xa1b2c3d4, true); // magic number (little-endian)
  gv.setUint16(4, 2, true);           // version major
  gv.setUint16(6, 4, true);           // version minor
  gv.setInt32(8, 0, true);            // thiszone
  gv.setUint32(12, 0, true);          // sigfigs
  gv.setUint32(16, 65535, true);      // snaplen
  gv.setUint32(20, 1, true);          // link type = Ethernet

  // Base epoch seconds for today (timestamps are HH:MM:SS without date)
  const now = new Date();
  const dayStartSec = Math.floor(now.getTime() / 1000)
    - now.getHours() * 3600 - now.getMinutes() * 60 - now.getSeconds();

  const chunks: Uint8Array[] = [new Uint8Array(gh)];

  for (const entry of entries) {
    let tsSec = Math.floor(Date.now() / 1000);
    let tsUsec = 0;
    const m = entry.timestamp.match(/^(\d+):(\d+):(\d+)[.,](\d+)$/);
    if (m) {
      tsSec = dayStartSec + parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
      tsUsec = parseInt(m[4].padEnd(6, "0").slice(0, 6), 10);
    }

    const pkt = buildPacketBytes(entry);
    const ph = new ArrayBuffer(16);
    const pv = new DataView(ph);
    pv.setUint32(0, tsSec, true);
    pv.setUint32(4, tsUsec, true);
    pv.setUint32(8, pkt.length, true);
    pv.setUint32(12, pkt.length, true);
    chunks.push(new Uint8Array(ph), pkt);
  }

  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

interface TrafficTableProps {
  output: string[];
  isRunning: boolean;
  iface: string;
  filter: string;
  onClear: () => void;
}

const MAX_ENTRIES = 1000;

const PROTO_STYLES: Record<string, string> = {
  TCP: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  UDP: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  ICMP: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  ICMPv6: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  ARP: "bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400",
};

function ProtoBadge({ proto }: { proto: string }) {
  const style = PROTO_STYLES[proto] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px] px-1.5 py-0", style)}>
      {proto}
    </Badge>
  );
}


interface ContextMenuState {
  x: number;
  y: number;
  value: string;
}

export function TrafficTable({
  output,
  isRunning,
  iface,
  filter,
  onClear,
}: TrafficTableProps) {
  const [entries, setEntries] = useState<TrafficEntry[]>([]);
  const [search, setSearch] = useState("");
  const [protoFilter, setProtoFilter] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TrafficEntry | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const parsedOffsetRef = useRef(0);
  const idCounterRef = useRef(0);
  const bufferRef = useRef<TrafficEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Incremental parsing
  useEffect(() => {
    const newChunks = output.slice(parsedOffsetRef.current);
    parsedOffsetRef.current = output.length;
    if (newChunks.length === 0) return;

    const newEntries = parseChunks(newChunks, (line, id) => parseTrafficLine(line, id), idCounterRef.current);
    idCounterRef.current += newChunks.reduce((acc, c) => acc + c.split("\n").length, 0);

    if (newEntries.length === 0) return;

    if (paused) {
      bufferRef.current = [...bufferRef.current, ...newEntries];
    } else {
      setEntries((prev) => {
        const combined = [...prev, ...newEntries];
        return combined.length > MAX_ENTRIES ? combined.slice(-MAX_ENTRIES) : combined;
      });
    }
  }, [output, paused]);

  // Flush buffer on resume
  const handleResume = () => {
    setPaused(false);
    if (bufferRef.current.length > 0) {
      setEntries((prev) => {
        const combined = [...prev, ...bufferRef.current];
        bufferRef.current = [];
        return combined.length > MAX_ENTRIES ? combined.slice(-MAX_ENTRIES) : combined;
      });
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && autoScrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, paused]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, value: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, value });
    },
    []
  );

  const addToFilter = (value: string) => {
    setSearch((prev) => (prev ? `${prev} ${value}` : value));
    setContextMenu(null);
  };

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setContextMenu(null);
  };

  // Protocol counts
  const protoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.proto] = (counts[e.proto] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  // Filtered rows
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (protoFilter) {
      result = result.filter((e) => e.proto === protoFilter);
    }
    if (search.trim()) {
      const terms = search.trim().toLowerCase().split(/\s+/);
      result = result.filter((e) => {
        const haystack = `${e.srcIp} ${e.srcPort} ${e.dstIp} ${e.dstPort} ${e.proto} ${e.flags} ${e.info}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
    }
    return result;
  }, [entries, protoFilter, search]);

  const exportPcap = () => {
    const data = buildPcap(filteredEntries);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: "application/vnd.tcpdump.pcap" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traffic-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pcap`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleClear = () => {
    setEntries([]);
    bufferRef.current = [];
    parsedOffsetRef.current = output.length;
    setSelectedEntry(null);
    onClear();
  };

  const TOP_PROTOS = ["TCP", "UDP", "ICMP", "ARP", "ICMPv6"];
  const displayProtos = [...new Set([...TOP_PROTOS, ...Object.keys(protoCounts)])].filter(
    (p) => protoCounts[p]
  );

  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/30 flex-wrap">
        {/* Live indicator + context */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {iface || "—"}
          </span>
          {filter && (
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 max-w-[200px] truncate">
              {filter}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {entries.length.toLocaleString()} pkts
          </span>
          {displayProtos.map((proto) => (
            <button
              key={proto}
              onClick={() => setProtoFilter(protoFilter === proto ? null : proto)}
              className={cn(
                "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                protoFilter === proto
                  ? PROTO_STYLES[proto] ?? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {proto} {protoCounts[proto]}
            </button>
          ))}
          {paused && bufferRef.current.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              +{bufferRef.current.length} buffered
            </Badge>
          )}
        </div>

        {/* Controls — pushed right */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter rows…"
              className="h-7 pl-6 pr-2 text-xs w-40"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={paused ? handleResume : () => setPaused(true)}
          >
            {paused ? (
              <><Play className="h-3 w-3 mr-1" />Resume</>
            ) : (
              <><Pause className="h-3 w-3 mr-1" />Pause</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={exportPcap}
            disabled={entries.length === 0}
            title="Export PCAP"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={handleClear}
            disabled={entries.length === 0}
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ maxHeight: 480 }}
      >
        <Table className="table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[110px] text-xs py-2">Time</TableHead>
              <TableHead className="w-[70px] text-xs py-2">Protocol</TableHead>
              <TableHead className="w-[130px] text-xs py-2">Src IP</TableHead>
              <TableHead className="w-[62px] text-xs py-2">Src Port</TableHead>
              <TableHead className="w-[130px] text-xs py-2">Dst IP</TableHead>
              <TableHead className="w-[62px] text-xs py-2">Dst Port</TableHead>
              <TableHead className="w-[54px] text-xs py-2">Flags</TableHead>
              <TableHead className="w-[50px] text-xs py-2 text-right">Bytes</TableHead>
              <TableHead className="w-[24px] py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center text-muted-foreground text-sm">
                  {isRunning
                    ? "Waiting for packets…"
                    : entries.length > 0
                    ? "No packets match the current filter"
                    : "Start monitoring to capture traffic"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;
                return (
                  <TableRow
                    key={entry.id}
                    onClick={() =>
                      setSelectedEntry(isSelected ? null : entry)
                    }
                    onContextMenu={(e) => handleContextMenu(e, entry.srcIp || entry.info)}
                    className={cn(
                      "cursor-pointer text-xs",
                      isSelected && "bg-muted/60"
                    )}
                  >
                    <TableCell className="font-mono py-1.5 text-muted-foreground whitespace-nowrap">
                      {entry.timestamp}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <ProtoBadge proto={entry.proto} />
                    </TableCell>
                    <TableCell
                      className="py-1.5 font-mono text-xs"
                      onContextMenu={(e) => { e.stopPropagation(); if (entry.srcIp) handleContextMenu(e, entry.srcIp); }}
                    >
                      <div className="truncate" title={entry.srcIp || undefined}>
                        {entry.srcIp || <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell
                      className="py-1.5 font-mono text-xs text-muted-foreground"
                      onContextMenu={(e) => { e.stopPropagation(); if (entry.srcPort) handleContextMenu(e, entry.srcPort); }}
                    >
                      {entry.srcPort || "—"}
                    </TableCell>
                    <TableCell
                      className="py-1.5 font-mono text-xs"
                      onContextMenu={(e) => { e.stopPropagation(); if (entry.dstIp) handleContextMenu(e, entry.dstIp); }}
                    >
                      <div className="truncate" title={entry.dstIp || undefined}>
                        {entry.dstIp || <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell
                      className="py-1.5 font-mono text-xs text-muted-foreground"
                      onContextMenu={(e) => { e.stopPropagation(); if (entry.dstPort) handleContextMenu(e, entry.dstPort); }}
                    >
                      {entry.dstPort || "—"}
                    </TableCell>
                    <TableCell className="font-mono py-1.5 text-muted-foreground text-[11px]">
                      {entry.flags || "—"}
                    </TableCell>
                    <TableCell className="font-mono py-1.5 text-muted-foreground text-right">
                      {entry.length || "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-muted-foreground">
                      {isSelected ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
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
            <span className="text-xs font-medium text-muted-foreground">Packet Details</span>
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {[
              { label: "Timestamp", value: selectedEntry.timestamp },
              { label: "Network Protocol", value: selectedEntry.networkProto },
              { label: "Transport Protocol", value: selectedEntry.proto },
              { label: "Source IP", value: selectedEntry.srcIp || "—" },
              { label: "Source Port", value: selectedEntry.srcPort || "—" },
              { label: "Destination IP", value: selectedEntry.dstIp || "—" },
              { label: "Destination Port", value: selectedEntry.dstPort || "—" },
              { label: "TCP Flags", value: selectedEntry.flags || "—" },
              { label: "Length (bytes)", value: selectedEntry.length || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-xs font-mono">{value}</p>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 space-y-0.5 pt-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Info
              </p>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {selectedEntry.info || "—"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-3 space-y-0.5 pt-1 border-t border-border/50">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Raw Line
              </p>
              <p className="text-[11px] font-mono text-muted-foreground break-all bg-muted/50 rounded p-2">
                {selectedEntry.raw}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 min-w-[200px] rounded-lg border bg-popover shadow-lg p-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="px-2 py-1 mb-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Value
              </p>
              <p className="text-xs font-mono truncate max-w-[200px]">
                {contextMenu.value}
              </p>
            </div>
            <div className="h-px bg-border mb-1" />
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              onClick={() => addToFilter(contextMenu.value)}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              Add to filter
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              onClick={() => copyToClipboard(contextMenu.value)}
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              Copy value
            </button>
          </div>
        </>
      )}
    </div>
  );
}
