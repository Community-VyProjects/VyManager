"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Server, Settings2 } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";
import { SchemaEditor } from "./schema/SchemaEditor";
import { DHCPV6_SCHEMA } from "./schema/schemas";
import { EntityListEditor } from "./schema/EntityListEditor";
import { DHCPV6_SHARED_NETWORK_GROUP } from "./schema/dhcpv6Entities";

interface VrfDhcpv6TabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfDhcpv6Tab({ vrf, capabilities, canWrite, onRefresh }: VrfDhcpv6TabProps) {
  const t = useTranslations("vrfProtocols");
  const tc = useTranslations("common");
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const dhcpv6 = vrf.dhcpv6;

  const editor = (
    <SchemaEditor
      open={editOpen}
      onOpenChange={setEditOpen}
      title={t("dhcpv6.settingsTitle", { vrf: vrf.name })}
      vrfName={vrf.name}
      sections={DHCPV6_SCHEMA}
      scope="dhcpv6"
      rawConfig={dhcpv6?.raw_config}
      capabilities={capabilities}
      canWrite={canWrite}
      onSaved={onRefresh}
    />
  );

  if (!dhcpv6 || !dhcpv6.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Server className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("dhcpv6.server")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("tabs.notConfigured")}</p>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            {t("dhcpv6.configure")}
          </Button>
        )}
        {editor}
      </div>
    );
  }

  const totalSubnets = dhcpv6.shared_networks.reduce(
    (sum, n) => sum + n.subnets.length,
    0
  );
  const totalMappings = dhcpv6.shared_networks.reduce(
    (sum, n) => sum + n.subnets.reduce((s, sub) => s + sub.static_mappings, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{tc("status")}</p>
            <Badge variant={dhcpv6.disabled ? "outline" : "secondary"}>
              {dhcpv6.disabled ? tc("disabled") : t("tabs.active")}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("tabs.sharedNetworks")}</p>
            <p className="text-lg font-semibold">{dhcpv6.shared_networks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("tabs.subnets")}</p>
            <p className="text-lg font-semibold">{totalSubnets}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("tabs.staticMappings")}</p>
            <p className="text-lg font-semibold">{totalMappings}</p>
          </CardContent>
        </Card>
      </div>

      <EntityListEditor
        vrfName={vrf.name}
        group={DHCPV6_SHARED_NETWORK_GROUP}
        rawParent={dhcpv6.raw_config}
        capabilities={capabilities}
        canWrite={canWrite}
        onRefresh={onRefresh}
      />

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            {t("tabs.editSettings")}
          </Button>
        )}
        {dhcpv6.raw_config && (
          <Button variant="outline" size="sm" onClick={() => setRawConfigOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            {t("tabs.viewRawConfig")}
          </Button>
        )}
      </div>
      {editor}

      <Dialog open={rawConfigOpen} onOpenChange={setRawConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t("dhcpv6.rawTitle", { vrf: vrf.name })}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(dhcpv6.raw_config, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
