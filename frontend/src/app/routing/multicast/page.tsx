"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { InProgress } from "@/components/layout/InProgress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Radio, ChevronRight, Wifi } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type MulticastType = "igmp-proxy" | "pim" | "pim6";

const multicast = [
  { id: "igmp-proxy" as MulticastType, name: "IGMP Proxy", description: "Internet Group Management Protocol Proxy", icon: Wifi },
  { id: "pim" as MulticastType, name: "PIM", description: "Protocol Independent Multicast", icon: Radio },
  { id: "pim6" as MulticastType, name: "PIM6", description: "Protocol Independent Multicast for IPv6", icon: Radio },
];

export default function MulticastPage() {
  const [selectedMulticast, setSelectedMulticast] = useState<MulticastType>("igmp-proxy");

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Multicast Protocol Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Radio className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Multicast</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Multicast routing protocols
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Multicast Protocol List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {multicast.map((protocol) => {
                const Icon = protocol.icon;
                return (
                  <button
                    key={protocol.id}
                    onClick={() => setSelectedMulticast(protocol.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedMulticast === protocol.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        selectedMulticast === protocol.id ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          selectedMulticast === protocol.id ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={cn(
                            "font-medium text-sm",
                            selectedMulticast === protocol.id ? "text-foreground" : "text-foreground"
                          )}>
                            {protocol.name}
                          </span>
                          {selectedMulticast === protocol.id && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {protocol.description}
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
