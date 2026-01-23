"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Server, Shield, Plus, Trash2, Settings } from "lucide-react";
import { type DNSForwardingConfig } from "@/lib/api/dns";
import { DNSEditModal } from "./DNSEditModal";

interface DNSServiceCardProps {
  config: DNSForwardingConfig;
  onUpdate: () => void;
}

export function DNSServiceCard({ config, onUpdate }: DNSServiceCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
            <Globe className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">DNS Forwarding Configuration</h2>
            <p className="text-sm text-muted-foreground">Forward DNS queries to upstream name servers</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Edit Settings
        </Button>
      </div>

      <DNSEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={onUpdate}
        config={config}
      />

      {!config.configured ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Globe className="h-12 w-12 mb-4 opacity-30" />
          <p>DNS Forwarding is not configured</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Configure DNS Forwarding
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Listen Addresses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Server className="h-4 w-4" />
                Listen Addresses
              </h3>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {config.listen_addresses.length > 0 ? (
                config.listen_addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                  >
                    <code className="text-sm font-mono">{addr}</code>
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
                <p className="text-sm text-muted-foreground italic">No listen addresses configured</p>
              )}
            </div>
          </div>

          {/* Allow From Networks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Allow From Networks
              </h3>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {config.allow_from.length > 0 ? (
                config.allow_from.map((network, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                  >
                    <code className="text-sm font-mono">{network}</code>
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
                <p className="text-sm text-muted-foreground italic">No networks allowed</p>
              )}
            </div>
          </div>

          {/* Name Servers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Name Servers
              </h3>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {config.name_servers.length > 0 ? (
                config.name_servers.map((server, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                  >
                    <div>
                      <code className="text-sm font-mono">{server.address}</code>
                      {server.port && (
                        <span className="text-xs text-muted-foreground ml-2">:{server.port}</span>
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
                <p className="text-sm text-muted-foreground italic">No name servers configured</p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Options
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Cache Size</p>
                <p className="font-mono text-sm font-medium">{config.cache_size || "Default"}</p>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">DNSSEC</p>
                <p className="text-sm font-medium capitalize">{config.dnssec || "Off"}</p>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Negative TTL</p>
                <p className="font-mono text-sm font-medium">{config.negative_ttl || "Default"}</p>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Timeout</p>
                <p className="font-mono text-sm font-medium">{config.timeout || "Default"}</p>
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Flags</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={config.system ? "default" : "secondary"}>
                {config.system ? "Using System Nameservers" : "Custom Nameservers"}
              </Badge>
              {config.ignore_hosts_file && (
                <Badge variant="outline">Ignore Hosts File</Badge>
              )}
              {config.no_serve_rfc1918 && (
                <Badge variant="outline">No RFC1918 Responses</Badge>
              )}
            </div>
          </div>

          {/* Forward Domains */}
          {config.domains.length > 0 && (
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Domain-specific Forwarding</h3>
                <Button variant="ghost" size="sm" className="h-7">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Domain
                </Button>
              </div>
              <div className="space-y-2">
                {config.domains.map((domain, idx) => (
                  <div key={idx} className="p-3 rounded-md bg-accent/50">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-sm font-medium">{domain.name}</code>
                      <div className="flex gap-1">
                        {domain.addnta && <Badge variant="outline" className="text-xs">ADDNTA</Badge>}
                        {domain.recursion_desired && <Badge variant="outline" className="text-xs">Recursion</Badge>}
                      </div>
                    </div>
                    {domain.name_servers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {domain.name_servers.map((ns, nsIdx) => (
                          <Badge key={nsIdx} variant="secondary" className="font-mono text-xs">
                            {ns}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DHCP Interfaces */}
          {config.dhcp_interfaces.length > 0 && (
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">DHCP Interfaces</h3>
              <div className="flex flex-wrap gap-2">
                {config.dhcp_interfaces.map((iface, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono">
                    {iface}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
