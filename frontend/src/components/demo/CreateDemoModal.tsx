"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DemoCreateResponse, demoService } from "@/lib/api/demo";
import { Loader2, Copy, Check, Beaker } from "lucide-react";

interface CreateDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateDemoModal({ open, onOpenChange, onCreated }: CreateDemoModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<DemoCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const demo = await demoService.createDemo();
      setResult(demo);
      onCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create demo");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Create Demo Environment
              </DialogTitle>
              <DialogDescription>
                Creates a new isolated demo organization with its own user account,
                site, and placeholder instances. The demo will automatically expire
                after 10 hours.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Demo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Check className="h-5 w-5" />
                Demo Created
              </DialogTitle>
              <DialogDescription>
                Share these credentials with the demo user. They expire in 10 hours.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <CredentialRow
                label="Demo URL"
                value={result.demo_url}
                onCopy={() => copyToClipboard(result.demo_url, "url")}
                copied={copiedField === "url"}
              />
              <CredentialRow
                label="Email"
                value={result.email}
                onCopy={() => copyToClipboard(result.email, "email")}
                copied={copiedField === "email"}
              />
              <CredentialRow
                label="Password"
                value={result.password}
                onCopy={() => copyToClipboard(result.password, "password")}
                copied={copiedField === "password"}
              />
              <CredentialRow
                label="Expires"
                value={new Date(result.expires_at).toLocaleString()}
                onCopy={() => copyToClipboard(new Date(result.expires_at).toLocaleString(), "expires")}
                copied={copiedField === "expires"}
              />

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const text = `URL: ${result.demo_url}\nEmail: ${result.email}\nPassword: ${result.password}\nExpires: ${new Date(result.expires_at).toLocaleString()}`;
                    copyToClipboard(text, "all");
                  }}
                >
                  {copiedField === "all" ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copiedField === "all" ? "Copied!" : "Copy All Credentials"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-mono truncate">{value}</p>
      </div>
      <Button variant="ghost" size="sm" className="ml-2 shrink-0 h-8 w-8 p-0" onClick={onCopy}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
