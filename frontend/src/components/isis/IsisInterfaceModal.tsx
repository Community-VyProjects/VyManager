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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import {
  IsisInterface,
  IsisCapabilities,
} from "@/lib/api/isis";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface IsisInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: IsisInterface) => Promise<void>;
  existingInterface: IsisInterface | null;
  capabilities: IsisCapabilities | null;
}


export function IsisInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
}: IsisInterfaceModalProps) {
  const isEdit = !!existingInterface;
  const isV15 = capabilities?.version_info.is_1_5 ?? false;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interfaceNames, setInterfaceNames] = useState<InterfaceName[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  // Basic fields
  const [name, setName] = useState("");
  const [circuitType, setCircuitType] = useState("");
  const [metric, setMetric] = useState("");
  const [priority, setPriority] = useState("");
  const [passive, setPassive] = useState(false);
  const [pointToPoint, setPointToPoint] = useState(false);
  const [bfd, setBfd] = useState(false);
  const [bfdProfile, setBfdProfile] = useState("");

  // Timers
  const [helloInterval, setHelloInterval] = useState("");
  const [helloMultiplier, setHelloMultiplier] = useState("");
  const [helloPadding, setHelloPadding] = useState(false);
  const [psnpInterval, setPsnpInterval] = useState("");
  const [noThreeWayHandshake, setNoThreeWayHandshake] = useState(false);
  const [ldpSyncHolddown, setLdpSyncHolddown] = useState("");
  const [ldpSyncDisable, setLdpSyncDisable] = useState(false);

  // Authentication
  const [passwordMd5, setPasswordMd5] = useState("");
  const [passwordPlaintext, setPasswordPlaintext] = useState("");

  // LFA
  const [lfaLevel1, setLfaLevel1] = useState(false);
  const [lfaLevel2, setLfaLevel2] = useState(false);

  // TI-LFA (v1.5+)
  const [tiLfaLevel1, setTiLfaLevel1] = useState(false);
  const [tiLfaLevel1NodeProtection, setTiLfaLevel1NodeProtection] = useState(false);
  const [tiLfaLevel1LinkFallback, setTiLfaLevel1LinkFallback] = useState(false);
  const [tiLfaLevel2, setTiLfaLevel2] = useState(false);
  const [tiLfaLevel2NodeProtection, setTiLfaLevel2NodeProtection] = useState(false);
  const [tiLfaLevel2LinkFallback, setTiLfaLevel2LinkFallback] = useState(false);

  // Remote LFA (v1.5+)
  const [remoteLfaLevel1, setRemoteLfaLevel1] = useState(false);
  const [remoteLfaLevel1MaxMetric, setRemoteLfaLevel1MaxMetric] = useState("");
  const [remoteLfaLevel1TunnelMplsLdp, setRemoteLfaLevel1TunnelMplsLdp] = useState(false);
  const [remoteLfaLevel2, setRemoteLfaLevel2] = useState(false);
  const [remoteLfaLevel2MaxMetric, setRemoteLfaLevel2MaxMetric] = useState("");
  const [remoteLfaLevel2TunnelMplsLdp, setRemoteLfaLevel2TunnelMplsLdp] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);

    // Fetch available interface names from the device
    setInterfacesLoading(true);
    showService
      .getAllInterfaces()
      .then((res) => setInterfaceNames([...res.interfaces].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setInterfaceNames([]))
      .finally(() => setInterfacesLoading(false));

    if (existingInterface) {
      const i = existingInterface;
      setName(i.name);
      setCircuitType(i.circuit_type || "");
      setMetric(i.metric != null ? String(i.metric) : "");
      setPriority(i.priority != null ? String(i.priority) : "");
      setPassive(i.passive);
      setPointToPoint(i.point_to_point);
      setBfd(i.bfd);
      setBfdProfile(i.bfd_profile || "");
      setHelloInterval(i.hello_interval != null ? String(i.hello_interval) : "");
      setHelloMultiplier(i.hello_multiplier != null ? String(i.hello_multiplier) : "");
      setHelloPadding(i.hello_padding);
      setPsnpInterval(i.psnp_interval != null ? String(i.psnp_interval) : "");
      setNoThreeWayHandshake(i.no_three_way_handshake);
      setLdpSyncHolddown(i.ldp_sync_holddown != null ? String(i.ldp_sync_holddown) : "");
      setLdpSyncDisable(i.ldp_sync_disable);
      setPasswordMd5(i.password_md5 || "");
      setPasswordPlaintext(i.password_plaintext || "");
      setLfaLevel1(i.lfa.level1_enabled);
      setLfaLevel2(i.lfa.level2_enabled);
      setTiLfaLevel1(i.ti_lfa.level1_enabled);
      setTiLfaLevel1NodeProtection(i.ti_lfa.level1_node_protection);
      setTiLfaLevel1LinkFallback(i.ti_lfa.level1_link_fallback);
      setTiLfaLevel2(i.ti_lfa.level2_enabled);
      setTiLfaLevel2NodeProtection(i.ti_lfa.level2_node_protection);
      setTiLfaLevel2LinkFallback(i.ti_lfa.level2_link_fallback);
      setRemoteLfaLevel1(i.remote_lfa.level1_enabled);
      setRemoteLfaLevel1MaxMetric(i.remote_lfa.level1_max_metric != null ? String(i.remote_lfa.level1_max_metric) : "");
      setRemoteLfaLevel1TunnelMplsLdp(i.remote_lfa.level1_tunnel_mpls_ldp);
      setRemoteLfaLevel2(i.remote_lfa.level2_enabled);
      setRemoteLfaLevel2MaxMetric(i.remote_lfa.level2_max_metric != null ? String(i.remote_lfa.level2_max_metric) : "");
      setRemoteLfaLevel2TunnelMplsLdp(i.remote_lfa.level2_tunnel_mpls_ldp);
    } else {
      setName("");
      setCircuitType("");
      setMetric("");
      setPriority("");
      setPassive(false);
      setPointToPoint(false);
      setBfd(false);
      setBfdProfile("");
      setHelloInterval("");
      setHelloMultiplier("");
      setHelloPadding(false);
      setPsnpInterval("");
      setNoThreeWayHandshake(false);
      setLdpSyncHolddown("");
      setLdpSyncDisable(false);
      setPasswordMd5("");
      setPasswordPlaintext("");
      setLfaLevel1(false);
      setLfaLevel2(false);
      setTiLfaLevel1(false);
      setTiLfaLevel1NodeProtection(false);
      setTiLfaLevel1LinkFallback(false);
      setTiLfaLevel2(false);
      setTiLfaLevel2NodeProtection(false);
      setTiLfaLevel2LinkFallback(false);
      setRemoteLfaLevel1(false);
      setRemoteLfaLevel1MaxMetric("");
      setRemoteLfaLevel1TunnelMplsLdp(false);
      setRemoteLfaLevel2(false);
      setRemoteLfaLevel2MaxMetric("");
      setRemoteLfaLevel2TunnelMplsLdp(false);
    }
  }, [open, existingInterface]);

  const handleSubmit = async () => {
    if (!name) {
      setError("Please select an interface");
      return;
    }

    const iface: IsisInterface = {
      name,
      circuit_type: circuitType || null,
      metric: metric.trim() ? parseInt(metric.trim(), 10) : null,
      priority: priority.trim() ? parseInt(priority.trim(), 10) : null,
      passive,
      point_to_point: pointToPoint,
      bfd,
      bfd_profile: bfdProfile.trim() || null,
      hello_interval: helloInterval.trim() ? parseInt(helloInterval.trim(), 10) : null,
      hello_multiplier: helloMultiplier.trim() ? parseInt(helloMultiplier.trim(), 10) : null,
      hello_padding: helloPadding,
      psnp_interval: psnpInterval.trim() ? parseInt(psnpInterval.trim(), 10) : null,
      no_three_way_handshake: noThreeWayHandshake,
      ldp_sync_holddown: ldpSyncHolddown.trim() ? parseInt(ldpSyncHolddown.trim(), 10) : null,
      ldp_sync_disable: ldpSyncDisable,
      password_md5: passwordMd5.trim() || null,
      password_plaintext: passwordPlaintext.trim() || null,
      lfa: {
        level1_enabled: lfaLevel1,
        level1_exclude_interfaces: existingInterface?.lfa.level1_exclude_interfaces || [],
        level2_enabled: lfaLevel2,
        level2_exclude_interfaces: existingInterface?.lfa.level2_exclude_interfaces || [],
      },
      ti_lfa: {
        enabled: tiLfaLevel1 || tiLfaLevel2,
        level1_enabled: tiLfaLevel1,
        level1_node_protection: tiLfaLevel1NodeProtection,
        level1_link_fallback: tiLfaLevel1LinkFallback,
        level2_enabled: tiLfaLevel2,
        level2_node_protection: tiLfaLevel2NodeProtection,
        level2_link_fallback: tiLfaLevel2LinkFallback,
      },
      remote_lfa: {
        level1_enabled: remoteLfaLevel1,
        level1_max_metric: remoteLfaLevel1MaxMetric.trim() ? parseInt(remoteLfaLevel1MaxMetric.trim(), 10) : null,
        level1_tunnel_mpls_ldp: remoteLfaLevel1TunnelMplsLdp,
        level2_enabled: remoteLfaLevel2,
        level2_max_metric: remoteLfaLevel2MaxMetric.trim() ? parseInt(remoteLfaLevel2MaxMetric.trim(), 10) : null,
        level2_tunnel_mpls_ldp: remoteLfaLevel2TunnelMplsLdp,
      },
    };

    try {
      setSaving(true);
      setError(null);
      await onSubmit(iface);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save interface");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit IS-IS Interface" : "Add IS-IS Interface"}</DialogTitle>
          <DialogDescription>
            Configure IS-IS parameters for this interface.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <Tabs defaultValue="basic">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
            <TabsTrigger value="timers" className="flex-1">Timers</TabsTrigger>
            <TabsTrigger value="auth" className="flex-1">Authentication</TabsTrigger>
            <TabsTrigger value="frr" className="flex-1">Fast Reroute</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Interface <span className="text-destructive">*</span></Label>
              {isEdit ? (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted text-sm font-mono">
                  {name}
                </div>
              ) : (
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={interfacesLoading}
                  interfaces={interfaceNames}
                  placeholder="Select interface"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Circuit Type</Label>
              <Select value={circuitType} onValueChange={setCircuitType}>
                <SelectTrigger>
                  <SelectValue placeholder="Inherit from level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="level-1">Level 1 Only</SelectItem>
                  <SelectItem value="level-2">Level 2 Only</SelectItem>
                  <SelectItem value="level-1-2">Level 1 and 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Input
                  type="number"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="Default"
                  min={1}
                  max={16777214}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority (DR election)</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="Default (64)"
                  min={0}
                  max={127}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="passive" checked={passive} onCheckedChange={(c) => setPassive(!!c)} />
                <Label htmlFor="passive">Passive (suppress hellos)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="p2p" checked={pointToPoint} onCheckedChange={(c) => setPointToPoint(!!c)} />
                <Label htmlFor="p2p">Point-to-Point</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="bfd" checked={bfd} onCheckedChange={(c) => setBfd(!!c)} />
                <Label htmlFor="bfd">BFD</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="hello-padding" checked={helloPadding} onCheckedChange={(c) => setHelloPadding(!!c)} />
                <Label htmlFor="hello-padding">Hello Padding</Label>
              </div>
            </div>

            {bfd && (
              <div className="space-y-2">
                <Label>BFD Profile</Label>
                <Input
                  value={bfdProfile}
                  onChange={(e) => setBfdProfile(e.target.value)}
                  placeholder="Optional BFD profile name"
                />
              </div>
            )}
          </TabsContent>

          {/* Timers Tab */}
          <TabsContent value="timers" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hello Interval (s)</Label>
                <Input
                  type="number"
                  value={helloInterval}
                  onChange={(e) => setHelloInterval(e.target.value)}
                  placeholder="Default (3)"
                  min={1}
                  max={600}
                />
              </div>
              <div className="space-y-2">
                <Label>Hello Multiplier</Label>
                <Input
                  type="number"
                  value={helloMultiplier}
                  onChange={(e) => setHelloMultiplier(e.target.value)}
                  placeholder="Default (10)"
                  min={2}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>PSNP Interval (ms)</Label>
                <Input
                  type="number"
                  value={psnpInterval}
                  onChange={(e) => setPsnpInterval(e.target.value)}
                  placeholder="Default (2000)"
                  min={100}
                  max={60000}
                />
              </div>
              <div className="space-y-2">
                <Label>LDP Sync Holddown (s)</Label>
                <Input
                  type="number"
                  value={ldpSyncHolddown}
                  onChange={(e) => setLdpSyncHolddown(e.target.value)}
                  placeholder="Disabled"
                  min={1}
                  max={10000}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="no-3way" checked={noThreeWayHandshake} onCheckedChange={(c) => setNoThreeWayHandshake(!!c)} />
                <Label htmlFor="no-3way">Disable 3-Way Handshake</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ldp-sync-disable" checked={ldpSyncDisable} onCheckedChange={(c) => setLdpSyncDisable(!!c)} />
                <Label htmlFor="ldp-sync-disable">Disable LDP Sync</Label>
              </div>
            </div>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Configure IS-IS authentication for this interface. Only one type can be active at a time.
            </p>
            <div className="space-y-2">
              <Label>MD5 Password</Label>
              <Input
                type="password"
                value={passwordMd5}
                onChange={(e) => setPasswordMd5(e.target.value)}
                placeholder="MD5 authentication password"
              />
            </div>
            <div className="space-y-2">
              <Label>Plaintext Password</Label>
              <Input
                type="password"
                value={passwordPlaintext}
                onChange={(e) => setPasswordPlaintext(e.target.value)}
                placeholder="Plaintext authentication password"
              />
            </div>
          </TabsContent>

          {/* Fast Reroute Tab */}
          <TabsContent value="frr" className="space-y-4 mt-4">
            {/* LFA */}
            <div>
              <h4 className="text-sm font-medium mb-3">LFA (Loop-Free Alternate)</h4>
              <div className="space-y-2 pl-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="lfa-l1" checked={lfaLevel1} onCheckedChange={(c) => setLfaLevel1(!!c)} />
                  <Label htmlFor="lfa-l1">Enable LFA — Level 1</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="lfa-l2" checked={lfaLevel2} onCheckedChange={(c) => setLfaLevel2(!!c)} />
                  <Label htmlFor="lfa-l2">Enable LFA — Level 2</Label>
                </div>
              </div>
            </div>

            {/* TI-LFA (v1.5 only) */}
            {isV15 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-medium">TI-LFA (Topology Independent LFA)</h4>
                  </div>
                  <div className="space-y-2 pl-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="tilfa-l1" checked={tiLfaLevel1} onCheckedChange={(c) => setTiLfaLevel1(!!c)} />
                      <Label htmlFor="tilfa-l1">Enable TI-LFA — Level 1</Label>
                    </div>
                    {tiLfaLevel1 && (
                      <div className="pl-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox id="tilfa-l1-np" checked={tiLfaLevel1NodeProtection} onCheckedChange={(c) => setTiLfaLevel1NodeProtection(!!c)} />
                          <Label htmlFor="tilfa-l1-np">Node Protection</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="tilfa-l1-lf" checked={tiLfaLevel1LinkFallback} onCheckedChange={(c) => setTiLfaLevel1LinkFallback(!!c)} />
                          <Label htmlFor="tilfa-l1-lf">Link Fallback</Label>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox id="tilfa-l2" checked={tiLfaLevel2} onCheckedChange={(c) => setTiLfaLevel2(!!c)} />
                      <Label htmlFor="tilfa-l2">Enable TI-LFA — Level 2</Label>
                    </div>
                    {tiLfaLevel2 && (
                      <div className="pl-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox id="tilfa-l2-np" checked={tiLfaLevel2NodeProtection} onCheckedChange={(c) => setTiLfaLevel2NodeProtection(!!c)} />
                          <Label htmlFor="tilfa-l2-np">Node Protection</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="tilfa-l2-lf" checked={tiLfaLevel2LinkFallback} onCheckedChange={(c) => setTiLfaLevel2LinkFallback(!!c)} />
                          <Label htmlFor="tilfa-l2-lf">Link Fallback</Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Remote LFA */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-medium">Remote LFA</h4>
                  </div>
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="rlfa-l1" checked={remoteLfaLevel1} onCheckedChange={(c) => setRemoteLfaLevel1(!!c)} />
                      <Label htmlFor="rlfa-l1">Enable Remote LFA — Level 1</Label>
                    </div>
                    {remoteLfaLevel1 && (
                      <div className="pl-6 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Max Metric</Label>
                          <Input
                            type="number"
                            value={remoteLfaLevel1MaxMetric}
                            onChange={(e) => setRemoteLfaLevel1MaxMetric(e.target.value)}
                            placeholder="Unlimited"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <div className="flex items-center gap-2">
                            <Checkbox id="rlfa-l1-ldp" checked={remoteLfaLevel1TunnelMplsLdp} onCheckedChange={(c) => setRemoteLfaLevel1TunnelMplsLdp(!!c)} />
                            <Label htmlFor="rlfa-l1-ldp">MPLS LDP Tunnel</Label>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox id="rlfa-l2" checked={remoteLfaLevel2} onCheckedChange={(c) => setRemoteLfaLevel2(!!c)} />
                      <Label htmlFor="rlfa-l2">Enable Remote LFA — Level 2</Label>
                    </div>
                    {remoteLfaLevel2 && (
                      <div className="pl-6 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Max Metric</Label>
                          <Input
                            type="number"
                            value={remoteLfaLevel2MaxMetric}
                            onChange={(e) => setRemoteLfaLevel2MaxMetric(e.target.value)}
                            placeholder="Unlimited"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <div className="flex items-center gap-2">
                            <Checkbox id="rlfa-l2-ldp" checked={remoteLfaLevel2TunnelMplsLdp} onCheckedChange={(c) => setRemoteLfaLevel2TunnelMplsLdp(!!c)} />
                            <Label htmlFor="rlfa-l2-ldp">MPLS LDP Tunnel</Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {!isV15 && (
              <p className="text-sm text-muted-foreground">
                TI-LFA and Remote LFA are not supported on this device.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
