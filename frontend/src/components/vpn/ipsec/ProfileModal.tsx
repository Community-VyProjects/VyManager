"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import {
  ipsecService,
  IPSecProfile,
  IKEGroup,
  ESPGroup,
  IPSecCapabilities,
} from "@/lib/api/ipsec";
import { showService, InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  ikeGroups: IKEGroup[];
  espGroups: ESPGroup[];
  existingProfile: IPSecProfile | null;
}

export function ProfileModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  ikeGroups,
  espGroups,
  existingProfile,
}: ProfileModalProps) {
  const t = useTranslations("ipsec");
  const tc = useTranslations("common");
  const isEdit = !!existingProfile;

  const [name, setName] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [ikeGroup, setIkeGroup] = useState("");
  const [espGroup, setEspGroup] = useState("");
  const [authMode, setAuthMode] = useState("");
  const [authPsk, setAuthPsk] = useState("");
  const [bindTunnels, setBindTunnels] = useState<string[]>([]);
  const [tunnelInterfaces, setTunnelInterfaces] = useState<InterfaceName[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showService
      .getAllInterfaces()
      .then((res) => setTunnelInterfaces(res.interfaces.filter((iface) => iface.name.startsWith("tun"))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setName(existingProfile?.name || "");
      setDisabled(existingProfile?.disabled || false);
      setIkeGroup(existingProfile?.ike_group || "");
      setEspGroup(existingProfile?.esp_group || "");
      setAuthMode(existingProfile?.auth_mode || "");
      setAuthPsk(existingProfile?.auth_psk || "");
      setBindTunnels(existingProfile?.bind_tunnels || []);
      setError(null);
    }
  }, [open, existingProfile]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t("profileModal.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        disabled,
        ike_group: ikeGroup || undefined,
        esp_group: espGroup || undefined,
        auth_mode: authMode || undefined,
        auth_psk: authMode === "pre-shared-secret" ? authPsk || undefined : undefined,
        bind_tunnels: bindTunnels,
      };
      const result = isEdit && existingProfile
        ? await ipsecService.updateProfile(existingProfile.name, payload, existingProfile)
        : await ipsecService.createProfile(name.trim(), payload);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("profileModal.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("profileModal.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {isEdit ? t("profileModal.titleEdit") : t("profileModal.titleCreate")}
          </DialogTitle>
          <DialogDescription>{t("profileModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="dmvpn" disabled={isEdit} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="profile-disable" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
            <Label htmlFor="profile-disable" className="cursor-pointer text-sm">{tc("disabled")}</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("page.ikeGroup")}</Label>
              <Select value={ikeGroup || "_none"} onValueChange={(v) => setIkeGroup(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{tc("none")}</SelectItem>
                  {ikeGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("page.espGroup")}</Label>
              <Select value={espGroup || "_none"} onValueChange={(v) => setEspGroup(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{tc("none")}</SelectItem>
                  {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("s2sModal.authMode")}</Label>
              <Select value={authMode || "_none"} onValueChange={(v) => setAuthMode(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{tc("none")}</SelectItem>
                  {(capabilities?.features.profiles.auth_modes || []).map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {authMode === "pre-shared-secret" && (
              <div className="space-y-2">
                <Label>{t("raModal.preSharedKey")}</Label>
                <Input type="password" value={authPsk} onChange={(e) => setAuthPsk(e.target.value)} placeholder={t("raModal.enterPsk")} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("profileModal.bindTunnels")}</Label>
            <InterfaceMultiSelect values={bindTunnels} onChange={setBindTunnels} interfaces={tunnelInterfaces} />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : tc("creating")}</> : isEdit ? tc("saveChanges") : t("profileModal.titleCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
