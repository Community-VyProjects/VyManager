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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Key, Eye, EyeOff, RefreshCw } from "lucide-react";
import { ipsecService, AuthPSK } from "@/lib/api/ipsec";
import { showService, InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface AuthPSKModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingPSK: AuthPSK | null;
}

export function AuthPSKModal({
  open,
  onOpenChange,
  onSuccess,
  existingPSK,
}: AuthPSKModalProps) {
  const isEdit = !!existingPSK;

  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [identities, setIdentities] = useState("");
  const [secretType, setSecretType] = useState("");
  const [dhcpInterface, setDhcpInterface] = useState("");

  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showService.getAllInterfaces().then((res) => setAllInterfaces(res.interfaces)).catch(() => {});
  }, []);

  const generatePsk = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setSecret(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
    setShowSecret(true);
  };

  useEffect(() => {
    if (open) {
      if (existingPSK) {
        setName(existingPSK.name);
        setSecret("");
        setIdentities((existingPSK.identities || []).join("\n"));
        setSecretType(existingPSK.secret_type || "");
        setDhcpInterface(existingPSK.dhcp_interface || "");
      } else {
        setName("");
        setSecret("");
        setIdentities("");
        setSecretType("");
        setDhcpInterface("");
      }
      setShowSecret(false);
      setError(null);
    }
  }, [open, existingPSK]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("PSK name is required"); return; }
    if (!isEdit && !secret.trim()) { setError("Secret is required"); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await ipsecService.deleteAuthPSK(existingPSK!.name);

      const ids = identities.split("\n").map((i) => i.trim()).filter(Boolean);

      const result = await ipsecService.createAuthPSK(name.trim(), {
        identities: ids.length > 0 ? ids : undefined,
        secret: secret || undefined,
        secret_type: secretType || undefined,
        dhcp_interface: dhcpInterface || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save PSK");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save PSK");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Create"} Pre-Shared Key
          </DialogTitle>
          <DialogDescription>Configure a pre-shared key for IPSec authentication.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="psk-1" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Secret {isEdit && "(leave blank to keep current)"}</Label>
              <Button type="button" variant="outline" size="sm" onClick={generatePsk}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Generate
              </Button>
            </div>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={isEdit ? "Enter new secret or leave blank" : "Enter secret"}
                className="pr-10"
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Identities</Label>
            <Textarea
              value={identities}
              onChange={(e) => setIdentities(e.target.value)}
              placeholder={"@local-id\n@remote-id\n192.168.1.1"}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">One identity per line (e.g., @id, IP, %any)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Secret Type (optional)</Label>
              <Select value={secretType || "_none"} onValueChange={(v) => setSecretType(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Default</SelectItem>
                  <SelectItem value="base64">Base64</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>DHCP Interface (optional)</Label>
              <Select value={dhcpInterface || "_none"} onValueChange={(v) => setDhcpInterface(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {allInterfaces.map((iface) => <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create PSK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
