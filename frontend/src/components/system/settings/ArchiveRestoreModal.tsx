"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  FileJson,
  Loader2,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { systemSettingsService, type ArchiveFile } from "@/lib/api/system-settings";
import type { ConfigDiff } from "@/lib/api/config";
import { useToast } from "@/hooks/useToast";

// ---------------------------------------------------------------------------
// Diff content helpers (mirrored from ConfigDiffModal)
// ---------------------------------------------------------------------------

function expandSetCommands(pathParts: string[], value: unknown): string[] {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      expandSetCommands([...pathParts, k], v)
    );
  }
  const pathStr = pathParts.join(" ");
  const valStr = formatCLIValue(value);
  return [`set ${pathStr}${valStr ? " " + valStr : ""}`];
}

function expandDeleteCommands(pathParts: string[], value: unknown): string[] {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return [`delete ${pathParts.join(" ")}`];
  }
  const pathStr = pathParts.join(" ");
  const valStr = formatCLIValue(value);
  return [`delete ${pathStr}${valStr ? " " + valStr : ""}`];
}

function formatCLIValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value);
  if (/\s|'/.test(str)) return `'${str.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  return str;
}

function generateCommands(
  section: Record<string, unknown>,
  type: "added" | "removed" | "modified"
): string[] {
  return Object.entries(section).flatMap(([dotPath, value]) => {
    const pathParts = dotPath.split(".");
    if (type === "modified")
      return expandSetCommands(pathParts, (value as { old: unknown; new: unknown }).new);
    if (type === "added") return expandSetCommands(pathParts, value);
    return expandDeleteCommands(pathParts, value);
  });
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  const indent = depth * 16;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return (
      <div style={{ marginLeft: `${indent}px` }}>
        {Object.entries(value as Record<string, unknown>).map(([key, val]) => (
          <div key={key} className="my-1">
            <span className="text-blue-600 dark:text-blue-400 font-mono">{key}:</span>
            {typeof val === "object" && val !== null ? (
              renderValue(val, depth + 1)
            ) : (
              <span className="ml-2 text-foreground font-mono">{String(val)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div style={{ marginLeft: `${indent}px` }} className="text-foreground font-mono">
        [{(value as unknown[]).map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")}]
      </div>
    );
  }
  return <span className="text-foreground font-mono">{String(value)}</span>;
}

// ---------------------------------------------------------------------------
// DiffPanel — the right-hand side
// ---------------------------------------------------------------------------

function DiffPanel({ diff }: { diff: ConfigDiff }) {
  const { added, removed, modified, summary } = diff;
  const hasAdded = summary.added > 0;
  const hasRemoved = summary.removed > 0;
  const hasModified = summary.modified > 0;
  const defaultTab = hasAdded ? "added" : hasRemoved ? "removed" : hasModified ? "modified" : "commands";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary badges */}
      <div className="flex items-center gap-3 pb-3 flex-shrink-0">
        {hasAdded && (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <Plus className="h-3 w-3 mr-1" />
            {summary.added} Added
          </Badge>
        )}
        {hasRemoved && (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <Minus className="h-3 w-3 mr-1" />
            {summary.removed} Removed
          </Badge>
        )}
        {hasModified && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Edit className="h-3 w-3 mr-1" />
            {summary.modified} Modified
          </Badge>
        )}
        {!hasAdded && !hasRemoved && !hasModified && (
          <span className="text-sm text-muted-foreground">No differences from current config</span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
          <TabsTrigger value="added" disabled={!hasAdded}>
            Added ({summary.added})
          </TabsTrigger>
          <TabsTrigger value="removed" disabled={!hasRemoved}>
            Removed ({summary.removed})
          </TabsTrigger>
          <TabsTrigger value="modified" disabled={!hasModified}>
            Modified ({summary.modified})
          </TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
        </TabsList>

        <TabsContent value="added" className="flex-1 overflow-hidden mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {Object.entries(added).map(([path, value]) => (
                <div key={path} className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="flex items-start gap-2">
                    <Plus className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-green-600 break-all">{path}</p>
                      <div className="mt-1 text-xs">{renderValue(value)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="removed" className="flex-1 overflow-hidden mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {Object.entries(removed).map(([path, value]) => (
                <div key={path} className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <Minus className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-red-600 break-all">{path}</p>
                      <div className="mt-1 text-xs line-through opacity-60">{renderValue(value)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="modified" className="flex-1 overflow-hidden mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {Object.entries(modified).map(([path, change]) => (
                <div key={path} className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex items-start gap-2">
                    <Edit className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-yellow-600 break-all">{path}</p>
                      <div className="mt-1 space-y-1">
                        <div>
                          <span className="text-xs font-semibold text-red-600">Old: </span>
                          <span className="text-xs line-through opacity-60">
                            {renderValue((change as { old: unknown; new: unknown }).old)}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-green-600">New: </span>
                          <span className="text-xs">
                            {renderValue((change as { old: unknown; new: unknown }).new)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="commands" className="flex-1 overflow-hidden mt-3">
          <ScrollArea className="h-full">
            {(() => {
              const cmds = [
                ...generateCommands(added, "added"),
                ...generateCommands(modified, "modified"),
                ...generateCommands(removed, "removed"),
              ];
              return cmds.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No commands to show</div>
              ) : (
                <div className="space-y-0.5 pr-2">
                  {cmds.map((cmd, i) => (
                    <div
                      key={i}
                      className={cn(
                        "px-2 py-1 rounded font-mono text-xs",
                        cmd.startsWith("set")
                          ? "bg-green-500/5 text-green-700 dark:text-green-400"
                          : "bg-red-500/5 text-red-700 dark:text-red-400"
                      )}
                    >
                      {cmd}
                    </div>
                  ))}
                </div>
              );
            })()}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ArchiveRestoreModalProps {
  location: string | null;
  onClose: () => void;
  onRestored: () => void;
  isReadOnly?: boolean;
}

export function ArchiveRestoreModal({
  location,
  onClose,
  onRestored,
  isReadOnly = false,
}: ArchiveRestoreModalProps) {
  const { toast } = useToast();

  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<string | null>(null);
  const [manualFilename, setManualFilename] = useState("");

  const [diff, setDiff] = useState<ConfigDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Cancel stale diff requests when selection changes
  const diffAbortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const activeFilename = selected ?? (manualFilename.trim() || null);

  const maskCredentials = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.password) parsed.password = "***";
      return parsed.toString();
    } catch {
      return url.replace(/:([^@/]+)@/, ":***@");
    }
  };

  // Load file list when location changes
  useEffect(() => {
    if (!location) {
      setFiles([]);
      setFilesError(null);
      setSelected(null);
      setManualFilename("");
      setDiff(null);
      setDiffError(null);
      setSearch("");
      return;
    }
    setFilesLoading(true);
    setFilesError(null);
    systemSettingsService
      .listArchiveFiles(location)
      .then((r) => {
        setFiles(r.files);
        if (r.files.length === 0) {
          setFilesError(
            "No backup files found. This protocol may not support directory listing — enter a filename manually below."
          );
        }
      })
      .catch(() => setFilesError("Failed to list files at this archive location."))
      .finally(() => setFilesLoading(false));
  }, [location]);

  // Fetch diff whenever active filename changes
  useEffect(() => {
    if (!location || !activeFilename) {
      setDiff(null);
      setDiffError(null);
      return;
    }

    const token = { cancelled: false };
    diffAbortRef.current = token;
    setDiff(null);
    setDiffError(null);
    setDiffLoading(true);

    systemSettingsService
      .getArchiveDiff(location, activeFilename)
      .then((d) => {
        if (!token.cancelled) setDiff(d);
      })
      .catch((err: unknown) => {
        if (!token.cancelled) {
          setDiffError(
            err instanceof Error ? err.message : "Failed to load diff for this backup."
          );
        }
      })
      .finally(() => {
        if (!token.cancelled) setDiffLoading(false);
      });

    return () => {
      token.cancelled = true;
    };
  }, [location, activeFilename]);

  const handleRestore = async () => {
    if (!location || !activeFilename) return;
    setRestoring(true);
    try {
      const r = await systemSettingsService.restoreFromArchive(location, activeFilename);
      if (!r.success) {
        toast.error("Restore failed", r.error ?? "Could not restore configuration");
      } else {
        toast.success("Configuration restored successfully");
        setShowConfirm(false);
        onClose();
        onRestored();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred during restore");
    } finally {
      setRestoring(false);
      setShowConfirm(false);
    }
  };

  const filteredFiles = search
    ? files.filter((f) => f.filename.toLowerCase().includes(search.toLowerCase()))
    : files;

  return (
    <>
      <Dialog
        open={!!location}
        onOpenChange={(open) => {
          if (!open && !restoring) onClose();
        }}
      >
        <DialogContent className="w-[85vw] max-w-[1100px] sm:max-w-[1100px] h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Restore from Archive
            </DialogTitle>
            <DialogDescription>{location && maskCredentials(location)}</DialogDescription>
          </DialogHeader>

          {/* Split panel body */}
          <div className="flex flex-1 gap-0 overflow-hidden px-6 pt-4">
            {/* Left panel — file list */}
            <div className="w-96 flex-shrink-0 flex flex-col gap-2 overflow-hidden pr-4 border-r">
              <div className="relative flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter backups..."
                  className="pl-8 text-xs h-8"
                />
              </div>

              {filesLoading && (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}

              {!filesLoading && filesError && files.length === 0 && (
                <p className="text-xs text-muted-foreground px-1">{filesError}</p>
              )}

              {!filesLoading && files.length > 0 && (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-0.5 pr-1">
                    {filteredFiles.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-4">No matching files</p>
                    ) : (
                      filteredFiles.map((f) => (
                        <button
                          key={f.filename}
                          type="button"
                          className={cn(
                            "w-full text-left rounded px-2 py-2 transition-colors",
                            selected === f.filename
                              ? "bg-accent"
                              : "hover:bg-muted/60"
                          )}
                          onClick={() => {
                            setSelected(f.filename);
                            setManualFilename("");
                          }}
                        >
                          <div className="font-mono text-xs truncate">{f.filename}</div>
                          {(f.modified || f.size != null) && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {f.modified && new Date(f.modified).toLocaleString()}
                              {f.modified && f.size != null && " · "}
                              {f.size != null && `${(f.size / 1024).toFixed(1)} KB`}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Manual filename entry */}
              <div className="flex-shrink-0 space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground">Or enter filename manually</p>
                <Input
                  value={manualFilename}
                  onChange={(e) => {
                    setManualFilename(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="config.boot-hostname.20250101_120000"
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>

            {/* Right panel — diff viewer */}
            <div className="flex-1 flex flex-col overflow-hidden pl-4">
              {!activeFilename && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                  <FileJson className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Select a backup to preview changes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The diff between that backup and your current running config will appear here.
                  </p>
                </div>
              )}

              {activeFilename && diffLoading && (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading diff…</span>
                </div>
              )}

              {activeFilename && !diffLoading && diffError && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                  <p className="text-sm text-destructive">{diffError}</p>
                  <p className="text-xs text-muted-foreground">
                    You can still restore this backup — the diff preview is unavailable for this protocol or file.
                  </p>
                </div>
              )}

              {activeFilename && !diffLoading && diff && (
                <DiffPanel diff={diff} />
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 flex-shrink-0 border-t mt-0">
            <Button variant="outline" onClick={onClose} disabled={restoring}>
              Cancel
            </Button>
            <Button
              disabled={!activeFilename || diffLoading || isReadOnly}
              onClick={() => setShowConfirm(true)}
            >
              Restore Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={(o) => { if (!o && !restoring) setShowConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Restore</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately replace your running configuration.
            </AlertDialogDescription>
            <div className="space-y-3 mt-3">
              <div className="rounded border px-3 py-2 bg-muted/30">
                <p className="text-xs text-muted-foreground">Restoring file:</p>
                <p className="font-mono text-sm font-medium break-all">{activeFilename}</p>
              </div>
              {diff && (diff.summary.added > 0 || diff.summary.removed > 0 || diff.summary.modified > 0) && (
                <div className="flex items-center gap-2 text-sm">
                  {diff.summary.added > 0 && (
                    <span className="text-green-600 font-medium">+{diff.summary.added} added</span>
                  )}
                  {diff.summary.removed > 0 && (
                    <span className="text-red-600 font-medium">-{diff.summary.removed} removed</span>
                  )}
                  {diff.summary.modified > 0 && (
                    <span className="text-yellow-600 font-medium">~{diff.summary.modified} modified</span>
                  )}
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Restoring…
                </>
              ) : (
                "Confirm Restore"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
