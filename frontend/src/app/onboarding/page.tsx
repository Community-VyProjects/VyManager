"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
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
import { ApiError } from "@/lib/types/api";
import { postLoginPath } from "@/lib/appliance";
import { BackupRestoreModal } from "@/components/session/BackupRestoreModal";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [appliance, setAppliance] = useState(false);

  // SECURITY: Check if onboarding is actually needed
  // Prevent access to onboarding page if users already exist
  useEffect(() => {
    const checkOnboardingAccess = async () => {
      try {
        console.log("[OnboardingPage] Checking if onboarding is needed...");
        const data = await sessionService.getOnboardingStatus();

        if (!data.needs_onboarding) {
          console.log("[OnboardingPage] Onboarding not needed - redirecting to login");
          router.push("/login");
          return;
        }
        setAppliance(data.appliance === true);

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
      setError(t("errors.passwordMismatch"));
      return;
    }

    if (adminData.password.length < 8) {
      setError(t("errors.passwordTooShort"));
      return;
    }

    if (!adminData.name.trim() || !adminData.email.trim()) {
      setError(t("errors.nameEmailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminData.email)) {
      setError(t("errors.invalidEmail"));
      return;
    }

    // Just move to next step - don't create user yet
    if (appliance) {
      await completeOnboarding(false);
      return;
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation only - don't create anything yet
    if (!siteData.name.trim()) {
      setError(t("errors.siteNameRequired"));
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
      setError(t("errors.instanceFieldsRequired"));
      return;
    }

    await completeOnboarding(true);
  };

  const handleSkipInstance = async () => {
    setError("");
    await completeOnboarding(false);
  };

  const completeOnboarding = async (withInstance: boolean) => {
    setLoading(true);
    setIsSubmitting(true); // Prevent going back once submission starts

    try {
      // SECURITY: Re-check onboarding status before creating account
      // Prevents race condition if someone else completed onboarding while form was open
      console.log("[Onboarding] Validating onboarding is still needed...");
      const statusData = await sessionService.getOnboardingStatus();
      if (!statusData.needs_onboarding) {
        setError(t("errors.alreadyCompleted"));
        setLoading(false);
        setIsSubmitting(false);
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      // Step 1: Create admin account
      console.log("[Onboarding] Step 1/3: Creating admin account...");
      const signUpResult = await signUp.email({
        email: adminData.email,
        password: adminData.password,
        name: adminData.name,
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message || t("errors.createAccountFailed"));
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
        setError(t("errors.signInFailed"));
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      console.log("[Onboarding] ✓ Session established");

      // Wait a moment for session cookie to be fully set
      await new Promise((resolve) => setTimeout(resolve, 500));

      // The first user is created as ADMIN atomically (Better Auth
      // user.create.before hook), so there is no separate promotion step.

      if (!appliance) {
      // Step 2: Create site
      console.log("[Onboarding] Step 2/3: Creating site...");
      const createdSite = await sessionService.createSite({
        name: siteData.name,
        description: siteData.description || undefined,
      });

      console.log("[Onboarding] ✓ Site created");

      if (withInstance) {
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
      } else {
        console.log("[Onboarding] Instance step skipped - add a router later in Site Manager");
      }
      }

      if (appliance) {
        try {
          await sessionService.connectLocal();
        } catch {
          // Connect 503 still lands on the dashboard.
        }
      }

      router.push(postLoginPath(appliance));
      router.refresh();
    } catch (err) {
      console.error("[Onboarding] Error:", err);
      setError((err as ApiError).message || t("errors.setupFailed"));
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
          <p className="text-sm text-muted-foreground">{t("verifyingAccess")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector compact />
      </div>
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
          <CardTitle className="text-3xl">{t("welcome")}</CardTitle>
          <CardDescription>
            {t("intro")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!appliance && (
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
          )}

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
                <h3 className="text-xl font-semibold mb-2">{t("admin.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("admin.subtitle")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.fullName")}</Label>
                <Input
                  id="name"
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  placeholder={t("admin.fullNamePlaceholder")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("admin.email")}</Label>
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
                <Label htmlFor="password">{t("admin.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t("admin.passwordHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("admin.confirmPassword")}</Label>
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
                    {t("admin.creating")}
                  </>
                ) : appliance ? (
                  t("finish")
                ) : (
                  t("continue")
                )}
              </Button>

              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  {t("admin.haveBackup")}{" "}
                  <button
                    type="button"
                    onClick={() => setRestoreOpen(true)}
                    className="font-medium text-primary hover:underline"
                  >
                    {t("admin.restoreBackup")}
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Step 2: Create Site */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">{t("site.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("site.subtitle")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteName">{t("site.name")}</Label>
                <Input
                  id="siteName"
                  value={siteData.name}
                  onChange={(e) => setSiteData({ ...siteData, name: e.target.value })}
                  placeholder={t("site.namePlaceholder")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">{t("descriptionOptional")}</Label>
                <Textarea
                  id="siteDescription"
                  value={siteData.description}
                  onChange={(e) => setSiteData({ ...siteData, description: e.target.value })}
                  placeholder={t("site.descriptionPlaceholder")}
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
                  {t("back")}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || isSubmitting}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("site.creating")}
                    </>
                  ) : (
                    t("continue")
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Add Instance */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">{t("instance.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("instance.subtitle")}
                </p>
              </div>

              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">{t("instance.basicTab")}</TabsTrigger>
                  <TabsTrigger value="connection">{t("instance.connectionTab")}</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="instanceName">{t("instance.name")}</Label>
                    <Input
                      id="instanceName"
                      value={instanceData.name}
                      onChange={(e) => setInstanceData({ ...instanceData, name: e.target.value })}
                      placeholder="vyos-router-01"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instanceDescription">{t("descriptionOptional")}</Label>
                    <Textarea
                      id="instanceDescription"
                      value={instanceData.description}
                      onChange={(e) => setInstanceData({ ...instanceData, description: e.target.value })}
                      placeholder={t("instance.descriptionPlaceholder")}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vyosVersion">{t("instance.version")}</Label>
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
                    <Label htmlFor="host">{t("instance.host")}</Label>
                    <Input
                      id="host"
                      value={instanceData.host}
                      onChange={(e) => setInstanceData({ ...instanceData, host: e.target.value })}
                      placeholder={t("instance.hostPlaceholder")}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="protocol">{t("instance.protocol")}</Label>
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
                      <Label htmlFor="port">{t("instance.port")}</Label>
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
                    <Label htmlFor="apiKey">{t("instance.apiKey")}</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={instanceData.apiKey}
                      onChange={(e) => setInstanceData({ ...instanceData, apiKey: e.target.value })}
                      placeholder={t("instance.apiKeyPlaceholder")}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("instance.apiKeyHint", { command: "set service https api keys id KEY key VALUE" })}
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
                  {t("back")}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || isSubmitting}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("instance.completing")}
                    </>
                  ) : (
                    t("instance.complete")
                  )}
                </Button>
              </div>

              <div className="text-center mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-muted-foreground"
                  onClick={handleSkipInstance}
                  disabled={loading || isSubmitting}
                >
                  {t("instance.skip")}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("instance.skipHint")}
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Disaster recovery: restore a full backup onto this fresh install */}
      <BackupRestoreModal
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        defaultTab="restore"
        onRestored={() => router.push("/login")}
      />
    </div>
  );
}
