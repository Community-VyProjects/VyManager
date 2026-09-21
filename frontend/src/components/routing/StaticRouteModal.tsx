"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { staticRoutesService, type StaticRoute, type StaticRoutesCapabilities } from "@/lib/api/static-routes";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyInterfaceDraft,
  emptyNextHopDraft,
  emptyStaticRouteDraft,
  staticRouteDraftFrom,
  submitStaticRouteCreate,
  submitStaticRouteUpdate,
  validateStaticRouteCreate,
  validateStaticRouteEdit,
  type StaticRouteDraft,
} from "./static-routes-form";

interface StaticRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeType: "ipv4" | "ipv6";
  existing?: StaticRoute | null;
}

export function StaticRouteModal({
  open,
  onOpenChange,
  onSuccess,
  routeType,
  existing,
}: StaticRouteModalProps) {
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<StaticRoutesCapabilities | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<StaticRouteDraft>(emptyStaticRouteDraft(routeType));

  useEffect(() => {
    if (!open) return;
    staticRoutesService.getCapabilities().then(setCapabilities).catch((err) => {
      console.error("Failed to load capabilities:", err);
    });
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch((err) => {
      console.error("Failed to load interfaces:", err);
    });
    if (existing) {
      setDraft(staticRouteDraftFrom(existing));
    } else {
      setDraft(emptyStaticRouteDraft(routeType));
    }
    setError(null);
  }, [open, existing, routeType]);

  const patch = (fields: Partial<StaticRouteDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const effectiveType = isEdit ? existing.route_type : routeType;
  const lockedDestination = lockedIdentity(existing, (r) => r.destination, draft.destination);

  const handleSubmit = async () => {
    const validationError = isEdit
      ? validateStaticRouteEdit(draft)
      : validateStaticRouteCreate(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.destination } : null);
    setLoading(true);
    setError(null);
    const dhcpSupported = capabilities?.features.dhcp_interface.supported ?? false;

    try {
      const result =
        write.kind === "update" && existing
          ? await submitStaticRouteUpdate(existing, draft, dhcpSupported)
          : await submitStaticRouteCreate({ ...draft, routeType: effectiveType }, dhcpSupported);

      if (result && result.success === false) {
        setError(result.error || "Operation failed");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to update route" : "Failed to create route");
    } finally {
      setLoading(false);
    }
  };

  const addNextHop = () => patch({ nextHops: [...draft.nextHops, emptyNextHopDraft()] });
  const removeNextHop = (index: number) => patch({ nextHops: draft.nextHops.filter((_, i) => i !== index) });
  const updateNextHop = <K extends keyof StaticRouteDraft["nextHops"][number]>(
    index: number,
    field: K,
    value: StaticRouteDraft["nextHops"][number][K],
  ) => {
    const nextHops = [...draft.nextHops];
    nextHops[index] = { ...nextHops[index], [field]: value };
    patch({ nextHops });
  };

  const addInterface = () => patch({ interfaces: [...draft.interfaces, emptyInterfaceDraft()] });
  const removeInterface = (index: number) => patch({ interfaces: draft.interfaces.filter((_, i) => i !== index) });
  const updateInterface = <K extends keyof StaticRouteDraft["interfaces"][number]>(
    index: number,
    field: K,
    value: StaticRouteDraft["interfaces"][number][K],
  ) => {
    const interfaces = [...draft.interfaces];
    interfaces[index] = { ...interfaces[index], [field]: value };
    patch({ interfaces });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Static Route" : `Create ${effectiveType.toUpperCase()} Static Route`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modify configuration for ${existing.destination}`
              : `Configure a new static route for ${effectiveType === "ipv4" ? "IPv4" : "IPv6"} traffic`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">
                Destination Network {isEdit ? null : <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="destination"
                placeholder={effectiveType === "ipv4" ? "e.g., 10.0.0.0/24" : "e.g., 2001:db8::/32"}
                value={lockedDestination.value}
                disabled={lockedDestination.disabled}
                className={lockedDestination.disabled ? "bg-muted" : undefined}
                onChange={(e) => patch({ destination: e.target.value })}
              />
              {isEdit ? (
                <p className="text-xs text-muted-foreground">
                  Destination cannot be changed. Delete and recreate to change destination.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Network in CIDR notation</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this route"
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="routing" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Next-Hops</Label>
                <Button type="button" variant="outline" size="sm" onClick={addNextHop}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Next-Hop
                </Button>
              </div>

              {draft.nextHops.length > 0 ? (
                draft.nextHops.map((nh, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Next-Hop #{index + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeNextHop(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder={effectiveType === "ipv4" ? "e.g., 192.168.1.1" : "e.g., 2001:db8::1"}
                          value={nh.address}
                          onChange={(e) => updateNextHop(index, "address", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Distance (Metric)</Label>
                        <Input
                          type="number"
                          placeholder="Default: 1"
                          value={nh.distance}
                          onChange={(e) => updateNextHop(index, "distance", e.target.value)}
                        />
                      </div>
                    </div>

                    {capabilities?.features.next_hop_vrf.supported && (
                      <div className="space-y-2">
                        <Label>VRF</Label>
                        <VrfSelect
                          value={nh.vrf}
                          onValueChange={(v) => updateNextHop(index, "vrf", v)}
                          extraOptions={[{ label: "Default", value: "default" }]}
                        />
                      </div>
                    )}

                    {capabilities?.features.next_hop_bfd.supported && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`bfd-enable-${index}`}
                            checked={nh.bfd_enable}
                            onCheckedChange={(checked) => updateNextHop(index, "bfd_enable", checked === true)}
                          />
                          <Label htmlFor={`bfd-enable-${index}`}>Enable BFD Monitoring</Label>
                        </div>
                        {nh.bfd_enable && (
                          <div className="space-y-2 ml-6">
                            <Label>BFD Profile</Label>
                            <Input
                              placeholder="BFD profile name (optional)"
                              value={nh.bfd_profile}
                              onChange={(e) => updateNextHop(index, "bfd_profile", e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`nh-disable-${index}`}
                        checked={nh.disable}
                        onCheckedChange={(checked) => updateNextHop(index, "disable", checked === true)}
                      />
                      <Label htmlFor={`nh-disable-${index}`}>Disable this next-hop</Label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No next-hops configured. Click &quot;Add Next-Hop&quot; to add one.
                </p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Interface Routes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInterface}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interface
                </Button>
              </div>

              {draft.interfaces.length > 0 ? (
                draft.interfaces.map((iface, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Interface #{index + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeInterface(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          Interface <span className="text-destructive">*</span>
                        </Label>
                        <InterfaceSelect
                          value={iface.interface}
                          onValueChange={(value) => updateInterface(index, "interface", value)}
                          interfaces={availableInterfaces}
                          placeholder="Select interface"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Distance (Metric)</Label>
                        <Input
                          type="number"
                          placeholder="Default: 1"
                          value={iface.distance}
                          onChange={(e) => updateInterface(index, "distance", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`iface-disable-${index}`}
                        checked={iface.disable}
                        onCheckedChange={(checked) => updateInterface(index, "disable", checked === true)}
                      />
                      <Label htmlFor={`iface-disable-${index}`}>Disable this interface route</Label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No interface routes configured. Click &quot;Add Interface&quot; to add one.
                </p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="blackhole"
                  checked={draft.isBlackhole}
                  onCheckedChange={(checked) =>
                    patch({ isBlackhole: checked === true, isReject: checked === true ? false : draft.isReject })
                  }
                />
                <Label htmlFor="blackhole" className="text-base font-semibold cursor-pointer">
                  Blackhole Route (Drop silently)
                </Label>
              </div>
              {draft.isBlackhole && (
                <div className="ml-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Packets matching this route will be dropped without notification.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Distance (Metric)</Label>
                      <Input
                        type="number"
                        placeholder="Default: 1"
                        value={draft.blackholeDistance}
                        onChange={(e) => patch({ blackholeDistance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Input
                        type="number"
                        placeholder="Optional"
                        value={draft.blackholeTag}
                        onChange={(e) => patch({ blackholeTag: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reject"
                  checked={draft.isReject}
                  onCheckedChange={(checked) =>
                    patch({ isReject: checked === true, isBlackhole: checked === true ? false : draft.isBlackhole })
                  }
                />
                <Label htmlFor="reject" className="text-base font-semibold cursor-pointer">
                  Reject Route (ICMP unreachable)
                </Label>
              </div>
              {draft.isReject && (
                <div className="ml-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Packets matching this route will be rejected with ICMP unreachable response.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Distance (Metric)</Label>
                      <Input
                        type="number"
                        placeholder="Default: 1"
                        value={draft.rejectDistance}
                        onChange={(e) => patch({ rejectDistance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Input
                        type="number"
                        placeholder="Optional"
                        value={draft.rejectTag}
                        onChange={(e) => patch({ rejectTag: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {capabilities?.features.dhcp_interface.supported && (
              <div className="space-y-2">
                <Label htmlFor="dhcp-interface">DHCP Interface</Label>
                <InterfaceSelect
                  id="dhcp-interface"
                  value={draft.dhcpInterface || "__none__"}
                  onValueChange={(v) => patch({ dhcpInterface: v === "__none__" ? "" : v })}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "__none__" }}
                  placeholder="Select interface"
                />
                <p className="text-xs text-muted-foreground">
                  Use gateway from DHCP on this interface
                </p>
              </div>
            )}

            {!capabilities?.features.dhcp_interface.supported && (
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  No advanced options available on this device.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update Route" : "Create Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
