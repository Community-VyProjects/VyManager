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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import type { VppAnyConfig, VppCapabilities, VppSubType } from "@/lib/api/vpp";
import { showService } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  ALL_VPP_SUB_TYPES,
  VPP_NAME_EXAMPLES,
  emptyVppDraft,
  emptyVppVifDraft,
  submitVppCreate,
  submitVppUpdate,
  validateVppCreate,
  validateVppEdit,
  vppDraftFrom,
  vppTabs,
  type VppDraft,
  type VppValidationError,
  type VppVifDraft,
} from "./vpp-form";

interface VppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VppCapabilities | null;
  existingNames: string[];
  /** The interface being edited, or null when creating. */
  existing?: VppAnyConfig | null;
  /** Sub-type of `existing`. Ignored on create, where the operator picks one. */
  existingSubType?: VppSubType | null;
}

export function VppModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNames,
  existing,
  existingSubType,
}: VppModalProps) {
  const t = useTranslations("vpp");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const subTypeLabel = (st: VppSubType) => t(`subTypes.${st}.label`);
  const validationText = (e: VppValidationError) => {
    switch (e.key) {
      case "remoteRequired":
        return t("validation.remoteRequired", e.values);
      case "sourceRequired":
        return t("validation.sourceRequired", e.values);
      case "namePattern":
        return t("validation.namePattern", e.values);
      case "nameExists":
        return t("validation.nameExists", e.values);
      default:
        return t(`validation.${e.key}`);
    }
  };

  const [selectedSubType, setSelectedSubType] = useState<VppSubType | null>(null);
  const [allIfaces, setAllIfaces] = useState<{ name: string; type: string }[]>([]);
  const [draft, setDraft] = useState<VppDraft>(emptyVppDraft());

  const [editingVifIdx, setEditingVifIdx] = useState<number | null>(null);
  const [vifDraft, setVifDraft] = useState<VppVifDraft>(emptyVppVifDraft());
  const [addressInput, setAddressInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAllIfaces(res.interfaces)).catch(() => {});
  }, [open]);

  // Reset to the record being edited, or to an empty create form.
  useEffect(() => {
    if (!open) return;
    if (existing && existingSubType) {
      setSelectedSubType(existingSubType);
      setDraft(vppDraftFrom(existing, existingSubType));
    } else {
      setSelectedSubType(null);
      setDraft(emptyVppDraft());
    }
    setEditingVifIdx(null);
    setVifDraft(emptyVppVifDraft());
    setAddressInput("");
    setError(null);
  }, [open, existing, existingSubType]);

  const patch = (fields: Partial<VppDraft>) => setDraft((d) => ({ ...d, ...fields }));

  const lockedName = lockedIdentity(existing, (i) => i.name, draft.name);

  const handleSubmit = async () => {
    const subType = isEdit ? existingSubType : selectedSubType;
    if (!subType) {
      setError(t("validation.selectType"));
      return;
    }

    const validationError = isEdit
      ? validateVppEdit(draft, subType)
      : validateVppCreate(draft, subType, existingNames);
    if (validationError) {
      setError(validationText(validationError));
      return;
    }

    const write = modalWriteKind(existing);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitVppUpdate(subType, write.name, existing, draft)
          : await submitVppCreate(subType, draft);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || tc("operationFailed"));
      }
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? t("modal.updateFailed") : t("modal.createFailed")),
      );
    } finally {
      setLoading(false);
    }
  };

  const addAddress = () => {
    const v = addressInput.trim();
    if (v && !draft.addresses.includes(v)) patch({ addresses: [...draft.addresses, v] });
    setAddressInput("");
  };

  const toggleBvi = (iface: string) => {
    patch({
      bridgeMembers: draft.bridgeMembers.map((m) =>
        m.interface === iface ? { ...m, bvi: !m.bvi } : m,
      ),
    });
  };

  const saveVif = () => {
    if (!vifDraft.vlan_id.trim()) return;
    if (editingVifIdx !== null) {
      patch({ vifs: draft.vifs.map((v, i) => (i === editingVifIdx ? { ...vifDraft } : v)) });
      setEditingVifIdx(null);
    } else if (!draft.vifs.some((v) => v.vlan_id === vifDraft.vlan_id.trim())) {
      patch({ vifs: [...draft.vifs, { ...vifDraft }] });
    }
    setVifDraft(emptyVppVifDraft());
  };

  const addVifAddress = () => {
    const v = vifDraft.addressInput.trim();
    if (v && !vifDraft.addresses.includes(v)) {
      setVifDraft((d) => ({ ...d, addresses: [...d.addresses, v], addressInput: "" }));
    } else {
      setVifDraft((d) => ({ ...d, addressInput: "" }));
    }
  };

  // Bonding takes ethernet members; bridge and xconnect also take bonds.
  const memberOptions =
    selectedSubType === "bonding"
      ? allIfaces.filter((i) => i.type === "ethernet").map((i) => i.name)
      : allIfaces.filter((i) => i.type === "ethernet" || i.type === "bonding").map((i) => i.name);

  const tabs = selectedSubType ? vppTabs(selectedSubType) : null;

  const renderTypePicker = () => (
    <div className="grid grid-cols-2 gap-3 py-2">
      {ALL_VPP_SUB_TYPES.map((st) => {
        const supported = capabilities?.features?.[st]?.supported ?? false;
        if (!supported) return null;
        return (
          <button
            key={st}
            onClick={() => {
              setSelectedSubType(st);
              patch({ name: VPP_NAME_EXAMPLES[st] });
            }}
            className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{subTypeLabel(st)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t(`subTypes.${st}.description`)}</div>
              <code className="text-xs text-muted-foreground mt-1 block">{VPP_NAME_EXAMPLES[st]}</code>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          </button>
        );
      })}
    </div>
  );

  const renderVifForm = () => (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {editingVifIdx !== null ? t("vif.edit") : t("vif.add")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">VLAN ID *</Label>
          <Input
            value={vifDraft.vlan_id}
            onChange={(e) => setVifDraft((d) => ({ ...d, vlan_id: e.target.value }))}
            placeholder="100"
            type="number"
            min={1}
            max={4094}
            disabled={editingVifIdx !== null}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">MTU</Label>
          <Input value={vifDraft.mtu} onChange={(e) => setVifDraft((d) => ({ ...d, mtu: e.target.value }))} placeholder="68-16000" type="number" min={68} max={16000} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{tc("description")}</Label>
        <Input value={vifDraft.description} onChange={(e) => setVifDraft((d) => ({ ...d, description: e.target.value }))} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="vpp-vif-disabled" checked={vifDraft.disabled} onCheckedChange={(c) => setVifDraft((d) => ({ ...d, disabled: !!c }))} />
        <Label htmlFor="vpp-vif-disabled" className="text-xs font-normal">{tc("disabled")}</Label>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t("vif.addresses")}</Label>
        <div className="flex gap-2">
          <Input
            value={vifDraft.addressInput}
            onChange={(e) => setVifDraft((d) => ({ ...d, addressInput: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVifAddress())}
            placeholder="192.168.1.1/24"
            className="text-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={addVifAddress}><Plus className="h-3 w-3" /></Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {vifDraft.addresses.map((a) => (
            <Badge key={a} variant="secondary" className="gap-1 pr-1 text-xs">
              {a}
              <button onClick={() => setVifDraft((d) => ({ ...d, addresses: d.addresses.filter((x) => x !== a) }))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={saveVif} disabled={!vifDraft.vlan_id.trim()}>
          {editingVifIdx !== null ? t("vif.update") : t("vif.add")}
        </Button>
        {editingVifIdx !== null && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setEditingVifIdx(null); setVifDraft(emptyVppVifDraft()); }}>
            {tc("cancel")}
          </Button>
        )}
      </div>
    </div>
  );

  const renderForm = () => {
    if (!selectedSubType || !tabs) return null;

    return (
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="basic" className="flex-1">{t("tabs.basic")}</TabsTrigger>
          {tabs.addresses && <TabsTrigger value="addresses" className="flex-1">{t("tabs.addresses")}</TabsTrigger>}
          {(tabs.members || tabs.bridgeMembers) && <TabsTrigger value="members" className="flex-1">{t("tabs.members")}</TabsTrigger>}
          {tabs.vif && <TabsTrigger value="vif" className="flex-1">{t("tabs.vif")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="vpp-iface-name">
              {t("form.interfaceName")} {!lockedName.disabled && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="vpp-iface-name"
              value={lockedName.value}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder={VPP_NAME_EXAMPLES[selectedSubType]}
              disabled={lockedName.disabled}
              className={lockedName.disabled ? "bg-muted font-mono" : undefined}
            />
            {lockedName.disabled && (
              <p className="text-xs text-muted-foreground">{t("form.nameLocked")}</p>
            )}
          </div>

          {selectedSubType === "bonding" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("form.mode")}</Label>
                  <Select value={draft.bondMode} onValueChange={(v) => patch({ bondMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["802.3ad", "active-backup", "broadcast", "round-robin", "xor-hash"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("form.hashPolicy")}</Label>
                  <Select value={draft.bondHashPolicy} onValueChange={(v) => patch({ bondHashPolicy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["layer2", "layer2+3", "layer3+4"].map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("form.macAddress")}</Label>
                  <Input value={draft.bondMac} onChange={(e) => patch({ bondMac: e.target.value })} placeholder="aa:bb:cc:dd:ee:ff" />
                </div>
                <div className="space-y-2">
                  <Label>MTU</Label>
                  <Input type="number" value={draft.mtu} onChange={(e) => patch({ mtu: e.target.value })} placeholder="68-16000" min={68} max={16000} />
                </div>
              </div>
            </>
          )}

          {selectedSubType === "gre" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("form.remoteIp")} {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input value={draft.greRemote} onChange={(e) => patch({ greRemote: e.target.value })} placeholder="10.0.0.1" />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.sourceAddress")} {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input value={draft.greSource} onChange={(e) => patch({ greSource: e.target.value })} placeholder="10.0.0.2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("form.tunnelType")}</Label>
                  <Select value={draft.greTunnelType} onValueChange={(v) => patch({ greTunnelType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["l3", "teb", "erspan"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("form.key")}</Label>
                  <Input type="number" value={draft.greKey} onChange={(e) => patch({ greKey: e.target.value })} placeholder={tc("optional")} min={0} max={4294967295} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>MTU</Label>
                <Input type="number" value={draft.mtu} onChange={(e) => patch({ mtu: e.target.value })} placeholder="68-16000" min={68} max={16000} />
              </div>
            </>
          )}

          {selectedSubType === "ipip" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("form.remoteIp")} {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input value={draft.ipipRemote} onChange={(e) => patch({ ipipRemote: e.target.value })} placeholder="10.0.0.1" />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.sourceAddress")} {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input value={draft.ipipSource} onChange={(e) => patch({ ipipSource: e.target.value })} placeholder="10.0.0.2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>MTU</Label>
                <Input type="number" value={draft.mtu} onChange={(e) => patch({ mtu: e.target.value })} placeholder="68-16000" min={68} max={16000} />
              </div>
            </>
          )}

          {selectedSubType === "loopback" && (
            <div className="space-y-2">
              <Label>MTU</Label>
              <Input type="number" value={draft.mtu} onChange={(e) => patch({ mtu: e.target.value })} placeholder="68-16000" min={68} max={16000} />
            </div>
          )}

          {selectedSubType === "vxlan" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("form.remoteIp")} {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input value={draft.vxlanRemote} onChange={(e) => patch({ vxlanRemote: e.target.value })} placeholder="10.0.0.1" />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.sourceAddress")} {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input value={draft.vxlanSource} onChange={(e) => patch({ vxlanSource: e.target.value })} placeholder="10.0.0.2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>VNI (0-16777214) {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input type="number" value={draft.vxlanVni} onChange={(e) => patch({ vxlanVni: e.target.value })} placeholder="100" min={0} max={16777214} />
                </div>
                <div className="space-y-2">
                  <Label>MTU</Label>
                  <Input type="number" value={draft.mtu} onChange={(e) => patch({ mtu: e.target.value })} placeholder="68-16000" min={68} max={16000} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>{tc("description")}</Label>
            <Input value={draft.description} onChange={(e) => patch({ description: e.target.value })} placeholder={tc("optionalDescription")} />
          </div>

          {selectedSubType !== "bridge" && (
            <div className="flex items-center gap-2">
              <Checkbox id="vpp-disabled" checked={draft.disabled} onCheckedChange={(c) => patch({ disabled: !!c })} />
              <Label htmlFor="vpp-disabled">{tc("disabled")}</Label>
            </div>
          )}
        </TabsContent>

        {tabs.addresses && (
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("form.ipAddresses")}</Label>
              <div className="flex gap-2">
                <Input
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAddress())}
                  placeholder={t("form.examplePlaceholder", { value: "192.168.1.1/24" })}
                />
                <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {draft.addresses.map((addr) => (
                  <Badge key={addr} variant="secondary" className="gap-1 pr-1">
                    {addr}
                    <button onClick={() => patch({ addresses: draft.addresses.filter((a) => a !== addr) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {(tabs.members || tabs.bridgeMembers) && (
          <TabsContent value="members" className="space-y-4 mt-4">
            {tabs.bridgeMembers ? (
              <div className="space-y-3">
                <Label>{t("members.bridgeMembers")}</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v && !draft.bridgeMembers.some((m) => m.interface === v)) {
                      patch({ bridgeMembers: [...draft.bridgeMembers, { interface: v, bvi: false }] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("members.selectToAdd")} />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions
                      .filter((i) => !draft.bridgeMembers.some((m) => m.interface === i))
                      .map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    {memberOptions.filter((i) => !draft.bridgeMembers.some((m) => m.interface === i)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t("members.allAdded")}</div>
                    )}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  {draft.bridgeMembers.map((m) => (
                    <div key={m.interface} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <code className="flex-1 text-sm font-mono">{m.interface}</code>
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id={`vpp-bvi-${m.interface}`}
                          checked={m.bvi}
                          onCheckedChange={() => toggleBvi(m.interface)}
                        />
                        <Label htmlFor={`vpp-bvi-${m.interface}`} className="text-xs font-normal cursor-pointer">BVI</Label>
                      </div>
                      <Button
                        type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => patch({ bridgeMembers: draft.bridgeMembers.filter((x) => x.interface !== m.interface) })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>{selectedSubType === "xconnect" ? t("members.xconnectMembers") : t("members.bondMembers")}</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v && !draft.members.includes(v)) patch({ members: [...draft.members, v] });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("members.selectToAdd")} />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions
                      .filter((i) => !draft.members.includes(i))
                      .map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    {memberOptions.filter((i) => !draft.members.includes(i)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t("members.allAdded")}</div>
                    )}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1">
                  {draft.members.map((m) => (
                    <Badge key={m} variant="secondary" className="gap-1 pr-1">
                      <code className="font-mono">{m}</code>
                      <button onClick={() => patch({ members: draft.members.filter((x) => x !== m) })}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {tabs.vif && (
          <TabsContent value="vif" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>{t("vif.title")}</Label>
              {editingVifIdx === null && (
                <Button type="button" variant="outline" size="sm" onClick={() => setVifDraft(emptyVppVifDraft())}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("vif.add")}
                </Button>
              )}
            </div>

            {draft.vifs.length > 0 && (
              <div className="space-y-2">
                {draft.vifs.map((v, i) => (
                  <div key={v.vlan_id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <Badge variant="secondary" className="text-xs font-mono">VLAN {v.vlan_id}</Badge>
                    <span className="flex-1 text-xs text-muted-foreground truncate">
                      {v.addresses.length > 0 ? v.addresses.join(", ") : t("vif.noAddresses")}
                      {v.description ? ` - ${v.description}` : ""}
                    </span>
                    {v.disabled && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">{tc("disabled")}</Badge>}
                    <Button
                      type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => { setEditingVifIdx(i); setVifDraft({ ...v }); }}
                    >
                      <span className="text-xs">{tc("edit")}</span>
                    </Button>
                    <Button
                      type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                      onClick={() => patch({ vifs: draft.vifs.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {renderVifForm()}
          </TabsContent>
        )}
      </Tabs>
    );
  };

  const title = () => {
    if (isEdit && selectedSubType) {
      return (
        <>
          {t("modal.editTitle", { type: subTypeLabel(selectedSubType) })}{" "}
          <code className="font-mono text-base">{existing.name}</code>
        </>
      );
    }
    if (selectedSubType) {
      return (
        <button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setSelectedSubType(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-normal">VPP</span>
          <span className="text-sm text-muted-foreground mx-1">/</span>
          <span className="font-semibold text-foreground">{subTypeLabel(selectedSubType)}</span>
        </button>
      );
    }
    return t("modal.createTitle");
  };

  const description = () => {
    if (!selectedSubType) return t("modal.selectTypeDescription");
    const label = subTypeLabel(selectedSubType);
    return isEdit
      ? t("modal.editDescription", { type: label })
      : t("modal.createDescription", { type: label });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title()}</DialogTitle>
          <DialogDescription>{description()}</DialogDescription>
        </DialogHeader>

        {selectedSubType ? renderForm() : renderTypePicker()}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          {selectedSubType && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? tc("saving") : tc("creating")}
                </>
              ) : isEdit ? (
                tc("saveChanges")
              ) : (
                t("modal.createSubType", { type: subTypeLabel(selectedSubType) })
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
