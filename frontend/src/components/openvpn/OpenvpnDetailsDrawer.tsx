"use client";

import { useTranslations } from "next-intl";
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

export function OpenvpnDetailsDrawer({
  open,
  onOpenChange,
  interfaceData,
}: OpenvpnDetailsDrawerProps) {
  const t = useTranslations("openvpnTools");
  const tc = useTranslations("common");
  const modeLabel = (mode: string | null): string => {
    if (!mode) return "—";
    if (mode === "server") return t("modes.server");
    if (mode === "client") return t("modes.client");
    if (mode === "site-to-site") return t("modes.siteToSite");
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };
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
            {i.description || t("drawer.defaultDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {/* Overview */}
          <SectionHeader icon={Activity} title={t("drawer.overview")} />
          <Row label={tc("name")} value={i.name} />
          <Row label={t("fields.mode")} value={<Badge variant="outline">{modeLabel(i.mode)}</Badge>} />
          <Row
            label={tc("status")}
            value={
              i.disabled ? (
                <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                  {tc("disabled")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600/30">
                  {t("active")}
                </Badge>
              )
            }
          />
          <Row label={t("fields.deviceType")} value={i.device_type} />
          <Row label={t("fields.protocol")} value={i.protocol} />
          <Row label="VRF" value={i.vrf} />
          <Row label={t("fields.persistentTunnel")} value={i.persistent_tunnel ? t("yes") : t("no")} />
          <Row label={t("fields.lzoCompression")} value={i.use_lzo_compression ? t("yes") : t("no")} />
          <Row label={t("fields.offloadDco")} value={i.offload_dco ? t("yes") : t("no")} />
          <Row label={t("fields.redirect")} value={i.redirect} />
          <Row
            label={t("fields.replaceDefaultRoute")}
            value={
              i.replace_default_route?.enabled
                ? i.replace_default_route.local
                  ? t("drawer.enabledLocal")
                  : tc("enabled")
                : "—"
            }
          />
          {i.openvpn_options.length > 0 && (
            <Row
              label={t("fields.openvpnOptions")}
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
          <SectionHeader icon={Network} title={t("drawer.addressing")} />
          <Row label={t("fields.localHost")} value={i.local_host} />
          <Row label={t("fields.localPort")} value={i.local_port} />
          <Row
            label={t("fields.localAddresses")}
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
            label={t("fields.remoteHost")}
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
          <Row label={t("fields.remotePort")} value={i.remote_port} />
          <Row
            label={t("fields.remoteAddresses")}
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
            label={t("fields.keepalive")}
            value={
              i.keep_alive?.failure_count || i.keep_alive?.interval
                ? `interval=${i.keep_alive.interval ?? "—"}, failures=${i.keep_alive.failure_count ?? "—"}`
                : "—"
            }
          />
          <Row
            label={t("fields.authentication")}
            value={
              i.authentication?.username
                ? `${i.authentication.username} / ${i.authentication.password ? "••••••" : "—"}`
                : "—"
            }
          />

          <Separator className="my-3" />

          {/* Encryption & TLS */}
          <SectionHeader icon={Shield} title={t("drawer.encryptionTls")} />
          <Row label={t("fields.cipher")} value={i.encryption?.cipher} />
          <Row
            label={t("fields.dataCiphers")}
            value={
              i.encryption?.data_ciphers && i.encryption.data_ciphers.length > 0
                ? i.encryption.data_ciphers.join(", ")
                : "—"
            }
          />
          <Row label={t("fields.dataCiphersFallback")} value={i.encryption?.data_ciphers_fallback} />
          <Row label={t("fields.hash")} value={i.hash} />
          <Row label={t("fields.sharedSecretKey")} value={i.shared_secret_key} />
          <Row label={t("fields.tlsCaCertificate")} value={i.tls?.ca_certificates?.join(", ") || undefined} />
          <Row label={t("fields.tlsCertificate")} value={i.tls?.certificate} />
          <Row label={t("fields.tlsDhParams")} value={i.tls?.dh_params} />
          <Row label={t("fields.tlsAuthKey")} value={i.tls?.auth_key} />
          <Row label={t("fields.tlsCryptKey")} value={i.tls?.crypt_key} />
          <Row label={t("fields.tlsRole")} value={i.tls?.role} />
          <Row label={t("fields.tlsVersionMin")} value={i.tls?.tls_version_min} />
          {i.tls?.peer_fingerprints && i.tls.peer_fingerprints.length > 0 && (
            <Row
              label={t("fields.peerFingerprints")}
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
              <SectionHeader icon={Server} title={t("modes.server")} />
              <Row
                label={t("fields.subnet")}
                value={i.server.subnet.length > 0 ? i.server.subnet.join(", ") : "—"}
              />
              <Row label={t("fields.topology")} value={i.server.topology} />
              <Row label={t("fields.domainName")} value={i.server.domain_name} />
              <Row label={t("fields.maxConnections")} value={i.server.max_connections} />
              <Row
                label={t("fields.nameServers")}
                value={
                  i.server.name_server.length > 0 ? i.server.name_server.join(", ") : "—"
                }
              />
              <Row
                label={t("fields.rejectUnconfigured")}
                value={i.server.reject_unconfigured_clients ? t("yes") : t("no")}
              />
              {i.server.push_route.length > 0 && (
                <Row
                  label={t("fields.pushRoutes")}
                  value={
                    <div className="space-y-1">
                      {i.server.push_route.map((pr, idx) => (
                        <div key={idx}>
                          {pr.route}
                          {pr.metric ? t("drawer.metric", { metric: pr.metric }) : ""}
                        </div>
                      ))}
                    </div>
                  }
                />
              )}
              {i.server.bridge && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">{t("drawer.bridge")}</div>
                  <Row label={t("fields.bridgeGateway")} value={i.server.bridge.gateway} />
                  <Row label={t("fields.bridgeStart")} value={i.server.bridge.start} />
                  <Row label={t("fields.bridgeStop")} value={i.server.bridge.stop} />
                  <Row label={t("fields.bridgeSubnetMask")} value={i.server.bridge.subnet_mask} />
                  <Row label={t("fields.bridgeDisabled")} value={i.server.bridge.disable ? t("yes") : t("no")} />
                </>
              )}
              {i.server.client_ip_pool && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">{t("drawer.clientIpPool")}</div>
                  <Row label={t("fields.poolStart")} value={i.server.client_ip_pool.start} />
                  <Row label={t("fields.poolStop")} value={i.server.client_ip_pool.stop} />
                  <Row label={t("fields.poolMask")} value={i.server.client_ip_pool.subnet_mask} />
                  <Row label={t("fields.poolDisabled")} value={i.server.client_ip_pool.disable ? t("yes") : t("no")} />
                </>
              )}
              {i.server.client_ipv6_pool && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">{t("drawer.clientIpv6Pool")}</div>
                  <Row label={t("fields.poolBase")} value={i.server.client_ipv6_pool.base} />
                  <Row label={t("fields.poolDisabled")} value={i.server.client_ipv6_pool.disable ? t("yes") : t("no")} />
                </>
              )}
              {i.server.mfa_totp && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">MFA TOTP</div>
                  <Row label={t("fields.challenge")} value={i.server.mfa_totp.challenge} />
                  <Row label={t("fields.digits")} value={i.server.mfa_totp.digits} />
                  <Row label={t("fields.drift")} value={i.server.mfa_totp.drift} />
                  <Row label={t("fields.slop")} value={i.server.mfa_totp.slop} />
                  <Row label={t("fields.step")} value={i.server.mfa_totp.step} />
                </>
              )}

              {i.server.clients.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    {t("drawer.clients", { count: String(i.server.clients.length) })}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tc("name")}</TableHead>
                        <TableHead>{tc("status")}</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>{t("fields.subnets")}</TableHead>
                        <TableHead>{t("fields.pushRoutes")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {i.server.clients.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            {c.disable ? (
                              <Badge variant="secondary">{tc("disabled")}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600/30">
                                {t("active")}
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
              <SectionHeader icon={Network} title={t("drawer.advancedIp")} />
              {i.ip && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">IPv4</div>
                  <Row label={t("fields.adjustMss")} value={i.ip.adjust_mss} />
                  <Row label={t("fields.arpCacheTimeout")} value={i.ip.arp_cache_timeout} />
                  <Row label={t("fields.sourceValidation")} value={i.ip.source_validation} />
                  <Row label={t("fields.disableArpFilter")} value={i.ip.disable_arp_filter ? t("yes") : "—"} />
                  <Row label={t("fields.disableForwarding")} value={i.ip.disable_forwarding ? t("yes") : "—"} />
                  <Row label={t("fields.enableArpAccept")} value={i.ip.enable_arp_accept ? t("yes") : "—"} />
                  <Row label={t("fields.enableArpAnnounce")} value={i.ip.enable_arp_announce ? t("yes") : "—"} />
                  <Row label={t("fields.enableArpIgnore")} value={i.ip.enable_arp_ignore ? t("yes") : "—"} />
                  <Row
                    label={t("fields.enableDirectedBroadcast")}
                    value={i.ip.enable_directed_broadcast ? t("yes") : "—"}
                  />
                  <Row label={t("fields.enableProxyArp")} value={i.ip.enable_proxy_arp ? t("yes") : "—"} />
                  <Row label={t("fields.proxyArpPvlan")} value={i.ip.proxy_arp_pvlan ? t("yes") : "—"} />
                </>
              )}
              {i.ipv6 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-2">IPv6</div>
                  <Row label={t("fields.acceptDad")} value={i.ipv6.accept_dad} />
                  <Row label={t("fields.adjustMss")} value={i.ipv6.adjust_mss} />
                  <Row label={t("fields.autoconf")} value={i.ipv6.address_autoconf ? t("yes") : "—"} />
                  <Row label="EUI-64" value={i.ipv6.address_eui64} />
                  <Row
                    label={t("fields.noDefaultLinkLocal")}
                    value={i.ipv6.address_no_default_link_local ? t("yes") : "—"}
                  />
                  <Row
                    label={t("fields.interfaceIdentifier")}
                    value={i.ipv6.address_interface_identifier}
                  />
                  <Row label={t("fields.baseReachableTime")} value={i.ipv6.base_reachable_time} />
                  <Row
                    label={t("fields.disableForwarding")}
                    value={i.ipv6.disable_forwarding ? t("yes") : "—"}
                  />
                  <Row
                    label={t("fields.dupAddrDetectTransmits")}
                    value={i.ipv6.dup_addr_detect_transmits}
                  />
                  <Row label={t("fields.sourceValidation")} value={i.ipv6.source_validation} />
                </>
              )}
            </>
          )}

          {/* Mirror */}
          {(i.mirror_ingress || i.mirror_egress) && (
            <>
              <Separator className="my-3" />
              <SectionHeader icon={Activity} title={t("drawer.trafficMirror")} />
              <Row label={t("fields.ingressMirror")} value={i.mirror_ingress} />
              <Row label={t("fields.egressMirror")} value={i.mirror_egress} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
