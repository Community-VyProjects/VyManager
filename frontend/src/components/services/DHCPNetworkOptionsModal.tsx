"use client";

import { useEffect, useState } from "react";
import { Network, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  dhcpService,
  type DHCPBatchOperation,
  type DHCPCapabilitiesResponse,
  type DHCPSharedNetwork,
} from "@/lib/api/dhcp";
import { DhcpCatalogFields } from "./DhcpCatalogFields";
import { catalogDraftFrom, catalogOps, type CatalogDraft } from "./dhcp-catalog";

const NO_LEAVES: never[] = [];

interface DHCPNetworkOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
  capabilities: DHCPCapabilitiesResponse | null;
}

export function DHCPNetworkOptionsModal({
  open,
  onOpenChange,
  onSuccess,
  network,
  capabilities,
}: DHCPNetworkOptionsModalProps) {
  const leaves = capabilities?.catalog?.shared_network ?? NO_LEAVES;
  const [description, setDescription] = useState("");
  const [authoritative, setAuthoritative] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [pingCheck, setPingCheck] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [domainSearch, setDomainSearch] = useState<string[]>([]);
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>({});
  const [catalogOriginal, setCatalogOriginal] = useState<CatalogDraft>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDescription(network.description ?? "");
    setAuthoritative(network.authoritative);
    setDisabled(network.disable ?? false);
    setPingCheck(network.ping_check);
    setDomainName(network.domain_name ?? "");
    setNameServers([...(network.name_servers ?? [])]);
    setDomainSearch([...(network.domain_search ?? [])]);
    const loaded = catalogDraftFrom(leaves, network.catalog);
    setCatalogDraft(loaded);
    setCatalogOriginal(loaded);
    setError(null);
  }, [open, network, leaves]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const operations: DHCPBatchOperation[] = [];
    if ((network.description ?? "") !== description.trim()) {
      operations.push(
        description.trim()
          ? { op: "set_shared_network_description", value: description.trim() }
          : { op: "delete_shared_network_description" },
      );
    }
    if (network.authoritative !== authoritative) {
      operations.push({
        op: authoritative
          ? "set_shared_network_authoritative"
          : "delete_shared_network_authoritative",
      });
    }
    if ((network.disable ?? false) !== disabled) {
      operations.push({
        op: disabled ? "set_shared_network_disable" : "delete_shared_network_disable",
      });
    }
    if (network.ping_check !== pingCheck) {
      operations.push({
        op: pingCheck ? "set_shared_network_ping_check" : "delete_shared_network_ping_check",
      });
    }
    if ((network.domain_name ?? "") !== domainName.trim()) {
      operations.push(
        domainName.trim()
          ? { op: "set_shared_network_domain_name", value: domainName.trim() }
          : { op: "delete_shared_network_domain_name" },
      );
    }
    const nextServers = nameServers.map((item) => item.trim()).filter(Boolean);
    const prevServers = network.name_servers ?? [];
    for (const server of prevServers) {
      if (!nextServers.includes(server)) {
        operations.push({ op: "delete_shared_network_name_server", value: server });
      }
    }
    for (const server of nextServers) {
      if (!prevServers.includes(server)) {
        operations.push({ op: "set_shared_network_name_server", value: server });
      }
    }
    const nextSearch = domainSearch.map((item) => item.trim()).filter(Boolean);
    const prevSearch = network.domain_search ?? [];
    for (const domain of prevSearch) {
      if (!nextSearch.includes(domain)) {
        operations.push({ op: "delete_shared_network_domain_search", value: domain });
      }
    }
    for (const domain of nextSearch) {
      if (!prevSearch.includes(domain)) {
        operations.push({ op: "set_shared_network_domain_search", value: domain });
      }
    }
    operations.push(
      ...catalogOps(
        "set_network_catalog",
        "delete_network_catalog",
        leaves,
        catalogOriginal,
        catalogDraft,
      ),
    );
    if (operations.length === 0) {
      onOpenChange(false);
      setLoading(false);
      return;
    }
    try {
      const result = await dhcpService.batchConfigure({
        network_name: network.name,
        operations,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to save network options");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save network options");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            {network.name} options
          </DialogTitle>
          <DialogDescription>
            Shared-network settings inherited by subnets that do not set their own
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="net-description">Description</Label>
              <Input
                id="net-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="net-authoritative"
                checked={authoritative}
                onCheckedChange={(value) => setAuthoritative(value === true)}
              />
              <Label htmlFor="net-authoritative">Authoritative</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="net-disable"
                checked={disabled}
                onCheckedChange={(value) => setDisabled(value === true)}
              />
              <Label htmlFor="net-disable">Disable this network</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="net-ping"
                checked={pingCheck}
                onCheckedChange={(value) => setPingCheck(value === true)}
              />
              <Label htmlFor="net-ping">Ping check</Label>
            </div>
            <div>
              <Label htmlFor="net-domain">Domain name</Label>
              <Input
                id="net-domain"
                value={domainName}
                onChange={(event) => setDomainName(event.target.value)}
              />
            </div>
            <StringList
              label="Name servers"
              values={nameServers}
              onChange={setNameServers}
            />
            <StringList
              label="Domain search"
              values={domainSearch}
              onChange={setDomainSearch}
            />
            <DhcpCatalogFields
              leaves={leaves}
              values={catalogDraft}
              onChange={(token, value) =>
                setCatalogDraft((current) => ({ ...current, [token]: value }))
              }
              idPrefix="net-dhcp"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StringList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const rows = values.length === 0 ? [""] : values;
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2 mt-2">
        {rows.map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={value}
              onChange={(event) => {
                const next = [...rows];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onChange(rows.filter((_, item) => item !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, ""])}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
    </div>
  );
}
