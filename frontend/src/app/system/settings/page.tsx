"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Users, FileText, Shield, Map, Settings2, Network, Clock, Activity } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
} from "@/lib/api/system-settings";
import { FeatureGroup } from "@/lib/api/user-management";
import { usePermissions } from "@/hooks/usePermissions";
import { GeneralSettingsCard } from "@/components/system/settings/GeneralSettingsCard";
import { UserManagementPanel } from "@/components/system/settings/UserManagementPanel";
import { SyslogPanel } from "@/components/system/settings/SyslogPanel";
import { ConntrackPanel } from "@/components/system/settings/ConntrackPanel";
import { HostMappingPanel } from "@/components/system/settings/HostMappingPanel";
import { AdvancedPanel } from "@/components/system/settings/AdvancedPanel";
import { LoginAuthPanel } from "@/components/system/settings/LoginAuthPanel";
import { IpSettingsPanel } from "@/components/system/settings/IpSettingsPanel";
import { TaskSchedulerPanel } from "@/components/system/settings/TaskSchedulerPanel";
import { FlowAccountingPanel } from "@/components/system/settings/FlowAccountingPanel";

function SystemSettingsPageInner() {
  const t = useTranslations("systemGeneral");
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canWrite } = usePermissions();

  const isReadOnly = !canWrite(FeatureGroup.SYSTEM);
  const [selectedTab, setSelectedTab] = useState("general");

  const load = (refresh = false) => {
    setLoading(true);
    setError(null);
    Promise.all([
      systemSettingsService.getConfig(refresh),
      systemSettingsService.getCapabilities(),
    ])
      .then(([cfg, caps]) => {
        setConfig(cfg);
        setCapabilities(caps);
      })
      .catch(() => setError("loadFailed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load settings on mount
    load(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync selected tab from the URL
    setSelectedTab(searchParams.get("tab") ?? "general");
  }, [searchParams]);

  const refresh = () => load(true);

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8" />
            {t("page.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("page.subtitle")}
          </p>
          {isReadOnly && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {t("page.readOnly")}
            </p>
          )}
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">{t("page.loading")}</p>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {t("page.loadFailed")}
          </div>
        )}

        {!loading && config && capabilities && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {t("page.tabs.general")}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("page.tabs.users")}
              </TabsTrigger>
              <TabsTrigger value="syslog" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("page.tabs.syslog")}
              </TabsTrigger>
              <TabsTrigger value="conntrack" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t("page.tabs.conntrack")}
              </TabsTrigger>
              <TabsTrigger value="hostmap" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                {t("page.tabs.hostmap")}
              </TabsTrigger>
              <TabsTrigger value="ipsettings" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                {t("page.tabs.ipSettings")}
              </TabsTrigger>
              <TabsTrigger value="scheduler" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("page.tabs.scheduler")}
              </TabsTrigger>
              <TabsTrigger value="flowaccounting" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {t("page.tabs.flowAccounting")}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {t("page.tabs.advanced")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralSettingsCard
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="users">
              <div className="space-y-6">
                <UserManagementPanel
                  config={config}
                  capabilities={capabilities}
                  isReadOnly={isReadOnly}
                  onRefresh={refresh}
                />
                <LoginAuthPanel
                  config={config}
                  capabilities={capabilities}
                  isReadOnly={isReadOnly}
                  onRefresh={refresh}
                />
              </div>
            </TabsContent>

            <TabsContent value="syslog">
              <SyslogPanel
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="conntrack">
              <ConntrackPanel
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="hostmap">
              <HostMappingPanel
                config={config}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="ipsettings">
              <IpSettingsPanel
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="scheduler">
              <TaskSchedulerPanel
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="flowaccounting">
              <FlowAccountingPanel
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="advanced">
              <AdvancedPanel
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

export default function SystemSettingsPage() {
  return (
    <Suspense>
      <SystemSettingsPageInner />
    </Suspense>
  );
}
