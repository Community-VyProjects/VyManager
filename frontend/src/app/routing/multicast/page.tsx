"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { InProgress } from "@/components/layout/InProgress";
import { IgmpProxyContent } from "@/components/igmp-proxy/IgmpProxyContent";
import { PimContent } from "@/components/pim/PimContent";
import { Pim6Content } from "@/components/pim6/Pim6Content";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Radio, ChevronRight, Wifi } from "lucide-react";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type MulticastType = "igmp-proxy" | "pim" | "pim6";

const allMulticast = [
  { id: "igmp-proxy" as MulticastType, icon: Wifi, permission: FeatureGroup.IGMP_PROXY },
  { id: "pim" as MulticastType, icon: Radio, permission: FeatureGroup.PIM },
  { id: "pim6" as MulticastType, icon: Radio, permission: FeatureGroup.PIM6 },
];

export default function MulticastPage() {
  const t = useTranslations("routingPages");
  const { canRead, isLoading } = usePermissions();

  // Filter multicast protocols based on user permissions
  const multicast = useMemo(() => {
    if (isLoading) return [];
    return allMulticast.filter(protocol => canRead(protocol.permission));
  }, [canRead, isLoading]);

  const [userSelectedMulticast, setSelectedMulticast] = useState<MulticastType | null>(null);

  // Auto-select the first available protocol until the user picks one (derived, no effect)
  const selectedMulticast = userSelectedMulticast ?? multicast[0]?.id ?? null;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Multicast Protocol Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Radio className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("multicast.title")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("multicast.subtitle")}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Multicast Protocol List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">{t("multicast.loading")}</p>
                </div>
              ) : multicast.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">{t("multicast.empty")}</p>
                </div>
              ) : (
                multicast.map((protocol) => {
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
                              {t(`multicast.items.${protocol.id}.name`)}
                            </span>
                            {selectedMulticast === protocol.id && (
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {t(`multicast.items.${protocol.id}.description`)}
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
        <div className="flex-1 overflow-hidden">
          {selectedMulticast === "igmp-proxy" ? (
            <IgmpProxyContent />
          ) : selectedMulticast === "pim" ? (
            <PimContent />
          ) : selectedMulticast === "pim6" ? (
            <Pim6Content />
          ) : selectedMulticast === null ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">{t("multicast.loading")}</p>
            </div>
          ) : (
            <InProgress />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
