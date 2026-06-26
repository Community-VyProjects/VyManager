"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface BugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "loading" | "connect" | "form" | "preview" | "done";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "crash", label: "Crash / error" },
  { value: "ui", label: "UI / display" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
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
    setPreview(null);
    setIssueUrl("");
  }, [stopPolling]);

  // Load connection status when opening.
  useEffect(() => {
    if (!open) {
      resetAll();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const status = await bugReportService.getStatus();
        if (cancelled) return;
        if (!status.enabled) {
          setError("Bug reporting is not configured on this server.");
          setStep("connect");
          return;
        }
        setStep(status.connected ? "form" : "connect");
      } catch {
        if (!cancelled) {
          setError("Could not load bug reporter.");
          setStep("connect");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, resetAll]);

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
              ? "The authorization request expired. Please try again."
              : "Authorization was denied."
          );
          return;
        }
        pollTimer.current = setTimeout(() => poll(intervalMs), intervalMs);
      } catch {
        pollTimer.current = setTimeout(() => poll(intervalMs), intervalMs);
      }
    },
    [stopPolling]
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
      setError(err instanceof Error ? err.message : "Could not start GitHub authorization.");
    } finally {
      setBusy(false);
    }
  };

  const validateForm = (): string | null => {
    if (title.trim().length < 3) return "Please enter a short title (at least 3 characters).";
    if (description.trim().length < 10) return "Please describe the problem (at least 10 characters).";
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
      setError(err instanceof Error ? err.message : "Could not generate preview.");
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
      const msg = err instanceof Error ? err.message : "Could not submit the report.";
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
            Report a Bug
          </DialogTitle>
          <DialogDescription>
            File a GitHub issue using your own GitHub account.
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
                  Connect your GitHub account to submit a report. We never see or store your
                  GitHub password, and the connection is used only to create this one issue.
                </p>
                <Button onClick={handleConnect} disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                  Connect GitHub
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">
                  1. Copy this code:
                  <span className="ml-2 select-all rounded bg-muted px-2 py-1 font-mono text-base font-semibold tracking-widest">
                    {userCode}
                  </span>
                </p>
                <p className="text-sm">
                  2. Open GitHub, paste the code, and authorize:
                </p>
                <Button asChild variant="outline" className="gap-2">
                  <a href={verificationUri} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open GitHub
                  </a>
                </Button>
                {polling && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for authorization…
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="br-title">Title</Label>
              <Input
                id="br-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary of the problem"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="br-desc">Description</Label>
              <Textarea
                id="br-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What did you expect? Steps to reproduce."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="br-error">Error / stack trace (optional)</Label>
              <Textarea
                id="br-error"
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                placeholder="Paste any error message or stack trace here"
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
                Include basic diagnostics (browser and current page). No router configuration is
                attached.
              </span>
            </label>
            <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Sensitive data (public IPs, passwords, keys, certificates) is automatically redacted.
              You will review the final report before it is sent.
            </p>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-3 py-2">
            <p className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              This is exactly what will be posted to GitHub. Anything detected as sensitive has been
              replaced with <code className="font-mono">[REDACTED]</code>. Review it before submitting.
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-medium">
                {preview.title}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Body</Label>
              <ScrollArea className="h-64 rounded-md border bg-muted/20">
                <pre className="whitespace-pre-wrap break-words p-3 text-xs">{preview.body}</pre>
              </ScrollArea>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <p className="text-sm">Thanks! Your report was submitted.</p>
            {issueUrl && (
              <Button asChild variant="outline" className="gap-2">
                <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View issue
                </a>
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "form" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Review report
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("form")} disabled={busy}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit to GitHub
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
