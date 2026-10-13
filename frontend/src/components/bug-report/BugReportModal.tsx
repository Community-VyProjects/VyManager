"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, ExternalLink, Github, Loader2, ShieldCheck } from "lucide-react";
import {
  bugReportService,
  type ReportRequest,
  type ReportPreview,
} from "@/lib/api/bug-report";
import {
  getRecentErrors,
  formatErrorsForReport,
  hasRecentErrors,
} from "@/lib/error-capture";

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "loading" | "connect" | "form" | "preview" | "done";

const CATEGORIES = [
  { value: "bug", label: "bugReport.categories.bug" },
  { value: "crash", label: "bugReport.categories.crash" },
  { value: "ui", label: "bugReport.categories.ui" },
  { value: "performance", label: "bugReport.categories.performance" },
  { value: "other", label: "bugReport.categories.other" },
] as const;

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const t = useTranslations("backupBugReport");
  const tc = useTranslations("common");
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Device-flow state
  const [userCode, setUserCode] = useState<string>("");
  const [verificationUri, setVerificationUri] = useState<string>("");
  const [polling, setPolling] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");
  const [errorText, setErrorText] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [autoAttached, setAutoAttached] = useState(false);

  // Preview / result
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [issueUrl, setIssueUrl] = useState<string>("");

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    setPolling(false);
  }, []);

  const resetAll = useCallback(() => {
    stopPolling();
    setStep("loading");
    setError(null);
    setBusy(false);
    setUserCode("");
    setVerificationUri("");
    setTitle("");
    setCategory("bug");
    setDescription("");
    setErrorText("");
    setIncludeDiagnostics(true);
    setAutoAttached(false);
    setPreview(null);
    setIssueUrl("");
  }, [stopPolling]);

  // Load connection status when opening.
  useEffect(() => {
    if (!open) {
      resetAll();
      return;
    }

    // Auto-attach any recently captured errors so the user doesn't have to find
    // and paste a stack trace themselves.
    if (hasRecentErrors()) {
      const recent = getRecentErrors();
      setErrorText(formatErrorsForReport(recent));
      // A failed config operation is a "bug"; an uncaught/render error is a "crash".
      setCategory(recent[recent.length - 1].kind === "api" ? "bug" : "crash");
      setAutoAttached(true);
    }

    let cancelled = false;
    (async () => {
      try {
        const status = await bugReportService.getStatus();
        if (cancelled) return;
        if (!status.enabled) {
          setError(t("bugReport.notConfigured"));
          setStep("connect");
          return;
        }
        setStep(status.connected ? "form" : "connect");
      } catch {
        if (!cancelled) {
          setError(t("bugReport.loadFailed"));
          setStep("connect");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, resetAll, t]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const buildRequest = (): ReportRequest => ({
    title: title.trim(),
    category,
    description: description.trim(),
    error_text: errorText.trim() || undefined,
    include_diagnostics: includeDiagnostics,
    diagnostics: includeDiagnostics
      ? {
          browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }
      : undefined,
  });

  const poll = useCallback(
    async (intervalMs: number) => {
      try {
        const res = await bugReportService.devicePoll();
        if (res.status === "connected") {
          stopPolling();
          setStep("form");
          return;
        }
        if (res.status === "expired" || res.status === "denied") {
          stopPolling();
          setError(
            res.status === "expired"
              ? t("bugReport.authExpired")
              : t("bugReport.authDenied")
          );
          return;
        }
        pollTimer.current = setTimeout(() => poll(intervalMs), intervalMs);
      } catch {
        pollTimer.current = setTimeout(() => poll(intervalMs), intervalMs);
      }
    },
    [stopPolling, t]
  );

  const handleConnect = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await bugReportService.deviceStart();
      setUserCode(res.user_code);
      setVerificationUri(res.verification_uri);
      setPolling(true);
      const intervalMs = Math.max(res.interval, 5) * 1000;
      pollTimer.current = setTimeout(() => poll(intervalMs), intervalMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bugReport.authStartFailed"));
    } finally {
      setBusy(false);
    }
  };

  const validateForm = (): string | null => {
    if (title.trim().length < 3) return t("bugReport.titleTooShort");
    if (description.trim().length < 10) return t("bugReport.descriptionTooShort");
    return null;
  };

  const handlePreview = async () => {
    const v = validateForm();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const p = await bugReportService.preview(buildRequest());
      setPreview(p);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bugReport.previewFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await bugReportService.submit(buildRequest());
      setIssueUrl(res.url);
      setStep("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("bugReport.submitFailed");
      setError(msg);
      // A revoked/expired token sends us back to connect.
      if (/connect|authoriz/i.test(msg)) setStep("connect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            {t("bugReport.title")}
          </DialogTitle>
          <DialogDescription>
            {t("bugReport.description")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "loading" && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {step === "connect" && (
          <div className="space-y-4 py-2">
            {!userCode ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("bugReport.connectIntro")}
                </p>
                <Button onClick={handleConnect} disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                  {t("bugReport.connect")}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">
                  {t("bugReport.step1")}
                  <span className="ml-2 select-all rounded bg-muted px-2 py-1 font-mono text-base font-semibold tracking-widest">
                    {userCode}
                  </span>
                </p>
                <p className="text-sm">
                  {t("bugReport.step2")}
                </p>
                <Button asChild variant="outline" className="gap-2">
                  <a href={verificationUri} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t("bugReport.openGithub")}
                  </a>
                </Button>
                {polling && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("bugReport.waiting")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="br-title">{t("bugReport.titleLabel")}</Label>
              <Input
                id="br-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("bugReport.titlePlaceholder")}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("bugReport.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(c.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="br-desc">{tc("description")}</Label>
              <Textarea
                id="br-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("bugReport.descriptionPlaceholder")}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="br-error">{t("bugReport.errorLabel")}</Label>
                {errorText.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorText("");
                      setAutoAttached(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("bugReport.clear")}
                  </button>
                )}
              </div>
              {autoAttached && (
                <p className="text-xs text-muted-foreground">
                  {t("bugReport.autoAttached")}
                </p>
              )}
              <Textarea
                id="br-error"
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                placeholder={t("bugReport.errorPlaceholder")}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={includeDiagnostics}
                onCheckedChange={(v) => setIncludeDiagnostics(v === true)}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                {t("bugReport.includeDiagnostics")}
              </span>
            </label>
            <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {t("bugReport.redactionNotice")}
            </p>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-3 py-2">
            <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {t.rich("bugReport.previewNotice", {
                code: (chunks) => <code className="font-mono">{chunks}</code>,
              })}
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("bugReport.titleLabel")}</Label>
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-medium">
                {preview.title}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("bugReport.body")}</Label>
              <ScrollArea className="h-64 rounded-md border bg-muted/20">
                <pre className="whitespace-pre-wrap break-words p-3 text-xs">{preview.body}</pre>
              </ScrollArea>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <p className="text-sm">{t("bugReport.submitted")}</p>
            {issueUrl && (
              <Button asChild variant="outline" className="gap-2">
                <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("bugReport.viewIssue")}
                </a>
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "form" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handlePreview} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("bugReport.review")}
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("form")} disabled={busy}>
                {t("bugReport.back")}
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("bugReport.submit")}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => onOpenChange(false)}>{tc("close")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
