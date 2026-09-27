"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { sessionService, type TwoFactorPolicy } from "@/lib/api/session";
import { useOrgStore } from "@/store/org-store";

export function TwoFactorPolicyCard() {
  const t = useTranslations("twoFactor");
  const [policy, setPolicy] = useState<TwoFactorPolicy | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrganizations = useOrgStore((s) => s.loadOrganizations);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  const load = useCallback(async () => {
    setError("");
    try {
      await loadOrganizations();
      setPolicy(await sessionService.getTwoFactorPolicy());
    } catch (err) {
      setPolicy(null);
      setError(err instanceof Error ? err.message : t("policy.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [loadOrganizations, t]);

  useEffect(() => {
    void load();
  }, [load, activeOrgId]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("policy.loading")}
      </p>
    );
  }

  if (error && !policy) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!policy?.can_edit) return null;

  const required = policy.org_require_two_factor;

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      setPolicy(await sessionService.setTwoFactorPolicy(!required));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("policy.updateFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("policy.title")}
        </CardTitle>
        <CardDescription>
          {t("policy.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("policy.passwordLogins", { status: required ? t("policy.statusRequired") : t("policy.statusOptional") })}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" variant={required ? "destructive" : "default"} disabled={busy} onClick={() => void toggle()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : required ? t("policy.stopRequiring") : t("policy.require")}
        </Button>
      </CardContent>
    </Card>
  );
}
