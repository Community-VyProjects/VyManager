"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { useSessionStore } from "@/store/session-store";

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
  const t = useTranslations("backupBugReport");
  const tc = useTranslations("common");
  const appliance = useSessionStore((s) => s.appliance);
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
      setBackupError(t("backup.passTooShort"));
      return;
    }
    if (backupPass !== backupConfirm) {
      setBackupError(t("backup.passMismatch"));
      return;
    }
    setBackupLoading(true);
    setBackupError(null);
    try {
      await sessionService.backup(backupPass);
      handleClose(false);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : t("backup.failed"));
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
      setRestoreError(t("restore.fileAndPassRequired"));
      return;
    }
    setPreviewLoading(true);
    setRestoreError(null);
    setSummary(null);
    try {
      setPreview(await sessionService.previewBackup(file, restorePass));
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : t("restore.readFailed"));
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
      setRestoreError(err instanceof Error ? err.message : t("restore.failed"));
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
          <DialogTitle>{t("backup.title")}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "backup" | "restore")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup">{t("backup.tab")}</TabsTrigger>
            <TabsTrigger value="restore">{t("restore.tab")}</TabsTrigger>
          </TabsList>

          {/* ------------------------------ BACKUP ------------------------------ */}
          <TabsContent value="backup" className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
              {t("backup.intro")}
            </div>

            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  {t.rich("backup.secretsWarning", {
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backup-pass">{t("backup.passphrase")}</Label>
              <Input
                id="backup-pass"
                type="password"
                value={backupPass}
                onChange={(e) => setBackupPass(e.target.value)}
                placeholder={t("backup.passPlaceholder")}
                disabled={backupLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-confirm">{t("backup.confirmPassphrase")}</Label>
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
                {tc("cancel")}
              </Button>
              <Button onClick={handleBackup} disabled={backupLoading}>
                {backupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("backup.preparing")}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t("backup.download")}
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
                {appliance && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
                    {t("restore.applianceNotice")}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="restore-file">{t("restore.file")}</Label>
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
                  <Label htmlFor="restore-pass">{t("backup.passphrase")}</Label>
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
                  <Label>{t("restore.mode")}</Label>
                  <RadioGroup
                    value={mode}
                    onValueChange={(v) => setMode(v as RestoreMode)}
                    className="gap-2"
                  >
                    <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
                      <RadioGroupItem value="merge" id="mode-merge" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{t("restore.merge")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("restore.mergeHint")}
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-destructive/30 p-3 cursor-pointer">
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          {t("restore.replace")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("restore.replaceHint")}
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {preview && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1 text-xs text-muted-foreground">
                    <p className="text-sm font-medium text-foreground">
                      {t("restore.recordCount", { count: totalRecords(preview.counts) })}
                    </p>
                    {preview.created_at && (
                      <p>{t("restore.created", { date: new Date(preview.created_at).toLocaleString() })}</p>
                    )}
                    <p>
                      {t("restore.counts", {
                        users: preview.counts.users ?? 0,
                        sites: preview.counts.sites ?? 0,
                        instances: preview.counts.instances ?? 0,
                        providers: preview.counts.oauth_providers ?? 0,
                      })}
                    </p>
                    {!preview.ssh_keys_decryptable && (
                      <p className="flex items-start gap-1.5 text-yellow-600 dark:text-yellow-400 pt-1">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        {t("restore.sshKeysWarning")}
                      </p>
                    )}
                  </div>
                )}

                {restoreError && <ErrorBox message={restoreError} />}

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleClose(false)} disabled={restoreLoading}>
                    {tc("cancel")}
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
                          {t("restore.restoring")}
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {mode === "replace" ? t("restore.wipeAndRestore") : t("restore.tab")}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handlePreview} disabled={!file || !restorePass || previewLoading}>
                      {previewLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("restore.reading")}
                        </>
                      ) : (
                        t("restore.review")
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
  const t = useTranslations("backupBugReport");
  const sum = (r: Record<string, number>) =>
    Object.values(r).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-3 py-2">
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {t("result.completed", {
                mode: summary.mode === "replace" ? t("result.modeReplace") : t("result.modeMerge"),
              })}
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>{t("result.added", { count: sum(summary.inserted) })}</li>
              <li>{t("result.updated", { count: sum(summary.updated) })}</li>
              {sum(summary.skipped) > 0 && (
                <li>{t("result.skipped", { count: sum(summary.skipped) })}</li>
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
