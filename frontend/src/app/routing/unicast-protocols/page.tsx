"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { InProgress } from "@/components/layout/InProgress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Network, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ProtocolType = "bgp" | "ospf" | "ospfv3" | "isis" | "openfabric" | "rip" | "ripng" | "babel";

const protocols = [
  { id: "bgp" as ProtocolType, name: "BGP", description: "Border Gateway Protocol" },
  { id: "ospf" as ProtocolType, name: "OSPF", description: "Open Shortest Path First" },
  { id: "ospfv3" as ProtocolType, name: "OSPFv3", description: "OSPF for IPv6" },
  { id: "isis" as ProtocolType, name: "IS-IS", description: "Intermediate System to Intermediate System" },
  { id: "openfabric" as ProtocolType, name: "OpenFabric", description: "OpenFabric Protocol" },
  { id: "rip" as ProtocolType, name: "RIP", description: "Routing Information Protocol" },
  { id: "ripng" as ProtocolType, name: "RIPng", description: "RIP Next Generation" },
  { id: "babel" as ProtocolType, name: "Babel", description: "Babel Routing Protocol" },
];

export default function UnicastProtocolsPage() {
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType>("bgp");

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
              {protocols.map((protocol) => (
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
              ))}
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
