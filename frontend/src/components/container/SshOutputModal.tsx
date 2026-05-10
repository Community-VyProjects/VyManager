"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  loading: boolean;
  success: boolean | null;
  output?: string | null;
  error?: string | null;
}

export function SshOutputModal({ open, onOpenChange, title, loading, success, output, error }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {loading && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <span className="text-sm">Running command, please wait…</span>
            </div>
          )}

          {!loading && success === true && (
            <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">Command completed successfully.</p>
            </div>
          )}

          {!loading && success === false && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error || "Command failed."}</p>
            </div>
          )}

          {!loading && (output || error) && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Output</p>
              <ScrollArea className="h-[50vh] rounded-md border bg-muted/50">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {output || error}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {loading ? "Please wait…" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
