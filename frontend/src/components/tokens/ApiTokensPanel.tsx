"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, KeyRound, Plus } from "lucide-react";
import { tokenService, type ApiTokenMetadata } from "@/lib/api/tokens";
import { CreateTokenDialog } from "./CreateTokenDialog";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function accessLabel(t: ApiTokenMetadata): string {
  if (t.allowed_instance_ids.length > 0) {
    return `${t.allowed_instance_ids.length} instance${t.allowed_instance_ids.length === 1 ? "" : "s"}`;
  }
  if (t.allowed_site_ids.length > 0) {
    return `${t.allowed_site_ids.length} site${t.allowed_site_ids.length === 1 ? "" : "s"}`;
  }
  return "All";
}

type Status = { label: string; variant: "default" | "secondary" | "destructive" | "outline" };

function tokenStatus(t: ApiTokenMetadata): Status {
  if (t.revoked_at) return { label: "Revoked", variant: "destructive" };
  if (t.expires_at && new Date(t.expires_at) < new Date()) {
    return { label: "Expired", variant: "secondary" };
  }
  return { label: "Active", variant: "default" };
}

export function ApiTokensPanel() {
  const [tokens, setTokens] = useState<ApiTokenMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTokens(await tokenService.list());
    } catch {
      setError("Could not load tokens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await tokenService.revoke(id);
      await load();
    } catch {
      setError("Could not revoke token.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            API Tokens
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personal tokens for non-browser clients. A token acts as you and never exceeds your
            own permissions.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New token
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No tokens yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((t) => {
                const status = tokenStatus(t);
                const revoked = Boolean(t.revoked_at);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.prefix}…
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.scopes.includes("read") ? "secondary" : "outline"}>
                        {t.scopes.includes("read") ? "Read-only" : "Full"}
                      </Badge>
                    </TableCell>
                    <TableCell>{accessLabel(t)}</TableCell>
                    <TableCell>{formatDate(t.last_used_at)}</TableCell>
                    <TableCell>{formatDate(t.expires_at)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!revoked && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={revoking === t.id}
                            >
                              Revoke
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke “{t.name}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Any client using this token will immediately lose access. This
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(t.id)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Revoke
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateTokenDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </div>
  );
}
