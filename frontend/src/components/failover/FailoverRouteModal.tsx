"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { failoverService, type FailoverCapabilities, type FailoverRoute } from "@/lib/api/failover";
import {
  DEFAULT_CHECK_POLICY,
  DEFAULT_CHECK_TYPE,
  emptyDhcpRow,
  emptyNextHopRow,
  emptyTargetRow,
  failoverForm,
  failoverProblem,
  failoverSupports,
  type FailoverCheckForm,
  type FailoverForm,
  type FailoverProblem,
  type FailoverTargetRow,
} from "@/lib/api/failover-save-ops";
import type { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit } from "@/lib/modal-mode";

interface FailoverRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: FailoverCapabilities;
  /** Destinations already configured (a create must not reuse one). */
  destinations: string[];
  existingRoute?: FailoverRoute | null;
}

/** Shared fields of a next-hop row and a DHCP interface row. */
interface GatewayRow {
  interface: string;
  metric: string;
  onlink: boolean;
  check: FailoverCheckForm;
}

/** The page passes a `key` that changes per open, so the form is seeded from props here. */
export function FailoverRouteModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  destinations,
  existingRoute,
}: FailoverRouteModalProps) {
  const t = useTranslations("failover");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existingRoute);
  const original = existingRoute ?? null;
  const features = capabilities.features;
  const showDhcp = failoverSupports(capabilities, "dhcp_interface");
  const showTargetInterface = failoverSupports(capabilities, "check_target_interface");
  const showTargetVrf = failoverSupports(capabilities, "check_target_vrf");

  const [form, setForm] = useState<FailoverForm>(() => failoverForm(original));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = lockedIdentity(existingRoute, (r) => r.destination, form.destination);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  // ==========================================================================
  // Row mutators (row key is the index)
  // ==========================================================================

  type Kind = "next_hops" | "dhcp_interfaces";

  const updateRow = (kind: Kind, index: number, patch: Partial<GatewayRow> & { address?: string; name?: string }) =>
    setForm((f) => ({
      ...f,
      [kind]: (f[kind] as GatewayRow[]).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));

  const removeRow = (kind: Kind, index: number) =>
    setForm((f) => ({ ...f, [kind]: (f[kind] as GatewayRow[]).filter((_, i) => i !== index) }));

  const updateCheck = (kind: Kind, index: number, patch: Partial<FailoverCheckForm>) =>
    setForm((f) => ({
      ...f,
      [kind]: (f[kind] as GatewayRow[]).map((row, i) =>
        i === index ? { ...row, check: { ...row.check, ...patch } } : row
      ),
    }));

  const updateTargets = (kind: Kind, index: number, change: (targets: FailoverTargetRow[]) => FailoverTargetRow[]) =>
    setForm((f) => ({
      ...f,
      [kind]: (f[kind] as GatewayRow[]).map((row, i) =>
        i === index ? { ...row, check: { ...row.check, targets: change(row.check.targets) } } : row
      ),
    }));

  // ==========================================================================
  // Submit
  // ==========================================================================

  const problemText = (p: FailoverProblem) => t(`validation.${p.key}`, p.values);

  const handleSubmit = async () => {
    const issue = failoverProblem(original, form, capabilities, { destinations });
    if (issue) {
      setError(problemText(issue));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (original) await failoverService.updateRoute(original, form, capabilities);
      else await failoverService.createRoute(form, capabilities);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t(isEdit ? "modal.updateFailed" : "modal.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Render helpers
  // ==========================================================================

  const rangeText = (range: { min: number; max: number }) =>
    t("modal.rangePlaceholder", { min: range.min, max: range.max });

  const numberField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    range: { min: number; max: number },
  ) => (
    <div className="space-y-1">
      <Label className="text-xs" htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        className="h-8 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={rangeText(range)}
        min={range.min}
        max={range.max}
      />
    </div>
  );

  const renderHealthCheck = (kind: Kind, index: number, prefix: string, check: FailoverCheckForm) => (
    <div className="space-y-3 mt-3">
      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("healthCheck.title")}
      </h5>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${prefix}-check-type`}>{t("healthCheck.type")}</Label>
          <NamedListSelect
            id={`${prefix}-check-type`}
            value={check.type}
            names={features.check_type.values}
            noneLabel={t("modal.defaultValue", { value: DEFAULT_CHECK_TYPE })}
            onValueChange={(type) => updateCheck(kind, index, { type })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${prefix}-check-policy`}>{t("healthCheck.policy")}</Label>
          <NamedListSelect
            id={`${prefix}-check-policy`}
            value={check.policy}
            names={features.check_policy.values}
            noneLabel={t("modal.defaultValue", { value: DEFAULT_CHECK_POLICY })}
            onValueChange={(policy) => updateCheck(kind, index, { policy })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {numberField(`${prefix}-check-port`, t("healthCheck.port"), check.port, (port) => updateCheck(kind, index, { port }), features.check_port)}
        {numberField(`${prefix}-check-timeout`, t("healthCheck.timeout"), check.timeout, (timeout) => updateCheck(kind, index, { timeout }), features.check_timeout)}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{t("healthCheck.checkTargets")}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => updateTargets(kind, index, (targets) => [...targets, emptyTargetRow()])}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("healthCheck.addTarget")}
          </Button>
        </div>
        {check.targets.map((target, tIndex) => {
          const setTarget = (patch: Partial<FailoverTargetRow>) =>
            updateTargets(kind, index, (targets) => targets.map((row, j) => (j === tIndex ? { ...row, ...patch } : row)));
          const columns = 1 + (showTargetInterface ? 1 : 0) + (showTargetVrf ? 1 : 0);
          const targetId = `${prefix}-target-${tIndex}`;
          return (
            <div key={tIndex} className="flex items-end gap-2">
              <div className={`grid ${columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1"} gap-2 flex-1`}>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor={`${targetId}-addr`}>{t("healthCheck.targetIp")}</Label>
                  <Input
                    id={`${targetId}-addr`}
                    className="h-8 text-xs font-mono"
                    value={target.address}
                    onChange={(e) => setTarget({ address: e.target.value })}
                    placeholder={t("example", { value: "198.51.100.1" })}
                  />
                </div>
                {showTargetInterface && (
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`${targetId}-iface`}>{t("modal.interface")}</Label>
                    <InterfaceSelect
                      id={`${targetId}-iface`}
                      className="h-8 text-xs"
                      value={target.interface}
                      onValueChange={(v) => setTarget({ interface: v })}
                      noneOption={{ label: tc("none"), value: "" }}
                    />
                  </div>
                )}
                {showTargetVrf && (
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`${targetId}-vrf`}>{t("modal.vrf")}</Label>
                    <VrfSelect
                      id={`${targetId}-vrf`}
                      className="h-8 text-xs"
                      value={target.vrf}
                      onValueChange={(v) => setTarget({ vrf: v })}
                    />
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tc("delete")}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => updateTargets(kind, index, (targets) => targets.filter((_, j) => j !== tIndex))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGatewayFields = (kind: Kind, index: number, prefix: string, row: GatewayRow) => (
    <div className="grid grid-cols-2 gap-3 items-end">
      {numberField(`${prefix}-metric`, t("modal.metric"), row.metric, (metric) => updateRow(kind, index, { metric }), features.metric)}
      <div className="flex items-center space-x-2 pb-1">
        <Checkbox
          id={`${prefix}-onlink`}
          checked={row.onlink}
          onCheckedChange={(checked) => updateRow(kind, index, { onlink: checked === true })}
        />
        <Label htmlFor={`${prefix}-onlink`} className="text-xs cursor-pointer">
          {t("modal.onlink")}
        </Label>
      </div>
    </div>
  );

  // DHCP interface names already used by another row of this route.
  const dhcpNamesBesides = (index: number) =>
    new Set(form.dhcp_interfaces.filter((_, i) => i !== index).map((d) => d.name.trim()).filter(Boolean));

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("modal.editTitle") : t("modal.addTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("modal.editDescription", { destination: existingRoute.destination })
              : t("modal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pb-2">
          <div className="space-y-2">
            <Label htmlFor="failover-destination">{t("modal.destination")}</Label>
            <Input
              id="failover-destination"
              value={destination.value}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              placeholder={t("example", { value: "10.0.0.0/24" })}
              disabled={destination.disabled}
              className={destination.disabled ? "bg-muted font-mono" : "font-mono"}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("modal.nextHops")}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setForm((f) => ({ ...f, next_hops: [...f.next_hops, emptyNextHopRow()] }))}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("modal.addNextHop")}
              </Button>
            </div>

            {form.next_hops.map((nh, nhIndex) => (
              <div key={nhIndex} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("modal.nextHopN", { n: nhIndex + 1 })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={tc("delete")}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow("next_hops", nhIndex)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`nh-${nhIndex}-addr`}>{t("modal.addressRequired")}</Label>
                    <Input
                      id={`nh-${nhIndex}-addr`}
                      className="h-8 text-xs font-mono"
                      value={nh.address}
                      onChange={(e) => updateRow("next_hops", nhIndex, { address: e.target.value })}
                      placeholder={t("example", { value: "192.168.1.1" })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`nh-${nhIndex}-iface`}>{t("modal.interfaceRequired")}</Label>
                    <InterfaceSelect
                      id={`nh-${nhIndex}-iface`}
                      className="h-8 text-xs"
                      value={nh.interface}
                      onValueChange={(v) => updateRow("next_hops", nhIndex, { interface: v })}
                    />
                  </div>
                </div>

                {renderGatewayFields("next_hops", nhIndex, `nh-${nhIndex}`, nh)}
                {renderHealthCheck("next_hops", nhIndex, `nh-${nhIndex}`, nh.check)}
              </div>
            ))}
          </div>

          {showDhcp && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t("modal.dhcpInterfaces")}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setForm((f) => ({ ...f, dhcp_interfaces: [...f.dhcp_interfaces, emptyDhcpRow()] }))}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t("modal.addDhcpInterface")}
                  </Button>
                </div>

                {form.dhcp_interfaces.map((d, dIndex) => {
                  const used = dhcpNamesBesides(dIndex);
                  return (
                    <div key={dIndex} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("modal.dhcpInterfaceN", { n: dIndex + 1 })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={tc("delete")}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow("dhcp_interfaces", dIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`dhcp-${dIndex}-name`}>{t("modal.nameRequired")}</Label>
                          <InterfaceSelect
                            id={`dhcp-${dIndex}-name`}
                            className="h-8 text-xs"
                            value={d.name}
                            onValueChange={(v) => updateRow("dhcp_interfaces", dIndex, { name: v })}
                            filter={(iface) => !used.has(iface.name)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`dhcp-${dIndex}-iface`}>{t("modal.interface")}</Label>
                          <InterfaceSelect
                            id={`dhcp-${dIndex}-iface`}
                            className="h-8 text-xs"
                            value={d.interface}
                            onValueChange={(v) => updateRow("dhcp_interfaces", dIndex, { interface: v })}
                            noneOption={{ label: tc("none"), value: "" }}
                          />
                        </div>
                      </div>

                      {renderGatewayFields("dhcp_interfaces", dIndex, `dhcp-${dIndex}`, d)}
                      {renderHealthCheck("dhcp_interfaces", dIndex, `dhcp-${dIndex}`, d.check)}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : tc("creating")}
              </>
            ) : isEdit ? (
              tc("saveChanges")
            ) : (
              t("addRoute")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
