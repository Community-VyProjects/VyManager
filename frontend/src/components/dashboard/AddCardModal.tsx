"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, Plus, Server, Shield, Lock, TrendingUp, Gauge, ShieldCheck, Waypoints, Route, Activity, Thermometer } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type CardKey =
  | "interfaceStatistics"
  | "systemInfo"
  | "hardwareSensors"
  | "transceiverHealth"
  | "wireguardPeers"
  | "networkSpeed"
  | "pppoeStatistics"
  | "qosStatistics"
  | "openvpnStatus"
  | "vrrpStatus"
  | "bgpStatus"
  | "ipsecStatus";

interface AvailableCard {
  type: string;
  /** Message key under dashboard.addCardModal.cards for the name and description. */
  key: CardKey;
  icon: React.ComponentType<{ className?: string }>;
  /** FeatureGroup key required to add this card. Undefined = no restriction. */
  requiredPermission?: FeatureGroup;
}

const AVAILABLE_CARDS: AvailableCard[] = [
  {
    type: "interface-statistics",
    key: "interfaceStatistics",
    icon: Network,
  },
  {
    type: "system-info",
    key: "systemInfo",
    icon: Server,
  },
  {
    type: "hardware-sensors",
    key: "hardwareSensors",
    icon: Thermometer,
  },
  {
    type: "transceiver-health",
    key: "transceiverHealth",
    icon: Gauge,
    requiredPermission: FeatureGroup.ETHERNET,
  },
  {
    type: "wireguard-peers",
    key: "wireguardPeers",
    icon: Shield,
    requiredPermission: FeatureGroup.WIREGUARD,
  },
  {
    type: "network-speed",
    key: "networkSpeed",
    icon: TrendingUp,
  },
  {
    type: "pppoe-statistics",
    key: "pppoeStatistics",
    icon: Activity,
    requiredPermission: FeatureGroup.PPPOE,
  },
  {
    type: "qos-statistics",
    key: "qosStatistics",
    icon: Gauge,
    requiredPermission: FeatureGroup.QOS,
  },
  {
    type: "openvpn-status",
    key: "openvpnStatus",
    icon: ShieldCheck,
    requiredPermission: FeatureGroup.OPENVPN,
  },
  {
    type: "vrrp-status",
    key: "vrrpStatus",
    icon: Waypoints,
    requiredPermission: FeatureGroup.HIGH_AVAILABILITY,
  },
  {
    type: "bgp-status",
    key: "bgpStatus",
    icon: Route,
    requiredPermission: FeatureGroup.BGP,
  },
  {
    type: "ipsec-status",
    key: "ipsecStatus",
    icon: Lock,
    requiredPermission: FeatureGroup.IPSEC,
  },
];

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCard: (cardType: string) => void;
}

export function AddCardModal({ open, onOpenChange, onAddCard }: AddCardModalProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { canRead, isLoading: permissionsLoading } = usePermissions();

  const handleAdd = () => {
    if (selectedType) {
      onAddCard(selectedType);
      setSelectedType(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>{t("addCardModal.title")}</DialogTitle>
          <DialogDescription>
            {t("addCardModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3 flex-1 min-h-0 overflow-y-auto">
          {AVAILABLE_CARDS.map((card) => {
            const Icon = card.icon;
            const locked =
              !permissionsLoading &&
              !!card.requiredPermission &&
              !canRead(card.requiredPermission);
            const isSelected = selectedType === card.type;

            return (
              <Card
                key={card.type}
                className={`transition-all relative ${
                  locked
                    ? "opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "border-primary ring-2 ring-primary ring-offset-2 cursor-pointer"
                    : "hover:border-primary/50 cursor-pointer"
                }`}
                onClick={() => !locked && setSelectedType(card.type)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{t(`addCardModal.cards.${card.key}.name`)}</CardTitle>
                    </div>
                    {locked && (
                      <div
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                        title={t("addCardModal.requiresPermission", { permission: String(card.requiredPermission) })}
                      >
                        <Lock className="h-3 w-3" />
                        <span>{t("addCardModal.noAccess")}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {t(`addCardModal.cards.${card.key}.description`)}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={!selectedType}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addCardModal.addCard")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
