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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { dhcpRelayService, DHCPRelayConfig } from "@/lib/api/dhcp-relay";
import { showService, InterfaceName } from "@/lib/api/show";

interface DHCPRelayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: DHCPRelayConfig | null;
}

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIPv4(value: string): boolean {
  if (!IPV4_REGEX.test(value)) return false;
  return value.split(".").every((octet) => parseInt(octet, 10) <= 255);
}

const RELAY_AGENTS_POLICIES = [
  { value: "append", label: "Append", description: "Append own relay options to packet" },
  { value: "replace", label: "Replace", description: "Replace existing agent option field" },
  { value: "forward", label: "Forward", description: "Forward packet unchanged" },
  { value: "discard", label: "Discard", description: "Discard packet" },
];

export function DHCPRelayModal({ open, onClose, onSuccess, config }: DHCPRelayModalProps) {
  const [servers, setServers] = useState<string[]>([]);
  const [serverInput, setServerInput] = useState("");

  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState("");

  const [listenInterfaces, setListenInterfaces] = useState<string[]>([]);
  const [selectedListenInterface, setSelectedListenInterface] = useState("");

  const [upstreamInterfaces, setUpstreamInterfaces] = useState<string[]>([]);
  const [selectedUpstreamInterface, setSelectedUpstreamInterface] = useState("");

  const [hopCount, setHopCount] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [relayAgentsPackets, setRelayAgentsPackets] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (config) {
        setServers([...config.servers]);
        setInterfaces([...config.interfaces]);
        setListenInterfaces([...config.listen_interfaces]);
        setUpstreamInterfaces([...config.upstream_interfaces]);
        setHopCount(config.relay_options.hop_count != null ? String(config.relay_options.hop_count) : "");
        setMaxSize(config.relay_options.max_size != null ? String(config.relay_options.max_size) : "");
        setRelayAgentsPackets(config.relay_options.relay_agents_packets ?? "");
        setDisabled(config.disabled);
      } else {
        resetForm();
      }
      setServerInput("");
      setSelectedInterface("");
      setSelectedListenInterface("");
      setSelectedUpstreamInterface("");
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
      // non-critical — user can still type interface names via text input
    } finally {
      setInterfacesLoading(false);
    }
  };

  const resetForm = () => {
    setServers([]);
    setServerInput("");
    setInterfaces([]);
    setSelectedInterface("");
    setListenInterfaces([]);
    setSelectedListenInterface("");
    setUpstreamInterfaces([]);
    setSelectedUpstreamInterface("");
    setHopCount("");
    setMaxSize("");
    setRelayAgentsPackets("");
    setDisabled(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ---- Servers ----

  const handleAddServer = () => {
    const trimmed = serverInput.trim();
    if (!trimmed) return;
    if (!isValidIPv4(trimmed)) {
      setError("Server address must be a valid IPv4 address (e.g. 10.0.0.1)");
      return;
    }
    if (servers.includes(trimmed)) {
      setError("That server address is already in the list");
      return;
    }
    setServers([...servers, trimmed]);
    setServerInput("");
    setError(null);
  };

  const handleServerInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddServer();
    }
  };

  const handleRemoveServer = (server: string) => {
    setServers(servers.filter((s) => s !== server));
  };

  // ---- Generic interface add/remove helpers ----

  const makeAddHandler = (
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    selected: string,
    clearSelected: () => void
  ) => () => {
    if (!selected || current.includes(selected)) return;
    setter([...current, selected]);
    clearSelected();
  };

  const makeRemoveHandler = (
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => (iface: string) => {
    setter((prev) => prev.filter((i) => i !== iface));
  };

  const removeInterface = makeRemoveHandler(setInterfaces);
  const removeListenInterface = makeRemoveHandler(setListenInterfaces);
  const removeUpstreamInterface = makeRemoveHandler(setUpstreamInterfaces);

  const addInterface = makeAddHandler(interfaces, setInterfaces, selectedInterface, () => setSelectedInterface(""));
  const addListenInterface = makeAddHandler(listenInterfaces, setListenInterfaces, selectedListenInterface, () => setSelectedListenInterface(""));
  const addUpstreamInterface = makeAddHandler(upstreamInterfaces, setUpstreamInterfaces, selectedUpstreamInterface, () => setSelectedUpstreamInterface(""));

  // ---- Validation ----

  const validate = (): string | null => {
    if (servers.length === 0) {
      return "At least one DHCP server address is required";
    }
    if (hopCount !== "") {
      const n = parseInt(hopCount, 10);
      if (isNaN(n) || n < 1 || n > 255) {
        return "Hop count must be an integer between 1 and 255";
      }
    }
    if (maxSize !== "") {
      const n = parseInt(maxSize, 10);
      if (isNaN(n) || n < 64 || n > 1400) {
        return "Max packet size must be an integer between 64 and 1400";
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

    const payload: DHCPRelayConfig = {
      disabled,
      servers,
      interfaces,
      listen_interfaces: listenInterfaces,
      upstream_interfaces: upstreamInterfaces,
      relay_options: {
        hop_count: hopCount !== "" ? parseInt(hopCount, 10) : null,
        max_size: maxSize !== "" ? parseInt(maxSize, 10) : null,
        relay_agents_packets: relayAgentsPackets || null,
      },
    };

    const result = await dhcpRelayService.configure(payload);
    if (!result.success) {
      setError(result.error ?? "Configuration failed");
      setLoading(false);
      return;
    }

    onSuccess();
    handleClose();
  };

  // ---- Interface dropdown helpers ----

  const interfacesNotIn = (excluded: string[]) =>
    availableInterfaces.filter((i) => !excluded.includes(i.name));

  const availableForBroadcast = interfacesNotIn(interfaces);
  const availableForListen = interfacesNotIn(listenInterfaces);
  const availableForUpstream = interfacesNotIn(upstreamInterfaces);

  const isEditing = config !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit DHCP Relay Configuration" : "Configure DHCP Relay"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the DHCP relay service settings."
              : "Set up the DHCP relay agent to forward client requests to a centralized server."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">

            {/* ---- Service Control ---- */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="dhcpr-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <Label htmlFor="dhcpr-disabled" className="cursor-pointer">
                Disable DHCP Relay service
              </Label>
            </div>

            <Separator />

            {/* ---- DHCP Servers ---- */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">DHCP Servers</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  IPv4 addresses of the DHCP servers to relay requests to. At least one is required.
                </p>
              </div>

              {servers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {servers.map((server) => (
                    <Badge key={server} variant="secondary" className="font-mono gap-1 pr-1">
                      {server}
                      <button
                        onClick={() => handleRemoveServer(server)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={serverInput}
                  onChange={(e) => setServerInput(e.target.value)}
                  onKeyDown={handleServerInputKeyDown}
                  placeholder="e.g. 10.0.0.1"
                  className="font-mono flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddServer}
                  disabled={!serverInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* ---- Listen Interfaces ---- */}
            <InterfaceSection
              label="Listen Interfaces"
              description="Interfaces the relay agent listens on for client DHCP requests."
              items={listenInterfaces}
              onRemove={removeListenInterface}
              selected={selectedListenInterface}
              onSelectedChange={setSelectedListenInterface}
              available={availableForListen}
              onAdd={addListenInterface}
              loading={interfacesLoading}
            />

            <Separator />

            {/* ---- Upstream Interfaces ---- */}
            <InterfaceSection
              label="Upstream Interfaces"
              description="Interfaces used to forward DHCP requests to the server."
              items={upstreamInterfaces}
              onRemove={removeUpstreamInterface}
              selected={selectedUpstreamInterface}
              onSelectedChange={setSelectedUpstreamInterface}
              available={availableForUpstream}
              onAdd={addUpstreamInterface}
              loading={interfacesLoading}
            />

            <Separator />

            {/* ---- Broadcast Interfaces (optional) ---- */}
            <InterfaceSection
              label="Broadcast Interfaces"
              description="Optional — combined listen/upstream interface for broadcast environments."
              items={interfaces}
              onRemove={removeInterface}
              selected={selectedInterface}
              onSelectedChange={setSelectedInterface}
              available={availableForBroadcast}
              onAdd={addInterface}
              loading={interfacesLoading}
              optional
            />

            <Separator />

            {/* ---- Relay Options ---- */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Relay Options</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Advanced tuning — leave blank to use VyOS defaults.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dhcpr-hop-count">Hop Count</Label>
                <Input
                  id="dhcpr-hop-count"
                  type="number"
                  value={hopCount}
                  onChange={(e) => setHopCount(e.target.value)}
                  min={1}
                  max={255}
                  placeholder="10 (default)"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Discard packets that have reached this hop count (1–255).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dhcpr-max-size">Max Packet Size</Label>
                <Input
                  id="dhcpr-max-size"
                  type="number"
                  value={maxSize}
                  onChange={(e) => setMaxSize(e.target.value)}
                  min={64}
                  max={1400}
                  placeholder="576 (default)"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum packet size sent to the DHCP server in bytes (64–1400).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dhcpr-relay-agents-policy">Relay Agents Policy</Label>
                <Select value={relayAgentsPackets} onValueChange={setRelayAgentsPackets}>
                  <SelectTrigger id="dhcpr-relay-agents-policy">
                    <SelectValue placeholder="forward (default)" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELAY_AGENTS_POLICIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="font-mono">{p.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">— {p.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How to handle incoming packets that already contain relay agent options.
                </p>
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

// ---- Reusable interface section sub-component ----

interface InterfaceSectionProps {
  label: string;
  description: string;
  items: string[];
  onRemove: (iface: string) => void;
  selected: string;
  onSelectedChange: (value: string) => void;
  available: InterfaceName[];
  onAdd: () => void;
  loading: boolean;
  optional?: boolean;
}

function InterfaceSection({
  label,
  description,
  items,
  onRemove,
  selected,
  onSelectedChange,
  available,
  onAdd,
  loading,
  optional = false,
}: InterfaceSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">
          {label}
          {optional && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>
          )}
        </Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((iface) => (
            <Badge key={iface} variant="secondary" className="font-mono gap-1 pr-1">
              {iface}
              <button
                onClick={() => onRemove(iface)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select value={selected} onValueChange={onSelectedChange}>
          <SelectTrigger className="flex-1">
            <SelectValue
              placeholder={
                loading
                  ? "Loading interfaces..."
                  : available.length === 0
                  ? "No additional interfaces available"
                  : "Select interface to add"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {available.map((iface) => (
              <SelectItem key={iface.name} value={iface.name}>
                <span className="font-mono">{iface.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">({iface.type})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onAdd}
          disabled={!selected}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
