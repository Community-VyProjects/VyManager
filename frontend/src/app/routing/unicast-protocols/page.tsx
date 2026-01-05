"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { InProgress } from "@/components/layout/InProgress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Network, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type ProtocolType = "bgp" | "ospf" | "ospfv3" | "isis" | "openfabric" | "rip" | "ripng" | "babel";

const allProtocols = [
  { id: "bgp" as ProtocolType, name: "BGP", description: "Border Gateway Protocol", permission: FeatureGroup.BGP },
  { id: "ospf" as ProtocolType, name: "OSPF", description: "Open Shortest Path First", permission: FeatureGroup.OSPF },
  { id: "ospfv3" as ProtocolType, name: "OSPFv3", description: "OSPF for IPv6", permission: FeatureGroup.OSPFV3 },
  { id: "isis" as ProtocolType, name: "IS-IS", description: "Intermediate System to Intermediate System", permission: FeatureGroup.ISIS },
  { id: "openfabric" as ProtocolType, name: "OpenFabric", description: "OpenFabric Protocol", permission: FeatureGroup.OPENFABRIC },
  { id: "rip" as ProtocolType, name: "RIP", description: "Routing Information Protocol", permission: FeatureGroup.RIP },
  { id: "ripng" as ProtocolType, name: "RIPng", description: "RIP Next Generation", permission: FeatureGroup.RIPNG },
  { id: "babel" as ProtocolType, name: "Babel", description: "Babel Routing Protocol", permission: FeatureGroup.BABEL },
];

export default function UnicastProtocolsPage() {
  const { canRead, isLoading } = usePermissions();

  // Filter protocols based on user permissions
  const protocols = useMemo(() => {
    if (isLoading) return [];
    return allProtocols.filter(protocol => canRead(protocol.permission));
  }, [canRead, isLoading]);

  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);

  // Auto-select first available protocol
  useEffect(() => {
    if (protocols.length > 0 && !selectedProtocol) {
      setSelectedProtocol(protocols[0].id);
    }
  }, [protocols, selectedProtocol]);

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Protocol Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Network className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Unicast Protocols</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Dynamic routing protocols
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Protocol List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading protocols...</p>
                </div>
              ) : protocols.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No accessible protocols</p>
                </div>
              ) : (
                protocols.map((protocol) => (
                <button
                  key={protocol.id}
                  onClick={() => setSelectedProtocol(protocol.id)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedProtocol === protocol.id
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedProtocol === protocol.id ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Network className={cn(
                        "h-4 w-4",
                        selectedProtocol === protocol.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "font-medium text-sm",
                          selectedProtocol === protocol.id ? "text-foreground" : "text-foreground"
                        )}>
                          {protocol.name}
                        </span>
                        {selectedProtocol === protocol.id && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {protocol.description}
                      </span>
                    </div>
                  </div>
                </button>
              ))
              )}
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
