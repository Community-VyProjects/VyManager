"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import {
  dhcpv6ServerService,
  DHCPv6SharedNetwork,
  DHCPv6AddressRange,
  DHCPv6ServerCapabilities,
} from "@/lib/api/dhcpv6-server";

interface ListFieldProps {
  label: string;
  placeholder: string;
  list: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
}

function ListField({ label, placeholder, list, input, setInput, onAdd, onRemove }: ListFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
        />
        <Button type="button" variant="outline" size="icon" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {list.length > 0 && (
        <div className="space-y-1 mt-1">
          {list.map((item) => (
            <div
              key={item}
              className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-sm font-mono"
            >
              <span>{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onRemove(item)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  network: DHCPv6SharedNetwork | null;
  caps: DHCPv6ServerCapabilities;
  onClose: () => void;
  onSuccess: (name: string) => void;
}

type Tab = "network" | "subnet" | "ranges" | "net-options";

export function DHCPv6ServerNetworkModal({ open, network, caps, onClose, onSuccess }: Props) {
  const isEditing = network !== null;
  const is15 = caps.version_info.is_1_5;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("network");

  // ── Network fields ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [netDisabled, setNetDisabled] = useState(false);
  const [netNameServers, setNetNameServers] = useState<string[]>([]);
  const [netNsInput, setNetNsInput] = useState("");
  const [netDomainSearch, setNetDomainSearch] = useState<string[]>([]);
  const [netDsInput, setNetDsInput] = useState("");
  const [netInfoRefreshTime, setNetInfoRefreshTime] = useState("");

  // ── Subnet fields (create only) ──
  const [subnetCidr, setSubnetCidr] = useState("");
  const [subnetDisabled, setSubnetDisabled] = useState(false);
  const [leaseDefault, setLeaseDefault] = useState("");
  const [leaseMinimum, setLeaseMinimum] = useState("");
  const [leaseMaximum, setLeaseMaximum] = useState("");
  const [subNsServers, setSubNsServers] = useState<string[]>([]);
  const [subNsInput, setSubNsInput] = useState("");
  const [subDomainSearch, setSubDomainSearch] = useState<string[]>([]);
  const [subDsInput, setSubDsInput] = useState("");
  const [subInfoRefreshTime, setSubInfoRefreshTime] = useState("");
  const [nisDomain, setNisDomain] = useState("");
  const [nisplusDomain, setNisplusDomain] = useState("");
  const [nisServers, setNisServers] = useState<string[]>([]);
  const [nisInput, setNisInput] = useState("");
  const [nisplusServers, setNisplusServers] = useState<string[]>([]);
  const [nisplusInput, setNisplusInput] = useState("");
  const [sipServers, setSipServers] = useState<string[]>([]);
  const [sipInput, setSipInput] = useState("");
  const [sntpServers, setSntpServers] = useState<string[]>([]);
  const [sntpInput, setSntpInput] = useState("");
  const [ciscoTftpServers, setCiscoTftpServers] = useState<string[]>([]);
  const [ciscoTftpInput, setCiscoTftpInput] = useState("");

  // ── Address range fields (create only, 1.5) ──
  const [rangeStart, setRangeStart] = useState("");
  const [rangeStop, setRangeStop] = useState("");
  const [rangePrefix, setRangePrefix] = useState("");

  // ── Address range fields (create only, 1.4) ──
  const [range14Mode, setRange14Mode] = useState<"start-stop" | "prefix">("start-stop");
  const [range14Start, setRange14Start] = useState("");
  const [range14Stop, setRange14Stop] = useState("");
  const [range14Prefix, setRange14Prefix] = useState("");
  const [range14Temporary, setRange14Temporary] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setActiveTab("network");

    setSubnetCidr(""); setSubnetDisabled(false);
    setLeaseDefault(""); setLeaseMinimum(""); setLeaseMaximum("");
    setSubNsServers([]); setSubNsInput("");
    setSubDomainSearch([]); setSubDsInput("");
    setSubInfoRefreshTime("");
    setNisDomain(""); setNisplusDomain("");
    setNisServers([]); setNisInput("");
    setNisplusServers([]); setNisplusInput("");
    setSipServers([]); setSipInput("");
    setSntpServers([]); setSntpInput("");
    setCiscoTftpServers([]); setCiscoTftpInput("");
    setRangeStart(""); setRangeStop(""); setRangePrefix("");
    setRange14Mode("start-stop");
    setRange14Start(""); setRange14Stop(""); setRange14Prefix("");
    setRange14Temporary(false);
    setNetNsInput(""); setNetDsInput("");

    if (network) {
      setName(network.name);
      setDescription(network.description ?? "");
      setNetDisabled(network.disabled);
      setNetNameServers([...network.name_servers]);
      setNetDomainSearch([...network.domain_search]);
      setNetInfoRefreshTime(network.info_refresh_time != null ? String(network.info_refresh_time) : "");
    } else {
      setName(""); setDescription(""); setNetDisabled(false);
      setNetNameServers([]); setNetDomainSearch([]); setNetInfoRefreshTime("");
    }
  }, [open, network]);

  function addToList(list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) {
    const v = value.trim();
    if (v && !list.includes(v)) setList([...list, v]);
    setInput("");
  }

  function removeFromList(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.filter((x) => x !== item));
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Network name is required"); setActiveTab("network"); return; }
    if (!isEditing && !subnetCidr.trim()) { setError("Subnet CIDR is required"); setActiveTab("subnet"); return; }

    setLoading(true);
    setError(null);

    const netIrt = netInfoRefreshTime.trim() !== "" ? parseInt(netInfoRefreshTime.trim(), 10) : null;
    const updatedNetwork: DHCPv6SharedNetwork = {
      name: name.trim(),
      description: description.trim() || null,
      disabled: netDisabled,
      name_servers: netNameServers,
      domain_search: netDomainSearch,
      info_refresh_time: netIrt,
      subnets: network?.subnets ?? [],
    };

    if (isEditing) {
      const result = await dhcpv6ServerService.saveSharedNetwork(network, updatedNetwork);
      setLoading(false);
      if (!result.success) { setError(result.error ?? "Failed to save network"); return; }
    } else {
      const subIrt = subInfoRefreshTime.trim() !== "" ? parseInt(subInfoRefreshTime.trim(), 10) : null;
      const subnet = {
        subnet: subnetCidr.trim(),
        disabled: subnetDisabled,
        subnet_id: caps.features.subnet_id.supported ? 1 : null,
        lease_default: leaseDefault.trim() !== "" ? parseInt(leaseDefault.trim(), 10) : null,
        lease_minimum: leaseMinimum.trim() !== "" ? parseInt(leaseMinimum.trim(), 10) : null,
        lease_maximum: leaseMaximum.trim() !== "" ? parseInt(leaseMaximum.trim(), 10) : null,
        options: {
          name_servers: subNsServers,
          domain_search: subDomainSearch,
          info_refresh_time: subIrt,
          nis_domain: nisDomain.trim() || null,
          nisplus_domain: nisplusDomain.trim() || null,
          nis_servers: nisServers,
          nisplus_servers: nisplusServers,
          sip_servers: sipServers,
          sntp_servers: sntpServers,
          cisco_tftp_servers: ciscoTftpServers,
        },
        address_ranges: [],
        prefix_delegations: [],
        static_mappings: [],
      };

      let rangeObj: DHCPv6AddressRange | undefined;
      const hasRange15 = is15 && (rangeStart.trim() || rangeStop.trim() || rangePrefix.trim());
      const hasRange14 = !is15 && (
        (range14Mode === "start-stop" && range14Start.trim() && range14Stop.trim()) ||
        (range14Mode === "prefix" && range14Prefix.trim())
      );
      if (hasRange15) {
        rangeObj = { range_id: "1", start: rangeStart.trim() || null, stop: rangeStop.trim() || null, prefix: rangePrefix.trim() || null, temporary: false };
      } else if (hasRange14) {
        if (range14Mode === "start-stop") {
          rangeObj = { range_id: `start_${range14Start.trim()}`, start: range14Start.trim(), stop: range14Stop.trim(), prefix: null, temporary: false };
        } else {
          rangeObj = { range_id: `prefix_${range14Prefix.trim()}`, start: null, stop: null, prefix: range14Prefix.trim(), temporary: range14Temporary };
        }
      }

      const result = await dhcpv6ServerService.createSharedNetworkWithSubnet(updatedNetwork, subnet, rangeObj, is15);
      setLoading(false);
      if (!result.success) { setError(result.error ?? "Failed to create network"); return; }
    }

    onSuccess(updatedNetwork.name);
    onClose();
  }

  const tabs: { id: Tab; label: string }[] = isEditing
    ? [{ id: "network", label: "Network" }, { id: "net-options", label: "Options" }]
    : [{ id: "network", label: "Network" }, { id: "subnet", label: "DHCP Options" }, { id: "ranges", label: "Ranges" }];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Shared Network" : "Add Shared Network"}</DialogTitle>
        </DialogHeader>

        <div className="flex border-b border-border -mx-1 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ScrollArea className="max-h-[55vh] pr-2">
          <div className="space-y-4 py-1">

            {/* ── Network tab ── */}
            {activeTab === "network" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="net-name">Network Name</Label>
                  <Input
                    id="net-name"
                    placeholder="my-network"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="net-desc">Description</Label>
                  <Input
                    id="net-desc"
                    placeholder="Optional description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="net-disabled"
                    checked={netDisabled}
                    onCheckedChange={(v) => setNetDisabled(Boolean(v))}
                  />
                  <Label htmlFor="net-disabled" className="cursor-pointer">Disable this network</Label>
                </div>

                {!isEditing && (
                  <>
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">First Subnet</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="sub-cidr">Subnet CIDR</Label>
                      <Input
                        id="sub-cidr"
                        placeholder="2001:db8::/64"
                        value={subnetCidr}
                        onChange={(e) => setSubnetCidr(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sub-disabled"
                        checked={subnetDisabled}
                        onCheckedChange={(v) => setSubnetDisabled(Boolean(v))}
                      />
                      <Label htmlFor="sub-disabled" className="cursor-pointer">Disable this subnet</Label>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="lease-def">Default Lease (s)</Label>
                        <Input
                          id="lease-def"
                          type="number"
                          min={0}
                          placeholder="Optional"
                          value={leaseDefault}
                          onChange={(e) => setLeaseDefault(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lease-min">Min Lease (s)</Label>
                        <Input
                          id="lease-min"
                          type="number"
                          min={0}
                          placeholder="Optional"
                          value={leaseMinimum}
                          onChange={(e) => setLeaseMinimum(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lease-max">Max Lease (s)</Label>
                        <Input
                          id="lease-max"
                          type="number"
                          min={0}
                          placeholder="Optional"
                          value={leaseMaximum}
                          onChange={(e) => setLeaseMaximum(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── Network Options tab (edit only) ── */}
            {activeTab === "net-options" && isEditing && (
              <>
                <ListField
                  label="Name Servers"
                  placeholder="2001:db8::1"
                  list={netNameServers}
                  input={netNsInput}
                  setInput={setNetNsInput}
                  onAdd={() => addToList(netNameServers, setNetNameServers, netNsInput, setNetNsInput)}
                  onRemove={(item) => removeFromList(netNameServers, setNetNameServers, item)}
                />
                <ListField
                  label="Domain Search"
                  placeholder="example.com"
                  list={netDomainSearch}
                  input={netDsInput}
                  setInput={setNetDsInput}
                  onAdd={() => addToList(netDomainSearch, setNetDomainSearch, netDsInput, setNetDsInput)}
                  onRemove={(item) => removeFromList(netDomainSearch, setNetDomainSearch, item)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="net-irt">Info Refresh Time (seconds)</Label>
                  <Input
                    id="net-irt"
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={netInfoRefreshTime}
                    onChange={(e) => setNetInfoRefreshTime(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── DHCP Options tab (create only) ── */}
            {activeTab === "subnet" && !isEditing && (
              <>
                <ListField
                  label="Name Servers"
                  placeholder="2001:db8::1"
                  list={subNsServers}
                  input={subNsInput}
                  setInput={setSubNsInput}
                  onAdd={() => addToList(subNsServers, setSubNsServers, subNsInput, setSubNsInput)}
                  onRemove={(item) => removeFromList(subNsServers, setSubNsServers, item)}
                />
                <ListField
                  label="Domain Search"
                  placeholder="example.com"
                  list={subDomainSearch}
                  input={subDsInput}
                  setInput={setSubDsInput}
                  onAdd={() => addToList(subDomainSearch, setSubDomainSearch, subDsInput, setSubDsInput)}
                  onRemove={(item) => removeFromList(subDomainSearch, setSubDomainSearch, item)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="sub-irt">Info Refresh Time (seconds)</Label>
                  <Input
                    id="sub-irt"
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={subInfoRefreshTime}
                    onChange={(e) => setSubInfoRefreshTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nis-domain">NIS Domain</Label>
                  <Input
                    id="nis-domain"
                    placeholder="Optional"
                    value={nisDomain}
                    onChange={(e) => setNisDomain(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nisplus-domain">NIS+ Domain</Label>
                  <Input
                    id="nisplus-domain"
                    placeholder="Optional"
                    value={nisplusDomain}
                    onChange={(e) => setNisplusDomain(e.target.value)}
                  />
                </div>
                <ListField
                  label="NIS Servers"
                  placeholder="2001:db8::1"
                  list={nisServers}
                  input={nisInput}
                  setInput={setNisInput}
                  onAdd={() => addToList(nisServers, setNisServers, nisInput, setNisInput)}
                  onRemove={(item) => removeFromList(nisServers, setNisServers, item)}
                />
                <ListField
                  label="NIS+ Servers"
                  placeholder="2001:db8::1"
                  list={nisplusServers}
                  input={nisplusInput}
                  setInput={setNisplusInput}
                  onAdd={() => addToList(nisplusServers, setNisplusServers, nisplusInput, setNisplusInput)}
                  onRemove={(item) => removeFromList(nisplusServers, setNisplusServers, item)}
                />
                <ListField
                  label="SIP Servers"
                  placeholder="2001:db8::1 or hostname"
                  list={sipServers}
                  input={sipInput}
                  setInput={setSipInput}
                  onAdd={() => addToList(sipServers, setSipServers, sipInput, setSipInput)}
                  onRemove={(item) => removeFromList(sipServers, setSipServers, item)}
                />
                <ListField
                  label="SNTP Servers"
                  placeholder="2001:db8::1"
                  list={sntpServers}
                  input={sntpInput}
                  setInput={setSntpInput}
                  onAdd={() => addToList(sntpServers, setSntpServers, sntpInput, setSntpInput)}
                  onRemove={(item) => removeFromList(sntpServers, setSntpServers, item)}
                />
                <ListField
                  label="Cisco TFTP Servers"
                  placeholder="2001:db8::1"
                  list={ciscoTftpServers}
                  input={ciscoTftpInput}
                  setInput={setCiscoTftpInput}
                  onAdd={() => addToList(ciscoTftpServers, setCiscoTftpServers, ciscoTftpInput, setCiscoTftpInput)}
                  onRemove={(item) => removeFromList(ciscoTftpServers, setCiscoTftpServers, item)}
                />
              </>
            )}

            {/* ── Ranges tab (create only) ── */}
            {activeTab === "ranges" && !isEditing && (
              <>
                <p className="text-xs text-muted-foreground">
                  Optional — you can add address ranges after creating the network.
                </p>

                {is15 ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="range-start">Start Address</Label>
                      <Input
                        id="range-start"
                        placeholder="2001:db8::1 (optional)"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="range-stop">Stop Address</Label>
                      <Input
                        id="range-stop"
                        placeholder="2001:db8::ff (optional)"
                        value={rangeStop}
                        onChange={(e) => setRangeStop(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="range-prefix">Prefix</Label>
                      <Input
                        id="range-prefix"
                        placeholder="2001:db8::/64 (optional)"
                        value={rangePrefix}
                        onChange={(e) => setRangePrefix(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${
                          range14Mode === "start-stop"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-muted-foreground"
                        }`}
                        onClick={() => setRange14Mode("start-stop")}
                      >
                        Start / Stop
                      </button>
                      <button
                        type="button"
                        className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${
                          range14Mode === "prefix"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-muted-foreground"
                        }`}
                        onClick={() => setRange14Mode("prefix")}
                      >
                        Prefix
                      </button>
                    </div>

                    {range14Mode === "start-stop" ? (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="r14-start">Start Address</Label>
                          <Input
                            id="r14-start"
                            placeholder="2001:db8::1"
                            value={range14Start}
                            onChange={(e) => setRange14Start(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="r14-stop">Stop Address</Label>
                          <Input
                            id="r14-stop"
                            placeholder="2001:db8::ff"
                            value={range14Stop}
                            onChange={(e) => setRange14Stop(e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="r14-prefix">Prefix</Label>
                          <Input
                            id="r14-prefix"
                            placeholder="2001:db8::/64"
                            value={range14Prefix}
                            onChange={(e) => setRange14Prefix(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="r14-temp"
                            checked={range14Temporary}
                            onCheckedChange={(v) => setRange14Temporary(Boolean(v))}
                          />
                          <Label htmlFor="r14-temp" className="cursor-pointer">Temporary addresses</Label>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Save" : "Create Network"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
