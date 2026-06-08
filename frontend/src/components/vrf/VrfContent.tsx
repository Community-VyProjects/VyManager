"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Network,
  Route,
  RefreshCw,
  Trash2,
  Settings,
  Globe,
  Layers,
  Server,
} from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";
import { VrfSettingsTab } from "./VrfSettingsTab";
import { VrfStaticRoutesTab } from "./VrfStaticRoutesTab";
import { VrfOspfTab } from "./VrfOspfTab";
import { VrfOspfv3Tab } from "./VrfOspfv3Tab";
import { VrfIsisTab } from "./VrfIsisTab";
import { VrfBgpTab } from "./VrfBgpTab";
import { VrfRpkiTab } from "./VrfRpkiTab";
import { VrfFailoverTab } from "./VrfFailoverTab";
import { VrfDhcpTab } from "./VrfDhcpTab";
import { VrfDhcpv6Tab } from "./VrfDhcpv6Tab";
import { DeleteVrfModal } from "./DeleteVrfModal";

interface VrfContentProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
  onVrfDeleted: () => void;
}

export function VrfContent({
  vrf,
  capabilities,
  canWrite,
  onRefresh,
  onVrfDeleted,
}: VrfContentProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  // Count stats for header
  const routeCount =
    (vrf.static?.routes.length ?? 0) + (vrf.static?.routes6.length ?? 0);
  const protocolCount = vrf.protocols.length;
  const serviceCount = vrf.services.length;

  const is15 = capabilities.version_info.is_1_5;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{vrf.name}</h1>
                {vrf.disabled && (
                  <Badge variant="outline" className="text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
              {vrf.description && (
                <p className="text-sm text-muted-foreground">{vrf.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">{vrf.table ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">Table ID</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">{routeCount}</p>
                  <p className="text-[11px] text-muted-foreground">Static Routes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">{protocolCount}</p>
                  <p className="text-[11px] text-muted-foreground">Protocols</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">{serviceCount}</p>
                  <p className="text-[11px] text-muted-foreground">Services</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
        >
          <div className="border-b border-border bg-card px-6">
            <ScrollArea className="w-full" type="scroll">
              <TabsList className="h-10 bg-transparent p-0 gap-0">
                <TabsTrigger
                  value="settings"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Settings
                </TabsTrigger>

                <TabsTrigger
                  value="static"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                >
                  <Route className="h-3.5 w-3.5 mr-1.5" />
                  Static Routes
                  {routeCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {routeCount}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="ospf"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                >
                  OSPF
                  {vrf.ospf?.configured && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      on
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="ospfv3"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                >
                  OSPFv3
                  {vrf.ospfv3?.configured && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      on
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="isis"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                >
                  IS-IS
                  {vrf.isis?.configured && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      on
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="bgp"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                >
                  BGP
                  {vrf.bgp?.configured && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      on
                    </Badge>
                  )}
                </TabsTrigger>

                {is15 && (
                  <TabsTrigger
                    value="rpki"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                  >
                    RPKI
                    {vrf.rpki && vrf.rpki.caches.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                        {vrf.rpki.caches.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}

                {is15 && (
                  <TabsTrigger
                    value="failover"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                  >
                    Failover
                    {vrf.failover && vrf.failover.routes.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                        {vrf.failover.routes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}

                {is15 && (
                  <TabsTrigger
                    value="dhcp"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                  >
                    DHCP
                    {vrf.dhcp?.configured && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                        on
                      </Badge>
                    )}
                  </TabsTrigger>
                )}

                {is15 && (
                  <TabsTrigger
                    value="dhcpv6"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
                  >
                    DHCPv6
                    {vrf.dhcpv6?.configured && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                        on
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6">
              <TabsContent value="settings" className="mt-0">
                <VrfSettingsTab
                  vrf={vrf}
                  capabilities={capabilities}
                  canWrite={canWrite}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="static" className="mt-0">
                <VrfStaticRoutesTab
                  vrf={vrf}
                  capabilities={capabilities}
                  canWrite={canWrite}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="ospf" className="mt-0">
                <VrfOspfTab
                  vrf={vrf}
                  capabilities={capabilities}
                  canWrite={canWrite}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="ospfv3" className="mt-0">
                <VrfOspfv3Tab
                  vrf={vrf}
                  capabilities={capabilities}
                  canWrite={canWrite}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="isis" className="mt-0">
                <VrfIsisTab
                  vrf={vrf}
                  capabilities={capabilities}
                  canWrite={canWrite}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="bgp" className="mt-0">
                <VrfBgpTab
                  vrf={vrf}
                  capabilities={capabilities}
                  canWrite={canWrite}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              {is15 && (
                <TabsContent value="rpki" className="mt-0">
                  <VrfRpkiTab
                    vrf={vrf}
                    capabilities={capabilities}
                    canWrite={canWrite}
                    onRefresh={onRefresh}
                  />
                </TabsContent>
              )}

              {is15 && (
                <TabsContent value="failover" className="mt-0">
                  <VrfFailoverTab
                    vrf={vrf}
                    capabilities={capabilities}
                    canWrite={canWrite}
                    onRefresh={onRefresh}
                  />
                </TabsContent>
              )}

              {is15 && (
                <TabsContent value="dhcp" className="mt-0">
                  <VrfDhcpTab
                    vrf={vrf}
                    capabilities={capabilities}
                    canWrite={canWrite}
                    onRefresh={onRefresh}
                  />
                </TabsContent>
              )}

              {is15 && (
                <TabsContent value="dhcpv6" className="mt-0">
                  <VrfDhcpv6Tab
                    vrf={vrf}
                    capabilities={capabilities}
                    canWrite={canWrite}
                    onRefresh={onRefresh}
                  />
                </TabsContent>
              )}
            </div>
          </div>
        </Tabs>
      </div>

      {/* Delete VRF Modal */}
      <DeleteVrfModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        vrfName={vrf.name}
        onDeleted={onVrfDeleted}
      />
    </div>
  );
}
