"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Globe,
  Link2,
  Link2Off,
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  dashboardService,
  type DashboardOverview,
  type SiteOverview,
  type InstanceStatus,
} from "@/lib/api/dashboard";
import { sessionService } from "@/lib/api/session";
import { useSessionStore } from "@/store/session-store";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const { connectToInstance, activeSession } = useSessionStore();

  const loadData = async () => {
    try {
      setError(null);
      const overview = await dashboardService.getOverview();
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnect = async (instanceId: string) => {
    try {
      setConnecting(instanceId);
      await connectToInstance(instanceId);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(null);
    }
  };

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
          <p className="text-lg">{error}</p>
          <Button variant="outline" onClick={loadData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-muted-foreground mt-1">
            All your VyOS instances at a glance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Globe}
          label="Sites"
          value={data?.totalSites ?? 0}
          color="blue"
        />
        <StatsCard
          icon={Server}
          label="Instances"
          value={data?.totalInstances ?? 0}
          subValue={`${data?.activeInstances ?? 0} active`}
          color="purple"
        />
        <StatsCard
          icon={Link2}
          label="Connected"
          value={data?.connectedInstances ?? 0}
          color="green"
        />
        <StatsCard
          icon={AlertCircle}
          label="Critical Alerts"
          value={data?.alerts.critical ?? 0}
          color="red"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Warnings"
          value={data?.alerts.warning ?? 0}
          color="yellow"
        />
      </div>

      {/* Alert Banner */}
      {data && data.alerts.unacknowledged > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>
              You have{" "}
              <strong>{data.alerts.unacknowledged} unacknowledged alerts</strong>{" "}
              across your instances
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/monitoring")}
          >
            View Alerts
          </Button>
        </div>
      )}

      {/* Sites and Instances */}
      <div className="space-y-6">
        {data?.sites.map((site) => (
          <SiteCard
            key={site.id}
            site={site}
            onConnect={handleConnect}
            connecting={connecting}
            activeInstanceId={activeSession?.instance_id}
          />
        ))}

        {data?.sites.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No sites configured</p>
              <p className="text-sm mt-1">
                Add sites and instances in Settings to get started
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/sites")}
              >
                Go to Sites
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  subValue?: string;
  color: "blue" | "purple" | "green" | "red" | "yellow";
}) {
  const colorClasses = {
    blue: "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    green: "text-green-500 bg-green-500/10",
    red: "text-red-500 bg-red-500/10",
    yellow: "text-yellow-500 bg-yellow-500/10",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Site Card Component
function SiteCard({
  site,
  onConnect,
  connecting,
  activeInstanceId,
}: {
  site: SiteOverview;
  onConnect: (id: string) => void;
  connecting: string | null;
  activeInstanceId?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{site.name}</CardTitle>
              {site.description && (
                <p className="text-sm text-muted-foreground">
                  {site.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {site.instanceCount} instance{site.instanceCount !== 1 ? "s" : ""}
            </Badge>
            {site.connectedInstanceCount > 0 && (
              <Badge variant="default" className="bg-green-500">
                {site.connectedInstanceCount} connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {site.instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onConnect={onConnect}
              isConnecting={connecting === instance.id}
              isActive={activeInstanceId === instance.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Instance Card Component
function InstanceCard({
  instance,
  onConnect,
  isConnecting,
  isActive,
}: {
  instance: InstanceStatus;
  onConnect: (id: string) => void;
  isConnecting: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isActive
          ? "border-primary bg-primary/5"
          : instance.isConnected
          ? "border-green-500/50 bg-green-500/5"
          : "hover:border-muted-foreground/50"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              instance.isConnected
                ? "bg-green-500"
                : instance.isActive
                ? "bg-yellow-500"
                : "bg-gray-400"
            }`}
          />
          <span className="font-medium">{instance.name}</span>
        </div>
        {instance.vyosVersion && (
          <Badge variant="secondary" className="text-xs">
            v{instance.vyosVersion}
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-sm text-muted-foreground mb-3">
        <p className="font-mono text-xs">
          {instance.host}:{instance.port}
        </p>
        {instance.description && (
          <p className="text-xs truncate">{instance.description}</p>
        )}
        {instance.isConnected && instance.connectedBy && (
          <p className="text-xs flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            {instance.connectedBy}
            {instance.connectedAt && (
              <span className="text-muted-foreground/70">
                {" "}
                ({formatDistanceToNow(new Date(instance.connectedAt), { addSuffix: true })})
              </span>
            )}
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant={isActive ? "default" : "outline"}
        className="w-full"
        onClick={() => onConnect(instance.id)}
        disabled={isConnecting || isActive}
      >
        {isConnecting ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : isActive ? (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Active Session
          </>
        ) : (
          <>
            <ChevronRight className="h-4 w-4 mr-2" />
            Connect
          </>
        )}
      </Button>
    </div>
  );
}

// Loading Skeleton
function OverviewSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div>
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-4 w-16 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-9 w-full mt-3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
