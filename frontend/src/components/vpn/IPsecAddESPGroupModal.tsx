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
import { Loader2, Lock } from "lucide-react";
import { ipsecService } from "@/lib/api/ipsec";
import { useToast } from "@/hooks/useToast";

interface IPsecAddESPGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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

const PFS_OPTIONS = [
  { value: "dh-group14", label: "DH Group 14 (2048-bit)" },
  { value: "dh-group15", label: "DH Group 15 (3072-bit)" },
  { value: "dh-group16", label: "DH Group 16 (4096-bit)" },
  { value: "dh-group19", label: "DH Group 19 (256-bit ECP)" },
  { value: "dh-group20", label: "DH Group 20 (384-bit ECP)" },
  { value: "enable", label: "Use IKE DH Group" },
  { value: "disable", label: "Disabled" },
];

const ESP_MODES = [
  { value: "tunnel", label: "Tunnel (Default)" },
  { value: "transport", label: "Transport" },
];

export function IPsecAddESPGroupModal({
  open,
  onOpenChange,
  onSuccess,
}: IPsecAddESPGroupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Settings
  const [name, setName] = useState("");
  const [lifetime, setLifetime] = useState("3600");
  const [pfs, setPfs] = useState("dh-group14");
  const [mode, setMode] = useState("tunnel");
  const [encryption, setEncryption] = useState("aes256");
  const [hash, setHash] = useState("sha256");

  const resetForm = () => {
    setName("");
    setLifetime("3600");
    setPfs("dh-group14");
    setMode("tunnel");
    setEncryption("aes256");
    setHash("sha256");
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
      const response = await ipsecService.createESPGroup(name.trim(), {
        lifetime: parseInt(lifetime, 10),
        pfs,
        mode,
        proposal: {
          id: "1",
          encryption,
          hash,
        },
      });

      if (response.success) {
        toast.success("ESP Group Created", `ESP group ${name} has been created`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Create ESP Group", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Create ESP group error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to create ESP group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-500" />
            Add ESP Group
          </DialogTitle>
          <DialogDescription>
            Create an ESP group for Phase 2 negotiation (data encryption).
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
                placeholder="e.g., ESP-MAIN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-2">
                <Label htmlFor="mode">Mode</Label>
                <Select value={mode} onValueChange={setMode} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESP_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pfs">Perfect Forward Secrecy</Label>
              <Select value={pfs} onValueChange={setPfs} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PFS_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <p className="text-sm font-medium">Proposal Settings</p>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </div>
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
              Create ESP Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
