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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2, Shield } from "lucide-react";
import { ipsecService, ESPGroup, IPSecCapabilities } from "@/lib/api/ipsec";
import { ApiError } from "@/lib/types/api";

interface ESPGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  existingGroup: ESPGroup | null;
}

interface ProposalRow {
  id: string;
  encryption: string;
  hash: string;
}

const ENCRYPTION_OPTIONS = ["aes128", "aes256", "aes128gcm128", "aes256gcm128", "3des", "chacha20poly1305"];
const HASH_OPTIONS = ["sha1", "sha256", "sha384", "sha512", "md5"];
const PFS_OPTIONS = ["enable", "disable", "dh-group1", "dh-group2", "dh-group5", "dh-group14", "dh-group15", "dh-group16", "dh-group19", "dh-group20", "dh-group21", "dh-group24", "dh-group25", "dh-group26", "dh-group27", "dh-group28", "dh-group31"];

export function ESPGroupModal({
  open,
  onOpenChange,
  onSuccess,
  existingGroup,
}: ESPGroupModalProps) {
  const isEdit = !!existingGroup;

  const [name, setName] = useState("");
  const [lifetime, setLifetime] = useState("3600");
  const [mode, setMode] = useState("tunnel");
  const [pfs, setPfs] = useState("dh-group14");
  const [compression, setCompression] = useState(false);
  const [disableRekey, setDisableRekey] = useState(false);
  const [lifeBytes, setLifeBytes] = useState("");
  const [lifePackets, setLifePackets] = useState("");
  const [proposals, setProposals] = useState<ProposalRow[]>([
    { id: "1", encryption: "aes256", hash: "sha256" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingGroup) {
        setName(existingGroup.name);
        setLifetime(existingGroup.lifetime || "3600");
        setMode(existingGroup.mode || "tunnel");
        setPfs(existingGroup.pfs || "dh-group14");
        setCompression(existingGroup.compression || false);
        setDisableRekey(existingGroup.disable_rekey || false);
        setLifeBytes(existingGroup.life_bytes || "");
        setLifePackets(existingGroup.life_packets || "");
        setProposals(
          existingGroup.proposals.length > 0
            ? existingGroup.proposals.map((p) => ({
                id: p.number,
                encryption: p.encryption || "aes256",
                hash: p.hash || "sha256",
              }))
            : [{ id: "1", encryption: "aes256", hash: "sha256" }]
        );
      } else {
        setName("");
        setLifetime("3600");
        setMode("tunnel");
        setPfs("dh-group14");
        setCompression(false);
        setDisableRekey(false);
        setLifeBytes("");
        setLifePackets("");
        setProposals([{ id: "1", encryption: "aes256", hash: "sha256" }]);
      }
      setError(null);
    }
  }, [open, existingGroup]);

  const addProposal = () => {
    const nextNum = String(Math.max(...proposals.map((p) => parseInt(p.id)), 0) + 1);
    setProposals([...proposals, { id: nextNum, encryption: "aes256", hash: "sha256" }]);
  };

  const removeProposal = (id: string) => {
    if (proposals.length > 1) setProposals(proposals.filter((p) => p.id !== id));
  };

  const updateProposal = (id: string, field: keyof ProposalRow, value: string) => {
    setProposals(proposals.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await ipsecService.deleteESPGroup(existingGroup!.name);

      const result = await ipsecService.createESPGroup(name.trim(), {
        lifetime: lifetime || undefined,
        mode: mode || undefined,
        pfs: pfs || undefined,
        compression: compression || undefined,
        disable_rekey: disableRekey || undefined,
        life_bytes: lifeBytes || undefined,
        life_packets: lifePackets || undefined,
        proposals: proposals.map((p) => ({
          number: p.id,
          encryption: p.encryption || undefined,
          hash: p.hash || undefined,
        })),
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save ESP group");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save ESP group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Create"} ESP Group
          </DialogTitle>
          <DialogDescription>
            Configure Encapsulating Security Payload group parameters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ESP-GROUP-1" disabled={isEdit} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Lifetime (seconds)</Label>
              <Input value={lifetime} onChange={(e) => setLifetime(e.target.value)} placeholder="3600" />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunnel">Tunnel</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PFS</Label>
              <Select value={pfs} onValueChange={setPfs}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PFS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Life Bytes (optional)</Label>
              <Input value={lifeBytes} onChange={(e) => setLifeBytes(e.target.value)} placeholder="e.g. 1000000" />
            </div>
            <div className="space-y-2">
              <Label>Life Packets (optional)</Label>
              <Input value={lifePackets} onChange={(e) => setLifePackets(e.target.value)} placeholder="e.g. 100000" />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="compression" checked={compression} onCheckedChange={(c) => setCompression(c === true)} />
              <Label htmlFor="compression" className="cursor-pointer text-sm">Compression</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="disableRekey" checked={disableRekey} onCheckedChange={(c) => setDisableRekey(c === true)} />
              <Label htmlFor="disableRekey" className="cursor-pointer text-sm">Disable Rekey</Label>
            </div>
          </div>

          {/* Proposals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Proposals</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProposal}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {proposals.map((p) => (
              <div key={p.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-end rounded-lg border p-3">
                <div className="text-xs text-muted-foreground font-mono w-6 text-center pt-5">#{p.id}</div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Encryption</Label>
                  <Select value={p.encryption} onValueChange={(v) => updateProposal(p.id, "encryption", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENCRYPTION_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hash</Label>
                  <Select value={p.hash} onValueChange={(v) => updateProposal(p.id, "hash", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HASH_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => removeProposal(p.id)} disabled={proposals.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create ESP Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
