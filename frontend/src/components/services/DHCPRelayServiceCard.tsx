"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Server, Network, Plus, Trash2, Settings, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { type DHCPRelayFullConfig } from "@/lib/api/dhcp-relay";
import { DHCPRelayEditModal } from "./DHCPRelayEditModal";

interface DHCPRelayServiceCardProps {
  config: DHCPRelayFullConfig;
  onUpdate: () => void;
}

export function DHCPRelayServiceCard({ config, onUpdate }: DHCPRelayServiceCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const { dhcp_relay, dhcpv6_relay } = config;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
            <Server className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">DHCP Relay Configuration</h2>
            <p className="text-sm text-muted-foreground">Relay DHCP requests to remote servers</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Edit Settings
        </Button>
      </div>

      <DHCPRelayEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={onUpdate}
        config={config}
      />

      {!dhcp_relay.configured && !dhcpv6_relay.configured ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Server className="h-12 w-12 mb-4 opacity-30" />
          <p>DHCP Relay is not configured</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Configure DHCP Relay
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* DHCPv4 Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={dhcp_relay.configured ? "default" : "secondary"} className={dhcp_relay.configured ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : ""}>
                DHCPv4 Relay
              </Badge>
              {dhcp_relay.configured && (
                <span className="text-sm text-muted-foreground">
                  {dhcp_relay.servers.length} server{dhcp_relay.servers.length !== 1 ? "s" : ""}, {dhcp_relay.interfaces.length} interface{dhcp_relay.interfaces.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {dhcp_relay.configured ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DHCP Servers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      DHCP Servers
                    </h3>
                    <Button variant="ghost" size="sm" className="h-7">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dhcp_relay.servers.length > 0 ? (
                      dhcp_relay.servers.map((server, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                        >
                          <code className="text-sm font-mono">{server}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No DHCP servers configured</p>
                    )}
                  </div>
                </div>

                {/* Relay Interfaces */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Relay Interfaces
                    </h3>
                    <Button variant="ghost" size="sm" className="h-7">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dhcp_relay.interfaces.length > 0 ? (
                      dhcp_relay.interfaces.map((iface, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                        >
                          <code className="text-sm font-mono">{iface}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No relay interfaces configured</p>
                    )}
                  </div>
                </div>

                {/* Listen & Upstream Interfaces */}
                {(dhcp_relay.listen_interfaces.length > 0 || dhcp_relay.upstream_interfaces.length > 0) && (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <ArrowDownLeft className="h-4 w-4" />
                        Listen Interfaces
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {dhcp_relay.listen_interfaces.length > 0 ? (
                          dhcp_relay.listen_interfaces.map((iface, idx) => (
                            <Badge key={idx} variant="outline" className="font-mono">
                              {iface}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">None configured</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4" />
                        Upstream Interfaces
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {dhcp_relay.upstream_interfaces.length > 0 ? (
                          dhcp_relay.upstream_interfaces.map((iface, idx) => (
                            <Badge key={idx} variant="outline" className="font-mono">
                              {iface}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">None configured</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Relay Options */}
                {dhcp_relay.relay_options && (
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Relay Options
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-md bg-accent/50">
                        <p className="text-xs text-muted-foreground">Hop Count</p>
                        <p className="font-mono text-sm font-medium">{dhcp_relay.relay_options.hop_count || "Default"}</p>
                      </div>
                      <div className="p-3 rounded-md bg-accent/50">
                        <p className="text-xs text-muted-foreground">Max Size</p>
                        <p className="font-mono text-sm font-medium">{dhcp_relay.relay_options.max_size || "Default"}</p>
                      </div>
                      <div className="p-3 rounded-md bg-accent/50">
                        <p className="text-xs text-muted-foreground">Relay Agent Packets</p>
                        <p className="text-sm font-medium capitalize">{dhcp_relay.relay_options.relay_agents_packets || "Default"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-md bg-accent/30 text-center">
                <p className="text-sm text-muted-foreground">DHCPv4 Relay is not configured</p>
              </div>
            )}
          </div>

          {/* DHCPv6 Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Badge variant={dhcpv6_relay.configured ? "default" : "secondary"} className={dhcpv6_relay.configured ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}>
                DHCPv6 Relay
              </Badge>
              {dhcpv6_relay.configured && (
                <span className="text-sm text-muted-foreground">
                  {dhcpv6_relay.listen_interfaces.length} listen, {dhcpv6_relay.upstream_interfaces.length} upstream
                </span>
              )}
            </div>

            {dhcpv6_relay.configured ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Listen Interfaces */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4" />
                      Listen Interfaces
                    </h3>
                    <Button variant="ghost" size="sm" className="h-7">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dhcpv6_relay.listen_interfaces.length > 0 ? (
                      dhcpv6_relay.listen_interfaces.map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                        >
                          <div>
                            <code className="text-sm font-mono">{entry.interface}</code>
                            {entry.address && (
                              <span className="text-xs text-muted-foreground ml-2">({entry.address})</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No listen interfaces configured</p>
                    )}
                  </div>
                </div>

                {/* Upstream Interfaces */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Upstream Interfaces
                    </h3>
                    <Button variant="ghost" size="sm" className="h-7">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dhcpv6_relay.upstream_interfaces.length > 0 ? (
                      dhcpv6_relay.upstream_interfaces.map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                        >
                          <div>
                            <code className="text-sm font-mono">{entry.interface}</code>
                            {entry.address && (
                              <span className="text-xs text-muted-foreground ml-2">({entry.address})</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No upstream interfaces configured</p>
                    )}
                  </div>
                </div>

                {/* DHCPv6 Options */}
                <div className="md:col-span-2 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Options
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-accent/50">
                      <p className="text-xs text-muted-foreground">Max Hop Count</p>
                      <p className="font-mono text-sm font-medium">{dhcpv6_relay.max_hop_count || "Default"}</p>
                    </div>
                    <div className="p-3 rounded-md bg-accent/50">
                      <p className="text-xs text-muted-foreground">Interface ID Option</p>
                      <Badge variant={dhcpv6_relay.use_interface_id_option ? "default" : "secondary"}>
                        {dhcpv6_relay.use_interface_id_option ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-md bg-accent/30 text-center">
                <p className="text-sm text-muted-foreground">DHCPv6 Relay is not configured</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
