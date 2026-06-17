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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { RipInterface, RipMd5Key } from "@/lib/api/rip";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface RipInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: RipInterface) => Promise<void>;
  existingInterface?: RipInterface | null;
}

export function RipInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
}: RipInterfaceModalProps) {
  const isEditMode = !!existingInterface;

  const [name, setName] = useState("");
  const [authType, setAuthType] = useState("");
  const [md5Keys, setMd5Keys] = useState<RipMd5Key[]>([]);
  const [plaintextPassword, setPlaintextPassword] = useState("");
  const [sendVersion, setSendVersion] = useState("");
  const [receiveVersion, setReceiveVersion] = useState("");
  const [splitHorizon, setSplitHorizon] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces()
      .then((res) => setAvailableInterfaces(res.interfaces))
      .catch(() => {});

    if (existingInterface) {
      setName(existingInterface.name);
      setAuthType(existingInterface.authentication_type || "");
      setMd5Keys(existingInterface.md5_keys.map((k) => ({ ...k })));
      setPlaintextPassword(existingInterface.plaintext_password || "");
      setSendVersion(existingInterface.send_version || "");
      setReceiveVersion(existingInterface.receive_version || "");
      setSplitHorizon(existingInterface.split_horizon || "");
    } else {
      resetForm();
    }
  }, [open, existingInterface]);

  const resetForm = () => {
    setName("");
    setAuthType("");
    setMd5Keys([]);
    setPlaintextPassword("");
    setSendVersion("");
    setReceiveVersion("");
    setSplitHorizon("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addMd5Key = () => {
    setMd5Keys([...md5Keys, { key_id: "", password: "" }]);
  };

  const removeMd5Key = (idx: number) => {
    setMd5Keys(md5Keys.filter((_, i) => i !== idx));
  };

  const updateMd5Key = (idx: number, field: "key_id" | "password", value: string) => {
    const updated = [...md5Keys];
    updated[idx] = { ...updated[idx], [field]: value };
    setMd5Keys(updated);
  };

  const validate = (): string | null => {
    if (!name) return "Please select an interface";
    if (authType === "md5") {
      for (const key of md5Keys) {
        if (!key.key_id) return "All MD5 keys must have a key ID";
        const id = parseInt(key.key_id, 10);
        if (isNaN(id) || id < 1 || id > 255) return "MD5 key ID must be 1-255";
        if (!key.password) return "All MD5 keys must have a password";
        if (key.password.length > 16) return "MD5 key password must be ≤16 characters";
      }
    }
    if (authType === "plaintext") {
      if (plaintextPassword.length > 16) return "Plaintext password must be ≤16 characters";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const config: RipInterface = {
      name,
      authentication_type: authType || null,
      md5_keys: authType === "md5" ? md5Keys : [],
      plaintext_password: authType === "plaintext" ? plaintextPassword || null : null,
      send_version: sendVersion || null,
      receive_version: receiveVersion || null,
      split_horizon: splitHorizon || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(config);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit RIP Interface" : "Add RIP Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify RIP settings for ${existingInterface?.name}.`
              : "Configure per-interface RIP authentication, version, and split-horizon."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            {/* Interface */}
            <div className="space-y-2">
              <Label htmlFor="rip-iface-name">Interface</Label>
              <InterfaceSelect
                value={name}
                onValueChange={setName}
                disabled={isEditMode}
                id="rip-iface-name"
                className={isEditMode ? "bg-muted" : ""}
                interfaces={availableInterfaces}
              />
            </div>

            {/* Authentication */}
            <div className="space-y-3">
              <Label>Authentication</Label>
              <Select value={authType} onValueChange={(v) => { setAuthType(v === "none" ? "" : v); setMd5Keys([]); setPlaintextPassword(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="md5">MD5</SelectItem>
                  <SelectItem value="plaintext">Plaintext</SelectItem>
                </SelectContent>
              </Select>

              {authType === "md5" && (
                <div className="space-y-2 pl-2 border-l-2 border-border">
                  <p className="text-xs text-muted-foreground">MD5 key pairs (key ID 1-255, password ≤16 chars)</p>
                  {md5Keys.map((key, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Key ID"
                        min={1}
                        max={255}
                        value={key.key_id}
                        onChange={(e) => updateMd5Key(idx, "key_id", e.target.value)}
                        className="w-24"
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        maxLength={16}
                        value={key.password}
                        onChange={(e) => updateMd5Key(idx, "password", e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeMd5Key(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addMd5Key}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Key
                  </Button>
                </div>
              )}

              {authType === "plaintext" && (
                <div className="pl-2 border-l-2 border-border">
                  <Input
                    type="password"
                    placeholder="Password (≤16 chars)"
                    maxLength={16}
                    value={plaintextPassword}
                    onChange={(e) => setPlaintextPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Send / Receive Version */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Send Version</Label>
                <Select value={sendVersion} onValueChange={(v) => setSendVersion(v === "unset" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Default</SelectItem>
                    <SelectItem value="1">v1</SelectItem>
                    <SelectItem value="2">v2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Receive Version</Label>
                <Select value={receiveVersion} onValueChange={(v) => setReceiveVersion(v === "unset" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Default</SelectItem>
                    <SelectItem value="1">v1</SelectItem>
                    <SelectItem value="2">v2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Split Horizon */}
            <div className="space-y-2">
              <Label>Split Horizon</Label>
              <Select value={splitHorizon} onValueChange={(v) => setSplitHorizon(v === "unset" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Default</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                  <SelectItem value="poison-reverse">Poison Reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
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
                {isEditMode ? "Saving..." : "Adding..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
