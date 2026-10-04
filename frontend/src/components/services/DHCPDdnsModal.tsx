"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, X } from "lucide-react";
import {
  dhcpService,
  type DHCPCapabilitiesResponse,
  type DHCPDdnsConfig,
  type DHCPDdnsDomain,
  type DHCPDdnsTsigKey,
} from "@/lib/api/dhcp";

interface DHCPDdnsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ddns: DHCPDdnsConfig;
  capabilities: DHCPCapabilitiesResponse | null;
}

const emptyDdns = (): DHCPDdnsConfig => ({
  present: false,
  send_updates: "",
  conflict_resolution: "",
  override_client_update: "",
  override_no_update: "",
  update_on_renew: "",
  replace_client_name: "",
  ttl_percent: "",
  generated_prefix: "",
  qualifying_suffix: "",
  hostname_char_replacement: "",
  hostname_char_set: "",
  tsig_keys: [],
  forward_domains: [],
  reverse_domains: [],
});

const ALGOS = ["md5", "sha1", "sha224", "sha256", "sha384", "sha512"];
const ENABLE_DISABLE = ["enable", "disable"];
const REPLACE_CLIENT_NAME = ["never", "always", "when-present", "when-not-present"];

export function DHCPDdnsModal({
  open,
  onOpenChange,
  onSuccess,
  ddns,
  capabilities,
}: DHCPDdnsModalProps) {
  const t = useTranslations("dhcpServer");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DHCPDdnsConfig>(emptyDdns());
  const leaf = capabilities?.fields.dynamic_dns_update_leaf?.supported ?? false;
  const kea = capabilities?.fields.dynamic_dns_update_kea?.supported ?? false;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      present: ddns.present,
      send_updates: ddns.send_updates ?? "",
      conflict_resolution: ddns.conflict_resolution ?? "",
      override_client_update: ddns.override_client_update ?? "",
      override_no_update: ddns.override_no_update ?? "",
      update_on_renew: ddns.update_on_renew ?? "",
      replace_client_name: ddns.replace_client_name ?? "",
      ttl_percent: ddns.ttl_percent ?? "",
      generated_prefix: ddns.generated_prefix ?? "",
      qualifying_suffix: ddns.qualifying_suffix ?? "",
      hostname_char_replacement: ddns.hostname_char_replacement ?? "",
      hostname_char_set: ddns.hostname_char_set ?? "",
      tsig_keys: ddns.tsig_keys.map((k) => ({ ...k })),
      forward_domains: ddns.forward_domains.map((d) => ({
        ...d,
        dns_servers: d.dns_servers.map((s) => ({ ...s })),
      })),
      reverse_domains: ddns.reverse_domains.map((d) => ({
        ...d,
        dns_servers: d.dns_servers.map((s) => ({ ...s })),
      })),
    });
  }, [open, ddns]);

  const addKey = () => {
    setForm((prev) => ({
      ...prev,
      present: true,
      tsig_keys: [...prev.tsig_keys, { name: "", algorithm: "sha256", secret: "" }],
    }));
  };

  const updateKey = (index: number, patch: Partial<DHCPDdnsTsigKey>) => {
    setForm((prev) => ({
      ...prev,
      tsig_keys: prev.tsig_keys.map((k, i) => (i === index ? { ...k, ...patch } : k)),
    }));
  };

  const addDomain = (kind: "forward_domains" | "reverse_domains") => {
    setForm((prev) => ({
      ...prev,
      present: true,
      [kind]: [...prev[kind], { name: "", key_name: "", dns_servers: [] }],
    }));
  };

  const updateDomain = (
    kind: "forward_domains" | "reverse_domains",
    index: number,
    patch: Partial<DHCPDdnsDomain>
  ) => {
    setForm((prev) => ({
      ...prev,
      [kind]: prev[kind].map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  };

  const addServer = (kind: "forward_domains" | "reverse_domains", index: number) => {
    setForm((prev) => ({
      ...prev,
      [kind]: prev[kind].map((d, i) => {
        if (i !== index) return d;
        const nextId = String((d.dns_servers.length || 0) + 1);
        return {
          ...d,
          dns_servers: [...d.dns_servers, { id: nextId, address: "", port: "" }],
        };
      }),
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dhcpService.saveDdns(ddns, form, leaf, kea);
      if (!result.success) {
        setError(result.error ?? t("ddns.saveFailed"));
        setLoading(false);
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ddns.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const domainEditor = (title: string, kind: "forward_domains" | "reverse_domains") => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => addDomain(kind)}>
          <Plus className="h-3 w-3 mr-1" />
          {tc("add")}
        </Button>
      </div>
      {form[kind].map((domain, index) => (
        <div key={`${kind}-${index}`} className="border rounded-md p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              className="font-mono"
              placeholder="example.com"
              value={domain.name}
              onChange={(e) => updateDomain(kind, index, { name: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  [kind]: prev[kind].filter((_, i) => i !== index),
                }))
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder={t("ddns.tsigKeyName")}
            value={domain.key_name ?? ""}
            onChange={(e) => updateDomain(kind, index, { key_name: e.target.value })}
          />
          {domain.dns_servers.map((server, sidx) => (
            <div key={server.id} className="flex gap-2">
              <Input
                className="w-16 font-mono"
                value={server.id}
                onChange={(e) => {
                  const dns_servers = domain.dns_servers.map((s, i) =>
                    i === sidx ? { ...s, id: e.target.value } : s
                  );
                  updateDomain(kind, index, { dns_servers });
                }}
              />
              <Input
                className="font-mono"
                placeholder="192.0.2.53"
                value={server.address ?? ""}
                onChange={(e) => {
                  const dns_servers = domain.dns_servers.map((s, i) =>
                    i === sidx ? { ...s, address: e.target.value } : s
                  );
                  updateDomain(kind, index, { dns_servers });
                }}
              />
              <Input
                className="w-20 font-mono"
                placeholder="53"
                value={server.port ?? ""}
                onChange={(e) => {
                  const dns_servers = domain.dns_servers.map((s, i) =>
                    i === sidx ? { ...s, port: e.target.value } : s
                  );
                  updateDomain(kind, index, { dns_servers });
                }}
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => addServer(kind, index)}>
            {t("ddns.addDnsServer")}
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("ddns.title")}</DialogTitle>
          <DialogDescription>{t("ddns.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {leaf && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="ddns-leaf"
                checked={form.present}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, present: Boolean(v) }))}
              />
              <Label htmlFor="ddns-leaf" className="cursor-pointer">
                {t("ddns.enableUpdates")}
              </Label>
            </div>
          )}
          {kea && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ddns-present"
                  checked={form.present}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, present: Boolean(v) }))}
                />
                <Label htmlFor="ddns-present" className="cursor-pointer">
                  {t("ddns.configure")}
                </Label>
              </div>
              {form.present && (
                <>
                  <div className="space-y-1">
                    <Label>{t("ddns.sendUpdates")}</Label>
                    <Select
                      value={form.send_updates || "__none__"}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          send_updates: v === "__none__" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("unset")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("unset")}</SelectItem>
                        <SelectItem value="enable">{tc("shown.enable")}</SelectItem>
                        <SelectItem value="disable">{tc("shown.disable")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["conflict_resolution", t("ddns.conflictResolution"), ENABLE_DISABLE],
                        ["override_client_update", t("ddns.overrideClientUpdate"), ENABLE_DISABLE],
                        ["override_no_update", t("ddns.overrideNoUpdate"), ENABLE_DISABLE],
                        ["update_on_renew", t("ddns.updateOnRenew"), ENABLE_DISABLE],
                        ["replace_client_name", t("ddns.replaceClientName"), REPLACE_CLIENT_NAME],
                      ] as Array<["conflict_resolution" | "override_client_update" | "override_no_update" | "update_on_renew" | "replace_client_name", string, string[]]>
                    ).map(([field, label, options]) => (
                      <div className="space-y-1" key={field}>
                        <Label>{label}</Label>
                        <Select
                          value={form[field] || "__none__"}
                          onValueChange={(v) =>
                            setForm((prev) => ({
                              ...prev,
                              [field]: v === "__none__" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("unset")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t("unset")}</SelectItem>
                            {options.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <div className="space-y-1">
                      <Label>{t("ddns.ttlPercent")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        placeholder={t("unset")}
                        value={form.ttl_percent ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, ttl_percent: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["generated_prefix", t("ddns.generatedPrefix"), "myhost"],
                        ["qualifying_suffix", t("ddns.qualifyingSuffix"), "example.com"],
                        ["hostname_char_set", t("ddns.hostnameCharSet"), "[^A-Za-z0-9.-]"],
                        ["hostname_char_replacement", t("ddns.hostnameCharReplacement"), "-"],
                      ] as Array<["generated_prefix" | "qualifying_suffix" | "hostname_char_set" | "hostname_char_replacement", string, string]>
                    ).map(([field, label, ph]) => (
                      <div className="space-y-1" key={field}>
                        <Label>{label}</Label>
                        <Input
                          className="font-mono"
                          placeholder={ph}
                          value={form[field] ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, [field]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t("ddns.tsigKeys")}</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addKey}>
                        <Plus className="h-3 w-3 mr-1" />
                        {tc("add")}
                      </Button>
                    </div>
                    {form.tsig_keys.map((key, index) => (
                      <div key={index} className="border rounded-md p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder={t("ddns.keyName")}
                            value={key.name}
                            onChange={(e) => updateKey(index, { name: e.target.value })}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                tsig_keys: prev.tsig_keys.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Select
                          value={key.algorithm || "sha256"}
                          onValueChange={(v) => updateKey(index, { algorithm: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALGOS.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="font-mono"
                          placeholder={t("ddns.base64Secret")}
                          value={key.secret ?? ""}
                          onChange={(e) => updateKey(index, { secret: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                  {domainEditor(t("ddns.forwardDomains"), "forward_domains")}
                  {domainEditor(t("ddns.reverseDomains"), "reverse_domains")}
                </>
              )}
            </>
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
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
