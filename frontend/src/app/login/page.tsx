"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn, signUp } from "@/lib/auth-client";
import { Shield, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        // Validate password length
        if (formData.password.length < 8) {
          setError("Password must be at least 8 characters");
          setIsLoading(false);
          return;
        }

        // Sign up
        const result = await signUp.email({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        });

        if (result.error) {
          setError(result.error.message || "Sign up failed");
          setIsLoading(false);
          return;
        }

        // Auto sign in after successful sign up
        router.push(from);
        router.refresh();
      } else {
        // Sign in
        const result = await signIn.email({
          email: formData.email,
          password: formData.password,
        });

        if (result.error) {
          setError(result.error.message || "Login failed");
          setIsLoading(false);
          return;
        }

        router.push(from);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-cyan-400/20 opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-400/30 via-transparent to-transparent opacity-40" />

      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glass morphism card */}
        <div className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl shadow-2xl p-8">
          {/* Logo and title */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-20 h-20 mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-primary/10">
                <img
                  src="/vy-icon.png"
                  alt="VyManager Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              VyManager
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Professional VyOS Management
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/50 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Login/Sign up form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required={isSignUp}
                  className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@vymanager.local"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                disabled={isLoading}
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-foreground"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required={isSignUp}
                  className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                  disabled={isLoading}
                />
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, rememberMe: checked as boolean })
                    }
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                  >
                    Remember me
                  </label>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                isSignUp ? "Create account" : "Sign in"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-sm text-primary hover:underline"
                disabled={isLoading}
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Secure Access
              </span>
            </div>
          </div>

          {/* Footer info */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Protected by enterprise-grade encryption
            </p>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
              <Shield className="w-3 h-3" />
              <span>VyOS Router Management System</span>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
