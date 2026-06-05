"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  snmpService,
  SNMPv3TrapTarget,
  SNMPCapabilities,
  SNMPv3CredentialUpdate,
} from "@/lib/api/snmp";
import { SNMPv3CredentialFields } from "./SNMPv3CredentialFields";
import { isValidIP } from "./SNMPMultiValueField";

interface SNMPv3TrapTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPv3TrapTarget | null;
  existingAddresses: string[];
  userNames: string[];
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT = "__default__";

export function SNMPv3TrapTargetModal({
  open,
  onOpenChange,
  existing,
  existingAddresses,
  userNames,
  capabilities,
  onSuccess,
}: SNMPv3TrapTargetModalProps) {
  const isEdit = existing !== null;
  const v3 = capabilities.features.v3;

  const [address, setAddress] = useState(existing?.address ?? "");
  const [user, setUser] = useState(existing?.user ?? "");
  const [type, setType] = useState(existing?.type ?? DEFAULT);
  const [protocol, setProtocol] = useState(existing?.protocol ?? DEFAULT);
  const [port, setPort] = useState(existing?.port ?? "");

  const [authEnabled, setAuthEnabled] = useState(!!existing?.auth?.type ||
    !!existing?.auth?.encrypted_password || !!existing?.auth?.plaintext_password);
  const [auth, setAuth] = useState<SNMPv3CredentialUpdate>({
    type: existing?.auth?.type ?? "",
    passwordMode: existing?.auth?.encrypted_password ? "encrypted" : "plaintext",
    password: "",
  });

  const [privacyEnabled, setPrivacyEnabled] = useState(!!existing?.privacy?.type ||
    !!existing?.privacy?.encrypted_password || !!existing?.privacy?.plaintext_password);
  const [privacy, setPrivacy] = useState<SNMPv3CredentialUpdate>({
    type: existing?.privacy?.type ?? "",
    passwordMode: existing?.privacy?.encrypted_password ? "encrypted" : "plaintext",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const addr = address.trim();
    if (!addr) {
      setError("A target IP address is required");
      return;
    }
    if (!isValidIP(addr)) {
      setError("Enter a valid IPv4 or IPv6 address");
      return;
    }
    if (!isEdit && existingAddresses.includes(addr)) {
      setError(`Trap target "${addr}" already exists`);
      return;
    }
    if (privacyEnabled && !authEnabled) {
      setError("Privacy requires authentication to be enabled");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveV3TrapTarget(existing, {
        address: addr,
        user: user.trim(),
        type: type === DEFAULT ? "" : type,
        protocol: protocol === DEFAULT ? "" : protocol,
        port,
        authEnabled,
        auth,
        privacyEnabled,
        privacy,
      });
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
            {isEdit ? "Edit SNMPv3 Trap Target" : "Add SNMPv3 Trap Target"}
          </DialogTitle>
          <DialogDescription>
            Send authenticated inform/trap notifications to a target
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="v3trap-address">Target Address</Label>
              <Input
                id="v3trap-address"
                placeholder="e.g. 192.0.2.50"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : "font-mono"}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">User</Label>
              {userNames.length > 0 ? (
                <Select
                  value={user === "" ? DEFAULT : user}
                  onValueChange={(v) => setUser(v === DEFAULT ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT}>None</SelectItem>
                    {userNames.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Username for authentication"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="font-mono"
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT}>Default (Inform)</SelectItem>
                    {v3.trap_type_values.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "inform" ? "Inform" : "Trap"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT}>Default (UDP)</SelectItem>
                    {v3.trap_protocol_values.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v3trap-port" className="text-sm font-medium">
                  Port
                </Label>
                <Input
                  id="v3trap-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder={v3.default_trap_port}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <SNMPv3CredentialFields
              title="Authentication"
              description="Verify message integrity and origin"
              typeOptions={v3.auth_types}
              enabled={authEnabled}
              onEnabledChange={setAuthEnabled}
              value={auth}
              onChange={setAuth}
              original={existing?.auth ?? null}
              idPrefix="v3trap-auth"
            />

            <SNMPv3CredentialFields
              title="Privacy (Encryption)"
              description="Encrypt message contents (requires authentication)"
              typeOptions={v3.privacy_types}
              enabled={privacyEnabled}
              onEnabledChange={setPrivacyEnabled}
              value={privacy}
              onChange={setPrivacy}
              original={existing?.privacy ?? null}
              idPrefix="v3trap-privacy"
            />
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
