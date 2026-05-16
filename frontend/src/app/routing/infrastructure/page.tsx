"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { InProgress } from "@/components/layout/InProgress";
import { BfdContent } from "@/components/bfd/BfdContent";
import { MplsContent } from "@/components/mpls/MplsContent";
import { NhrpContent } from "@/components/nhrp/NhrpContent";
import { RpkiContent } from "@/components/rpki/RpkiContent";
import { TrafficEngineeringContent } from "@/components/traffic-engineering/TrafficEngineeringContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Settings, ChevronRight, Activity, Box, Waypoints, Globe, Shield, GitBranch } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { trafficEngineeringService } from "@/lib/api/traffic-engineering";

type InfraType = "bfd" | "mpls" | "segment-routing" | "nhrp" | "rpki" | "traffic-engineering";

const allInfrastructure: {
  id: InfraType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: FeatureGroup;
  requiresCapability?: boolean;
}[] = [
  { id: "bfd", name: "BFD", description: "Bidirectional Forwarding Detection", icon: Activity, permission: FeatureGroup.BFD },
  { id: "mpls", name: "MPLS", description: "Multiprotocol Label Switching", icon: Box, permission: FeatureGroup.MPLS },
  { id: "segment-routing", name: "Segment Routing", description: "Source routing with segments", icon: Waypoints, permission: FeatureGroup.SEGMENT_ROUTING },
  { id: "nhrp", name: "NHRP", description: "Next Hop Resolution Protocol", icon: Globe, permission: FeatureGroup.NHRP },
  { id: "rpki", name: "RPKI", description: "Resource Public Key Infrastructure", icon: Shield, permission: FeatureGroup.RPKI },
  { id: "traffic-engineering", name: "Traffic Engineering", description: "MPLS-TE link parameter configuration", icon: GitBranch, permission: FeatureGroup.TRAFFIC_ENGINEERING, requiresCapability: true },
];

function InfrastructurePageInner() {
  const searchParams = useSearchParams();
  const { canRead, isLoading } = usePermissions();
  const [teSupported, setTeSupported] = useState<boolean | null>(null);

  useEffect(() => {
    trafficEngineeringService
      .getCapabilities()
      .then((caps) => setTeSupported(caps.features.traffic_engineering.supported))
      .catch(() => setTeSupported(false));
  }, []);

  // Filter infrastructure based on user permissions and capabilities
  const infrastructure = useMemo(() => {
    if (isLoading) return [];
    return allInfrastructure.filter((infra) => {
      if (!canRead(infra.permission)) return false;
      if (infra.requiresCapability && teSupported !== true) return false;
      return true;
    });
  }, [canRead, isLoading, teSupported]);

  const [selectedInfra, setSelectedInfra] = useState<InfraType | null>(null);

  // Auto-select first available infrastructure component or use the requested section
  useEffect(() => {
    if (infrastructure.length === 0) return;

    const section = searchParams.get("section") as InfraType | null;

    if (section && infrastructure.some((infra) => infra.id === section)) {
      setSelectedInfra(section);
      return;
    }

    if (!selectedInfra) {
      setSelectedInfra(infrastructure[0].id);
    }
  }, [infrastructure, selectedInfra, searchParams]);

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Infrastructure Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Routing Infrastructure</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Advanced routing features
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Infrastructure List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading infrastructure...</p>
                </div>
              ) : infrastructure.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No accessible infrastructure</p>
                </div>
              ) : (
                infrastructure.map((infra) => {
                const Icon = infra.icon;
                return (
                  <button
                    key={infra.id}
                    onClick={() => setSelectedInfra(infra.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedInfra === infra.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        selectedInfra === infra.id ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          selectedInfra === infra.id ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={cn(
                            "font-medium text-sm",
                            selectedInfra === infra.id ? "text-foreground" : "text-foreground"
                          )}>
                            {infra.name}
                          </span>
                          {selectedInfra === infra.id && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {infra.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {selectedInfra === "bfd" ? (
            <BfdContent />
          ) : selectedInfra === "mpls" ? (
            <MplsContent />
          ) : selectedInfra === "nhrp" ? (
            <NhrpContent />
          ) : selectedInfra === "rpki" ? (
            <RpkiContent />
          ) : selectedInfra === "traffic-engineering" ? (
            <TrafficEngineeringContent />
          ) : (
            <InProgress />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function InfrastructurePage() {
  return (
    <Suspense>
      <InfrastructurePageInner />
    </Suspense>
  );
}
