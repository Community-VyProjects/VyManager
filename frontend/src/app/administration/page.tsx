"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, Server, Users, KeyRound, Key, Download } from "lucide-react";
import { administrationTabFromSearch, type AdministrationTab } from "@/lib/query-tabs";
import { hideSiteInventory } from "@/lib/appliance";
import { useSessionStore } from "@/store/session-store";
import { sessionService, type Instance, type Site } from "@/lib/api/session";
import { UserManagement } from "@/components/user-management/UserManagement";
import { AuthenticationSettings } from "@/components/authentication/AuthenticationSettings";
import { ApiTokensPanel } from "@/components/tokens/ApiTokensPanel";
import { BackupRestoreModal } from "@/components/session/BackupRestoreModal";
import { InstanceModal } from "@/components/sites/InstanceModal";

function AdministrationPageInner() {
  const t = useTranslations("admin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appliance, loadSession } = useSessionStore();
  const [modeReady, setModeReady] = useState(false);
  const tab: AdministrationTab =
    administrationTabFromSearch((key) => searchParams.get(key)) ?? "instance";

  const [sites, setSites] = useState<Site[]>([]);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  useEffect(() => {
    void loadSession().finally(() => setModeReady(true));
  }, [loadSession]);

  useEffect(() => {
    if (!modeReady) return;
    if (!hideSiteInventory(appliance)) {
      router.replace("/sites");
    }
  }, [modeReady, appliance, router]);

  const loadInstance = async () => {
    setLoading(true);
    setError(null);
    try {
      const siteList = await sessionService.listSites();
      setSites(siteList);
      const site = siteList[0];
      if (!site) {
        setInstance(null);
        return;
      }
      const instances = await sessionService.listInstances(site.id);
      setInstance(instances[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!modeReady || !hideSiteInventory(appliance)) return;
    void loadInstance();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once the mode is known; a language switch re-renders via router.refresh()
  }, [modeReady, appliance]);

  const setTab = (value: string) => {
    router.replace(`/administration?section=${value}`);
  };

  if (!modeReady || !hideSiteInventory(appliance)) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("page.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("page.subtitle")}
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="instance" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              {t("page.tabs.instance")}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("page.tabs.users")}
            </TabsTrigger>
            <TabsTrigger value="authentication" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t("page.tabs.authentication")}
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t("page.tabs.tokens")}
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t("page.tabs.backup")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instance">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("page.loadingInstance")}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : !instance ? (
              <p className="text-sm text-muted-foreground">{t("page.noInstance")}</p>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{instance.name}</CardTitle>
                  <CardDescription>
                    {t("page.instanceDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t("page.instanceSummary", {
                      host: instance.host,
                      port: String(instance.port),
                      version: instance.vyos_version ?? "",
                      timeout: String(instance.timeout),
                    })}
                  </p>
                  <Button className="gap-2" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4" />
                    {t("page.editInstance")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          <TabsContent value="authentication">
            <AuthenticationSettings />
          </TabsContent>
          <TabsContent value="tokens">
            <ApiTokensPanel />
          </TabsContent>
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>{t("page.backupTitle")}</CardTitle>
                <CardDescription>
                  {t("page.backupDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="gap-2" onClick={() => setBackupOpen(true)}>
                  <Download className="h-4 w-4" />
                  {t("page.backupTitle")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <InstanceModal
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => {
            void loadInstance();
          }}
          existing={instance}
          sites={sites}
        />
        <BackupRestoreModal
          open={backupOpen}
          onOpenChange={setBackupOpen}
          onRestored={() => {
            void loadInstance();
          }}
        />
      </div>
    </AppLayout>
  );
}

export default function AdministrationPage() {
  return (
    <Suspense>
      <AdministrationPageInner />
    </Suspense>
  );
}
