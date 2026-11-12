"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  dhcpServerService,
  type DHCPCapabilitiesResponse,
  type DHCPSharedNetwork,
} from "@/lib/api/dhcp-server";
import { DhcpCatalogFields } from "./DhcpCatalogFields";
import { catalogDraftFrom, catalogOps, type CatalogDraft } from "./dhcp-catalog";
import {
  networkSettingsDraft,
  networkSettingsOps,
  type NetworkSettingsDraft,
} from "./dhcp-network-settings";
import { failedSaveMessage } from "./dhcp-save";

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
  const t = useTranslations("dhcpServer");
  const tc = useTranslations("common");
  const leaves = capabilities?.catalog?.shared_network ?? NO_LEAVES;
  const [draft, setDraft] = useState<NetworkSettingsDraft>(() => networkSettingsDraft(network));
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>({});
  const [catalogOriginal, setCatalogOriginal] = useState<CatalogDraft>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(networkSettingsDraft(network));
    const loaded = catalogDraftFrom(leaves, network.catalog);
    setCatalogDraft(loaded);
    setCatalogOriginal(loaded);
    setError(null);
  }, [open, network, leaves]);

  const patch = (fields: Partial<NetworkSettingsDraft>) =>
    setDraft((current) => ({ ...current, ...fields }));

  const listField = (key: "nameServers" | "domainSearch") => ({
    add: () => patch({ [key]: [...draft[key], ""] }),
    update: (index: number, value: string) =>
      patch({ [key]: draft[key].map((item, i) => (i === index ? value : item)) }),
    remove: (index: number) => patch({ [key]: draft[key].filter((_, i) => i !== index) }),
  });
  const nameServers = listField("nameServers");
  const domainSearch = listField("domainSearch");

  const handleSubmit = async () => {
    const operations = [
      ...networkSettingsOps(network, draft),
      ...catalogOps(
        "set_network_catalog",
        "delete_network_catalog",
        leaves,
        catalogOriginal,
        catalogDraft,
      ),
    ];
    if (operations.length === 0) {
      onOpenChange(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await dhcpServerService.batchConfigure({
        network_name: network.name,
        operations,
      });
      const saveError = failedSaveMessage(result, t("networkOptions.saveFailed"));
      if (saveError) {
        setError(saveError);
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("networkOptions.saveFailed"));
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
            {t("networkOptions.title", { name: network.name })}
          </DialogTitle>
          <DialogDescription>
            {t("networkOptions.description")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="net-description">{tc("description")}</Label>
              <Input
                id="net-description"
                placeholder={tc("optionalDescription")}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="net-authoritative"
                checked={draft.authoritative}
                onCheckedChange={(checked) => patch({ authoritative: checked === true })}
              />
              <Label htmlFor="net-authoritative" className="cursor-pointer">
                {t("page.authoritative")}
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="net-ping-check"
                checked={draft.pingCheck}
                onCheckedChange={(checked) => patch({ pingCheck: checked === true })}
              />
              <Label htmlFor="net-ping-check" className="cursor-pointer">
                {t("subnetForm.pingCheck")}
              </Label>
            </div>

            <div>
              <Label>{t("subnetForm.nameServers")}</Label>
              <div className="space-y-2 mt-2">
                {draft.nameServers.map((ns, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={ns}
                      onChange={(e) => nameServers.update(index, e.target.value)}
                      placeholder={t("examplePlaceholder", { example: "192.0.2.53" })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => nameServers.remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={nameServers.add}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("subnetForm.addNameServer")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="net-domain-name">{t("subnetForm.domainName")}</Label>
              <Input
                id="net-domain-name"
                value={draft.domainName}
                onChange={(e) => patch({ domainName: e.target.value })}
                placeholder={t("examplePlaceholder", { example: "example.com" })}
              />
            </div>

            <div>
              <Label>{t("subnetForm.domainSearchList")}</Label>
              <div className="space-y-2 mt-2">
                {draft.domainSearch.map((ds, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={ds}
                      onChange={(e) => domainSearch.update(index, e.target.value)}
                      placeholder={t("examplePlaceholder", { example: "example.com" })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => domainSearch.remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={domainSearch.add}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("subnetForm.addDomainSearch")}
                </Button>
              </div>
            </div>

            {leaves.length > 0 && (
              <DhcpCatalogFields
                leaves={leaves}
                values={catalogDraft}
                onChange={(token, value) =>
                  setCatalogDraft((current) => ({ ...current, [token]: value }))
                }
                idPrefix="net-dhcp"
              />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
