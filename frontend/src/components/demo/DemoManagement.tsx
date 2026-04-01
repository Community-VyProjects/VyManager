"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DemoInfo, demoService } from "@/lib/api/demo";
import { useOrgStore } from "@/store/org-store";
import { CreateDemoModal } from "./CreateDemoModal";
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  Beaker,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
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

function getTimeRemaining(expiresAt: string): { text: string; urgent: boolean } {
  const now = new Date().getTime();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) return { text: "Expired", urgent: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return { text: `${hours}h ${minutes}m`, urgent: hours < 1 };
  return { text: `${minutes}m`, urgent: true };
}

export function DemoManagement() {
  const [demos, setDemos] = useState<DemoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DemoInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { loadOrgs } = useOrgStore();

  // Tick every minute for countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDemos = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await demoService.listDemos();
      setDemos(result.demos);
    } catch (err: any) {
      setError(err.message || "Failed to load demos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemos();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await demoService.deleteDemo(deleteTarget.org_id);
      setDeleteTarget(null);
      loadDemos();
      loadOrgs();
    } catch (err: any) {
      setError(err.message || "Failed to delete demo");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Beaker className="h-6 w-6" />
            Demo Environments
          </h2>
          <p className="text-muted-foreground mt-1">
            Create temporary demo environments with auto-expiry. Each demo gets its own
            organization, user account, and placeholder instances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDemos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Demo
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && demos.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : demos.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No Active Demos</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Create a demo environment to get started. Each demo includes a user account
            and placeholder router instances.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Demo
          </Button>
        </div>
      ) : (
        /* Demo List */
        <div className="grid gap-4">
          {demos.map((demo) => {
            const remaining = getTimeRemaining(demo.expires_at);
            return (
              <div
                key={demo.org_id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Title row */}
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                      <h3 className="font-semibold truncate">{demo.org_name}</h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          remaining.urgent
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {remaining.text}
                      </span>
                    </div>

                    {/* Demo URL */}
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Demo URL</p>
                        <a
                          href={demo.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-primary hover:underline truncate block"
                        >
                          {demo.demo_url}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => copyToClipboard(demo.demo_url, `url-${demo.org_id}`)}
                      >
                        {copiedField === `url-${demo.org_id}` ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Credentials */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</p>
                          <p className="text-sm font-mono truncate">{demo.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => copyToClipboard(demo.email, `email-${demo.org_id}`)}
                        >
                          {copiedField === `email-${demo.org_id}` ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Created</p>
                          <p className="text-sm">{new Date(demo.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{demo.site_count} site{demo.site_count !== 1 ? "s" : ""}</span>
                      <span>{demo.instance_count} instance{demo.instance_count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setDeleteTarget(demo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Demo Modal */}
      <CreateDemoModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          loadDemos();
          loadOrgs();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demo</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the demo &quot;{deleteTarget?.org_name}&quot; including
              its user account, sites, and all instances. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
