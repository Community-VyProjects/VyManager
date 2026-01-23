"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Key } from "lucide-react";
import { ipsecService } from "@/lib/api/ipsec";
import { useToast } from "@/hooks/useToast";

interface IPsecAddIKEGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const KEY_EXCHANGES = [
  { value: "ikev2", label: "IKEv2 (Recommended)" },
  { value: "ikev1", label: "IKEv1 (Legacy)" },
];

const ENCRYPTIONS = [
  { value: "aes256", label: "AES-256" },
  { value: "aes256gcm128", label: "AES-256-GCM" },
  { value: "aes192", label: "AES-192" },
  { value: "aes128", label: "AES-128" },
  { value: "aes128gcm128", label: "AES-128-GCM" },
  { value: "chacha20poly1305", label: "ChaCha20-Poly1305" },
  { value: "3des", label: "3DES (Legacy)" },
];

const HASHES = [
  { value: "sha256", label: "SHA-256" },
  { value: "sha384", label: "SHA-384" },
  { value: "sha512", label: "SHA-512" },
  { value: "sha1", label: "SHA-1 (Legacy)" },
  { value: "md5", label: "MD5 (Not recommended)" },
];

const DH_GROUPS = [
  { value: "14", label: "Group 14 (2048-bit MODP)" },
  { value: "15", label: "Group 15 (3072-bit MODP)" },
  { value: "16", label: "Group 16 (4096-bit MODP)" },
  { value: "19", label: "Group 19 (256-bit ECP)" },
  { value: "20", label: "Group 20 (384-bit ECP)" },
  { value: "21", label: "Group 21 (521-bit ECP)" },
  { value: "5", label: "Group 5 (1536-bit MODP)" },
  { value: "2", label: "Group 2 (1024-bit MODP, Legacy)" },
];

const DPD_ACTIONS = [
  { value: "restart", label: "Restart" },
  { value: "hold", label: "Hold" },
  { value: "clear", label: "Clear" },
];

export function IPsecAddIKEGroupModal({
  open,
  onOpenChange,
  onSuccess,
}: IPsecAddIKEGroupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Basic settings
  const [name, setName] = useState("");
  const [keyExchange, setKeyExchange] = useState("ikev2");
  const [lifetime, setLifetime] = useState("28800");

  // Proposal settings
  const [encryption, setEncryption] = useState("aes256");
  const [hash, setHash] = useState("sha256");
  const [dhGroup, setDhGroup] = useState("14");

  // DPD settings
  const [dpdAction, setDpdAction] = useState("restart");
  const [dpdInterval, setDpdInterval] = useState("30");
  const [dpdTimeout, setDpdTimeout] = useState("120");

  const resetForm = () => {
    setName("");
    setKeyExchange("ikev2");
    setLifetime("28800");
    setEncryption("aes256");
    setHash("sha256");
    setDhGroup("14");
    setDpdAction("restart");
    setDpdInterval("30");
    setDpdTimeout("120");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Validation Error", "Group name is required");
      return;
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name.trim())) {
      toast.error(
        "Validation Error",
        "Name must start with a letter and contain only letters, numbers, dashes, and underscores"
      );
      return;
    }

    setLoading(true);
    try {
      const response = await ipsecService.createIKEGroup(name.trim(), {
        keyExchange,
        lifetime: parseInt(lifetime, 10),
        proposal: {
          id: "1",
          dhGroup,
          encryption,
          hash,
        },
        dpd: {
          action: dpdAction,
          interval: parseInt(dpdInterval, 10),
          timeout: parseInt(dpdTimeout, 10),
        },
      });

      if (response.success) {
        toast.success("IKE Group Created", `IKE group ${name} has been created`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Create IKE Group", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Create IKE group error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to create IKE group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-500" />
            Add IKE Group
          </DialogTitle>
          <DialogDescription>
            Create an IKE group for Phase 1 negotiation (key exchange).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., IKE-MAIN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="key-exchange">Key Exchange</Label>
                <Select value={keyExchange} onValueChange={setKeyExchange} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KEY_EXCHANGES.map((ke) => (
                      <SelectItem key={ke.value} value={ke.value}>
                        {ke.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lifetime">Lifetime (seconds)</Label>
                <Input
                  id="lifetime"
                  type="number"
                  min="300"
                  max="86400"
                  value={lifetime}
                  onChange={(e) => setLifetime(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <p className="text-sm font-medium">Proposal Settings</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select value={encryption} onValueChange={setEncryption} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENCRYPTIONS.map((enc) => (
                        <SelectItem key={enc.value} value={enc.value}>
                          {enc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hash">Hash</Label>
                  <Select value={hash} onValueChange={setHash} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HASHES.map((h) => (
                        <SelectItem key={h.value} value={h.value}>
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dh-group">DH Group</Label>
                  <Select value={dhGroup} onValueChange={setDhGroup} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DH_GROUPS.map((dh) => (
                        <SelectItem key={dh.value} value={dh.value}>
                          {dh.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="dpd">
                <AccordionTrigger className="text-sm">Dead Peer Detection</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dpd-action">Action</Label>
                      <Select value={dpdAction} onValueChange={setDpdAction} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DPD_ACTIONS.map((action) => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dpd-interval">Interval (s)</Label>
                      <Input
                        id="dpd-interval"
                        type="number"
                        min="10"
                        max="300"
                        value={dpdInterval}
                        onChange={(e) => setDpdInterval(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dpd-timeout">Timeout (s)</Label>
                      <Input
                        id="dpd-timeout"
                        type="number"
                        min="30"
                        max="600"
                        value={dpdTimeout}
                        onChange={(e) => setDpdTimeout(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create IKE Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
