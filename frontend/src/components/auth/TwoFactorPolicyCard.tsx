"use client";

import { useCallback, useEffect, useState } from "react";
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

export function TwoFactorPolicyCard() {
  const [policy, setPolicy] = useState<TwoFactorPolicy | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setPolicy(await sessionService.getTwoFactorPolicy());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load 2FA policy");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!policy?.can_edit) return null;

  const required = policy.org_require_two_factor;

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      setPolicy(await sessionService.setTwoFactorPolicy(!required));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update 2FA policy");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Require two-factor
        </CardTitle>
        <CardDescription>
          When this is on, anyone who signs in with email and password in this
          organization must set up an authenticator before they can use VyManager.
          Users can still enroll on their own when it is off. Single sign-on and
          API tokens are not affected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Password logins: {required ? "2FA required" : "2FA optional"}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" variant={required ? "destructive" : "default"} disabled={busy} onClick={() => void toggle()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : required ? "Stop requiring 2FA" : "Require 2FA for password logins"}
        </Button>
      </CardContent>
    </Card>
  );
}
