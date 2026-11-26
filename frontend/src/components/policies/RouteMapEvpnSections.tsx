"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { RouteMapCapabilities } from "@/lib/api/route-map";
import { routeMapRange, type RouteMapRuleForm } from "@/lib/api/route-map-save-ops";
import { evpnRouteTypeLabel } from "./route-map-evpn";

interface EvpnSectionProps {
  idPrefix: string;
  form: RouteMapRuleForm;
  set: <K extends keyof RouteMapRuleForm>(key: K, value: RouteMapRuleForm[K]) => void;
  capabilities: RouteMapCapabilities | null;
}

/**
 * EVPN match conditions. Route types and the VNI range come from the
 * device's capabilities; the section is hidden when the device has no
 * `match evpn`.
 */
export function RouteMapEvpnMatchSection({ idPrefix, form, set, capabilities }: EvpnSectionProps) {
  const t = useTranslations("routeMapRuleModal");
  const evpn = capabilities?.features?.match_evpn;
  if (evpn?.supported !== true) return null;
  const routeTypes = capabilities?.values?.evpn_route_types || [];
  const labels = Object.fromEntries(
    routeTypes.map((type) => {
      const label = evpnRouteTypeLabel(type);
      if (!label) return [type, type];
      return [type, label.alias ? t("evpn.routeTypeAlias", { number: label.alias, name: t(label.key) }) : t(label.key)];
    }),
  );
  const vni = routeMapRange(capabilities, "evpn_vni");

  return (
    <AccordionItem value="evpn">
      <AccordionTrigger>{t("evpn.section")}</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-match-evpn-route-type`}>{t("evpn.routeType")}</Label>
            <NamedListSelect
              id={`${idPrefix}-match-evpn-route-type`}
              value={form.match_evpn_route_type}
              names={routeTypes}
              labels={labels}
              onValueChange={(v) => set("match_evpn_route_type", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-match-evpn-vni`}>{t("evpn.vni")}</Label>
            <Input
              id={`${idPrefix}-match-evpn-vni`}
              inputMode="numeric"
              placeholder={vni ? t("rangePlaceholder", { min: vni.min, max: vni.max }) : undefined}
              value={form.match_evpn_vni}
              onChange={(e) => set("match_evpn_vni", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-match-evpn-rd`}>{t("evpn.rd")}</Label>
            <Input
              id={`${idPrefix}-match-evpn-rd`}
              placeholder={t("example", { value: "65000:100" })}
              value={form.match_evpn_rd}
              onChange={(e) => set("match_evpn_rd", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id={`${idPrefix}-match-evpn-default-route`}
              checked={form.match_evpn_default_route}
              onCheckedChange={(checked) => set("match_evpn_default_route", checked === true)}
            />
            <Label htmlFor={`${idPrefix}-match-evpn-default-route`} className="text-sm font-normal">
              {t("evpn.defaultRoute")}
            </Label>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** EVPN set actions. */
export function RouteMapEvpnSetSection({ idPrefix, form, set }: Omit<EvpnSectionProps, "capabilities">) {
  const t = useTranslations("routeMapRuleModal");

  return (
    <AccordionItem value="evpn-set">
      <AccordionTrigger>{t("evpn.section")}</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-set-evpn-gateway-ipv4`}>{t("evpn.gatewayIpv4")}</Label>
            <Input
              id={`${idPrefix}-set-evpn-gateway-ipv4`}
              placeholder={t("example", { value: "192.0.2.1" })}
              value={form.set_evpn_gateway_ipv4}
              onChange={(e) => set("set_evpn_gateway_ipv4", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-set-evpn-gateway-ipv6`}>{t("evpn.gatewayIpv6")}</Label>
            <Input
              id={`${idPrefix}-set-evpn-gateway-ipv6`}
              placeholder={t("example", { value: "2001:db8::1" })}
              value={form.set_evpn_gateway_ipv6}
              onChange={(e) => set("set_evpn_gateway_ipv6", e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
