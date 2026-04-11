"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, CheckCircle2, Building2, Server, User } from "lucide-react";
import { signUp, signIn } from "@/lib/auth-client";
import { sessionService } from "@/lib/api/session";
import { ApiError } from "@/lib/types/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // SECURITY: Check if onboarding is actually needed
  // Prevent access to onboarding page if users already exist
  useEffect(() => {
    const checkOnboardingAccess = async () => {
      try {
        console.log("[OnboardingPage] Checking if onboarding is needed...");
        const response = await fetch("/api/session/onboarding-status", {
          method: "GET",
        });

        if (!response.ok) {
          console.error("[OnboardingPage] Failed to check onboarding status");
          router.push("/login");
          return;
        }

        const data = await response.json();

        if (!data.needs_onboarding) {
          // Users already exist - onboarding is not allowed
          console.log("[OnboardingPage] Onboarding not needed - redirecting to login");
          router.push("/login");
          return;
        }

        // Onboarding is allowed - show the form
        console.log("[OnboardingPage] Onboarding needed - showing form");
        setIsCheckingAccess(false);
      } catch (err) {
        console.error("[OnboardingPage] Error checking onboarding access:", err);
        router.push("/login");
      }
    };

    checkOnboardingAccess();
  }, [router]);

  // Step 1: Admin Account
  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Step 2: Site
  const [siteData, setSiteData] = useState({
    name: "",
    description: "",
  });

  // Step 3: Instance
  const [instanceData, setInstanceData] = useState({
    name: "",
    description: "",
    host: "",
    port: 443,
    apiKey: "",
    vyosVersion: "1.5",
    protocol: "https",
    verifySsl: false,
  });

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation only - don't create anything yet
    if (adminData.password !== adminData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (adminData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!adminData.name.trim() || !adminData.email.trim()) {
      setError("Name and email are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminData.email)) {
      setError("Please enter a valid email address (e.g., admin@example.com)");
      return;
    }

    // Just move to next step - don't create user yet
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation only - don't create anything yet
    if (!siteData.name.trim()) {
      setError("Site name is required");
      return;
    }

    // Just move to next step - don't create site yet
    setStep(3);
  };

  const completeSetup = async (skipInstance: boolean) => {
    setError("");
    setLoading(true);
    setIsSubmitting(true); // Prevent going back once submission starts

    try {
      // SECURITY: Re-check onboarding status before creating account
      // Prevents race condition if someone else completed onboarding while form was open
      console.log("[Onboarding] Validating onboarding is still needed...");
      const statusCheck = await fetch("/api/session/onboarding-status", {
        method: "GET",
      });

      if (statusCheck.ok) {
        const statusData = await statusCheck.json();
        if (!statusData.needs_onboarding) {
          setError("Onboarding has already been completed by another user. Please log in.");
          setLoading(false);
          setIsSubmitting(false);
          setTimeout(() => router.push("/login"), 2000);
          return;
        }
      }

      // Step 1: Create admin account
      console.log("[Onboarding] Step 1: Creating admin account...");
      const signUpResult = await signUp.email({
        email: adminData.email,
        password: adminData.password,
        name: adminData.name,
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message || "Failed to create admin account");
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      console.log("[Onboarding] ✓ Admin account created");

      // Step 1.5: Sign in the newly created user to establish session
      console.log("[Onboarding] Signing in...");
      const signInResult = await signIn.email({
        email: adminData.email,
        password: adminData.password,
      });

      if (signInResult.error) {
        setError("Account created but failed to sign in. Please go to login page.");
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      console.log("[Onboarding] ✓ Session established");

      // Wait a moment for session cookie to be fully set
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 1.75: Set first user as ADMIN
      console.log("[Onboarding] Setting user as ADMIN...");
      const setAdminResult = await fetch("/api/session/set-first-user-admin", {
        method: "POST",
      });

      if (!setAdminResult.ok) {
        console.error("[Onboarding] Warning: Failed to set user as ADMIN");
        // Don't fail the entire onboarding, but log it
      } else {
        console.log("[Onboarding] ✓ User set as ADMIN");
      }

      // Step 2: Create site
      console.log("[Onboarding] Step 2: Creating site...");
      const createdSite = await sessionService.createSite({
        name: siteData.name,
        description: siteData.description || undefined,
      });

      console.log("[Onboarding] ✓ Site created");

      // Step 3: Optionally create instance
      if (!skipInstance) {
        console.log("[Onboarding] Step 3: Creating VyOS instance...");
        await sessionService.createInstance({
          site_id: createdSite.id,
          name: instanceData.name,
          description: instanceData.description || undefined,
          host: instanceData.host,
          port: instanceData.port,
          api_key: instanceData.apiKey,
          vyos_version: instanceData.vyosVersion,
          protocol: instanceData.protocol,
          verify_ssl: instanceData.verifySsl,
          is_active: true,
        });

        console.log("[Onboarding] ✓ Instance created");
      } else {
        console.log("[Onboarding] Skipping instance creation");
      }

      console.log("[Onboarding] Setup complete! Redirecting to sites...");

      // Note: Site ADMIN users (which the first user is) automatically have access
      // to all instances without needing explicit instance-level role assignments

      // Full page redirect so the session cookie is picked up cleanly
      window.location.href = "/sites";
    } catch (err) {
      console.error("[Onboarding] Error:", err);
      setError((err as ApiError).message || "Failed to complete setup. Please try again.");
      setIsSubmitting(false); // Allow user to go back and fix issues
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate instance data
    if (!instanceData.name.trim() || !instanceData.host.trim() || !instanceData.apiKey.trim()) {
      setError("Instance name, host, and API key are required");
      return;
    }

    await completeSetup(false);
  };

  // Show loading state while checking if onboarding is allowed
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = [
    { label: "Account", icon: User },
    { label: "Site", icon: Building2 },
    { label: "Instance", icon: Server },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated gradient background - matches login page */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-cyan-400/20 opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-400/30 via-transparent to-transparent opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Logo and title */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-16 h-16 mb-3">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-primary/10">
                <Image
                  src="/vy-icon.png"
                  alt="VyOS Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  loader={({ src }) => src}
                />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome to VyManager</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Let's set up your management system
            </p>
          </div>

          {/* Progress Indicator with labels */}
          <div className="flex items-center justify-center mb-6">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const stepNum = i + 1;
              const isCompleted = step > stepNum;
              const isCurrent = step === stepNum;
              return (
                <div key={s.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex items-center justify-center h-9 w-9 rounded-full transition-colors ${
                      isCompleted || isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-xs mt-1.5 font-medium ${
                      isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 w-10 sm:w-14 mx-2 mb-5 transition-colors ${
                      step > stepNum ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/50 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Step 1: Create Admin Account */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  placeholder="John Doe"
                  className="h-11 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="h-11 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="h-11 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    className="h-11 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 mt-2" disabled={loading}>
                Continue
              </Button>
            </form>
          )}

          {/* Step 2: Create Site */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteData.name}
                  onChange={(e) => setSiteData({ ...siteData, name: e.target.value })}
                  placeholder="Headquarters"
                  className="h-11 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Description (Optional)</Label>
                <Textarea
                  id="siteDescription"
                  value={siteData.description}
                  onChange={(e) => setSiteData({ ...siteData, description: e.target.value })}
                  placeholder="Main datacenter location"
                  className="bg-background/50 border-border/50 focus:border-primary"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-11"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1 h-11" disabled={loading || isSubmitting}>
                  Continue
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Add Instance */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="connection">Connection</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="instanceName">Instance Name</Label>
                    <Input
                      id="instanceName"
                      value={instanceData.name}
                      onChange={(e) => setInstanceData({ ...instanceData, name: e.target.value })}
                      placeholder="vyos-router-01"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instanceDescription">Description (Optional)</Label>
                    <Textarea
                      id="instanceDescription"
                      value={instanceData.description}
                      onChange={(e) => setInstanceData({ ...instanceData, description: e.target.value })}
                      placeholder="Main gateway router"
                      className="bg-background/50 border-border/50 focus:border-primary"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vyosVersion">VyOS Version</Label>
                    <Select
                      value={instanceData.vyosVersion}
                      onValueChange={(value) => setInstanceData({ ...instanceData, vyosVersion: value })}
                    >
                      <SelectTrigger className="h-11 bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.4">VyOS 1.4</SelectItem>
                        <SelectItem value="1.5">VyOS 1.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="connection" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="host">Host / IP Address</Label>
                    <Input
                      id="host"
                      value={instanceData.host}
                      onChange={(e) => setInstanceData({ ...instanceData, host: e.target.value })}
                      placeholder="192.168.1.1 or vyos.example.com"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="protocol">Protocol</Label>
                      <Select
                        value={instanceData.protocol}
                        onValueChange={(value) => setInstanceData({ ...instanceData, protocol: value })}
                      >
                        <SelectTrigger className="h-11 bg-background/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="https">HTTPS</SelectItem>
                          <SelectItem value="http">HTTP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={instanceData.port}
                        onChange={(e) => setInstanceData({ ...instanceData, port: parseInt(e.target.value) })}
                        placeholder="443"
                        className="h-11 bg-background/50 border-border/50 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={instanceData.apiKey}
                      onChange={(e) => setInstanceData({ ...instanceData, apiKey: e.target.value })}
                      placeholder="Your VyOS API key"
                      className="h-11 bg-background/50 border-border/50 focus:border-primary"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set in VyOS: <code className="text-xs bg-muted px-1 py-0.5 rounded">set service https api keys id KEY key VALUE</code>
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="h-11 sm:flex-1 order-3 sm:order-1"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => completeSetup(true)}
                  className="h-11 sm:flex-1 order-2"
                  disabled={loading || isSubmitting}
                >
                  {loading && isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Skip, add later"
                  )}
                </Button>
                <Button type="submit" className="h-11 sm:flex-1 order-1 sm:order-3" disabled={loading || isSubmitting}>
                  {loading && !isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : loading && isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
