"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { InProgress } from "@/components/layout/InProgress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Settings, ChevronRight, Activity, Box, Waypoints, Globe, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type InfraType = "bfd" | "mpls" | "segment-routing" | "nhrp" | "rpki";

const infrastructure = [
  { id: "bfd" as InfraType, name: "BFD", description: "Bidirectional Forwarding Detection", icon: Activity },
  { id: "mpls" as InfraType, name: "MPLS", description: "Multiprotocol Label Switching", icon: Box },
  { id: "segment-routing" as InfraType, name: "Segment Routing", description: "Source routing with segments", icon: Waypoints },
  { id: "nhrp" as InfraType, name: "NHRP", description: "Next Hop Resolution Protocol", icon: Globe },
  { id: "rpki" as InfraType, name: "RPKI", description: "Resource Public Key Infrastructure", icon: Shield },
];

export default function InfrastructurePage() {
  const [selectedInfra, setSelectedInfra] = useState<InfraType>("bfd");

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
              {infrastructure.map((infra) => {
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
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <InProgress />
        </div>
      </div>
    </AppLayout>
  );
}
