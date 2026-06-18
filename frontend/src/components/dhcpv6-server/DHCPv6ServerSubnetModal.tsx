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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import {
  dhcpv6ServerService,
  DHCPv6Subnet,
  DHCPv6SharedNetwork,
  DHCPv6ServerCapabilities,
} from "@/lib/api/dhcpv6-server";

interface Props {
  open: boolean;
  networks: DHCPv6SharedNetwork[];
  preselectedNetName: string | null;
  subnet: DHCPv6Subnet | null;
  caps: DHCPv6ServerCapabilities;
  onClose: () => void;
  onSuccess: (netName: string) => void;
}

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
            <div key={item} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-sm font-mono">
              <span>{item}</span>
              <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => onRemove(item)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DHCPv6ServerSubnetModal({
  open,
  networks,
  preselectedNetName,
  subnet,
  caps,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = subnet !== null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("basic");

  // Network selector (create only)
  const [selectedNet, setSelectedNet] = useState("");

  // Basic
  const [subnetCidr, setSubnetCidr] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [leaseDefault, setLeaseDefault] = useState("");
  const [leaseMinimum, setLeaseMinimum] = useState("");
  const [leaseMaximum, setLeaseMaximum] = useState("");

  // Options
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [nsInput, setNsInput] = useState("");
  const [domainSearch, setDomainSearch] = useState<string[]>([]);
  const [dsInput, setDsInput] = useState("");
  const [infoRefreshTime, setInfoRefreshTime] = useState("");
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
  const [ciscoInput, setCiscoInput] = useState("");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed form state when the modal opens
    setError(null);
    setTab("basic");

    setSelectedNet(preselectedNetName ?? (networks[0]?.name ?? ""));

    if (subnet) {
      setSubnetCidr(subnet.subnet);
      setDisabled(subnet.disabled);
      setLeaseDefault(subnet.lease_default != null ? String(subnet.lease_default) : "");
      setLeaseMinimum(subnet.lease_minimum != null ? String(subnet.lease_minimum) : "");
      setLeaseMaximum(subnet.lease_maximum != null ? String(subnet.lease_maximum) : "");
      setNameServers([...subnet.options.name_servers]);
      setDomainSearch([...subnet.options.domain_search]);
      setInfoRefreshTime(subnet.options.info_refresh_time != null ? String(subnet.options.info_refresh_time) : "");
      setNisDomain(subnet.options.nis_domain ?? "");
      setNisplusDomain(subnet.options.nisplus_domain ?? "");
      setNisServers([...subnet.options.nis_servers]);
      setNisplusServers([...subnet.options.nisplus_servers]);
      setSipServers([...subnet.options.sip_servers]);
      setSntpServers([...subnet.options.sntp_servers]);
      setCiscoTftpServers([...subnet.options.cisco_tftp_servers]);
    } else {
      setSubnetCidr("");
      setDisabled(false);
      setLeaseDefault("");
      setLeaseMinimum("");
      setLeaseMaximum("");
      setNameServers([]);
      setDomainSearch([]);
      setInfoRefreshTime("");
      setNisDomain("");
      setNisplusDomain("");
      setNisServers([]);
      setNisplusServers([]);
      setSipServers([]);
      setSntpServers([]);
      setCiscoTftpServers([]);
    }
    setNsInput(""); setDsInput(""); setNisInput(""); setNisplusInput("");
    setSipInput(""); setSntpInput(""); setCiscoInput("");
  }, [open, subnet, preselectedNetName, networks]);

  function addToList(
    input: string,
    list: string[],
    setter: (v: string[]) => void,
    inputSetter: (v: string) => void
  ) {
    const v = input.trim();
    if (v && !list.includes(v)) setter([...list, v]);
    inputSetter("");
  }

  function removeFromList(item: string, list: string[], setter: (v: string[]) => void) {
    setter(list.filter((x) => x !== item));
  }

  async function handleSubmit() {
    const netName = isEditing ? (preselectedNetName ?? selectedNet) : selectedNet;
    if (!netName) { setError("Select a network"); return; }
    if (!subnetCidr.trim()) { setError("Subnet CIDR is required"); return; }

    setLoading(true);
    setError(null);

    let computedSubnetId: number | null = null;
    if (caps.features.subnet_id.supported) {
      if (isEditing) {
        computedSubnetId = subnet!.subnet_id;
      } else {
        const existingSubnets = networks.find(n => n.name === netName)?.subnets ?? [];
        const usedIds = new Set(existingSubnets.map(s => s.subnet_id).filter((id): id is number => id !== null));
        let id = 1;
        while (usedIds.has(id)) id++;
        computedSubnetId = id;
      }
    }

    const updated: DHCPv6Subnet = {
      subnet: subnetCidr.trim(),
      disabled,
      subnet_id: computedSubnetId,
      lease_default: leaseDefault.trim() !== "" ? parseInt(leaseDefault.trim(), 10) : null,
      lease_minimum: leaseMinimum.trim() !== "" ? parseInt(leaseMinimum.trim(), 10) : null,
      lease_maximum: leaseMaximum.trim() !== "" ? parseInt(leaseMaximum.trim(), 10) : null,
      options: {
        name_servers: nameServers,
        domain_search: domainSearch,
        info_refresh_time: infoRefreshTime.trim() !== "" ? parseInt(infoRefreshTime.trim(), 10) : null,
        nis_domain: nisDomain.trim() || null,
        nisplus_domain: nisplusDomain.trim() || null,
        nis_servers: nisServers,
        nisplus_servers: nisplusServers,
        sip_servers: sipServers,
        sntp_servers: sntpServers,
        cisco_tftp_servers: ciscoTftpServers,
      },
      address_ranges: subnet?.address_ranges ?? [],
      prefix_delegations: subnet?.prefix_delegations ?? [],
      static_mappings: subnet?.static_mappings ?? [],
    };

    const result = await dhcpv6ServerService.saveSubnet(netName, subnet, updated);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Operation failed");
      return;
    }
    onSuccess(netName);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Subnet" : "Add Subnet"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
            <TabsTrigger value="options" className="flex-1">Options</TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[55vh] pr-2">
            <TabsContent value="basic" className="space-y-4 mt-3">
              {/* Network selector (create only) */}
              {!isEditing && (
                <div className="space-y-1.5">
                  <Label>Shared Network</Label>
                  <Select value={selectedNet} onValueChange={setSelectedNet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((n) => (
                        <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="subnet-cidr">Subnet CIDR</Label>
                <Input
                  id="subnet-cidr"
                  placeholder="2001:db8::/48"
                  value={subnetCidr}
                  onChange={(e) => setSubnetCidr(e.target.value)}
                  disabled={isEditing}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="subnet-disabled"
                  checked={disabled}
                  onCheckedChange={(v) => setDisabled(Boolean(v))}
                />
                <Label htmlFor="subnet-disabled" className="cursor-pointer">Disable this subnet</Label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lease-default">Default Lease (s)</Label>
                  <Input
                    id="lease-default"
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
            </TabsContent>

            <TabsContent value="options" className="space-y-4 mt-3">
              <ListField
                label="Name Servers"
                placeholder="2001:db8::1"
                list={nameServers}
                input={nsInput}
                setInput={setNsInput}
                onAdd={() => addToList(nsInput, nameServers, setNameServers, setNsInput)}
                onRemove={(item) => removeFromList(item, nameServers, setNameServers)}
              />
              <ListField
                label="Domain Search"
                placeholder="example.com"
                list={domainSearch}
                input={dsInput}
                setInput={setDsInput}
                onAdd={() => addToList(dsInput, domainSearch, setDomainSearch, setDsInput)}
                onRemove={(item) => removeFromList(item, domainSearch, setDomainSearch)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="opt-irt">Info Refresh Time (seconds)</Label>
                <Input
                  id="opt-irt"
                  type="number"
                  min={0}
                  placeholder="Optional"
                  value={infoRefreshTime}
                  onChange={(e) => setInfoRefreshTime(e.target.value)}
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
                onAdd={() => addToList(nisInput, nisServers, setNisServers, setNisInput)}
                onRemove={(item) => removeFromList(item, nisServers, setNisServers)}
              />
              <ListField
                label="NIS+ Servers"
                placeholder="2001:db8::1"
                list={nisplusServers}
                input={nisplusInput}
                setInput={setNisplusInput}
                onAdd={() => addToList(nisplusInput, nisplusServers, setNisplusServers, setNisplusInput)}
                onRemove={(item) => removeFromList(item, nisplusServers, setNisplusServers)}
              />
              <ListField
                label="SIP Servers"
                placeholder="2001:db8::1 or sip.example.com"
                list={sipServers}
                input={sipInput}
                setInput={setSipInput}
                onAdd={() => addToList(sipInput, sipServers, setSipServers, setSipInput)}
                onRemove={(item) => removeFromList(item, sipServers, setSipServers)}
              />
              <ListField
                label="SNTP Servers"
                placeholder="2001:db8::1"
                list={sntpServers}
                input={sntpInput}
                setInput={setSntpInput}
                onAdd={() => addToList(sntpInput, sntpServers, setSntpServers, setSntpInput)}
                onRemove={(item) => removeFromList(item, sntpServers, setSntpServers)}
              />
              <ListField
                label="Cisco TFTP Servers"
                placeholder="2001:db8::1"
                list={ciscoTftpServers}
                input={ciscoInput}
                setInput={setCiscoInput}
                onAdd={() => addToList(ciscoInput, ciscoTftpServers, setCiscoTftpServers, setCiscoInput)}
                onRemove={(item) => removeFromList(item, ciscoTftpServers, setCiscoTftpServers)}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 mx-1">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Save" : "Add Subnet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
