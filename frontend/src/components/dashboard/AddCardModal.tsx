"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, Plus, Server, Shield, Lock, TrendingUp, Gauge, ShieldCheck, Waypoints } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

interface AvailableCard {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** FeatureGroup key required to add this card. Undefined = no restriction. */
  requiredPermission?: FeatureGroup;
}

const AVAILABLE_CARDS: AvailableCard[] = [
  {
    type: "interface-statistics",
    name: "Interface Statistics",
    description: "View real-time network interface counters and statistics",
    icon: Network,
  },
  {
    type: "system-info",
    name: "System Information",
    description: "Monitor memory usage, disk partitions, and VyOS version details",
    icon: Server,
  },
  {
    type: "wireguard-peers",
    name: "WireGuard Peers",
    description: "Live peer status with handshake times, transfer stats, and connection health",
    icon: Shield,
    requiredPermission: FeatureGroup.WIREGUARD,
  },
  {
    type: "network-speed",
    name: "Network Speed",
    description: "Real-time download and upload speed graph for any interface over a 2-minute rolling window",
    icon: TrendingUp,
  },
  {
    type: "qos-statistics",
    name: "QoS Statistics",
    description: "Live per-class shaper bandwidth, drops and policy effectiveness for QoS-enabled interfaces",
    icon: Gauge,
    requiredPermission: FeatureGroup.QOS,
  },
  {
    type: "openvpn-status",
    name: "OpenVPN",
    description: "Live status of OpenVPN servers, clients and site-to-site tunnels with connected client details",
    icon: ShieldCheck,
    requiredPermission: FeatureGroup.OPENVPN,
  },
  {
    type: "vrrp-status",
    name: "VRRP / High Availability",
    description: "Real-time VRRP group state (MASTER/BACKUP/FAULT) with interface, VRID, priority and last transition",
    icon: Waypoints,
    requiredPermission: FeatureGroup.HIGH_AVAILABILITY,
  },
];

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCard: (cardType: string) => void;
}

export function AddCardModal({ open, onOpenChange, onAddCard }: AddCardModalProps) {
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
          <DialogTitle>Add Dashboard Card</DialogTitle>
          <DialogDescription>
            Select a card to add to your dashboard
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
                      <CardTitle className="text-base">{card.name}</CardTitle>
                    </div>
                    {locked && (
                      <div
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                        title={`Requires ${card.requiredPermission} read permission`}
                      >
                        <Lock className="h-3 w-3" />
                        <span>No access</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedType}>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
