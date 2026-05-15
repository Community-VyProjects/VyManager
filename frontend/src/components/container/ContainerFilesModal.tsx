"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { containerService } from "@/lib/api/container";
import type { AppDef } from "@/lib/apps-catalog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerName: string;
  app: AppDef;
}

type View = "list" | "editor";

function resolvePath(template: string, containerName: string): string {
  return template.replace(/\$\{containerName\}/g, containerName);
}

export function ContainerFilesModal({ open, onOpenChange, containerName, app }: Props) {
  const editableFiles = app.installConfig?.editableFiles ?? [];

  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedFile = selectedIndex !== null ? editableFiles[selectedIndex] : null;
  const resolvedPath = selectedFile ? resolvePath(selectedFile.path, containerName) : "";

  const openFile = async (index: number) => {
    const file = editableFiles[index];
    const path = resolvePath(file.path, containerName);
    setSelectedIndex(index);
    setView("editor");
    setContent("");
    setError(null);
    setSaveSuccess(false);
    setLoading(true);
    try {
      const result = await containerService.readContainerFile(path);
      if (!result.success) {
        setError(result.error || "Failed to read file.");
      } else {
        setContent(result.content ?? "");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to read file.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!resolvedPath) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const result = await containerService.writeContainerFile(resolvedPath, content);
      if (!result.success) {
        setError(result.error || "Failed to save file.");
      } else {
        setSaveSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save file.");
    } finally {
      setSaving(false);
    }
  };

  const backToList = () => {
    setView("list");
    setSelectedIndex(null);
    setContent("");
    setError(null);
    setSaveSuccess(false);
  };

  useEffect(() => {
    if (!open) {
      setView("list");
      setSelectedIndex(null);
      setContent("");
      setError(null);
      setSaveSuccess(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === "editor" && (
              <button
                onClick={backToList}
                className="mr-1 rounded p-1 hover:bg-muted transition-colors"
                aria-label="Back to file list"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {app.iconPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.iconPath} alt="" className="h-5 w-5" />
            ) : null}
            <span>
              {view === "list"
                ? `Files — ${containerName}`
                : (selectedFile?.label ?? "Edit File")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ── File list ── */}
          {view === "list" && (
            <div className="space-y-1">
              {editableFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No editable files defined for this app.</p>
              ) : (
                editableFiles.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => openFile(i)}
                    className="w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {resolvePath(f.path, containerName)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Editor ── */}
          {view === "editor" && (
            <div className="flex flex-col gap-3 h-full">
              <p className="text-xs text-muted-foreground font-mono break-all">{resolvedPath}</p>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={e => { setContent(e.target.value); setSaveSuccess(false); }}
                  className="flex-1 min-h-[320px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  spellCheck={false}
                />
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-400">Saved. A backup was written to <span className="font-mono">{resolvedPath}.bak</span></p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {view === "editor" && !loading && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={backToList} disabled={saving}>Back</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
