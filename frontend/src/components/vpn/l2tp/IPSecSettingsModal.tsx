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
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { l2tpService, L2TPIPSecSettings } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface IPSecSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentSettings: L2TPIPSecSettings;
}

export function IPSecSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  currentSettings,
}: IPSecSettingsModalProps) {
  const [authMode, setAuthMode] = useState("");
  const [psk, setPsk] = useState("");
  const [x509CaCert, setX509CaCert] = useState("");
  const [x509Cert, setX509Cert] = useState("");
  const [x509Passphrase, setX509Passphrase] = useState("");
  const [ikeGroup, setIkeGroup] = useState("");
  const [espGroup, setEspGroup] = useState("");
  const [ikeLifetime, setIkeLifetime] = useState("");
  const [lifetime, setLifetime] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAuthMode(currentSettings.auth_mode || "");
      setPsk("");
      setX509CaCert(currentSettings.x509_ca_certificate || "");
      setX509Cert(currentSettings.x509_certificate || "");
      setX509Passphrase("");
      setIkeGroup(currentSettings.ike_group || "");
      setEspGroup(currentSettings.esp_group || "");
      setIkeLifetime(currentSettings.ike_lifetime || "");
      setLifetime(currentSettings.lifetime || "");
      setError(null);
    }
  }, [open, currentSettings]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await l2tpService.updateIPSecSettings(currentSettings, {
        auth_mode: authMode,
        psk: psk || undefined,
        x509_ca_certificate: x509CaCert,
        x509_certificate: x509Cert,
        x509_passphrase: x509Passphrase || undefined,
        ike_group: ikeGroup,
        esp_group: espGroup,
        ike_lifetime: ikeLifetime,
        lifetime,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update IPSec settings");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update IPSec settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            IPSec Settings
          </DialogTitle>
          <DialogDescription>Configure IPSec transport encryption for L2TP.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Authentication Mode</Label>
            <Select value={authMode} onValueChange={setAuthMode}>
              <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pre-shared-secret">Pre-Shared Secret</SelectItem>
                <SelectItem value="x509">X.509 Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authMode === "pre-shared-secret" && (
            <div className="space-y-2">
              <Label>Pre-Shared Secret</Label>
              <Input type="password" value={psk} onChange={(e) => setPsk(e.target.value)} placeholder={currentSettings.psk ? "Leave blank to keep current" : "Enter secret"} />
            </div>
          )}

          {authMode === "x509" && (
            <>
              <div className="space-y-2">
                <Label>CA Certificate</Label>
                <Input value={x509CaCert} onChange={(e) => setX509CaCert(e.target.value)} placeholder="CA certificate name" />
              </div>
              <div className="space-y-2">
                <Label>Certificate</Label>
                <Input value={x509Cert} onChange={(e) => setX509Cert(e.target.value)} placeholder="Certificate name" />
              </div>
              <div className="space-y-2">
                <Label>Passphrase</Label>
                <Input type="password" value={x509Passphrase} onChange={(e) => setX509Passphrase(e.target.value)} placeholder="Certificate passphrase (optional)" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IKE Group</Label>
              <Input value={ikeGroup} onChange={(e) => setIkeGroup(e.target.value)} placeholder="IKE group name" />
            </div>
            <div className="space-y-2">
              <Label>ESP Group</Label>
              <Input value={espGroup} onChange={(e) => setEspGroup(e.target.value)} placeholder="ESP group name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IKE Lifetime</Label>
              <Input value={ikeLifetime} onChange={(e) => setIkeLifetime(e.target.value)} placeholder="3600" />
            </div>
            <div className="space-y-2">
              <Label>ESP Lifetime</Label>
              <Input value={lifetime} onChange={(e) => setLifetime(e.target.value)} placeholder="1800" />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
