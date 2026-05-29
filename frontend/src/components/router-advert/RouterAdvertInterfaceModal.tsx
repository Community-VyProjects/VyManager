"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  routerAdvertService,
  RouterAdvertInterface,
  RouterAdvertCapabilities,
  RAPrefix,
  RARoute,
} from "@/lib/api/router-advert";
import { showService } from "@/lib/api/show";

interface RouterAdvertInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: RouterAdvertInterface | null;
  existingNames: string[];
  capabilities: RouterAdvertCapabilities | null;
  onSuccess: () => void;
}

// ---- Prefix form helpers ----

interface PrefixForm {
  prefix: string;
  base_interface: string;
  decrement_lifetime: boolean;
  deprecate_prefix: boolean;
  no_autonomous_flag: boolean;
  no_on_link_flag: boolean;
  preferred_lifetime: string;
  valid_lifetime: string;
}

const emptyPrefixForm: PrefixForm = {
  prefix: "",
  base_interface: "",
  decrement_lifetime: false,
  deprecate_prefix: false,
  no_autonomous_flag: false,
  no_on_link_flag: false,
  preferred_lifetime: "",
  valid_lifetime: "",
};

function raPrefixToForm(p: RAPrefix): PrefixForm {
  return {
    prefix: p.prefix,
    base_interface: p.base_interface ?? "",
    decrement_lifetime: p.decrement_lifetime,
    deprecate_prefix: p.deprecate_prefix,
    no_autonomous_flag: p.no_autonomous_flag,
    no_on_link_flag: p.no_on_link_flag,
    preferred_lifetime: p.preferred_lifetime ?? "",
    valid_lifetime: p.valid_lifetime ?? "",
  };
}

function formToRaPrefix(f: PrefixForm): RAPrefix {
  return {
    prefix: f.prefix.trim(),
    base_interface: f.base_interface.trim() || null,
    decrement_lifetime: f.decrement_lifetime,
    deprecate_prefix: f.deprecate_prefix,
    no_autonomous_flag: f.no_autonomous_flag,
    no_on_link_flag: f.no_on_link_flag,
    preferred_lifetime: f.preferred_lifetime.trim() || null,
    valid_lifetime: f.valid_lifetime.trim() || null,
  };
}

// ---- NAT64 form helpers ----

interface Nat64Form {
  prefix: string;
  valid_lifetime: string;
}

const emptyNat64Form: Nat64Form = { prefix: "", valid_lifetime: "" };

// ---- Route form helpers ----

interface RouteForm {
  route: string;
  route_preference: string;
  valid_lifetime: string;
  no_remove_route: boolean;
}

const emptyRouteForm: RouteForm = {
  route: "",
  route_preference: "",
  valid_lifetime: "",
  no_remove_route: false,
};

function raRouteToForm(r: RARoute): RouteForm {
  return {
    route: r.route,
    route_preference: r.route_preference ?? "",
    valid_lifetime: r.valid_lifetime ?? "",
    no_remove_route: r.no_remove_route,
  };
}

function formToRaRoute(f: RouteForm): RARoute {
  return {
    route: f.route.trim(),
    route_preference: f.route_preference || null,
    valid_lifetime: f.valid_lifetime.trim() || null,
    no_remove_route: f.no_remove_route,
  };
}

// ---- Validation ----

const IPV6_RE = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(\/\d{1,3})?$|^::1$|^::$/;

function isValidIPv6(v: string): boolean {
  return IPV6_RE.test(v.trim());
}

function validatePrefixForm(
  form: PrefixForm,
  existing: string[],
  selfPrefix?: string
): string | null {
  const trimmed = form.prefix.trim();
  if (!trimmed) return "Prefix is required";
  if (!isValidIPv6(trimmed)) return "Enter a valid IPv6 prefix (e.g. 2001:db8::/64)";
  if (trimmed !== selfPrefix && existing.includes(trimmed)) return "This prefix is already in the list";
  return null;
}

function validateRouteForm(
  form: RouteForm,
  existing: string[],
  selfRoute?: string
): string | null {
  const trimmed = form.route.trim();
  if (!trimmed) return "Route is required";
  if (!isValidIPv6(trimmed)) return "Enter a valid IPv6 route (e.g. 2001:db8::/64)";
  if (trimmed !== selfRoute && existing.includes(trimmed)) return "This route is already in the list";
  return null;
}

