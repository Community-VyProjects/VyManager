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
import { snmpService, SNMPCommunity, SNMPCapabilities } from "@/lib/api/snmp";
import { SNMPMultiValueField, isValidIP } from "./SNMPMultiValueField";

interface SNMPCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPCommunity | null;
  existingNames: string[];
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT_AUTH = "__default__";

export function SNMPCommunityModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  capabilities,
  onSuccess,
}: SNMPCommunityModalProps) {
  const isEdit = existing !== null;
  const comm = capabilities.features.community;

  const [name, setName] = useState(existing?.name ?? "");
  const [authorization, setAuthorization] = useState(
    existing?.authorization ?? DEFAULT_AUTH
  );
  const [clients, setClients] = useState<string[]>(existing?.clients ?? []);
  const [networks, setNetworks] = useState<string[]>(existing?.networks ?? []);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError("A community name is required");
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(`Community "${n}" already exists`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveCommunity(existing, {
        name: n,
        authorization: authorization === DEFAULT_AUTH ? "" : authorization,
        clients,
        networks,
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
          <DialogTitle>{isEdit ? "Edit Community" : "Add Community"}</DialogTitle>
          <DialogDescription>
            SNMPv1/v2c community string and the clients permitted to use it
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="community-name">Community Name</Label>
              <Input
                id="community-name"
                placeholder="e.g. public"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : "font-mono"}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Authorization</Label>
              <Select value={authorization} onValueChange={setAuthorization}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_AUTH}>
                    Default ({comm.default_authorization === "ro" ? "Read-Only" : "Read-Write"})
                  </SelectItem>
                  {comm.authorization_values.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "ro" ? "Read-Only (ro)" : "Read-Write (rw)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <SNMPMultiValueField
              label="Allowed Clients"
              description="Individual SNMP client IP addresses allowed to use this community"
              placeholder="e.g. 192.0.2.10"
              values={clients}
              onChange={setClients}
              validate={(v) =>
                isValidIP(v) ? null : "Enter a valid IPv4 or IPv6 address"
              }
            />

            <Separator />

            <SNMPMultiValueField
              label="Allowed Networks"
              description="Client subnets allowed to use this community (default: 0.0.0.0/0, ::/0)"
              placeholder="e.g. 192.0.2.0/24"
              values={networks}
              onChange={setNetworks}
              validate={(v) =>
                isValidIP(v, true) ? null : "Enter a valid IPv4/IPv6 network in CIDR notation"
              }
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
