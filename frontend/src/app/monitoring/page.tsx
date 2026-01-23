"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Network, Globe, Bell, Shield, History } from "lucide-react";
import { SystemMetricsCard } from "@/components/monitoring/SystemMetricsCard";
import { InterfaceTrafficChart } from "@/components/monitoring/InterfaceTrafficChart";
import { ConntrackTable } from "@/components/monitoring/ConntrackTable";
import { TopTalkersCard } from "@/components/monitoring/TopTalkersCard";
import { VPNStatusTab } from "@/components/monitoring/VPNStatusTab";
import { AlertRulesPanel } from "@/components/monitoring/AlertRulesPanel";
import { AlertHistoryPanel } from "@/components/monitoring/AlertHistoryPanel";
import { MetricsHistoryChart } from "@/components/monitoring/MetricsHistoryChart";

export default function MonitoringPage() {
  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Real-time system metrics, interface traffic, and connection tracking
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="system" className="space-y-4">
          <TabsList>
            <TabsTrigger value="system" className="gap-2">
              <Cpu className="h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="traffic" className="gap-2">
              <Network className="h-4 w-4" />
              Traffic
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Globe className="h-4 w-4" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="vpn" className="gap-2">
              <Shield className="h-4 w-4" />
              VPN
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* System Tab */}
          <TabsContent value="system">
            <SystemMetricsCard autoRefresh={true} refreshInterval={5000} />
          </TabsContent>

          {/* Traffic Tab */}
          <TabsContent value="traffic">
            <InterfaceTrafficChart autoRefresh={true} refreshInterval={5000} />
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections">
            <div className="space-y-6">
              <TopTalkersCard autoRefresh={false} limit={10} />
              <ConntrackTable autoRefresh={false} pageSize={50} />
            </div>
          </TabsContent>

          {/* VPN Tab */}
          <TabsContent value="vpn">
            <div className="p-4">
              <VPNStatusTab autoRefresh={true} refreshInterval={10000} />
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <div className="space-y-6">
              <AlertRulesPanel />
              <AlertHistoryPanel />
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <MetricsHistoryChart />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
