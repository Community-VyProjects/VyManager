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
import { ipsecService, IKEGroup, IPSecCapabilities } from "@/lib/api/ipsec";
import { ApiError } from "@/lib/types/api";

interface IKEGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  existingGroup: IKEGroup | null;
}

interface ProposalRow {
  id: string;
  encryption: string;
  hash: string;
  dh_group: string;
  prf: string;
}

const ENCRYPTION_OPTIONS = ["aes128", "aes256", "aes128gcm128", "aes256gcm128", "3des", "chacha20poly1305"];
const HASH_OPTIONS = ["sha1", "sha256", "sha384", "sha512", "md5"];
const DH_GROUPS = ["1", "2", "5", "14", "15", "16", "19", "20", "21", "24", "25", "26", "27", "28", "31"];

export function IKEGroupModal({
  open,
  onOpenChange,
  onSuccess,
  existingGroup,
}: IKEGroupModalProps) {
  const isEdit = !!existingGroup;

  const [name, setName] = useState("");
  const [keyExchange, setKeyExchange] = useState("ikev2");
  const [lifetime, setLifetime] = useState("28800");
  const [mode, setMode] = useState("");
  const [closeAction, setCloseAction] = useState("");
  const [dpdAction, setDpdAction] = useState("");
  const [dpdInterval, setDpdInterval] = useState("");
  const [dpdTimeout, setDpdTimeout] = useState("");
  const [disableMobike, setDisableMobike] = useState(false);
  const [ikev2Reauth, setIkev2Reauth] = useState(false);
  const [proposals, setProposals] = useState<ProposalRow[]>([
    { id: "1", encryption: "aes256", hash: "sha256", dh_group: "14", prf: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingGroup) {
        setName(existingGroup.name);
        setKeyExchange(existingGroup.key_exchange || "ikev2");
        setLifetime(existingGroup.lifetime || "28800");
        setMode(existingGroup.mode || "");
        setCloseAction(existingGroup.close_action || "");
        setDpdAction(existingGroup.dpd_action || "");
        setDpdInterval(existingGroup.dpd_interval || "");
        setDpdTimeout(existingGroup.dpd_timeout || "");
        setDisableMobike(existingGroup.disable_mobike || false);
        setIkev2Reauth(existingGroup.ikev2_reauth || false);
        setProposals(
          existingGroup.proposals.length > 0
            ? existingGroup.proposals.map((p) => ({
                id: p.number,
                encryption: p.encryption || "aes256",
                hash: p.hash || "sha256",
                dh_group: p.dh_group || "14",
                prf: p.prf || "",
              }))
            : [{ id: "1", encryption: "aes256", hash: "sha256", dh_group: "14", prf: "" }]
        );
      } else {
        setName("");
        setKeyExchange("ikev2");
        setLifetime("28800");
        setMode("");
        setCloseAction("");
        setDpdAction("");
        setDpdInterval("");
        setDpdTimeout("");
        setDisableMobike(false);
        setIkev2Reauth(false);
        setProposals([{ id: "1", encryption: "aes256", hash: "sha256", dh_group: "14", prf: "" }]);
      }
      setError(null);
    }
  }, [open, existingGroup]);

  const addProposal = () => {
    const nextNum = String(Math.max(...proposals.map((p) => parseInt(p.id)), 0) + 1);
    setProposals([...proposals, { id: nextNum, encryption: "aes256", hash: "sha256", dh_group: "14", prf: "" }]);
  };

  const removeProposal = (id: string) => {
    if (proposals.length > 1) {
      setProposals(proposals.filter((p) => p.id !== id));
    }
  };

  const updateProposal = (id: string, field: keyof ProposalRow, value: string) => {
    setProposals(proposals.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) {
        await ipsecService.deleteIKEGroup(existingGroup!.name);
      }

      const result = await ipsecService.createIKEGroup(name.trim(), {
        key_exchange: keyExchange || undefined,
        lifetime: lifetime || undefined,
        mode: mode || undefined,
        close_action: closeAction || undefined,
        dpd_action: dpdAction || undefined,
        dpd_interval: dpdInterval || undefined,
        dpd_timeout: dpdTimeout || undefined,
        disable_mobike: disableMobike || undefined,
        ikev2_reauth: ikev2Reauth || undefined,
        proposals: proposals.map((p) => ({
          number: p.id,
          encryption: p.encryption || undefined,
          hash: p.hash || undefined,
          dh_group: p.dh_group || undefined,
          prf: p.prf || undefined,
        })),
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save IKE group");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save IKE group");
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
            {isEdit ? "Edit" : "Create"} IKE Group
          </DialogTitle>
          <DialogDescription>
            Configure Internet Key Exchange group parameters and proposals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="IKE-GROUP-1"
              disabled={isEdit}
            />
          </div>

          {/* Key Exchange + Lifetime */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Key Exchange</Label>
              <Select value={keyExchange} onValueChange={setKeyExchange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ikev1">IKEv1</SelectItem>
                  <SelectItem value="ikev2">IKEv2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lifetime (seconds)</Label>
              <Input value={lifetime} onChange={(e) => setLifetime(e.target.value)} placeholder="28800" />
            </div>
          </div>

          {/* Mode + Close Action */}
          <div className="grid grid-cols-2 gap-4">
            {keyExchange === "ikev1" && (
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Close Action</Label>
              <Select value={closeAction} onValueChange={setCloseAction}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="clear">Clear</SelectItem>
                  <SelectItem value="restart">Restart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DPD */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dead Peer Detection</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Action</Label>
                <Select value={dpdAction} onValueChange={setDpdAction}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restart">Restart</SelectItem>
                    <SelectItem value="clear">Clear</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="trap">Trap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Interval (s)</Label>
                <Input value={dpdInterval} onChange={(e) => setDpdInterval(e.target.value)} placeholder="15" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Timeout (s)</Label>
                <Input value={dpdTimeout} onChange={(e) => setDpdTimeout(e.target.value)} placeholder="60" />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="disableMobike" checked={disableMobike} onCheckedChange={(c) => setDisableMobike(c === true)} />
              <Label htmlFor="disableMobike" className="cursor-pointer text-sm">Disable MOBIKE</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ikev2Reauth" checked={ikev2Reauth} onCheckedChange={(c) => setIkev2Reauth(c === true)} />
              <Label htmlFor="ikev2Reauth" className="cursor-pointer text-sm">IKEv2 Re-authentication</Label>
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
              <div key={p.id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-2 items-end rounded-lg border p-3">
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
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">DH Group</Label>
                  <Select value={p.dh_group} onValueChange={(v) => updateProposal(p.id, "dh_group", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DH_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">PRF</Label>
                  <Select value={p.prf || "_none"} onValueChange={(v) => updateProposal(p.id, "prf", v === "_none" ? "" : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Auto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Auto</SelectItem>
                      {HASH_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                  onClick={() => removeProposal(p.id)}
                  disabled={proposals.length <= 1}
                >
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create IKE Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
