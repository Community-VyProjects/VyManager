"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lock, Server, Shield, Network, Users, Activity } from "lucide-react";
import type { OpenvpnInterface } from "@/lib/api/openvpn";

interface OpenvpnDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceData: OpenvpnInterface | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px,1fr] gap-2 py-1 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono text-xs break-all">{value ?? "—"}</div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function modeLabel(mode: string | null): string {
  if (!mode) return "—";
  if (mode === "site-to-site") return "Site-to-Site";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function OpenvpnDetailsDrawer({
  open,
  onOpenChange,
  interfaceData,
}: OpenvpnDetailsDrawerProps) {
  if (!interfaceData) return null;
  const i = interfaceData;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {i.name}
          </SheetTitle>
          <SheetDescription>
            {i.description || "OpenVPN interface configuration"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {/* Overview */}
          <SectionHeader icon={Activity} title="Overview" />
          <Row label="Name" value={i.name} />
          <Row label="Mode" value={<Badge variant="outline">{modeLabel(i.mode)}</Badge>} />
          <Row
            label="Status"
            value={
              i.disabled ? (
                <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                  Disabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600/30">
                  Active
                </Badge>
              )
            }
          />
          <Row label="Device Type" value={i.device_type} />
          <Row label="Protocol" value={i.protocol} />
          <Row label="VRF" value={i.vrf} />
          <Row label="Persistent Tunnel" value={i.persistent_tunnel ? "Yes" : "No"} />
          <Row label="LZO Compression" value={i.use_lzo_compression ? "Yes" : "No"} />
          <Row label="Offload DCO" value={i.offload_dco ? "Yes" : "No"} />
          <Row label="Redirect" value={i.redirect} />
          <Row
            label="Replace Default Route"
            value={
              i.replace_default_route?.enabled
                ? i.replace_default_route.local
                  ? "Enabled (local)"
                  : "Enabled"
                : "—"
            }
          />
          {i.openvpn_options.length > 0 && (
            <Row
              label="OpenVPN Options"
              value={
                <div className="space-y-1">
                  {i.openvpn_options.map((o, idx) => (
                    <div key={idx}>{o}</div>
                  ))}
                </div>
              }
            />
          )}

          <Separator className="my-3" />

          {/* Addressing */}
          <SectionHeader icon={Network} title="Addressing" />
          <Row label="Local Host" value={i.local_host} />
          <Row label="Local Port" value={i.local_port} />
          <Row
            label="Local Addresses"
            value={
              i.local_addresses.length > 0 ? (
                <div className="space-y-1">
                  {i.local_addresses.map((la, idx) => (
                    <div key={idx}>
                      {la.address}
                      {la.subnet_mask ? ` / ${la.subnet_mask}` : ""}
                    </div>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Remote Host"
            value={
              i.remote_host.length > 0 ? (
                <div className="space-y-1">
                  {i.remote_host.map((rh, idx) => (
                    <div key={idx}>{rh}</div>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          <Row label="Remote Port" value={i.remote_port} />
          <Row
            label="Remote Addresses"
            value={
              i.remote_address.length > 0 ? (
                <div className="space-y-1">
                  {i.remote_address.map((ra, idx) => (
                    <div key={idx}>{ra}</div>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Keepalive"
            value={
              i.keep_alive?.failure_count || i.keep_alive?.interval
                ? `interval=${i.keep_alive.interval ?? "—"}, failures=${i.keep_alive.failure_count ?? "—"}`
                : "—"
            }
          />
          <Row
            label="Authentication"
            value={
              i.authentication?.username
                ? `${i.authentication.username} / ${i.authentication.password ? "••••••" : "—"}`
                : "—"
            }
          />

          <Separator className="my-3" />

          {/* Encryption & TLS */}
          <SectionHeader icon={Shield} title="Encryption & TLS" />
          <Row label="Cipher" value={i.encryption?.cipher} />
          <Row
            label="Data Ciphers"
            value={
              i.encryption?.data_ciphers && i.encryption.data_ciphers.length > 0
                ? i.encryption.data_ciphers.join(", ")
                : "—"
            }
          />
          <Row label="Data Ciphers Fallback" value={i.encryption?.data_ciphers_fallback} />
          <Row label="Hash" value={i.hash} />
          <Row label="Shared Secret Key" value={i.shared_secret_key} />
          <Row label="TLS CA Certificate" value={i.tls?.ca_certificate} />
          <Row label="TLS Certificate" value={i.tls?.certificate} />
          <Row label="TLS DH Params" value={i.tls?.dh_params} />
          <Row label="TLS Auth Key" value={i.tls?.auth_key} />
          <Row label="TLS Crypt Key" value={i.tls?.crypt_key} />
          <Row label="TLS Role" value={i.tls?.role} />
          <Row label="TLS Version Min" value={i.tls?.tls_version_min} />
          {i.tls?.peer_fingerprints && i.tls.peer_fingerprints.length > 0 && (
            <Row
              label="Peer Fingerprints"
              value={
                <div className="space-y-1">
                  {i.tls.peer_fingerprints.map((fp, idx) => (
                    <div key={idx}>{fp}</div>
                  ))}
                </div>
              }
            />
          )}

          {/* Server */}
          {i.server && (
            <>
              <Separator className="my-3" />
              <SectionHeader icon={Server} title="Server" />
              <Row
                label="Subnet"
                value={i.server.subnet.length > 0 ? i.server.subnet.join(", ") : "—"}
              />
              <Row label="Topology" value={i.server.topology} />
              <Row label="Domain Name" value={i.server.domain_name} />
              <Row label="Max Connections" value={i.server.max_connections} />
              <Row
                label="Name Servers"
                value={
                  i.server.name_server.length > 0 ? i.server.name_server.join(", ") : "—"
                }
              />
              <Row
                label="Reject Unconfigured"
                value={i.server.reject_unconfigured_clients ? "Yes" : "No"}
              />
              {i.server.push_route.length > 0 && (
                <Row
                  label="Push Routes"
                  value={
                    <div className="space-y-1">
                      {i.server.push_route.map((pr, idx) => (
                        <div key={idx}>
                          {pr.route}
                          {pr.metric ? ` (metric ${pr.metric})` : ""}
                        </div>
                      ))}
                    </div>
                  }
                />
              )}
              {i.server.bridge && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">Bridge</div>
                  <Row label="Bridge Gateway" value={i.server.bridge.gateway} />
                  <Row label="Bridge Start" value={i.server.bridge.start} />
                  <Row label="Bridge Stop" value={i.server.bridge.stop} />
                  <Row label="Bridge Subnet Mask" value={i.server.bridge.subnet_mask} />
                  <Row label="Bridge Disabled" value={i.server.bridge.disable ? "Yes" : "No"} />
                </>
              )}
              {i.server.client_ip_pool && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">Client IP Pool</div>
                  <Row label="Pool Start" value={i.server.client_ip_pool.start} />
                  <Row label="Pool Stop" value={i.server.client_ip_pool.stop} />
                  <Row label="Pool Mask" value={i.server.client_ip_pool.subnet_mask} />
                  <Row label="Pool Disabled" value={i.server.client_ip_pool.disable ? "Yes" : "No"} />
                </>
              )}
              {i.server.client_ipv6_pool && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">Client IPv6 Pool</div>
                  <Row label="Pool Base" value={i.server.client_ipv6_pool.base} />
                  <Row label="Pool Disabled" value={i.server.client_ipv6_pool.disable ? "Yes" : "No"} />
                </>
              )}
              {i.server.mfa_totp && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">MFA TOTP</div>
                  <Row label="Challenge" value={i.server.mfa_totp.challenge} />
                  <Row label="Digits" value={i.server.mfa_totp.digits} />
                  <Row label="Drift" value={i.server.mfa_totp.drift} />
                  <Row label="Slop" value={i.server.mfa_totp.slop} />
                  <Row label="Step" value={i.server.mfa_totp.step} />
                </>
              )}

              {i.server.clients.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    Clients ({i.server.clients.length})
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Subnets</TableHead>
                        <TableHead>Push Routes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {i.server.clients.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            {c.disable ? (
                              <Badge variant="secondary">Disabled</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600/30">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{c.ip || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {c.subnet.length > 0 ? c.subnet.join(", ") : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {c.push_route.length > 0 ? c.push_route.join(", ") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {/* Advanced IP/IPv6 */}
          {(i.ip || i.ipv6) && (
            <>
              <Separator className="my-3" />
              <SectionHeader icon={Network} title="Advanced IP / IPv6" />
              {i.ip && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">IPv4</div>
                  <Row label="Adjust MSS" value={i.ip.adjust_mss} />
                  <Row label="ARP Cache Timeout" value={i.ip.arp_cache_timeout} />
                  <Row label="Source Validation" value={i.ip.source_validation} />
                  <Row label="Disable ARP Filter" value={i.ip.disable_arp_filter ? "Yes" : "—"} />
                  <Row label="Disable Forwarding" value={i.ip.disable_forwarding ? "Yes" : "—"} />
                  <Row label="Enable ARP Accept" value={i.ip.enable_arp_accept ? "Yes" : "—"} />
                  <Row label="Enable ARP Announce" value={i.ip.enable_arp_announce ? "Yes" : "—"} />
                  <Row label="Enable ARP Ignore" value={i.ip.enable_arp_ignore ? "Yes" : "—"} />
                  <Row
                    label="Enable Directed Broadcast"
                    value={i.ip.enable_directed_broadcast ? "Yes" : "—"}
                  />
                  <Row label="Enable Proxy ARP" value={i.ip.enable_proxy_arp ? "Yes" : "—"} />
                  <Row label="Proxy ARP PVLAN" value={i.ip.proxy_arp_pvlan ? "Yes" : "—"} />
                </>
              )}
              {i.ipv6 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">IPv6</div>
                  <Row label="Accept DAD" value={i.ipv6.accept_dad} />
                  <Row label="Adjust MSS" value={i.ipv6.adjust_mss} />
                  <Row label="Autoconf" value={i.ipv6.address_autoconf ? "Yes" : "—"} />
                  <Row label="EUI-64" value={i.ipv6.address_eui64} />
                  <Row
                    label="No Default Link-Local"
                    value={i.ipv6.address_no_default_link_local ? "Yes" : "—"}
                  />
                  <Row
                    label="Interface Identifier"
                    value={i.ipv6.address_interface_identifier}
                  />
                  <Row label="Base Reachable Time" value={i.ipv6.base_reachable_time} />
                  <Row
                    label="Disable Forwarding"
                    value={i.ipv6.disable_forwarding ? "Yes" : "—"}
                  />
                  <Row
                    label="Dup Addr Detect Transmits"
                    value={i.ipv6.dup_addr_detect_transmits}
                  />
                  <Row label="Source Validation" value={i.ipv6.source_validation} />
                </>
              )}
            </>
          )}

          {/* Mirror */}
          {(i.mirror_ingress || i.mirror_egress) && (
            <>
              <Separator className="my-3" />
              <SectionHeader icon={Activity} title="Traffic Mirror" />
              <Row label="Ingress Mirror" value={i.mirror_ingress} />
              <Row label="Egress Mirror" value={i.mirror_egress} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
