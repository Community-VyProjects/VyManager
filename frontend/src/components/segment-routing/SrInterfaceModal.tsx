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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { SrInterface } from "@/lib/api/segment-routing";

interface SrInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: SrInterface) => Promise<void>;
  existingInterface?: SrInterface | null;
  /** Interfaces that already have SRv6 enabled (excluded from the picker). */
  existingNames: string[];
  /** True on VyOS 1.4: saving rewrites the whole segment-routing tree. */
  requiresRecreate: boolean;
}

const HMAC_DEFAULT = "default";

export function SrInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  existingNames,
  requiresRecreate,
}: SrInterfaceModalProps) {
  const isEditMode = !!existingInterface;

  const [name, setName] = useState("");
  const [hmac, setHmac] = useState(HMAC_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setName(existingInterface.name);
        setHmac(existingInterface.hmac ?? HMAC_DEFAULT);
      } else {
        setName("");
        setHmac(HMAC_DEFAULT);
      }
      setError(null);
    }
  }, [open, existingInterface]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!name) {
      setError("Select an interface");
      return;
    }
    if (!isEditMode && existingNames.includes(name)) {
      setError(`SRv6 is already enabled on ${name}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name,
        hmac: hmac === HMAC_DEFAULT ? null : hmac,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit SRv6 Interface" : "Enable SRv6 on Interface"}
          </DialogTitle>
          <DialogDescription>
            Accept SR-enabled IPv6 packets on an interface and set the HMAC
            policy for ingress packets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Interface */}
          <div className="space-y-1.5">
            <Label>Interface</Label>
            {isEditMode ? (
              <p className="font-mono text-sm rounded-md border border-border bg-muted px-3 py-2">
                {name}
              </p>
            ) : (
              <InterfaceSelect
                value={name}
                onValueChange={setName}
                placeholder="Select an interface"
              />
            )}
          </div>

          {/* HMAC policy */}
          <div className="space-y-1.5">
            <Label>HMAC Policy</Label>
            <Select value={hmac} onValueChange={setHmac}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HMAC_DEFAULT}>Default (accept)</SelectItem>
                <SelectItem value="accept">accept — validate packets with HMAC, accept those without</SelectItem>
                <SelectItem value="drop">drop — validate packets with HMAC, drop those without</SelectItem>
                <SelectItem value="ignore">ignore — ignore the HMAC field entirely</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Policy for ingress SR-enabled packets on this interface
            </p>
          </div>

          {/* 1.4 recreate warning */}
          {isEditMode && requiresRecreate && (
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                This router runs VyOS 1.4, which cannot modify existing
                Segment Routing configuration in place. Saving removes the
                whole segment-routing tree and recreates it with your change,
                in two commits. If the second commit fails, the tree is left
                empty — refresh and re-apply from this page.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
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
                {isEditMode ? "Saving..." : "Enabling..."}
              </>
            ) : isEditMode ? (
              requiresRecreate ? "Rewrite & Save" : "Save Changes"
            ) : (
              "Enable SRv6"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
