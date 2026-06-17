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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { dhcpv6RelayService, DHCPv6RelayConfig } from "@/lib/api/dhcpv6-relay";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface DHCPv6RelayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: DHCPv6RelayConfig | null;
}

type ListenEntry = { interface: string; address: string };
type UpstreamEntry = { interface: string; addresses: string[]; addressInput: string };

function isValidIPv6(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new URL(`http://[${value.trim()}]`);
    return true;
  } catch {
    return false;
  }
}

export function DHCPv6RelayModal({ open, onClose, onSuccess, config }: DHCPv6RelayModalProps) {
  const [disabled, setDisabled] = useState(false);
  const [maxHopCount, setMaxHopCount] = useState("");
  const [useInterfaceIdOption, setUseInterfaceIdOption] = useState(false);

  const [listenEntries, setListenEntries] = useState<ListenEntry[]>([]);
  const [listenSelectedIface, setListenSelectedIface] = useState("");
  const [listenAddressInput, setListenAddressInput] = useState("");

  const [upstreamEntries, setUpstreamEntries] = useState<UpstreamEntry[]>([]);
  const [upstreamSelectedIface, setUpstreamSelectedIface] = useState("");

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (config) {
        setDisabled(config.disabled);
        setMaxHopCount(config.max_hop_count != null ? String(config.max_hop_count) : "");
        setUseInterfaceIdOption(config.use_interface_id_option);
        setListenEntries(
          config.listen_interfaces.map((li) => ({
            interface: li.interface,
            address: li.address ?? "",
          }))
        );
        setUpstreamEntries(
          config.upstream_interfaces.map((ui) => ({
            interface: ui.interface,
            addresses: [...ui.addresses],
            addressInput: "",
          }))
        );
      } else {
        resetForm();
      }
      setListenSelectedIface("");
      setListenAddressInput("");
      setUpstreamSelectedIface("");
      setError(null);
      loadInterfaces();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadInterfaces = async () => {
    setInterfacesLoading(true);
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch {
      // non-critical — dropdowns will be empty but form still works
    } finally {
      setInterfacesLoading(false);
    }
  };

  const resetForm = () => {
    setDisabled(false);
    setMaxHopCount("");
    setUseInterfaceIdOption(false);
    setListenEntries([]);
    setListenSelectedIface("");
    setListenAddressInput("");
    setUpstreamEntries([]);
    setUpstreamSelectedIface("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ---- Listen interface handlers ----

  const handleAddListenInterface = () => {
    if (!listenSelectedIface) return;
    if (listenEntries.some((e) => e.interface === listenSelectedIface)) return;
    const addr = listenAddressInput.trim();
    if (addr && !isValidIPv6(addr)) {
      setError(`"${addr}" is not a valid IPv6 address`);
      return;
    }
    setListenEntries([...listenEntries, { interface: listenSelectedIface, address: addr }]);
    setListenSelectedIface("");
    setListenAddressInput("");
    setError(null);
  };

  const handleRemoveListenInterface = (iface: string) => {
    setListenEntries(listenEntries.filter((e) => e.interface !== iface));
  };

  // ---- Upstream interface handlers ----

  const handleAddUpstreamInterface = () => {
    if (!upstreamSelectedIface) return;
    if (upstreamEntries.some((e) => e.interface === upstreamSelectedIface)) return;
    setUpstreamEntries([
      ...upstreamEntries,
      { interface: upstreamSelectedIface, addresses: [], addressInput: "" },
    ]);
    setUpstreamSelectedIface("");
    setError(null);
  };

  const handleRemoveUpstreamInterface = (iface: string) => {
    setUpstreamEntries(upstreamEntries.filter((e) => e.interface !== iface));
  };

  const handleUpstreamAddressInputChange = (iface: string, value: string) => {
    setUpstreamEntries(
      upstreamEntries.map((e) =>
        e.interface === iface ? { ...e, addressInput: value } : e
      )
    );
  };

  const handleAddUpstreamAddress = (iface: string) => {
    const entry = upstreamEntries.find((e) => e.interface === iface);
    if (!entry) return;
    const addr = entry.addressInput.trim();
    if (!addr) return;
    if (!isValidIPv6(addr)) {
      setError(`"${addr}" is not a valid IPv6 address`);
      return;
    }
    if (entry.addresses.includes(addr)) {
      setError(`${addr} is already listed for ${iface}`);
      return;
    }
    setUpstreamEntries(
      upstreamEntries.map((e) =>
        e.interface === iface
          ? { ...e, addresses: [...e.addresses, addr], addressInput: "" }
          : e
      )
    );
    setError(null);
  };

  const handleRemoveUpstreamAddress = (iface: string, addr: string) => {
    setUpstreamEntries(
      upstreamEntries.map((e) =>
        e.interface === iface
          ? { ...e, addresses: e.addresses.filter((a) => a !== addr) }
          : e
      )
    );
  };

  // ---- Validation ----

  const validate = (): string | null => {
    if (upstreamEntries.length === 0) {
      return "At least one upstream interface is required to forward DHCPv6 requests";
    }
    if (maxHopCount !== "") {
      const n = parseInt(maxHopCount, 10);
      if (isNaN(n) || n < 1 || n > 255) {
        return "Max hop count must be an integer between 1 and 255";
      }
    }
    for (const entry of listenEntries) {
      if (entry.address && !isValidIPv6(entry.address)) {
        return `Listen interface ${entry.interface}: "${entry.address}" is not a valid IPv6 address`;
      }
    }
    for (const entry of upstreamEntries) {
      for (const addr of entry.addresses) {
        if (!isValidIPv6(addr)) {
          return `Upstream interface ${entry.interface}: "${addr}" is not a valid IPv6 address`;
        }
      }
    }
    return null;
  };

  // ---- Submit ----

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const payload: DHCPv6RelayConfig = {
      disabled,
      max_hop_count: maxHopCount !== "" ? parseInt(maxHopCount, 10) : null,
      use_interface_id_option: useInterfaceIdOption,
      listen_interfaces: listenEntries.map((e) => ({
        interface: e.interface,
        address: e.address || null,
      })),
      upstream_interfaces: upstreamEntries.map((e) => ({
        interface: e.interface,
        addresses: e.addresses,
      })),
    };

    const result = await dhcpv6RelayService.configure(payload);
    if (!result.success) {
      setError(result.error ?? "Configuration failed");
      setLoading(false);
      return;
    }

    onSuccess();
    handleClose();
  };

  // ---- Interface dropdown helpers ----

  const usedListenIfaces = listenEntries.map((e) => e.interface);
  const usedUpstreamIfaces = upstreamEntries.map((e) => e.interface);

  const availableForListen = availableInterfaces.filter(
    (i) => !usedListenIfaces.includes(i.name)
  );
  const availableForUpstream = availableInterfaces.filter(
    (i) => !usedUpstreamIfaces.includes(i.name)
  );

  const isEditing = config !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit DHCPv6 Relay Configuration" : "Configure DHCPv6 Relay"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the DHCPv6 relay service settings."
              : "Set up the DHCPv6 relay agent to forward client requests to a centralized server."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 pb-2">

            {/* ---- Service Control ---- */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="dhcpv6r-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <Label htmlFor="dhcpv6r-disabled" className="cursor-pointer">
                Disable DHCPv6 Relay service
              </Label>
            </div>

            <Separator />

            {/* ---- Listen Interfaces ---- */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">
                  Listen Interfaces
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Interfaces the relay agent listens on for client DHCPv6 requests. Optionally
                  specify the IPv6 source address to listen on for each interface.
                </p>
              </div>

              {listenEntries.length > 0 && (
                <div className="space-y-1.5">
                  {listenEntries.map((entry) => (
                    <div
                      key={entry.interface}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border"
                    >
                      <Badge variant="secondary" className="font-mono shrink-0">
                        {entry.interface}
                      </Badge>
                      {entry.address ? (
                        <>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="font-mono text-xs text-foreground flex-1 truncate">
                            {entry.address}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground flex-1">all addresses</span>
                      )}
                      <button
                        onClick={() => handleRemoveListenInterface(entry.interface)}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <InterfaceSelect
                  value={listenSelectedIface}
                  onValueChange={setListenSelectedIface}
                  interfaces={availableForListen}
                  placeholder="Select interface"
                />
                <Input
                  value={listenAddressInput}
                  onChange={(e) => setListenAddressInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddListenInterface(); } }}
                  placeholder="IPv6 address (optional)"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddListenInterface}
                  disabled={!listenSelectedIface}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* ---- Upstream Interfaces ---- */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Upstream Interfaces</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Interfaces used to forward DHCPv6 requests to the server. Add one or more
                  server IPv6 addresses per interface.
                </p>
              </div>

              {upstreamEntries.length > 0 && (
                <div className="space-y-2">
                  {upstreamEntries.map((entry) => (
                    <div
                      key={entry.interface}
                      className="rounded-md border border-border p-3 space-y-2 bg-muted/30"
                    >
                      {/* Interface header */}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-mono">{entry.interface}</Badge>
                        <button
                          onClick={() => handleRemoveUpstreamInterface(entry.interface)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Server addresses */}
                      {entry.addresses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.addresses.map((addr) => (
                            <Badge
                              key={addr}
                              variant="outline"
                              className="font-mono text-xs gap-1 pr-1"
                            >
                              {addr}
                              <button
                                onClick={() => handleRemoveUpstreamAddress(entry.interface, addr)}
                                className="ml-1 hover:text-destructive transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Add address row */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={entry.addressInput}
                          onChange={(e) =>
                            handleUpstreamAddressInputChange(entry.interface, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddUpstreamAddress(entry.interface);
                            }
                          }}
                          placeholder="Server IPv6 address"
                          className="font-mono text-sm h-8"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleAddUpstreamAddress(entry.interface)}
                          disabled={!entry.addressInput.trim()}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add upstream interface */}
              <div className="flex items-center gap-2">
                <InterfaceSelect
                  value={upstreamSelectedIface}
                  onValueChange={setUpstreamSelectedIface}
                  interfaces={availableForUpstream}
                  className="flex-1"
                  placeholder="Select upstream interface to add"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddUpstreamInterface}
                  disabled={!upstreamSelectedIface}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* ---- Global Options ---- */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Global Options</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Advanced tuning — leave blank to use defaults.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dhcpv6r-hop-count">Max Hop Count</Label>
                <Input
                  id="dhcpv6r-hop-count"
                  type="number"
                  value={maxHopCount}
                  onChange={(e) => setMaxHopCount(e.target.value)}
                  min={1}
                  max={255}
                  placeholder="10 (default)"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Discard relay packets that have reached this hop count (1–255).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="dhcpv6r-interface-id"
                  checked={useInterfaceIdOption}
                  onCheckedChange={(checked) => setUseInterfaceIdOption(checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="dhcpv6r-interface-id" className="cursor-pointer font-normal">
                    Use Interface-ID Option
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add an interface-ID option to relayed packets identifying the interface
                    on which the client request was received.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
