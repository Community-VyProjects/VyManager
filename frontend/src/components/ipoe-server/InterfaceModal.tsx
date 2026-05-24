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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Network, X } from "lucide-react";
import { ipoeServerService, IPoEInterface, IPoECapabilities } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterface: IPoEInterface | null;
  capabilities: IPoECapabilities | null;
}

export function InterfaceModal({ open, onOpenChange, onSuccess, existingInterface, capabilities }: InterfaceModalProps) {
  const isEdit = !!existingInterface;

  const [ifaceName, setIfaceName] = useState("");
  const [mode, setMode] = useState("l2");
  const [network, setNetwork] = useState("shared");
  const [startSession, setStartSession] = useState("dhcp");
  const [clientSubnet, setClientSubnet] = useState("");
  const [vlans, setVlans] = useState<string[]>([]);
  const [vlanInput, setVlanInput] = useState("");
  const [vlanMon, setVlanMon] = useState(false);
  const [luaUsername, setLuaUsername] = useState("");
  const [dhcpRelay, setDhcpRelay] = useState("");
  const [giaddr, setGiaddr] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showVlanMon = capabilities?.features.vlan_mon ?? false;

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setIfaceName(existingInterface.interface);
        setMode(existingInterface.mode || "l2");
        setNetwork(existingInterface.network || "shared");
        setStartSession(existingInterface.start_session || "dhcp");
        setClientSubnet(existingInterface.client_subnet || "");
        setVlans(existingInterface.vlans || []);
        setVlanMon(existingInterface.vlan_mon || false);
        setLuaUsername(existingInterface.lua_username || "");
        setDhcpRelay(existingInterface.external_dhcp?.dhcp_relay || "");
        setGiaddr(existingInterface.external_dhcp?.giaddr || "");
      } else {
        setIfaceName("");
        setMode("l2");
        setNetwork("shared");
        setStartSession("dhcp");
        setClientSubnet("");
        setVlans([]);
        setVlanMon(false);
        setLuaUsername("");
        setDhcpRelay("");
        setGiaddr("");
      }
      setVlanInput("");
      setError(null);
    }
  }, [open, existingInterface]);

  const addVlan = () => {
    const val = vlanInput.trim();
    if (val && !vlans.includes(val)) {
      setVlans([...vlans, val]);
      setVlanInput("");
    }
  };

  const handleSubmit = async () => {
    if (!ifaceName.trim()) { setError("Interface name is required"); return; }

    setLoading(true);
    setError(null);

    const opts = {
      mode,
      network,
      start_session: startSession,
      client_subnet: clientSubnet || undefined,
      vlans,
      vlan_mon: vlanMon,
      lua_username: luaUsername || undefined,
      dhcp_relay: dhcpRelay || undefined,
      giaddr: giaddr || undefined,
    };

    try {
      let result;
      if (isEdit) {
        result = await ipoeServerService.updateInterface(existingInterface!.interface, existingInterface!, opts);
      } else {
        result = await ipoeServerService.createInterface(ifaceName.trim(), opts);
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Add"} Interface
          </DialogTitle>
          <DialogDescription>Configure an IPoE server interface.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interface Name</Label>
            <Input value={ifaceName} onChange={(e) => setIfaceName(e.target.value)} placeholder="eth0" disabled={isEdit} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="l2">L2</SelectItem>
                  <SelectItem value="l3">L3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="vlan">VLAN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Start Session</Label>
            <Select value={startSession} onValueChange={setStartSession}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dhcp">DHCP</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="unclassified-packet">Unclassified Packet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Client Subnet</Label>
            <Input value={clientSubnet} onChange={(e) => setClientSubnet(e.target.value)} placeholder="192.168.100.0/24" />
          </div>

          <div className="space-y-2">
            <Label>VLANs</Label>
            <div className="flex gap-2">
              <Input
                value={vlanInput}
                onChange={(e) => setVlanInput(e.target.value)}
                placeholder="100 or 100-200"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVlan(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addVlan}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {vlans.map((vlan) => (
                <Badge key={vlan} variant="secondary" className="gap-1 font-mono text-xs">
                  {vlan}
                  <button onClick={() => setVlans(vlans.filter((v) => v !== vlan))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {showVlanMon && (
            <div className="flex items-center gap-2">
              <Checkbox id="vlan-mon" checked={vlanMon} onCheckedChange={(v) => setVlanMon(!!v)} />
              <Label htmlFor="vlan-mon" className="cursor-pointer">VLAN Monitoring</Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>Lua Username Function</Label>
            <Input value={luaUsername} onChange={(e) => setLuaUsername(e.target.value)} placeholder="getUsername" />
          </div>

          <Separator />
          <h4 className="text-sm font-medium">External DHCP</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>DHCP Relay</Label>
              <Input value={dhcpRelay} onChange={(e) => setDhcpRelay(e.target.value)} placeholder="10.0.0.1" />
            </div>
            <div className="space-y-2">
              <Label>Gateway Address (giaddr)</Label>
              <Input value={giaddr} onChange={(e) => setGiaddr(e.target.value)} placeholder="10.0.0.2" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
