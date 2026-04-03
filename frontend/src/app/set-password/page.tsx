"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError("No invite token provided");
      setValidating(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/internal/set-password?token=${token}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setValid(true);
        setEmail(data.email);
        setName(data.name || "");
      } else {
        setTokenError(data.error || "Invalid invite link");
      }
    } catch {
      setTokenError("Failed to validate invite link");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/internal/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.error || "Failed to set password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center">
              <Image
                src="/vy-icon.png"
                alt="VyOS Logo"
                width={56}
                height={56}
                className="object-contain"
                loader={({ src }) => src}
              />
            </div>
          </div>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            You've been invited to VyManager
          </CardDescription>
        </CardHeader>

        <CardContent>
          {validating ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validating invite link...</p>
            </div>
          ) : tokenError ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Invalid Invite Link</h3>
                <p className="text-sm text-muted-foreground">{tokenError}</p>
              </div>
              <Button variant="outline" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Password Set Successfully</h3>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to the login page...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User info */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{name || email}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Set Password & Continue
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
