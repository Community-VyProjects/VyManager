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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Building2, Server, User } from "lucide-react";
import { signUp, signIn } from "@/lib/auth-client";
import { sessionService } from "@/lib/api/session";

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

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate instance data
    if (!instanceData.name.trim() || !instanceData.host.trim() || !instanceData.apiKey.trim()) {
      setError("Instance name, host, and API key are required");
      return;
    }

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
      console.log("[Onboarding] Step 1/3: Creating admin account...");
      const signUpResult = await signUp.email({
        email: adminData.email,
        password: adminData.password,
        name: adminData.name,
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message || "Failed to create admin account");
        setLoading(false);
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

      // Step 2: Create site
      console.log("[Onboarding] Step 2/3: Creating site...");
      const createdSite = await sessionService.createSite({
        name: siteData.name,
        description: siteData.description || undefined,
      });

      console.log("[Onboarding] ✓ Site created");

      // Step 3: Create instance
      console.log("[Onboarding] Step 3/3: Creating VyOS instance...");
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
      console.log("[Onboarding] Setup complete! Redirecting to sites...");

      // Setup complete! Redirect to sites page
      router.push("/sites");
      router.refresh();
    } catch (err: any) {
      console.error("[Onboarding] Error:", err);
      setError(err.message || "Failed to complete setup. Please try again.");
      setIsSubmitting(false); // Allow user to go back and fix issues
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking if onboarding is allowed
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center">
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
          <CardTitle className="text-3xl">Welcome to VyManager</CardTitle>
          <CardDescription>
            Let's set up your VyOS management system in 3 easy steps
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className={`h-1 w-16 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > 2 ? <CheckCircle2 className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </div>
              <div className={`h-1 w-16 ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Server className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Create Admin Account */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Step 1: Create Admin Account</h3>
                <p className="text-sm text-muted-foreground">
                  You'll be the owner with full access to everything
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  placeholder="John Doe"
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={adminData.confirmPassword}
                  onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Create Site */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Step 2: Create Your First Site</h3>
                <p className="text-sm text-muted-foreground">
                  A site is a logical grouping of VyOS instances
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteData.name}
                  onChange={(e) => setSiteData({ ...siteData, name: e.target.value })}
                  placeholder="Headquarters"
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
                  rows={3}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || isSubmitting}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Site...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Add Instance */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Step 3: Add Your First VyOS Instance</h3>
                <p className="text-sm text-muted-foreground">
                  Connect to your VyOS router
                </p>
              </div>

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
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vyosVersion">VyOS Version</Label>
                    <Select
                      value={instanceData.vyosVersion}
                      onValueChange={(value) => setInstanceData({ ...instanceData, vyosVersion: value })}
                    >
                      <SelectTrigger>
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
                      placeholder="192.168.1.1"
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
                        <SelectTrigger>
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
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Set in VyOS with: set service https api keys id KEY key VALUE
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || isSubmitting}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing Setup...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
