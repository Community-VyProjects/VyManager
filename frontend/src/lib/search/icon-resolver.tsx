import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Activity,
  Box,
  Cable,
  Database,
  FileText,
  Globe,
  HeartPulse,
  KeyRound,
  Layers,
  List,
  Lock,
  Map,
  Network,
  Play,
  Route,
  Scale,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { SearchResult } from "./types";

type IconComponent = ComponentType<LucideProps>;

export interface ResolvedSearchIcons {
  primary: IconComponent;
  /** Optional small badge icon (e.g. play on container) */
  badge?: IconComponent;
}

interface IconRule {
  test: (tokens: string[], result: SearchResult) => boolean;
  primary: IconComponent;
  badge?: IconComponent;
}

const RULES: IconRule[] = [
  { test: (t) => t.some((x) => x.includes("vrrp") || x.includes("high availability")), primary: HeartPulse },
  { test: (t) => t.some((x) => x.includes("running") && x.includes("container")), primary: Box, badge: Play },
  { test: (t) => t.some((x) => x.includes("container") || x.includes("registry")), primary: Box },
  { test: (t) => t.some((x) => x.includes("haproxy") || x.includes("load balancing")), primary: Scale },
  { test: (t) => t.some((x) => x.includes("wireguard") || x.includes("ipsec") || x.includes("openvpn") || x.includes("l2tp")), primary: Lock },
  { test: (t) => t.some((x) => x.includes("auth")), primary: KeyRound, badge: Lock },
  { test: (t) => t.some((x) => x.includes("bgp") || x.includes("ospf") || x.includes("isis") || x.includes("rip")), primary: Route },
  { test: (t) => t.some((x) => x.includes("vrf")), primary: Layers },
  { test: (t) => t.some((x) => x.includes("nat") || x.includes("cgnat")), primary: Network },
  { test: (t) => t.some((x) => x.includes("dhcp")), primary: Network, badge: Zap },
  { test: (t) => t.some((x) => x.includes("interface") || x.includes("ethernet") || x.includes("vlan")), primary: Cable },
  { test: (t) => t.some((x) => x.includes("zone")), primary: Shield, badge: Globe },
  { test: (t) => t.some((x) => x.includes("chain")), primary: Shield, badge: List },
  { test: (t) => t.some((x) => x.includes("firewall") || x.includes("policy")), primary: Shield },
  { test: (t) => t.some((x) => x.includes("pki") || x.includes("certificate") || x.includes("dh ")), primary: ShieldCheck },
  { test: (t) => t.some((x) => x.includes("host map") || x.includes("hostmap")), primary: Map },
  { test: (t) => t.some((x) => x.includes("user") || x.includes("login")), primary: Users },
  { test: (t) => t.some((x) => x.includes("ssh")), primary: KeyRound },
  { test: (t) => t.some((x) => x.includes("syslog") || x.includes("conntrack")), primary: Server },
  { test: (t) => t.some((x) => x.includes("monitor")), primary: Activity },
  { test: (t) => t.some((x) => x.includes("access list") || x.includes("prefix") || x.includes("route map")), primary: FileText },
  { test: (t, r) => r.kind === "page", primary: Settings },
  { test: (t, r) => r.kind === "section", primary: FileText },
];

const KIND_DEFAULTS: Partial<Record<SearchResult["kind"], IconComponent>> = {
  interface: Cable,
  "wireguard-peer": Lock,
  "bgp-neighbor": Route,
  "bgp-peer-group": Route,
  "firewall-rule": Shield,
  "firewall-zone": Globe,
  container: Box,
  "system-user": Users,
  "host-mapping": Map,
  "pki-certificate": ShieldCheck,
  "pki-dh": ShieldCheck,
  "haproxy-backend": Scale,
  "haproxy-service": Scale,
  "nat-cgnat": Network,
};

function tokenize(result: SearchResult): string[] {
  const blob = [
    result.title,
    result.subtitle,
    result.description,
    result.feature,
    result.subcategory,
    result.kind,
    ...result.keywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.split(/[\s·|,;:/_-]+/).filter(Boolean);
}

export function resolveSearchIcons(result: SearchResult): ResolvedSearchIcons {
  if (result.icon) {
    const tokens = tokenize(result);
    const rule = RULES.find((r) => r.test(tokens, result));
    return { primary: result.icon, badge: rule?.badge };
  }

  const tokens = tokenize(result);
  for (const rule of RULES) {
    if (rule.test(tokens, result)) {
      return { primary: rule.primary, badge: rule.badge };
    }
  }

  const kindDefault = KIND_DEFAULTS[result.kind];
  if (kindDefault) return { primary: kindDefault };

  return { primary: Database };
}

export function SearchResultIcon({
  result,
  className,
}: {
  result: SearchResult;
  className?: string;
}) {
  const { primary: Primary, badge: BadgeIcon } = resolveSearchIcons(result);
  return (
    <div className={cn("relative flex h-8 w-8 items-center justify-center rounded-lg bg-muted/80", className)}>
      <Primary className="h-4 w-4 text-muted-foreground" />
      {BadgeIcon && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <BadgeIcon className="h-2 w-2" />
        </span>
      )}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
