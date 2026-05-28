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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  ndpProxyService,
  NdpProxyInterface,
  NdpProxyPrefix,
} from "@/lib/api/ndp-proxy";
import { showService } from "@/lib/api/show";

interface NdpProxyInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: NdpProxyInterface | null;
  existingNames: string[];
  onSuccess: () => void;
}

interface PrefixForm {
  prefix: string;
  disabled: boolean;
  mode: string;
  interface: string;
}

function prefixToForm(p: NdpProxyPrefix): PrefixForm {
  return {
    prefix: p.prefix,
    disabled: p.disabled,
    mode: p.mode ?? "static",
    interface: p.interface ?? "",
  };
}

const emptyPrefixForm: PrefixForm = {
  prefix: "",
  disabled: false,
  mode: "static",
  interface: "",
};

const IPV6_PREFIX_RE =
  /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(\/\d{1,3})?$|^::1$|^::$/;

function isValidIPv6Prefix(value: string): boolean {
  return IPV6_PREFIX_RE.test(value.trim());
}

function validatePrefixForm(form: PrefixForm, existingPrefixes: string[], selfPrefix?: string): string | null {
  const trimmed = form.prefix.trim();
  if (!trimmed) return "Prefix is required";
  if (!isValidIPv6Prefix(trimmed)) return "Enter a valid IPv6 prefix or address (e.g. 2001:db8::/64)";
  if (trimmed !== selfPrefix && existingPrefixes.includes(trimmed)) return "This prefix is already in the list";
  if (form.mode === "interface" && !form.interface.trim()) return "Forwarding interface is required for interface mode";
  return null;
}

