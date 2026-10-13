"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

type AccessLabel = {
  key: "tokens.accessInstances" | "tokens.accessSites" | "tokens.accessAll";
  count: number;
};

function accessLabel(t: ApiTokenMetadata): AccessLabel {
  if (t.allowed_instance_ids.length > 0) {
    return { key: "tokens.accessInstances", count: t.allowed_instance_ids.length };
  }
  if (t.allowed_site_ids.length > 0) {
    return { key: "tokens.accessSites", count: t.allowed_site_ids.length };
  }
  return { key: "tokens.accessAll", count: 0 };
}

type Status = {
  label: "tokens.statusRevoked" | "tokens.statusExpired" | "tokens.statusActive";
  variant: "default" | "secondary" | "destructive" | "outline";
};

function tokenStatus(t: ApiTokenMetadata): Status {
  if (t.revoked_at) return { label: "tokens.statusRevoked", variant: "destructive" };
  if (t.expires_at && new Date(t.expires_at) < new Date()) {
    return { label: "tokens.statusExpired", variant: "secondary" };
  }
  return { label: "tokens.statusActive", variant: "default" };
}

export function ApiTokensPanel() {
  // `t` is used below for each token row, so the translator gets a distinct name.
  const tr = useTranslations("admin");
  const tc = useTranslations("common");
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
      setError(tr("tokens.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await tokenService.revoke(id);
      await load();
    } catch {
      setError(tr("tokens.revokeFailed"));
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
            {tr("tokens.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tr("tokens.subtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {tr("tokens.new")}
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
              <TableHead>{tc("name")}</TableHead>
              <TableHead>{tr("tokens.colToken")}</TableHead>
              <TableHead>{tr("tokens.colScope")}</TableHead>
              <TableHead>{tr("tokens.colAccess")}</TableHead>
              <TableHead>{tr("tokens.colLastUsed")}</TableHead>
              <TableHead>{tr("tokens.colExpires")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {tr("tokens.loading")}
                </TableCell>
              </TableRow>
            ) : tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {tr("tokens.empty")}
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((t) => {
                const status = tokenStatus(t);
                const access = accessLabel(t);
                const revoked = Boolean(t.revoked_at);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.prefix}…
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.scopes.includes("read") ? "secondary" : "outline"}>
                        {t.scopes.includes("read") ? tr("tokens.scopeReadOnly") : tr("tokens.scopeFull")}
                      </Badge>
                    </TableCell>
                    <TableCell>{tr(access.key, { count: access.count })}</TableCell>
                    <TableCell>{formatDate(t.last_used_at)}</TableCell>
                    <TableCell>{formatDate(t.expires_at)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{tr(status.label)}</Badge>
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
                              {tr("tokens.revoke")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{tr("tokens.revokeTitle", { name: t.name })}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {tr("tokens.revokeDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(t.id)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                {tr("tokens.revoke")}
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
