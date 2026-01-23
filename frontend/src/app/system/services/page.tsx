"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Clock,
  Shield,
  Server,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { dnsForwardingService, type DNSForwardingConfig } from "@/lib/api/dns";
import { ntpService, type NTPConfig } from "@/lib/api/ntp";
import { sshService, type SSHConfig } from "@/lib/api/ssh";
import { dhcpRelayService, type DHCPRelayFullConfig } from "@/lib/api/dhcp-relay";
import { DNSServiceCard } from "@/components/services/DNSServiceCard";
import { NTPServiceCard } from "@/components/services/NTPServiceCard";
import { SSHServiceCard } from "@/components/services/SSHServiceCard";
import { DHCPRelayServiceCard } from "@/components/services/DHCPRelayServiceCard";

interface ServiceStatus {
  dns: { loading: boolean; config: DNSForwardingConfig | null; error: string | null };
  ntp: { loading: boolean; config: NTPConfig | null; error: string | null };
  ssh: { loading: boolean; config: SSHConfig | null; error: string | null };
  dhcpRelay: { loading: boolean; config: DHCPRelayFullConfig | null; error: string | null };
}

export default function SystemServicesPage() {
  const [services, setServices] = useState<ServiceStatus>({
    dns: { loading: true, config: null, error: null },
    ntp: { loading: true, config: null, error: null },
    ssh: { loading: true, config: null, error: null },
    dhcpRelay: { loading: true, config: null, error: null },
  });
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const loadAllServices = async () => {
    // Load DNS
    setServices(prev => ({ ...prev, dns: { ...prev.dns, loading: true, error: null } }));
    try {
      const dnsConfig = await dnsForwardingService.getConfig();
      setServices(prev => ({ ...prev, dns: { loading: false, config: dnsConfig, error: null } }));
    } catch (err) {
      setServices(prev => ({ ...prev, dns: { loading: false, config: null, error: err instanceof Error ? err.message : "Failed to load" } }));
    }

    // Load NTP
    setServices(prev => ({ ...prev, ntp: { ...prev.ntp, loading: true, error: null } }));
    try {
      const ntpConfig = await ntpService.getConfig();
      setServices(prev => ({ ...prev, ntp: { loading: false, config: ntpConfig, error: null } }));
    } catch (err) {
      setServices(prev => ({ ...prev, ntp: { loading: false, config: null, error: err instanceof Error ? err.message : "Failed to load" } }));
    }

    // Load SSH
    setServices(prev => ({ ...prev, ssh: { ...prev.ssh, loading: true, error: null } }));
    try {
      const sshConfig = await sshService.getConfig();
      setServices(prev => ({ ...prev, ssh: { loading: false, config: sshConfig, error: null } }));
    } catch (err) {
      setServices(prev => ({ ...prev, ssh: { loading: false, config: null, error: err instanceof Error ? err.message : "Failed to load" } }));
    }

    // Load DHCP Relay
    setServices(prev => ({ ...prev, dhcpRelay: { ...prev.dhcpRelay, loading: true, error: null } }));
    try {
      const dhcpConfig = await dhcpRelayService.getConfig();
      setServices(prev => ({ ...prev, dhcpRelay: { loading: false, config: dhcpConfig, error: null } }));
    } catch (err) {
      setServices(prev => ({ ...prev, dhcpRelay: { loading: false, config: null, error: err instanceof Error ? err.message : "Failed to load" } }));
    }
  };

  useEffect(() => {
    loadAllServices();
  }, []);

  const isLoading = services.dns.loading || services.ntp.loading || services.ssh.loading || services.dhcpRelay.loading;

  // Count configured services
  const configuredCount = [
    services.dns.config?.configured,
    services.ntp.config?.configured,
    services.ssh.config?.configured,
    services.dhcpRelay.config?.dhcp_relay.configured || services.dhcpRelay.config?.dhcpv6_relay.configured,
  ].filter(Boolean).length;

  const toggleExpand = (service: string) => {
    setExpandedService(expandedService === service ? null : service);
  };

  if (isLoading && !services.dns.config && !services.ntp.config && !services.ssh.config && !services.dhcpRelay.config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Services</h1>
            <p className="text-muted-foreground mt-1">
              Configure DNS forwarding, NTP, SSH, and DHCP relay services
            </p>
          </div>
          <Button variant="outline" onClick={loadAllServices} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{configuredCount}/4</p>
                  <p className="text-xs text-muted-foreground">Services Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${services.dns.config?.configured ? "bg-green-500/10" : "bg-muted"}`}>
                  <Globe className={`h-5 w-5 ${services.dns.config?.configured ? "text-green-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">DNS Forwarding</p>
                  <p className="text-xs text-muted-foreground">
                    {services.dns.config?.configured ? `${services.dns.config.name_servers.length} servers` : "Not configured"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${services.ntp.config?.configured ? "bg-blue-500/10" : "bg-muted"}`}>
                  <Clock className={`h-5 w-5 ${services.ntp.config?.configured ? "text-blue-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">NTP</p>
                  <p className="text-xs text-muted-foreground">
                    {services.ntp.config?.configured ? `${services.ntp.config.servers.length} servers` : "Not configured"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${services.ssh.config?.configured ? "bg-purple-500/10" : "bg-muted"}`}>
                  <Shield className={`h-5 w-5 ${services.ssh.config?.configured ? "text-purple-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">SSH</p>
                  <p className="text-xs text-muted-foreground">
                    {services.ssh.config?.configured ? `Port ${services.ssh.config.port || 22}` : "Not configured"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DNS Card */}
          <Card
            className={`border-border hover:border-primary/50 transition-all cursor-pointer ${expandedService === "dns" ? "ring-2 ring-primary" : ""}`}
            onClick={() => toggleExpand("dns")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                    <Globe className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">DNS Forwarding</h3>
                    <p className="text-sm text-muted-foreground">Forward DNS queries to upstream servers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {services.dns.config?.configured ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedService === "dns" ? "rotate-90" : ""}`} />
                </div>
              </div>

              {services.dns.config?.configured && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Listen Addresses</p>
                      <p className="font-mono font-medium">{services.dns.config.listen_addresses.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Name Servers</p>
                      <p className="font-mono font-medium">{services.dns.config.name_servers.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">DNSSEC</p>
                      <p className="font-medium">{services.dns.config.dnssec || "Off"}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NTP Card */}
          <Card
            className={`border-border hover:border-primary/50 transition-all cursor-pointer ${expandedService === "ntp" ? "ring-2 ring-primary" : ""}`}
            onClick={() => toggleExpand("ntp")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">NTP Service</h3>
                    <p className="text-sm text-muted-foreground">Network time synchronization</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {services.ntp.config?.configured ? (
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedService === "ntp" ? "rotate-90" : ""}`} />
                </div>
              </div>

              {services.ntp.config?.configured && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">NTP Servers</p>
                      <p className="font-mono font-medium">{services.ntp.config.servers.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Listen Addresses</p>
                      <p className="font-mono font-medium">{services.ntp.config.listen_addresses.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Allow Clients</p>
                      <p className="font-mono font-medium">{services.ntp.config.allow_clients.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SSH Card */}
          <Card
            className={`border-border hover:border-primary/50 transition-all cursor-pointer ${expandedService === "ssh" ? "ring-2 ring-primary" : ""}`}
            onClick={() => toggleExpand("ssh")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                    <Shield className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">SSH Service</h3>
                    <p className="text-sm text-muted-foreground">Secure shell access configuration</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {services.ssh.config?.configured ? (
                    <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedService === "ssh" ? "rotate-90" : ""}`} />
                </div>
              </div>

              {services.ssh.config?.configured && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Port</p>
                      <p className="font-mono font-medium">{services.ssh.config.port || 22}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Password Auth</p>
                      <p className="font-medium">{services.ssh.config.disable_password_authentication ? "Disabled" : "Enabled"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Dynamic Protection</p>
                      <p className="font-medium">{services.ssh.config.dynamic_protection ? "On" : "Off"}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* DHCP Relay Card */}
          <Card
            className={`border-border hover:border-primary/50 transition-all cursor-pointer ${expandedService === "dhcp-relay" ? "ring-2 ring-primary" : ""}`}
            onClick={() => toggleExpand("dhcp-relay")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                    <Server className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">DHCP Relay</h3>
                    <p className="text-sm text-muted-foreground">Relay DHCP requests to servers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(services.dhcpRelay.config?.dhcp_relay.configured || services.dhcpRelay.config?.dhcpv6_relay.configured) ? (
                    <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedService === "dhcp-relay" ? "rotate-90" : ""}`} />
                </div>
              </div>

              {(services.dhcpRelay.config?.dhcp_relay.configured || services.dhcpRelay.config?.dhcpv6_relay.configured) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">DHCPv4 Servers</p>
                      <p className="font-mono font-medium">{services.dhcpRelay.config?.dhcp_relay.servers.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Interfaces</p>
                      <p className="font-mono font-medium">{services.dhcpRelay.config?.dhcp_relay.interfaces.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">DHCPv6</p>
                      <p className="font-medium">{services.dhcpRelay.config?.dhcpv6_relay.configured ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expanded Service Detail */}
        {expandedService && (
          <Card className="border-border">
            <CardContent className="p-6">
              {expandedService === "dns" && services.dns.config && (
                <DNSServiceCard config={services.dns.config} onUpdate={loadAllServices} />
              )}
              {expandedService === "ntp" && services.ntp.config && (
                <NTPServiceCard config={services.ntp.config} onUpdate={loadAllServices} />
              )}
              {expandedService === "ssh" && services.ssh.config && (
                <SSHServiceCard config={services.ssh.config} onUpdate={loadAllServices} />
              )}
              {expandedService === "dhcp-relay" && services.dhcpRelay.config && (
                <DHCPRelayServiceCard config={services.dhcpRelay.config} onUpdate={loadAllServices} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