export function NdpProxyInterfaceModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  onSuccess,
}: NdpProxyInterfaceModalProps) {
  const isEdit = existing !== null;

  const [interfaceName, setInterfaceName] = useState(existing?.name ?? "");
  const [disabled, setDisabled] = useState(existing?.disabled ?? false);
  const [enableRouterBit, setEnableRouterBit] = useState(existing?.enable_router_bit ?? false);
  const [timeout, setTimeout_] = useState(
    existing?.timeout !== null && existing?.timeout !== undefined ? String(existing.timeout) : ""
  );
  const [ttl, setTtl] = useState(
    existing?.ttl !== null && existing?.ttl !== undefined ? String(existing.ttl) : ""
  );

  const [prefixes, setPrefixes] = useState<PrefixForm[]>(
    existing?.prefixes.map(prefixToForm) ?? []
  );
  const [editingPrefixIdx, setEditingPrefixIdx] = useState<number | null>(null);
  const [editingPrefixForm, setEditingPrefixForm] = useState<PrefixForm>(emptyPrefixForm);
  const [addingPrefix, setAddingPrefix] = useState(false);
  const [newPrefix, setNewPrefix] = useState<PrefixForm>({ ...emptyPrefixForm });

  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [prefixError, setPrefixError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => {
      const names = res.interfaces.map((i) => i.name).sort();
      setAvailableInterfaces(names);
    });
  }, [open]);

  const existingPrefixStrings = prefixes.map((p) => p.prefix);

  const startEditPrefix = (idx: number) => {
    setEditingPrefixIdx(idx);
    setEditingPrefixForm({ ...prefixes[idx] });
    setAddingPrefix(false);
    setPrefixError(null);
  };

  const cancelEditPrefix = () => {
    setEditingPrefixIdx(null);
    setPrefixError(null);
  };

  const saveEditPrefix = () => {
    if (editingPrefixIdx === null) return;
    const err = validatePrefixForm(
      editingPrefixForm,
      existingPrefixStrings,
      prefixes[editingPrefixIdx].prefix
    );
    if (err) { setPrefixError(err); return; }
    setPrefixes((prev) => {
      const next = [...prev];
      next[editingPrefixIdx] = {
        ...editingPrefixForm,
        prefix: editingPrefixForm.prefix.trim(),
      };
      return next;
    });
    setEditingPrefixIdx(null);
    setPrefixError(null);
  };

  const deletePrefix = (idx: number) => {
    if (editingPrefixIdx === idx) setEditingPrefixIdx(null);
    setPrefixes((prev) => prev.filter((_, i) => i !== idx));
  };

  const startAddPrefix = () => {
    setAddingPrefix(true);
    setEditingPrefixIdx(null);
    setNewPrefix({ ...emptyPrefixForm });
    setPrefixError(null);
  };

  const cancelAddPrefix = () => {
    setAddingPrefix(false);
    setPrefixError(null);
  };

  const confirmAddPrefix = () => {
    const err = validatePrefixForm(newPrefix, existingPrefixStrings);
    if (err) { setPrefixError(err); return; }
    setPrefixes((prev) => [
      ...prev,
      { ...newPrefix, prefix: newPrefix.prefix.trim() },
    ]);
    setAddingPrefix(false);
    setNewPrefix({ ...emptyPrefixForm });
    setPrefixError(null);
  };

  const validate = (): string | null => {
    if (!interfaceName.trim()) return "Interface name is required";
    if (!isEdit && existingNames.includes(interfaceName.trim())) {
      return `Interface "${interfaceName.trim()}" is already configured`;
    }
    const timeoutTrimmed = timeout.trim();
    if (timeoutTrimmed !== "") {
      const val = parseInt(timeoutTrimmed, 10);
      if (isNaN(val) || val < 500 || val > 120000) {
        return "Timeout must be between 500 and 120000 ms";
      }
    }
    const ttlTrimmed = ttl.trim();
    if (ttlTrimmed !== "") {
      const val = parseInt(ttlTrimmed, 10);
      if (isNaN(val) || val < 10000 || val > 120000) {
        return "TTL must be between 10000 and 120000 ms";
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (editingPrefixIdx !== null || addingPrefix) {
      setError("Save or cancel the open prefix form before submitting");
      return;
    }
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);

    const timeoutVal = timeout.trim() !== "" ? parseInt(timeout.trim(), 10) : null;
    const ttlVal = ttl.trim() !== "" ? parseInt(ttl.trim(), 10) : null;

    const updatedInterface: NdpProxyInterface = {
      name: interfaceName.trim(),
      disabled,
      enable_router_bit: enableRouterBit,
      timeout: timeoutVal,
      ttl: ttlVal,
      prefixes: prefixes.map((p) => ({
        prefix: p.prefix,
        disabled: p.disabled,
        mode: p.mode !== "static" ? p.mode : null,
        interface: p.mode === "interface" ? p.interface || null : null,
      })),
    };

    try {
      await ndpProxyService.setInterface(existing, updatedInterface);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Interface" : "Add Interface"}
          </DialogTitle>
          <DialogDescription>
            Configure an NDP proxy listener interface and its prefixes
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            {/* Interface name */}
            <div className="space-y-1.5">
              <Label htmlFor="iface-name">Interface Name</Label>
              {isEdit ? (
                <Input id="iface-name" value={interfaceName} disabled />
              ) : (
                <Select value={interfaceName} onValueChange={setInterfaceName}>
                  <SelectTrigger id="iface-name">
                    <SelectValue placeholder="Select interface" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInterfaces
                      .filter((name) => !existingNames.includes(name))
                      .map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Disable */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="iface-disable"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(!!checked)}
              />
              <Label htmlFor="iface-disable" className="cursor-pointer">
                Disable this interface
              </Label>
            </div>

            {/* Enable router bit */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="router-bit"
                checked={enableRouterBit}
                onCheckedChange={(checked) => setEnableRouterBit(!!checked)}
              />
              <Label htmlFor="router-bit" className="cursor-pointer">
                Enable router bit in Neighbor Advertisement
              </Label>
            </div>

            {/* Timeout */}
            <div className="space-y-1.5">
              <Label htmlFor="iface-timeout">Timeout (ms)</Label>
              <Input
                id="iface-timeout"
                placeholder="500 (default)"
                value={timeout}
                onChange={(e) => setTimeout_(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                NA response timeout. Valid range: 500–120000 ms. Leave empty for default.
              </p>
            </div>

            {/* TTL */}
            <div className="space-y-1.5">
              <Label htmlFor="iface-ttl">TTL (ms)</Label>
              <Input
                id="iface-ttl"
                placeholder="30000 (default)"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Proxy entry cache TTL. Valid range: 10000–120000 ms. Leave empty for default.
              </p>
            </div>

            <Separator />

            {/* Prefixes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Prefixes</Label>
                {!addingPrefix && editingPrefixIdx === null && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={startAddPrefix}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Prefix
                  </Button>
                )}
              </div>

              {prefixes.length === 0 && !addingPrefix && (
                <p className="text-sm text-muted-foreground">
                  No prefixes configured. Add at least one prefix for this interface to proxy.
                </p>
              )}

              {/* Prefix list */}
              <div className="space-y-2">
                {prefixes.map((p, idx) => (
                  <div key={idx}>
                    {editingPrefixIdx === idx ? (
                      <PrefixInlineForm
                        form={editingPrefixForm}
                        onChange={setEditingPrefixForm}
                        onSave={saveEditPrefix}
                        onCancel={cancelEditPrefix}
                        error={prefixError}
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <span className="font-mono font-medium flex-1 truncate">{p.prefix}</span>
                        {p.disabled && (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                            Disabled
                          </Badge>
                        )}
                        <Badge variant="secondary" className="shrink-0">
                          {p.mode || "static"}
                        </Badge>
                        {p.mode === "interface" && p.interface && (
                          <span className="text-muted-foreground font-mono text-xs shrink-0">
                            → {p.interface}
                          </span>
                        )}
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => startEditPrefix(idx)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deletePrefix(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add form */}
                {addingPrefix && (
                  <PrefixInlineForm
                    form={newPrefix}
                    onChange={setNewPrefix}
                    onSave={confirmAddPrefix}
                    onCancel={cancelAddPrefix}
                    error={prefixError}
                    isNew
                  />
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PrefixInlineFormProps {
  form: PrefixForm;
  onChange: (form: PrefixForm) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  isNew?: boolean;
}

function PrefixInlineForm({
  form,
  onChange,
  onSave,
  onCancel,
  error,
  isNew = false,
}: PrefixInlineFormProps) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">IPv6 Prefix</Label>
        <Input
          placeholder="e.g. 2001:db8::/64"
          value={form.prefix}
          onChange={(e) => onChange({ ...form, prefix: e.target.value })}
          disabled={!isNew}
          className={!isNew ? "font-mono" : ""}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`prefix-disable-${isNew ? "new" : form.prefix}`}
          checked={form.disabled}
          onCheckedChange={(checked) => onChange({ ...form, disabled: !!checked })}
        />
        <Label
          htmlFor={`prefix-disable-${isNew ? "new" : form.prefix}`}
          className="text-xs cursor-pointer"
        >
          Disable this prefix
        </Label>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Mode</Label>
        <Select
          value={form.mode}
          onValueChange={(v) =>
            onChange({ ...form, mode: v, interface: v !== "interface" ? "" : form.interface })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="static">static</SelectItem>
            <SelectItem value="auto">auto</SelectItem>
            <SelectItem value="interface">interface</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.mode === "interface" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Forwarding Interface</Label>
          <Input
            placeholder="e.g. eth1"
            value={form.interface}
            onChange={(e) => onChange({ ...form, interface: e.target.value })}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={onSave}>
          {isNew ? "Add" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
