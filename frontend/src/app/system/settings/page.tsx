"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Users, FileText, Shield, Map, Settings2 } from "lucide-react";
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

export default function SystemSettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canWrite } = usePermissions();

  const isReadOnly = !canWrite(FeatureGroup.SYSTEM);

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
      .catch(() => setError("Failed to load system configuration."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(true);
  }, []);

  const refresh = () => load(true);

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage VyOS system configuration — hostname, users, syslog, conntrack, and more.
          </p>
          {isReadOnly && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              You have read-only access to system settings.
            </p>
          )}
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading system configuration…</p>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && config && capabilities && (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users &amp; Login
              </TabsTrigger>
              <TabsTrigger value="syslog" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Syslog
              </TabsTrigger>
              <TabsTrigger value="conntrack" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Conntrack
              </TabsTrigger>
              <TabsTrigger value="hostmap" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Host Mapping
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Advanced
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
              <UserManagementPanel
                config={config}
                capabilities={capabilities}
                isReadOnly={isReadOnly}
                onRefresh={refresh}
              />
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
