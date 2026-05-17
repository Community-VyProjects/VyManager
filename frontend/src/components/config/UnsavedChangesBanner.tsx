"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Save, FileText, CheckCircle, Clock, RotateCcw, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { configService, type ConfigDiff, type CommitConfirmStatus } from "@/lib/api/config";
import { ConfigDiffModal } from "./ConfigDiffModal";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/types/api";

interface UnsavedChangesBannerProps {
  configDiff: ConfigDiff | null;
  commitConfirm: CommitConfirmStatus | null;
}

export function UnsavedChangesBanner({ configDiff, commitConfirm }: UnsavedChangesBannerProps) {
  const [diff, setDiff] = useState<ConfigDiff | null>(null);
  const [cc, setCc] = useState<CommitConfirmStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tick every second to update countdown display when commit-confirm is active
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Sync SSE-driven props into local state
  useEffect(() => {
    if (configDiff !== null) setDiff(configDiff);
  }, [configDiff]);

  useEffect(() => {
    if (commitConfirm !== null) setCc(commitConfirm);
  }, [commitConfirm]);

  // Manage the per-second tick for the countdown
  useEffect(() => {
    if (cc?.active) {
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [cc?.active]);

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const result = await configService.confirmCommit();
      if (!result.success) {
        const msg = result.error || "Failed to confirm commit";
        setError(msg);
        toast.error("Confirm Failed", msg);
        return;
      }
      toast.success("Changes Confirmed", "Your changes are live. Save configuration when ready.");
      setCc({ active: false });
      // SSE will push updated diff shortly; also fetch eagerly
      const newDiff = await configService.getDiff();
      setDiff(newDiff);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to confirm commit";
      setError(msg);
      toast.error("Confirm Failed", msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await configService.saveConfig();
      if (!result.success) {
        const msg = result.error || "Failed to save configuration";
        setError(msg);
        toast.error("Save Failed", msg);
        return;
      }
      toast.success("Configuration Saved", "Your changes have been written to disk successfully.");
      // SSE will push updated diff shortly; also fetch eagerly
      const newDiff = await configService.getDiff();
      setDiff(newDiff);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? (err as ApiError).message : "Failed to save configuration";
      setError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    setDiscarding(true);
    setError(null);
    try {
      const result = await configService.discardConfig();
      if (!result.success) {
        const msg = result.error || "Failed to discard configuration changes";
        setError(msg);
        toast.error("Discard Failed", msg);
        return;
      }
      toast.success("Changes Discarded", "Configuration has been reverted to the last saved state.");
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to discard configuration changes";
      setError(msg);
      toast.error("Discard Failed", msg);
    } finally {
      setDiscarding(false);
      setShowDiscardDialog(false);
    }
  };

  // Calculate live seconds remaining from expires_at (more accurate than polled value)
  const secondsRemaining = (() => {
    if (!cc?.active || !cc.expires_at) return 0;
    const diff = new Date(cc.expires_at).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  })();

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // ── Commit-confirm active: show countdown banner (highest priority) ──
  if (cc?.active) {
    const isUrgent = secondsRemaining <= 60;
    return (
      <>
      <div
        className={cn(
          "shrink-0 z-10",
          "shadow-lg border-b",
          isUrgent
            ? "bg-gradient-to-r from-red-600 to-orange-500 border-red-700/20"
            : "bg-gradient-to-r from-amber-500 to-yellow-400 border-amber-600/20"
        )}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-white flex-shrink-0" />
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-white">
                  Commit-Confirm Active — confirm before changes revert
                </p>
                <p className="text-xs text-white/80">
                  Auto-{cc.action ?? "reload"} in{" "}
                  <span className={cn("font-mono font-bold", isUrgent && "text-white")}>
                    {formatCountdown(secondsRemaining)}
                  </span>
                  {" "}· {cc.confirm_time_minutes} min window
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {error && (
                <span className="text-xs text-white bg-red-600/30 px-3 py-1 rounded">
                  {error}
                </span>
              )}
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-white text-amber-600 hover:bg-amber-50 font-semibold"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {confirming ? "Confirming..." : "Confirm Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
  }


  // ── No commit-confirm: show unsaved-changes banner if there are diffs ──
  if (!diff?.has_changes) {
    return null;
  }

  const { added, removed, modified } = diff.summary;
  const totalChanges = added + removed + modified;

  return (
    <>
      <div
        className={cn(
          "shrink-0 z-10 bg-gradient-to-r from-blue-600 to-cyan-500",
          "shadow-lg border-b border-blue-700/20"
        )}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-white">
                  Unsaved Configuration Changes
                </p>
                <p className="text-xs text-blue-100">
                  {totalChanges} change{totalChanges !== 1 ? "s" : ""} detected
                  {added > 0 && ` (${added} added`}
                  {removed > 0 && `, ${removed} removed`}
                  {modified > 0 && `, ${modified} modified`}
                  {(added > 0 || removed > 0 || modified > 0) && ")"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {error && (
                <span className="text-xs text-white bg-red-600/30 px-3 py-1 rounded">
                  {error}
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiffModal(true)}
                className="bg-white/20 text-white border-white/40 hover:bg-white/30 hover:text-white font-medium shadow-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Show Diffs
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiscardDialog(true)}
                disabled={discarding}
                className="bg-red-500/20 text-white border-red-400/40 hover:bg-red-500/30 hover:text-white font-medium shadow-sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard Changes
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfigDiffModal
        open={showDiffModal}
        onOpenChange={setShowDiffModal}
        diff={diff}
      />

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard All Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently discard all unsaved changes to the running
              configuration, reverting it to the last saved state.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => { e.preventDefault(); await handleDiscard(); }}
              disabled={discarding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {discarding ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Discarding...</>
              ) : "Discard Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
