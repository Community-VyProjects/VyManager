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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { sshService, SSHConfig, SSHCapabilities } from "@/lib/api/ssh";
import { SSHMultiValueField } from "./SSHMultiValueField";

interface SSHAuthenticationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SSHConfig;
  capabilities: SSHCapabilities;
  onSuccess: () => void;
}

export function SSHAuthenticationModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SSHAuthenticationModalProps) {
  const fidoSupported = capabilities.features.fido.supported;
  const caSupported = capabilities.features.trusted_user_ca.supported;

  const [disablePassword, setDisablePassword] = useState(config.disable_password_authentication);
  const [allowUsers, setAllowUsers] = useState<string[]>(config.access_control.allow_users);
  const [allowGroups, setAllowGroups] = useState<string[]>(config.access_control.allow_groups);
  const [denyUsers, setDenyUsers] = useState<string[]>(config.access_control.deny_users);
  const [denyGroups, setDenyGroups] = useState<string[]>(config.access_control.deny_groups);
  const [trustedCa, setTrustedCa] = useState(config.trusted_user_ca ?? "");
  const [pinRequired, setPinRequired] = useState(config.fido.pin_required);
  const [touchRequired, setTouchRequired] = useState(config.fido.touch_required);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const next: SSHConfig = {
      ...config,
      disable_password_authentication: disablePassword,
      access_control: {
        allow_users: allowUsers,
        allow_groups: allowGroups,
        deny_users: denyUsers,
        deny_groups: denyGroups,
      },
      trusted_user_ca: caSupported ? trustedCa.trim() || null : config.trusted_user_ca,
      fido: fidoSupported
        ? { pin_required: pinRequired, touch_required: touchRequired }
        : config.fido,
    };
    try {
      await sshService.updateConfig(config, next);
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
          <DialogTitle>Authentication &amp; Access</DialogTitle>
          <DialogDescription>
            Control how clients authenticate and which users may connect
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="disable-password"
                checked={disablePassword}
                onCheckedChange={(c) => setDisablePassword(!!c)}
              />
              <Label htmlFor="disable-password" className="cursor-pointer leading-tight">
                <span className="font-medium">Disable password authentication</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Require public-key (or other) authentication; reject passwords
                </span>
              </Label>
            </div>

            <Separator />

            <div className="space-y-4">
              <p className="text-sm font-medium">Access Control</p>
              <SSHMultiValueField
                label="Allow Users"
                placeholder="e.g. alice"
                values={allowUsers}
                onChange={setAllowUsers}
              />
              <SSHMultiValueField
                label="Allow Groups"
                placeholder="e.g. admins"
                values={allowGroups}
                onChange={setAllowGroups}
              />
              <SSHMultiValueField
                label="Deny Users"
                placeholder="e.g. guest"
                values={denyUsers}
                onChange={setDenyUsers}
              />
              <SSHMultiValueField
                label="Deny Groups"
                placeholder="e.g. contractors"
                values={denyGroups}
                onChange={setDenyGroups}
              />
            </div>

            {caSupported && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <Label htmlFor="trusted-ca" className="text-sm font-medium">
                    Trusted User CA
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    OpenSSH certificate name from the PKI subsystem used to verify user certificates.
                  </p>
                  <Input
                    id="trusted-ca"
                    placeholder="e.g. my-ssh-ca"
                    value={trustedCa}
                    onChange={(e) => setTrustedCa(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </>
            )}

            {fidoSupported && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium">FIDO2 Security Keys</p>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="fido-pin"
                      checked={pinRequired}
                      onCheckedChange={(c) => setPinRequired(!!c)}
                    />
                    <Label htmlFor="fido-pin" className="cursor-pointer leading-tight">
                      <span className="font-medium">Require PIN</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        FIDO2 keys must attest the user was verified (e.g. via a PIN)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="fido-touch"
                      checked={touchRequired}
                      onCheckedChange={(c) => setTouchRequired(!!c)}
                    />
                    <Label htmlFor="fido-touch" className="cursor-pointer leading-tight">
                      <span className="font-medium">Require Touch</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        FIDO2 keys must attest the user is physically present
                      </span>
                    </Label>
                  </div>
                </div>
              </>
            )}
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
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
