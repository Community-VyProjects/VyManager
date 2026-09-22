"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { challengeMethods, type TwoFactorMethod } from "@/lib/two-factor";

const METHOD_LABEL: Record<TwoFactorMethod, string> = {
  totp: "Authenticator app",
  otp: "Email code",
  backup: "Backup code",
};

export function TwoFactorChallenge({
  methods,
  onVerified,
}: {
  methods: string[];
  onVerified: () => Promise<void> | void;
}) {
  const available = challengeMethods(methods);
  const [method, setMethod] = useState<TwoFactorMethod>(available[0]);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const body = { code: code.trim(), trustDevice };
      const result =
        method === "totp"
          ? await authClient.twoFactor.verifyTotp(body)
          : method === "otp"
            ? await authClient.twoFactor.verifyOtp(body)
            : await authClient.twoFactor.verifyBackupCode(body);
      if (result.error) {
        setError(result.error.message || "Verification failed");
        return;
      }
      await onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailCode = async () => {
    setError("");
    setSending(true);
    try {
      const result = await authClient.twoFactor.sendOtp({});
      if (result.error) {
        setError(result.error.message || "Could not send email code");
        return;
      }
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send email code");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {available.map((id) => (
          <Button
            key={id}
            type="button"
            variant={method === id ? "default" : "outline"}
            className="h-9"
            disabled={isLoading}
            onClick={() => {
              setMethod(id);
              setCode("");
              setError("");
            }}
          >
            {METHOD_LABEL[id]}
          </Button>
        ))}
      </div>

      {method === "otp" && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            disabled={sending || isLoading}
            onClick={() => void sendEmailCode()}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : otpSent ? (
              "Resend email code"
            ) : (
              "Send email code"
            )}
          </Button>
          {otpSent && (
            <p className="text-xs text-muted-foreground">Code sent if mail is configured.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="two-factor-code" className="text-sm font-medium text-foreground">
          {method === "backup" ? "Backup code" : "Verification code"}
        </Label>
        <Input
          id="two-factor-code"
          inputMode={method === "backup" ? "text" : "numeric"}
          autoComplete="one-time-code"
          placeholder={method === "backup" ? "xxxx-xxxx" : "123456"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
          disabled={isLoading}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={trustDevice}
          onCheckedChange={(v) => setTrustDevice(v === true)}
          disabled={isLoading}
        />
        Trust this device for 30 days
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
        disabled={isLoading || !code.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify"
        )}
      </Button>
    </form>
  );
}
