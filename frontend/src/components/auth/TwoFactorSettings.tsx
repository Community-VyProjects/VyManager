"use client";

import { useState } from "react";
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

  const secret = totpURI ? totpSecretFromUri(totpURI) : null;

  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        setError(result.error.message || "Could not start enrollment");
        return;
      }
      setTotpURI(result.data?.totpURI ?? "");
      setBackupCodes(result.data?.backupCodes ?? []);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start enrollment");
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
        setError(result.error.message || "Invalid authenticator code");
        return;
      }
      setPassword("");
      setCode("");
      setTotpURI("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid authenticator code");
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
        setError(result.error.message || "Could not disable two-factor");
        return;
      }
      setPassword("");
      setBackupCodes([]);
      setTotpURI("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable two-factor");
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
        setError(result.error.message || "Could not generate backup codes");
        return;
      }
      setBackupCodes(result.data?.backupCodes ?? []);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate backup codes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-factor authentication
        </CardTitle>
        <CardDescription>
          {enabled
            ? "Sign-in with email and password requires an authenticator code, email code (if mail is configured), or a backup code."
            : "Add an authenticator app. Email one-time codes are offered at sign-in when SMTP is configured."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Status: {enabled ? "On" : "Off"}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {totpURI && (
          <div className="space-y-3 rounded-lg border border-border/50 p-4">
            <p className="text-sm">
              Scan this with your authenticator app, then enter a code to finish.
            </p>
            <div className="bg-white p-3 w-fit rounded-md">
              <QRCodeSVG value={totpURI} size={192} level="M" />
            </div>
            {secret && (
              <p className="text-xs font-mono break-all text-muted-foreground">
                Secret: {secret}
              </p>
            )}
            {backupCodes.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Backup codes (save these now)</p>
                <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
                  {backupCodes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <form onSubmit={verifyEnrollment} className="space-y-2">
              <Label htmlFor="enroll-code">Authenticator code</Label>
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
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm and enable"}
              </Button>
            </form>
          </div>
        )}

        {!enabled && !totpURI && (
          <form onSubmit={enable} className="space-y-2 max-w-sm">
            <Label htmlFor="enable-2fa-password">Password</Label>
            <Input
              id="enable-2fa-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable authenticator"}
            </Button>
          </form>
        )}

        {enabled && (
          <div className="space-y-4 max-w-sm">
            <form onSubmit={regenerate} className="space-y-2">
              <Label htmlFor="regen-2fa-password">Password</Label>
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
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "New backup codes"}
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
                  Disable
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
