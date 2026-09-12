"use client";

import { useEffect, useState } from "react";
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
import { AlertCircle, Plus, Settings2, X } from "lucide-react";
import { InterfaceSelect } from "@/components/ui/interface-select";
import {
  dhcpService,
  type DHCPCapabilitiesResponse,
  type DHCPGlobalConfig,
} from "@/lib/api/dhcp";

interface DHCPServerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  globalConfig: DHCPGlobalConfig;
  capabilities: DHCPCapabilitiesResponse | null;
}

export function DHCPServerSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  globalConfig,
  capabilities,
}: DHCPServerSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [listenInterfaces, setListenInterfaces] = useState<string[]>([]);
  const [addressInput, setAddressInput] = useState("");
  const [ifacePick, setIfacePick] = useState("__none__");
  const [hostfileUpdate, setHostfileUpdate] = useState(false);
  const [hostDeclName, setHostDeclName] = useState(false);

  const canListenInterface = capabilities?.fields.listen_interface?.supported ?? false;
  const canHostDeclName = capabilities?.fields.host_decl_name?.supported ?? false;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setListenAddresses([...(globalConfig.listen_addresses ?? [])]);
    setListenInterfaces([...(globalConfig.listen_interfaces ?? [])]);
    setAddressInput("");
    setIfacePick("__none__");
    setHostfileUpdate(globalConfig.hostfile_update);
    setHostDeclName(globalConfig.host_decl_name);
  }, [open, globalConfig]);

  const addAddress = () => {
    const v = addressInput.trim();
    if (!v) return;
    if (!listenAddresses.includes(v)) setListenAddresses([...listenAddresses, v]);
    setAddressInput("");
  };

  const addInterface = (value: string) => {
    setIfacePick("__none__");
    if (value === "__none__" || listenInterfaces.includes(value)) return;
    setListenInterfaces([...listenInterfaces, value]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dhcpService.saveGlobalSettings(globalConfig, {
        ...globalConfig,
        listen_addresses: listenAddresses,
        listen_interfaces: canListenInterface ? listenInterfaces : (globalConfig.listen_interfaces ?? []),
        hostfile_update: hostfileUpdate,
        host_decl_name: canHostDeclName ? hostDeclName : globalConfig.host_decl_name,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to save server settings");
        setLoading(false);
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save server settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            DHCP Server Settings
          </DialogTitle>
          <DialogDescription>
            Bind the DHCP listener and toggle host-file options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Listen addresses</Label>
            <div className="flex gap-2">
              <Input
                placeholder="192.168.1.1"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAddress();
                  }
                }}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="icon" onClick={addAddress}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {listenAddresses.map((addr) => (
                <Badge key={addr} variant="outline" className="font-mono gap-1">
                  {addr}
                  <button type="button" onClick={() => setListenAddresses(listenAddresses.filter((a) => a !== addr))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {canListenInterface && (
            <div className="space-y-2">
              <Label>Listen interfaces</Label>
              <InterfaceSelect
                value={ifacePick}
                onValueChange={addInterface}
                noneOption={{ label: "Add interface", value: "__none__" }}
                placeholder="Select interface"
              />
              <div className="flex flex-wrap gap-1.5">
                {listenInterfaces.map((iface) => (
                  <Badge key={iface} variant="outline" className="font-mono gap-1">
                    {iface}
                    <button type="button" onClick={() => setListenInterfaces(listenInterfaces.filter((i) => i !== iface))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="hostfile-update"
              checked={hostfileUpdate}
              onCheckedChange={(v) => setHostfileUpdate(Boolean(v))}
            />
            <Label htmlFor="hostfile-update" className="cursor-pointer">
              Update hosts file from leases
            </Label>
          </div>

          {canHostDeclName && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="host-decl-name"
                checked={hostDeclName}
                onCheckedChange={(v) => setHostDeclName(Boolean(v))}
              />
              <Label htmlFor="host-decl-name" className="cursor-pointer">
                Use host declaration name
              </Label>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
