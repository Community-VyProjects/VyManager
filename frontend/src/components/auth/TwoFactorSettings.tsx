"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { totpSecretFromUri } from "@/lib/two-factor";

export function TwoFactorSettings() {
  const t = useTranslations("twoFactor");
  const { data: session, refetch } = useSession();
  const enabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled,
  );
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [trustCleared, setTrustCleared] = useState(false);

  const secret = totpURI ? totpSecretFromUri(totpURI) : null;

  const forgetTrustedDevice = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/trust-device", { method: "POST" });
      if (!res.ok) {
        setError(t("settings.clearTrustFailed"));
        return;
      }
      setTrustCleared(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.clearTrustFailed"));
    } finally {
      setBusy(false);
    }
  };

  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        setError(result.error.message || t("enroll.startFailed"));
        return;
      }
      setTotpURI(result.data?.totpURI ?? "");
      setBackupCodes(result.data?.backupCodes ?? []);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("enroll.startFailed"));
    } finally {
      setBusy(false);
    }
  };

  const verifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: code.trim() });
      if (result.error) {
        setError(result.error.message || t("enroll.invalidCode"));
        return;
      }
      setPassword("");
      setCode("");
      setTotpURI("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("enroll.invalidCode"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(result.error.message || t("settings.disableFailed"));
        return;
      }
      setPassword("");
      setBackupCodes([]);
      setTotpURI("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.disableFailed"));
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error) {
        setError(result.error.message || t("settings.backupFailed"));
        return;
      }
      setBackupCodes(result.data?.backupCodes ?? []);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.backupFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("settings.title")}
        </CardTitle>
        <CardDescription>
          {enabled
            ? t("settings.descriptionEnabled")
            : t("settings.descriptionDisabled")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("settings.status", { status: enabled ? t("settings.on") : t("settings.off") })}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {totpURI && (
          <div className="space-y-3 rounded-lg border border-border/50 p-4">
            <p className="text-sm">
              {t("settings.scanToFinish")}
            </p>
            <div className="bg-white p-3 w-fit rounded-md">
              <QRCodeSVG value={totpURI} size={192} level="M" />
            </div>
            {secret && (
              <p className="text-xs font-mono break-all text-muted-foreground">
                {t("enroll.secret", { secret })}
              </p>
            )}
            {backupCodes.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("settings.backupCodesSave")}</p>
                <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
                  {backupCodes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <form onSubmit={verifyEnrollment} className="space-y-2">
              <Label htmlFor="enroll-code">{t("enroll.authenticatorCode")}</Label>
              <Input
                id="enroll-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={busy}
              />
              <Button type="submit" disabled={busy || !code.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("settings.confirmEnable")}
              </Button>
            </form>
          </div>
        )}

        {!enabled && !totpURI && (
          <form onSubmit={enable} className="space-y-2 max-w-sm">
            <Label htmlFor="enable-2fa-password">{t("enroll.password")}</Label>
            <Input
              id="enable-2fa-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("settings.enableAuthenticator")}
            </Button>
          </form>
        )}

        {enabled && (
          <div className="space-y-4 max-w-sm">
            <form onSubmit={regenerate} className="space-y-2">
              <Label htmlFor="regen-2fa-password">{t("enroll.password")}</Label>
              <Input
                id="regen-2fa-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" disabled={busy || !password}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("settings.newBackupCodes")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy || !password}
                  onClick={(e) => {
                    e.preventDefault();
                    void disable(e);
                  }}
                >
                  {t("settings.disable")}
                </Button>
              </div>
            </form>
            {backupCodes.length > 0 && (
              <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
                {backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void forgetTrustedDevice()}
            >
              {t("settings.requireCodeNextTime")}
            </Button>
            {trustCleared && (
              <p className="text-xs text-muted-foreground">
                {t("settings.trustCleared")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
