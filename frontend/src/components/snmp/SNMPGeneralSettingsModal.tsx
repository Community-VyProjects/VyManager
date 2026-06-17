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
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  snmpService,
  SNMPConfig,
  SNMPCapabilities,
  SNMPGeneralUpdate,
} from "@/lib/api/snmp";
import { SNMPMultiValueField } from "./SNMPMultiValueField";

interface SNMPGeneralSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SNMPConfig;
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT_PROTOCOL = "__default__";

export function SNMPGeneralSettingsModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SNMPGeneralSettingsModalProps) {
  const [contact, setContact] = useState(config.contact ?? "");
  const [description, setDescription] = useState(config.description ?? "");
  const [location, setLocation] = useState(config.location ?? "");
  const [protocol, setProtocol] = useState(config.protocol ?? DEFAULT_PROTOCOL);
  const [trapSource, setTrapSource] = useState(config.trap_source ?? "");
  const [vrf, setVrf] = useState(config.vrf ?? "");
  const [engineid, setEngineid] = useState(config.v3.engineid ?? "");
  const [smuxPeers, setSmuxPeers] = useState<string[]>(config.smux_peers);
  const [oidEnable, setOidEnable] = useState<string[]>(config.oid_enable);
  const [mibInterfaces, setMibInterfaces] = useState<string[]>(config.mib_interfaces);
  const [mibInterfaceMax, setMibInterfaceMax] = useState(config.mib_interface_max ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const update: SNMPGeneralUpdate = {
      original: config,
      contact,
      description,
      location,
      protocol: protocol === DEFAULT_PROTOCOL ? "" : protocol,
      trapSource,
      vrf,
      engineid,
      smuxPeers,
      oidEnable,
      mibInterfaces,
      mibInterfaceMax,
    };
    try {
      await snmpService.updateGeneral(update);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>SNMP General Settings</DialogTitle>
          <DialogDescription>
            System identification, transport, and agent-wide options
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            {/* Identity */}
            <div className="space-y-1.5">
              <Label htmlFor="snmp-contact">Contact</Label>
              <Input
                id="snmp-contact"
                placeholder="e.g. admin@example.com"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snmp-location">Location</Label>
              <Input
                id="snmp-location"
                placeholder="e.g. Data Center 1, Rack 4"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snmp-description">Description</Label>
              <Input
                id="snmp-description"
                placeholder="Free-text description of this agent"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Separator />

            {/* Transport */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Transport Protocol</Label>
              <p className="text-xs text-muted-foreground">
                Protocol the SNMP agent listens on
              </p>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_PROTOCOL}>
                    Default ({capabilities.features.protocol.default.toUpperCase()})
                  </SelectItem>
                  {capabilities.features.protocol.values.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snmp-trap-source">Trap Source Address</Label>
              <p className="text-xs text-muted-foreground">
                Source IP used as the origin for outgoing traps
              </p>
              <Input
                id="snmp-trap-source"
                placeholder="e.g. 192.0.2.1"
                value={trapSource}
                onChange={(e) => setTrapSource(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snmp-vrf">VRF Instance</Label>
              <p className="text-xs text-muted-foreground">
                Bind the agent to a VRF. Leave empty for the default routing table.
              </p>
              <VrfSelect
                id="snmp-vrf"
                placeholder="Default routing table"
                value={vrf}
                onValueChange={setVrf}
                extraOptions={[{ label: "Default", value: "default" }]}
              />
            </div>

            <Separator />

            {/* SNMPv3 engine id */}
            <div className="space-y-1.5">
              <Label htmlFor="snmp-engineid">SNMPv3 Engine ID</Label>
              <p className="text-xs text-muted-foreground">
                Even number of hex digits (2–36) uniquely identifying this agent.
                Leave empty to auto-generate.
              </p>
              <Input
                id="snmp-engineid"
                placeholder="e.g. 000000000000000000000002"
                value={engineid}
                onChange={(e) => setEngineid(e.target.value)}
                className="font-mono"
              />
            </div>

            <Separator />

            {/* OID enable */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Enable Additional OIDs</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OIDs disabled by default — enable only what you need
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {capabilities.features.oid_enable.values.map((oid) => (
                  <div key={oid} className="flex items-center gap-2">
                    <Checkbox
                      id={`oid-${oid}`}
                      checked={oidEnable.includes(oid)}
                      onCheckedChange={() => toggle(oidEnable, setOidEnable, oid)}
                    />
                    <Label htmlFor={`oid-${oid}`} className="cursor-pointer font-mono text-xs">
                      {oid}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* MIB interface collection */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">IF-MIB Interface Prefixes</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restrict IF-MIB collection to specific interface types. None
                  selected = all interfaces.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {capabilities.features.mib.interface_prefixes.map((prefix) => (
                  <div key={prefix} className="flex items-center gap-2">
                    <Checkbox
                      id={`mib-${prefix}`}
                      checked={mibInterfaces.includes(prefix)}
                      onCheckedChange={() => toggle(mibInterfaces, setMibInterfaces, prefix)}
                    />
                    <Label htmlFor={`mib-${prefix}`} className="cursor-pointer font-mono text-xs">
                      {prefix}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snmp-mib-max">Max IF-MIB Interfaces</Label>
              <p className="text-xs text-muted-foreground">
                Cap the number of interfaces included in IF-MIB data. Leave empty
                for no limit.
              </p>
              <Input
                id="snmp-mib-max"
                type="number"
                min={1}
                placeholder="e.g. 64"
                value={mibInterfaceMax}
                onChange={(e) => setMibInterfaceMax(e.target.value)}
              />
            </div>

            <Separator />

            {/* SMUX peers */}
            <SNMPMultiValueField
              label="SMUX Peers"
              description="Register subtree OIDs for SMUX-based processing"
              placeholder="e.g. 1.3.6.1.4.1.3317.1.2.2"
              values={smuxPeers}
              onChange={setSmuxPeers}
            />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
