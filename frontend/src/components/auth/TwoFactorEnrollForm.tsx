"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { totpSecretFromUri } from "@/lib/two-factor";

export function TwoFactorEnrollForm({
  password: initialPassword,
  onDone,
}: {
  password?: string;
  onDone: () => void | Promise<void>;
}) {
  const [password, setPassword] = useState(initialPassword ?? "");
  const [code, setCode] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const secret = totpURI ? totpSecretFromUri(totpURI) : null;

  const start = async (e: React.FormEvent) => {
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

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: code.trim() });
      if (result.error) {
        setError(result.error.message || "Invalid authenticator code");
        return;
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid authenticator code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!totpURI ? (
        <form onSubmit={start} className="space-y-2">
          {!initialPassword && (
            <>
              <Label htmlFor="enroll-password">Password</Label>
              <Input
                id="enroll-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
              />
            </>
          )}
          <Button type="submit" className="w-full" disabled={busy || !password}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set up authenticator"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">Scan this with your authenticator app, save the backup codes, then enter a code.</p>
          <div className="bg-white p-3 w-fit rounded-md mx-auto">
            <QRCodeSVG value={totpURI} size={192} level="M" />
          </div>
          {secret && (
            <p className="text-xs font-mono break-all text-muted-foreground">Secret: {secret}</p>
          )}
          {backupCodes.length > 0 && (
            <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          <form onSubmit={confirm} className="space-y-2">
            <Label htmlFor="forced-enroll-code">Authenticator code</Label>
            <Input
              id="forced-enroll-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={busy}
            />
            <Button type="submit" className="w-full" disabled={busy || !code.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm and continue"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
