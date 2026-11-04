"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { RouteMapCapabilities } from "@/lib/api/route-map";
import type { EvpnMatchDraft, EvpnSetDraft } from "./route-map-evpn";

type RouteTypeLabelKey =
  | "evpn.routeTypeEad"
  | "evpn.routeTypeMacip"
  | "evpn.routeTypeMulticast"
  | "evpn.routeTypeEs"
  | "evpn.routeTypePrefix";

const ROUTE_TYPE_LABELS: Record<string, RouteTypeLabelKey> = {
  ead: "evpn.routeTypeEad",
  macip: "evpn.routeTypeMacip",
  multicast: "evpn.routeTypeMulticast",
  es: "evpn.routeTypeEs",
  prefix: "evpn.routeTypePrefix",
};

/**
 * EVPN match conditions. Route types and the VNI range come from the
 * device's route-map capabilities; the section stays hidden until they are
 * known so the form never offers a value this device rejects.
 */
export function RouteMapEvpnMatchSection({
  value,
  onChange,
  capability,
}: {
  value: EvpnMatchDraft;
  onChange: (next: EvpnMatchDraft) => void;
  capability: RouteMapCapabilities["features"]["match_evpn"] | undefined;
}) {
  const t = useTranslations("routeMapRuleModal");
  const tc = useTranslations("common");
  if (!capability?.supported) return null;
  const { route_types: routeTypes, vni_min: vniMin, vni_max: vniMax } = capability;

  const routeTypeLabel = (type: string) => {
    const key = ROUTE_TYPE_LABELS[type];
    return key ? t(key) : t("evpn.routeTypeNumbered", { n: type });
  };

  return (
    <AccordionItem value="evpn">
      <AccordionTrigger>{t("evpn.section")}</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="matchEvpnRouteType">{t("evpn.routeType")}</Label>
            <Select
              value={value.routeType || "none"}
              onValueChange={(v) => onChange({ ...value, routeType: v === "none" ? "" : v })}
            >
              <SelectTrigger id="matchEvpnRouteType">
                <SelectValue placeholder={t("evpn.selectRouteType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tc("none")}</SelectItem>
                {routeTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {routeTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchEvpnVni">{t("evpn.vni")}</Label>
            <Input
              id="matchEvpnVni"
              type="number"
              min={vniMin}
              max={vniMax}
              placeholder={`${vniMin}-${vniMax}`}
              value={value.vni}
              onChange={(e) => onChange({ ...value, vni: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchEvpnRd">{t("evpn.rd")}</Label>
            <Input
              id="matchEvpnRd"
              placeholder={t("evpn.rdPlaceholder")}
              value={value.rd}
              onChange={(e) => onChange({ ...value, rd: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="matchEvpnDefaultRoute"
              checked={value.defaultRoute}
              onCheckedChange={(checked) => onChange({ ...value, defaultRoute: checked === true })}
            />
            <Label htmlFor="matchEvpnDefaultRoute" className="text-sm font-normal">
              {t("evpn.defaultRoute")}
            </Label>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** EVPN set actions. */
export function RouteMapEvpnSetSection({
  value,
  onChange,
}: {
  value: EvpnSetDraft;
  onChange: (next: EvpnSetDraft) => void;
}) {
  const t = useTranslations("routeMapRuleModal");

  return (
    <AccordionItem value="evpn-set">
      <AccordionTrigger>{t("evpn.section")}</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="setEvpnGatewayIpv4">{t("evpn.gatewayIpv4")}</Label>
            <Input
              id="setEvpnGatewayIpv4"
              placeholder={t("example", { value: "192.0.2.1" })}
              value={value.gatewayIpv4}
              onChange={(e) => onChange({ ...value, gatewayIpv4: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setEvpnGatewayIpv6">{t("evpn.gatewayIpv6")}</Label>
            <Input
              id="setEvpnGatewayIpv6"
              placeholder={t("example", { value: "2001:db8::1" })}
              value={value.gatewayIpv6}
              onChange={(e) => onChange({ ...value, gatewayIpv6: e.target.value })}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