function validateNat64Form(
  form: Nat64Form,
  existing: string[]
): string | null {
  const trimmed = form.prefix.trim();
  if (!trimmed) return "NAT64 prefix is required";
  if (!isValidIPv6(trimmed)) return "Enter a valid IPv6 prefix";
  if (existing.includes(trimmed)) return "This prefix is already in the list";
  return null;
}

// ---- Main component ----

export function RouterAdvertInterfaceModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  capabilities,
  onSuccess,
}: RouterAdvertInterfaceModalProps) {
  const isEdit = existing !== null;
  const captivePortalSupported = capabilities?.features.captive_portal.supported ?? false;
  const baseIfaceSupported = capabilities?.features.prefix_base_interface.supported ?? false;

  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);

  useEffect(() => {
    if (!open || isEdit) return;
    showService.getAllInterfaces().then((res) => {
      const names = res.interfaces.map((i) => i.name).sort();
      setAvailableInterfaces(names);
    });
  }, [open, isEdit]);

  // General tab state
  const [interfaceName, setInterfaceName] = useState(existing?.name ?? "");
  const [defaultLifetime, setDefaultLifetime] = useState(existing?.default_lifetime ?? "");
  const [defaultPreference, setDefaultPreference] = useState(existing?.default_preference ?? "");
  const [hopLimit, setHopLimit] = useState(
    existing?.hop_limit !== null && existing?.hop_limit !== undefined ? String(existing.hop_limit) : ""
  );
  const [linkMtu, setLinkMtu] = useState(
    existing?.link_mtu !== null && existing?.link_mtu !== undefined ? String(existing.link_mtu) : ""
  );
  const [reachableTime, setReachableTime] = useState(
    existing?.reachable_time !== null && existing?.reachable_time !== undefined ? String(existing.reachable_time) : ""
  );
  const [retransTimer, setRetransTimer] = useState(
    existing?.retrans_timer !== null && existing?.retrans_timer !== undefined ? String(existing.retrans_timer) : ""
  );
  const [intervalMax, setIntervalMax] = useState(
    existing?.interval_max !== null && existing?.interval_max !== undefined ? String(existing.interval_max) : ""
  );
  const [intervalMin, setIntervalMin] = useState(
    existing?.interval_min !== null && existing?.interval_min !== undefined ? String(existing.interval_min) : ""
  );
  const [captivePortal, setCaptivePortal] = useState(existing?.captive_portal ?? "");
  const [managedFlag, setManagedFlag] = useState(existing?.managed_flag ?? false);
  const [otherConfigFlag, setOtherConfigFlag] = useState(existing?.other_config_flag ?? false);
  const [noSendAdvert, setNoSendAdvert] = useState(existing?.no_send_advert ?? false);
  const [noSendInterval, setNoSendInterval] = useState(existing?.no_send_interval ?? false);
  const [sourceAddresses, setSourceAddresses] = useState<string[]>(existing?.source_address ?? []);
  const [sourceAddrInput, setSourceAddrInput] = useState("");
  const [autoIgnore, setAutoIgnore] = useState<string[]>(existing?.auto_ignore ?? []);
  const [autoIgnoreInput, setAutoIgnoreInput] = useState("");

  // Prefixes tab state
  const [prefixes, setPrefixes] = useState<PrefixForm[]>(
    existing?.prefixes.map(raPrefixToForm) ?? []
  );
  const [editingPrefixIdx, setEditingPrefixIdx] = useState<number | null>(null);
  const [editingPrefixForm, setEditingPrefixForm] = useState<PrefixForm>({ ...emptyPrefixForm });
  const [addingPrefix, setAddingPrefix] = useState(false);
  const [newPrefixForm, setNewPrefixForm] = useState<PrefixForm>({ ...emptyPrefixForm });
  const [prefixError, setPrefixError] = useState<string | null>(null);

  // DNS tab state
  const [nameServers, setNameServers] = useState<string[]>(existing?.name_server ?? []);
  const [nameServerInput, setNameServerInput] = useState("");
  const [nameServerLifetime, setNameServerLifetime] = useState(
    existing?.name_server_lifetime !== null && existing?.name_server_lifetime !== undefined
      ? String(existing.name_server_lifetime)
      : ""
  );
  const [dnssl, setDnssl] = useState<string[]>(existing?.dnssl ?? []);
  const [dnsslInput, setDnsslInput] = useState("");

  // Routes & NAT64 tab state
  const [routes, setRoutes] = useState<RouteForm[]>(existing?.routes.map(raRouteToForm) ?? []);
  const [editingRouteIdx, setEditingRouteIdx] = useState<number | null>(null);
  const [editingRouteForm, setEditingRouteForm] = useState<RouteForm>({ ...emptyRouteForm });
  const [addingRoute, setAddingRoute] = useState(false);
  const [newRouteForm, setNewRouteForm] = useState<RouteForm>({ ...emptyRouteForm });
  const [routeError, setRouteError] = useState<string | null>(null);

  const [nat64Prefixes, setNat64Prefixes] = useState<Nat64Form[]>(
    existing?.nat64_prefixes.map((n) => ({ prefix: n.prefix, valid_lifetime: n.valid_lifetime ?? "" })) ?? []
  );
  const [newNat64Form, setNewNat64Form] = useState<Nat64Form>({ ...emptyNat64Form });
  const [addingNat64, setAddingNat64] = useState(false);
  const [nat64Error, setNat64Error] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Prefix helpers ----

  const existingPrefixStrings = prefixes.map((p) => p.prefix);

  const startEditPrefix = (idx: number) => {
    setEditingPrefixIdx(idx);
    setEditingPrefixForm({ ...prefixes[idx] });
    setAddingPrefix(false);
    setPrefixError(null);
  };

  const saveEditPrefix = () => {
    if (editingPrefixIdx === null) return;
    const err = validatePrefixForm(editingPrefixForm, existingPrefixStrings, prefixes[editingPrefixIdx].prefix);
    if (err) { setPrefixError(err); return; }
    setPrefixes((prev) => {
      const next = [...prev];
      next[editingPrefixIdx] = { ...editingPrefixForm, prefix: editingPrefixForm.prefix.trim() };
      return next;
    });
    setEditingPrefixIdx(null);
    setPrefixError(null);
  };

  const cancelEditPrefix = () => { setEditingPrefixIdx(null); setPrefixError(null); };

  const deletePrefix = (idx: number) => {
    if (editingPrefixIdx === idx) setEditingPrefixIdx(null);
    setPrefixes((prev) => prev.filter((_, i) => i !== idx));
  };

  const startAddPrefix = () => {
    setAddingPrefix(true);
    setEditingPrefixIdx(null);
    setNewPrefixForm({ ...emptyPrefixForm });
    setPrefixError(null);
  };

  const confirmAddPrefix = () => {
    const err = validatePrefixForm(newPrefixForm, existingPrefixStrings);
    if (err) { setPrefixError(err); return; }
    setPrefixes((prev) => [...prev, { ...newPrefixForm, prefix: newPrefixForm.prefix.trim() }]);
    setAddingPrefix(false);
    setNewPrefixForm({ ...emptyPrefixForm });
    setPrefixError(null);
  };

  // ---- Route helpers ----

  const existingRouteStrings = routes.map((r) => r.route);

  const startEditRoute = (idx: number) => {
    setEditingRouteIdx(idx);
    setEditingRouteForm({ ...routes[idx] });
    setAddingRoute(false);
    setRouteError(null);
  };

  const saveEditRoute = () => {
    if (editingRouteIdx === null) return;
    const err = validateRouteForm(editingRouteForm, existingRouteStrings, routes[editingRouteIdx].route);
    if (err) { setRouteError(err); return; }
    setRoutes((prev) => {
      const next = [...prev];
      next[editingRouteIdx] = { ...editingRouteForm, route: editingRouteForm.route.trim() };
      return next;
    });
    setEditingRouteIdx(null);
    setRouteError(null);
  };

  const cancelEditRoute = () => { setEditingRouteIdx(null); setRouteError(null); };

  const deleteRoute = (idx: number) => {
    if (editingRouteIdx === idx) setEditingRouteIdx(null);
    setRoutes((prev) => prev.filter((_, i) => i !== idx));
  };

  const startAddRoute = () => {
    setAddingRoute(true);
    setEditingRouteIdx(null);
    setNewRouteForm({ ...emptyRouteForm });
    setRouteError(null);
  };

  const confirmAddRoute = () => {
    const err = validateRouteForm(newRouteForm, existingRouteStrings);
    if (err) { setRouteError(err); return; }
    setRoutes((prev) => [...prev, { ...newRouteForm, route: newRouteForm.route.trim() }]);
    setAddingRoute(false);
    setNewRouteForm({ ...emptyRouteForm });
    setRouteError(null);
  };

  // ---- NAT64 helpers ----

  const confirmAddNat64 = () => {
    const existing64 = nat64Prefixes.map((n) => n.prefix);
    const err = validateNat64Form(newNat64Form, existing64);
    if (err) { setNat64Error(err); return; }
    setNat64Prefixes((prev) => [...prev, { ...newNat64Form, prefix: newNat64Form.prefix.trim() }]);
    setAddingNat64(false);
    setNewNat64Form({ ...emptyNat64Form });
    setNat64Error(null);
  };

  const deleteNat64 = (idx: number) => setNat64Prefixes((prev) => prev.filter((_, i) => i !== idx));

  // ---- Multi-value list helpers ----

  const addToList = (
    list: string[],
    setList: (l: string[]) => void,
    input: string,
    setInput: (v: string) => void
  ) => {
    const trimmed = input.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    setInput("");
  };

  const removeFromList = (
    list: string[],
    setList: (l: string[]) => void,
    item: string
  ) => setList(list.filter((i) => i !== item));

  // ---- Validation & submit ----

  const validate = (): string | null => {
    if (!interfaceName.trim()) return "Interface name is required";
    if (!isEdit && existingNames.includes(interfaceName.trim())) {
      return `Interface "${interfaceName.trim()}" is already configured`;
    }
    if (editingPrefixIdx !== null || addingPrefix) return "Save or cancel the open prefix form first";
    if (editingRouteIdx !== null || addingRoute) return "Save or cancel the open route form first";
    if (addingNat64) return "Save or cancel the open NAT64 form first";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError(null);

    const updated: RouterAdvertInterface = {
      name: interfaceName.trim(),
      auto_ignore: autoIgnore,
      captive_portal: captivePortal.trim() || null,
      default_lifetime: defaultLifetime.trim() || null,
      default_preference: defaultPreference || null,
      dnssl,
      hop_limit: hopLimit.trim() !== "" ? parseInt(hopLimit.trim(), 10) : null,
      interval_max: intervalMax.trim() !== "" ? parseInt(intervalMax.trim(), 10) : null,
      interval_min: intervalMin.trim() !== "" ? parseInt(intervalMin.trim(), 10) : null,
      link_mtu: linkMtu.trim() !== "" ? parseInt(linkMtu.trim(), 10) : null,
      managed_flag: managedFlag,
      name_server: nameServers,
      name_server_lifetime: nameServerLifetime.trim() !== "" ? parseInt(nameServerLifetime.trim(), 10) : null,
      nat64_prefixes: nat64Prefixes.map((n) => ({
        prefix: n.prefix,
        valid_lifetime: n.valid_lifetime.trim() || null,
      })),
      no_send_advert: noSendAdvert,
      no_send_interval: noSendInterval,
      other_config_flag: otherConfigFlag,
      prefixes: prefixes.map(formToRaPrefix),
      reachable_time: reachableTime.trim() !== "" ? parseInt(reachableTime.trim(), 10) : null,
      retrans_timer: retransTimer.trim() !== "" ? parseInt(retransTimer.trim(), 10) : null,
      routes: routes.map(formToRaRoute),
      source_address: sourceAddresses,
    };

    try {
      await routerAdvertService.setInterface(existing, updated);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "Edit Interface" : "Add Interface"}</DialogTitle>
          <DialogDescription>
            Configure router advertisement settings for an interface
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="prefixes" className="flex-1">
              Prefixes {prefixes.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{prefixes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="dns" className="flex-1">DNS</TabsTrigger>
            <TabsTrigger value="routes" className="flex-1">
              Routes &amp; NAT64{" "}
              {(routes.length + nat64Prefixes.length) > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">{routes.length + nat64Prefixes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---- General Tab ---- */}
          <TabsContent value="general" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-5 py-1">
                {/* Interface name */}
                <div className="space-y-1.5">
                  <Label htmlFor="iface-name">Interface Name</Label>
                  {isEdit ? (
                    <Input id="iface-name" value={interfaceName} disabled className="font-mono" />
                  ) : (
                    <Select value={interfaceName} onValueChange={setInterfaceName}>
                      <SelectTrigger id="iface-name">
                        <SelectValue placeholder="Select interface" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInterfaces
                          .filter((name) => !existingNames.includes(name))
                          .map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Timing & Behavior */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-xs">
                    Timing &amp; Behavior
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="default-lifetime">Default Lifetime (s)</Label>
                      <Input
                        id="default-lifetime"
                        placeholder="0 or 4–9000"
                        value={defaultLifetime}
                        onChange={(e) => setDefaultLifetime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="default-preference">Default Preference</Label>
                      <Select value={defaultPreference} onValueChange={setDefaultPreference}>
                        <SelectTrigger id="default-preference">
                          <SelectValue placeholder="medium (default)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">low</SelectItem>
                          <SelectItem value="medium">medium</SelectItem>
                          <SelectItem value="high">high</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="hop-limit">Hop Limit (0–255)</Label>
                      <Input
                        id="hop-limit"
                        type="number"
                        placeholder="64 (default)"
                        value={hopLimit}
                        onChange={(e) => setHopLimit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="link-mtu">Link MTU (1280–9000)</Label>
                      <Input
                        id="link-mtu"
                        type="number"
                        placeholder="Leave empty for default"
                        value={linkMtu}
                        onChange={(e) => setLinkMtu(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reachable-time">Reachable Time ms</Label>
                      <Input
                        id="reachable-time"
                        type="number"
                        placeholder="0 or 1–3600000"
                        value={reachableTime}
                        onChange={(e) => setReachableTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="retrans-timer">Retrans Timer ms</Label>
                      <Input
                        id="retrans-timer"
                        type="number"
                        placeholder="0 or 1–4294967295"
                        value={retransTimer}
                        onChange={(e) => setRetransTimer(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="interval-max">Interval Max s (4–1800)</Label>
                      <Input
                        id="interval-max"
                        type="number"
                        placeholder="600 (default)"
                        value={intervalMax}
                        onChange={(e) => setIntervalMax(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="interval-min">Interval Min s (3–1350)</Label>
                      <Input
                        id="interval-min"
                        type="number"
                        placeholder="200 (default)"
                        value={intervalMin}
                        onChange={(e) => setIntervalMin(e.target.value)}
                      />
                    </div>
                    {captivePortalSupported && (
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="captive-portal">Captive Portal URL</Label>
                        <Input
                          id="captive-portal"
                          placeholder="https://portal.example.com/api"
                          value={captivePortal}
                          onChange={(e) => setCaptivePortal(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Flags */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-xs">
                    Flags
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="managed-flag"
                        checked={managedFlag}
                        onCheckedChange={(c) => setManagedFlag(!!c)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="managed-flag" className="cursor-pointer text-sm">Managed Flag</Label>
                        <p className="text-xs text-muted-foreground">Hosts use DHCPv6 for address autoconfiguration</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="other-config-flag"
                        checked={otherConfigFlag}
                        onCheckedChange={(c) => setOtherConfigFlag(!!c)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="other-config-flag" className="cursor-pointer text-sm">Other Config Flag</Label>
                        <p className="text-xs text-muted-foreground">Hosts use DHCPv6 for other configuration</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="no-send-advert"
                        checked={noSendAdvert}
                        onCheckedChange={(c) => setNoSendAdvert(!!c)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="no-send-advert" className="cursor-pointer text-sm">No Send Advert</Label>
                        <p className="text-xs text-muted-foreground">Suppress sending router advertisements</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="no-send-interval"
                        checked={noSendInterval}
                        onCheckedChange={(c) => setNoSendInterval(!!c)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="no-send-interval" className="cursor-pointer text-sm">No Send Interval</Label>
                        <p className="text-xs text-muted-foreground">Suppress Advertisement Interval option in RAs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source Addresses */}
                <MultiValueField
                  label="Source Addresses"
                  items={sourceAddresses}
                  input={sourceAddrInput}
                  onInputChange={setSourceAddrInput}
                  onAdd={() => addToList(sourceAddresses, setSourceAddresses, sourceAddrInput, setSourceAddrInput)}
                  onRemove={(item) => removeFromList(sourceAddresses, setSourceAddresses, item)}
                  placeholder="IPv6 address (e.g. 2001:db8::1)"
                />

                {/* Auto Ignore */}
                <MultiValueField
                  label="Auto Ignore Prefixes"
                  items={autoIgnore}
                  input={autoIgnoreInput}
                  onInputChange={setAutoIgnoreInput}
                  onAdd={() => addToList(autoIgnore, setAutoIgnore, autoIgnoreInput, setAutoIgnoreInput)}
                  onRemove={(item) => removeFromList(autoIgnore, setAutoIgnore, item)}
                  placeholder="IPv6 CIDR (e.g. ::/64)"
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ---- Prefixes Tab ---- */}
          <TabsContent value="prefixes" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-3 py-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">RA Prefixes</Label>
                  {!addingPrefix && editingPrefixIdx === null && (
                    <Button type="button" size="sm" variant="outline" onClick={startAddPrefix}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Prefix
                    </Button>
                  )}
                </div>

                {prefixes.length === 0 && !addingPrefix && (
                  <p className="text-sm text-muted-foreground">No prefixes configured.</p>
                )}

                <div className="space-y-2">
                  {prefixes.map((p, idx) => (
                    <div key={idx}>
                      {editingPrefixIdx === idx ? (
                        <PrefixInlineForm
                          form={editingPrefixForm}
                          onChange={setEditingPrefixForm}
                          onSave={saveEditPrefix}
                          onCancel={cancelEditPrefix}
                          error={prefixError}
                          baseIfaceSupported={baseIfaceSupported}
                          isNew={false}
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                          <span className="font-mono font-medium flex-1 truncate">{p.prefix}</span>
                          {p.valid_lifetime && (
                            <Badge variant="secondary" className="shrink-0 text-xs">vlt:{p.valid_lifetime}</Badge>
                          )}
                          {p.preferred_lifetime && (
                            <Badge variant="secondary" className="shrink-0 text-xs">plt:{p.preferred_lifetime}</Badge>
                          )}
                          {p.no_autonomous_flag && (
                            <Badge variant="secondary" className="shrink-0 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">no-auto</Badge>
                          )}
                          {p.no_on_link_flag && (
                            <Badge variant="secondary" className="shrink-0 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">no-onlink</Badge>
                          )}
                          <div className="flex items-center gap-1 ml-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => startEditPrefix(idx)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => deletePrefix(idx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {addingPrefix && (
                    <PrefixInlineForm
                      form={newPrefixForm}
                      onChange={setNewPrefixForm}
                      onSave={confirmAddPrefix}
                      onCancel={() => { setAddingPrefix(false); setPrefixError(null); }}
                      error={prefixError}
                      baseIfaceSupported={baseIfaceSupported}
                      isNew
                    />
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ---- DNS Tab ---- */}
          <TabsContent value="dns" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-5 py-1">
                <MultiValueField
                  label="Name Servers (RDNSS)"
                  items={nameServers}
                  input={nameServerInput}
                  onInputChange={setNameServerInput}
                  onAdd={() => addToList(nameServers, setNameServers, nameServerInput, setNameServerInput)}
                  onRemove={(item) => removeFromList(nameServers, setNameServers, item)}
                  placeholder="IPv6 address (e.g. 2001:db8::53)"
                />

                <div className="space-y-1.5">
                  <Label htmlFor="ns-lifetime">Name Server Lifetime (s)</Label>
                  <Input
                    id="ns-lifetime"
                    type="number"
                    placeholder="0 or 1–7200"
                    value={nameServerLifetime}
                    onChange={(e) => setNameServerLifetime(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">0 = servers no longer valid</p>
                </div>

                <Separator />

                <MultiValueField
                  label="DNS Search List (DNSSL)"
                  items={dnssl}
                  input={dnsslInput}
                  onInputChange={setDnsslInput}
                  onAdd={() => addToList(dnssl, setDnssl, dnsslInput, setDnsslInput)}
                  onRemove={(item) => removeFromList(dnssl, setDnssl, item)}
                  placeholder="Domain (e.g. example.com)"
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ---- Routes & NAT64 Tab ---- */}
          <TabsContent value="routes" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-5 py-1">
                {/* Routes section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Routes</Label>
                    {!addingRoute && editingRouteIdx === null && (
                      <Button type="button" size="sm" variant="outline" onClick={startAddRoute}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Route
                      </Button>
                    )}
                  </div>

                  {routes.length === 0 && !addingRoute && (
                    <p className="text-sm text-muted-foreground">No routes configured.</p>
                  )}

                  <div className="space-y-2">
                    {routes.map((r, idx) => (
                      <div key={idx}>
                        {editingRouteIdx === idx ? (
                          <RouteInlineForm
                            form={editingRouteForm}
                            onChange={setEditingRouteForm}
                            onSave={saveEditRoute}
                            onCancel={cancelEditRoute}
                            error={routeError}
                            isNew={false}
                          />
                        ) : (
                          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                            <span className="font-mono font-medium flex-1 truncate">{r.route}</span>
                            {r.route_preference && (
                              <Badge variant="secondary" className="shrink-0 text-xs">{r.route_preference}</Badge>
                            )}
                            {r.valid_lifetime && (
                              <Badge variant="secondary" className="shrink-0 text-xs">vlt:{r.valid_lifetime}</Badge>
                            )}
                            {r.no_remove_route && (
                              <Badge variant="secondary" className="shrink-0 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">no-remove</Badge>
                            )}
                            <div className="flex items-center gap-1 ml-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => startEditRoute(idx)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => deleteRoute(idx)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {addingRoute && (
                      <RouteInlineForm
                        form={newRouteForm}
                        onChange={setNewRouteForm}
                        onSave={confirmAddRoute}
                        onCancel={() => { setAddingRoute(false); setRouteError(null); }}
                        error={routeError}
                        isNew
                      />
                    )}
                  </div>
                </div>

                <Separator />

                {/* NAT64 Prefixes section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">NAT64 Prefixes</Label>
                    {!addingNat64 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setAddingNat64(true); setNewNat64Form({ ...emptyNat64Form }); setNat64Error(null); }}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add NAT64 Prefix
                      </Button>
                    )}
                  </div>

                  {nat64Prefixes.length === 0 && !addingNat64 && (
                    <p className="text-sm text-muted-foreground">No NAT64 prefixes configured.</p>
                  )}

                  <div className="space-y-2">
                    {nat64Prefixes.map((n, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <span className="font-mono font-medium flex-1 truncate">{n.prefix}</span>
                        {n.valid_lifetime && (
                          <Badge variant="secondary" className="shrink-0 text-xs">vlt:{n.valid_lifetime}</Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                          onClick={() => deleteNat64(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {addingNat64 && (
                      <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">NAT64 Prefix (IPv6 CIDR)</Label>
                          <Input
                            placeholder="e.g. 64:ff9b::/96"
                            value={newNat64Form.prefix}
                            onChange={(e) => setNewNat64Form({ ...newNat64Form, prefix: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Valid Lifetime (s or &quot;infinity&quot;)</Label>
                          <Input
                            placeholder="e.g. 65528 or infinity"
                            value={newNat64Form.valid_lifetime}
                            onChange={(e) => setNewNat64Form({ ...newNat64Form, valid_lifetime: e.target.value })}
                          />
                        </div>
                        {nat64Error && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {nat64Error}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <Button type="button" size="sm" onClick={confirmAddNat64}>Add</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingNat64(false); setNat64Error(null); }}>
                            <X className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="shrink-0 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- MultiValueField sub-component ----

interface MultiValueFieldProps {
  label: string;
  items: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  placeholder?: string;
}

function MultiValueField({
  label,
  items,
  input,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
}: MultiValueFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="font-mono text-xs gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="ml-0.5 rounded-sm hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- PrefixInlineForm sub-component ----

interface PrefixInlineFormProps {
  form: PrefixForm;
  onChange: (f: PrefixForm) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  baseIfaceSupported: boolean;
  isNew: boolean;
}

function PrefixInlineForm({
  form,
  onChange,
  onSave,
  onCancel,
  error,
  baseIfaceSupported,
  isNew,
}: PrefixInlineFormProps) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">IPv6 Prefix</Label>
        <Input
          placeholder="e.g. 2001:db8::/64"
          value={form.prefix}
          onChange={(e) => onChange({ ...form, prefix: e.target.value })}
          disabled={!isNew}
          className={!isNew ? "font-mono" : ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Valid Lifetime</Label>
          <Input
            placeholder="seconds or infinity"
            value={form.valid_lifetime}
            onChange={(e) => onChange({ ...form, valid_lifetime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Preferred Lifetime</Label>
          <Input
            placeholder="seconds or infinity"
            value={form.preferred_lifetime}
            onChange={(e) => onChange({ ...form, preferred_lifetime: e.target.value })}
          />
        </div>
      </div>
      {baseIfaceSupported && (
        <div className="space-y-1.5">
          <Label className="text-xs">Base Interface</Label>
          <Input
            placeholder="e.g. eth1"
            value={form.base_interface}
            onChange={(e) => onChange({ ...form, base_interface: e.target.value })}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`prefix-decr-${isNew ? "new" : form.prefix}`}
            checked={form.decrement_lifetime}
            onCheckedChange={(c) => onChange({ ...form, decrement_lifetime: !!c })}
          />
          <Label htmlFor={`prefix-decr-${isNew ? "new" : form.prefix}`} className="text-xs cursor-pointer">
            Decrement Lifetime
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`prefix-depr-${isNew ? "new" : form.prefix}`}
            checked={form.deprecate_prefix}
            onCheckedChange={(c) => onChange({ ...form, deprecate_prefix: !!c })}
          />
          <Label htmlFor={`prefix-depr-${isNew ? "new" : form.prefix}`} className="text-xs cursor-pointer">
            Deprecate on Shutdown
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`prefix-noauto-${isNew ? "new" : form.prefix}`}
            checked={form.no_autonomous_flag}
            onCheckedChange={(c) => onChange({ ...form, no_autonomous_flag: !!c })}
          />
          <Label htmlFor={`prefix-noauto-${isNew ? "new" : form.prefix}`} className="text-xs cursor-pointer">
            No Autonomous Flag
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`prefix-noonlink-${isNew ? "new" : form.prefix}`}
            checked={form.no_on_link_flag}
            onCheckedChange={(c) => onChange({ ...form, no_on_link_flag: !!c })}
          />
          <Label htmlFor={`prefix-noonlink-${isNew ? "new" : form.prefix}`} className="text-xs cursor-pointer">
            No On-Link Flag
          </Label>
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={onSave}>{isNew ? "Add" : "Save"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---- RouteInlineForm sub-component ----

interface RouteInlineFormProps {
  form: RouteForm;
  onChange: (f: RouteForm) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  isNew: boolean;
}

function RouteInlineForm({
  form,
  onChange,
  onSave,
  onCancel,
  error,
  isNew,
}: RouteInlineFormProps) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">IPv6 Route (CIDR)</Label>
        <Input
          placeholder="e.g. 2001:db8::/48"
          value={form.route}
          onChange={(e) => onChange({ ...form, route: e.target.value })}
          disabled={!isNew}
          className={!isNew ? "font-mono" : ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Route Preference</Label>
          <Select value={form.route_preference} onValueChange={(v) => onChange({ ...form, route_preference: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="medium (default)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">low</SelectItem>
              <SelectItem value="medium">medium</SelectItem>
              <SelectItem value="high">high</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Valid Lifetime</Label>
          <Input
            placeholder="seconds or infinity"
            value={form.valid_lifetime}
            onChange={(e) => onChange({ ...form, valid_lifetime: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`route-noremove-${isNew ? "new" : form.route}`}
          checked={form.no_remove_route}
          onCheckedChange={(c) => onChange({ ...form, no_remove_route: !!c })}
        />
        <Label htmlFor={`route-noremove-${isNew ? "new" : form.route}`} className="text-xs cursor-pointer">
          No Remove Route — do not announce zero lifetime on shutdown
        </Label>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={onSave}>{isNew ? "Add" : "Save"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
