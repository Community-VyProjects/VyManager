"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Copy, Key, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { monitoringService, SSHKeyStatus } from "@/lib/api/monitoring";

interface SSHKeySetupProps {
  instanceId: string;
  sshUsername?: string | null;
  onConfigured?: () => void;
}

export function SSHKeySetup({ instanceId, sshUsername, onConfigured }: SSHKeySetupProps) {
  const [status, setStatus] = useState<SSHKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await monitoringService.getSSHKeyStatus(instanceId);
      setStatus(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load SSH key status";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      await monitoringService.generateSSHKey(instanceId);
      await loadStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate SSH key";
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!status?.public_key) return;
    try {
      await navigator.clipboard.writeText(status.public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = status.public_key;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMarkConfigured = async () => {
    try {
      setMarking(true);
      setError(null);
      await monitoringService.markKeyConfigured(instanceId, true);
      await loadStatus();
      onConfigured?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to mark key as configured";
      setError(message);
    } finally {
      setMarking(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await monitoringService.deleteSSHKey(instanceId);
      await loadStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete SSH key";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const effectiveUsername = sshUsername || status?.ssh_username || "vyos";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className={`h-3 w-3 rounded-full flex-shrink-0 ${
          status?.configured ? "bg-green-500" :
          status?.has_key ? "bg-yellow-500" :
          "bg-gray-400"
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {status?.configured ? "SSH Key Configured" :
             status?.has_key ? "Key Generated — Awaiting VyOS Setup" :
             "No SSH Key"}
          </p>
          <p className="text-xs text-muted-foreground">
            {status?.configured ? "This instance is ready for monitoring" :
             status?.has_key ? "Install the public key on your VyOS device" :
             "Generate an SSH keypair to enable monitoring"}
          </p>
        </div>
      </div>

      {/* Step 1: Generate Key */}
      {!status?.has_key && (
        <Button onClick={handleGenerate} disabled={generating} className="w-full">
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Generate SSH Keypair
            </>
          )}
        </Button>
      )}

      {/* Step 2: Show public key and install instructions */}
      {status?.has_key && !status.configured && (
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Public Key</p>
            <div className="relative">
              <pre className="rounded-lg bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all pr-10">
                {status.public_key}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 border p-3 space-y-2">
            <p className="text-sm font-medium">Install on VyOS</p>
            <p className="text-xs text-muted-foreground">
              Run the following commands on your VyOS device:
            </p>
            <pre className="rounded bg-background p-2 text-xs font-mono overflow-x-auto">
{`configure
set system login user ${effectiveUsername} authentication public-keys vymanager type ssh-ed25519
set system login user ${effectiveUsername} authentication public-keys vymanager key ${status.public_key?.split(" ")[1] || "<KEY>"}
commit
save`}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleMarkConfigured} disabled={marking} className="flex-1">
              {marking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  I&apos;ve Configured the Key
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Configured: show management options */}
      {status?.configured && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={generating} className="flex-1">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Key
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
