"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  ShieldAlert,
  Upload,
} from "lucide-react";
import {
  sessionService,
  type BackupPreview,
  type RestoreSummary,
} from "@/lib/api/session";

interface BackupRestoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Refresh the sites/instances list after a successful restore. */
  onRestored?: () => void;
  /** Default tab to open on. */
  defaultTab?: "backup" | "restore";
}

type RestoreMode = "merge" | "replace";

export function BackupRestoreModal({
  open,
  onOpenChange,
  onRestored,
  defaultTab = "backup",
}: BackupRestoreModalProps) {
  const [tab, setTab] = useState<"backup" | "restore">(defaultTab);

  // Backup state
  const [backupPass, setBackupPass] = useState("");
  const [backupConfirm, setBackupConfirm] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  // Restore state
  const [file, setFile] = useState<File | null>(null);
  const [restorePass, setRestorePass] = useState("");
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [summary, setSummary] = useState<RestoreSummary | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const reset = () => {
    setBackupPass("");
    setBackupConfirm("");
    setBackupError(null);
    setBackupLoading(false);
    setFile(null);
    setRestorePass("");
    setMode("merge");
    setPreview(null);
    setSummary(null);
    setRestoreError(null);
    setRestoreLoading(false);
    setPreviewLoading(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // -- Backup --
  const handleBackup = async () => {
    if (backupPass.length < 8) {
      setBackupError("Passphrase must be at least 8 characters");
      return;
    }
    if (backupPass !== backupConfirm) {
      setBackupError("Passphrases do not match");
      return;
    }
    setBackupLoading(true);
    setBackupError(null);
    try {
      await sessionService.backup(backupPass);
      handleClose(false);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setBackupLoading(false);
    }
  };

  // -- Restore --
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setSummary(null);
    setRestoreError(null);
  };

  const handlePreview = async () => {
    if (!file || !restorePass) {
      setRestoreError("Select a backup file and enter its passphrase");
      return;
    }
    setPreviewLoading(true);
    setRestoreError(null);
    setSummary(null);
    try {
      setPreview(await sessionService.previewBackup(file, restorePass));
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Could not read backup");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!file || !restorePass) return;
    setRestoreLoading(true);
    setRestoreError(null);
    try {
      const result = await sessionService.restore(file, restorePass, mode);
      setSummary(result);
      onRestored?.();
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoreLoading(false);
    }
  };

  const totalRecords = (counts: Record<string, number>) =>
    Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Backup &amp; Restore</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "backup" | "restore")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="restore">Restore</TabsTrigger>
          </TabsList>

          {/* ------------------------------ BACKUP ------------------------------ */}
          <TabsContent value="backup" className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
              Downloads an encrypted file containing your entire VyManager setup:
              user accounts, sites, instances (including API keys and SSH keys),
              RBAC grants, and OIDC providers.
            </div>

            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  This file contains <strong>secrets</strong>. It is encrypted with
                  the passphrase below &mdash; store both safely. The passphrase
                  cannot be recovered if lost.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backup-pass">Passphrase</Label>
              <Input
                id="backup-pass"
                type="password"
                value={backupPass}
                onChange={(e) => setBackupPass(e.target.value)}
                placeholder="At least 8 characters"
                disabled={backupLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-confirm">Confirm passphrase</Label>
              <Input
                id="backup-confirm"
                type="password"
                value={backupConfirm}
                onChange={(e) => setBackupConfirm(e.target.value)}
                disabled={backupLoading}
              />
            </div>

            {backupError && <ErrorBox message={backupError} />}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={backupLoading}>
                Cancel
              </Button>
              <Button onClick={handleBackup} disabled={backupLoading}>
                {backupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download backup
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ------------------------------ RESTORE ----------------------------- */}
          <TabsContent value="restore" className="space-y-4 py-4">
            {summary ? (
              <RestoreResult summary={summary} />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="restore-file">Backup file</Label>
                  <Input
                    id="restore-file"
                    type="file"
                    accept=".vymgr"
                    onChange={handleFileChange}
                    disabled={restoreLoading}
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{file.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restore-pass">Passphrase</Label>
                  <Input
                    id="restore-pass"
                    type="password"
                    value={restorePass}
                    onChange={(e) => {
                      setRestorePass(e.target.value);
                      setPreview(null);
                    }}
                    disabled={restoreLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Restore mode</Label>
                  <RadioGroup
                    value={mode}
                    onValueChange={(v) => setMode(v as RestoreMode)}
                    className="gap-2"
                  >
                    <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
                      <RadioGroupItem value="merge" id="mode-merge" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Merge</p>
                        <p className="text-xs text-muted-foreground">
                          Add missing records and update existing ones. Nothing is
                          deleted.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-destructive/30 p-3 cursor-pointer">
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          Replace (destructive)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Wipe all current VyManager data and restore the backup
                          exactly. You will be signed out and must log in with a
                          restored account.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {preview && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1 text-xs text-muted-foreground">
                    <p className="text-sm font-medium text-foreground">
                      {totalRecords(preview.counts)} records in this backup
                    </p>
                    {preview.created_at && (
                      <p>Created: {new Date(preview.created_at).toLocaleString()}</p>
                    )}
                    <p>
                      Users: {preview.counts.users ?? 0} &middot; Sites:{" "}
                      {preview.counts.sites ?? 0} &middot; Instances:{" "}
                      {preview.counts.instances ?? 0} &middot; OIDC providers:{" "}
                      {preview.counts.oauth_providers ?? 0}
                    </p>
                    {!preview.ssh_keys_decryptable && (
                      <p className="flex items-start gap-1.5 text-yellow-600 dark:text-yellow-400 pt-1">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        Encrypted SSH keys were created on a different host and
                        cannot be restored here; re-run SSH key setup per instance.
                      </p>
                    )}
                  </div>
                )}

                {restoreError && <ErrorBox message={restoreError} />}

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleClose(false)} disabled={restoreLoading}>
                    Cancel
                  </Button>
                  {preview ? (
                    <Button
                      variant={mode === "replace" ? "destructive" : "default"}
                      onClick={handleRestore}
                      disabled={restoreLoading}
                    >
                      {restoreLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {mode === "replace" ? "Wipe & restore" : "Restore"}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handlePreview} disabled={!file || !restorePass || previewLoading}>
                      {previewLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reading...
                        </>
                      ) : (
                        "Review backup"
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
    </div>
  );
}

function RestoreResult({ summary }: { summary: RestoreSummary }) {
  const sum = (r: Record<string, number>) =>
    Object.values(r).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-3 py-2">
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Restore completed ({summary.mode} mode)
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>Records added: {sum(summary.inserted)}</li>
              <li>Records updated: {sum(summary.updated)}</li>
              {sum(summary.skipped) > 0 && (
                <li>Records skipped: {sum(summary.skipped)}</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {summary.warnings.length > 0 && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
              {summary.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
