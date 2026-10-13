"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  sstpcService,
  type SstpcCapabilities,
  type SstpcCreateConfig,
  type SstpcInterface,
} from "@/lib/api/sstpc";
import { pkiService, type PKIConfigResponse } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";
import {
  sstpcLockedName,
  sstpcModalIsEdit,
  sstpcWriteKind,
} from "./sstpc-modal-mode";

interface SstpcModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: SstpcCapabilities | null;
  existingInterfaces: string[];
  existing?: SstpcInterface | null;
}

const SSTPC_NAME_RE = /^sstpc[0-9]+$/;

export function SstpcModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
  existing,
}: SstpcModalProps) {
  const t = useTranslations("sstpc");
  const tc = useTranslations("common");
  const isEdit = sstpcModalIsEdit(existing);
  // Basic
  const [name, setName] = useState("sstpc0");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [server, setServer] = useState("");
  const [port, setPort] = useState("");

  // Auth & SSL
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sslCaCertificate, setSslCaCertificate] = useState("");
  const [pki, setPki] = useState<PKIConfigResponse | null>(null);

  // Routing & Network
  const [defaultRouteDistance, setDefaultRouteDistance] = useState("");
  const [noDefaultRoute, setNoDefaultRoute] = useState(false);
  const [noPeerDns, setNoPeerDns] = useState(false);
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("sstpc0");
    setDescription("");
    setDisabled(false);
    setServer("");
    setPort("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setSslCaCertificate("");
    setDefaultRouteDistance("");
    setNoDefaultRoute(false);
    setNoPeerDns(false);
    setMtu("");
    setVrf("");
    setError(null);
  };

  const populateForm = (interfaceData: SstpcInterface) => {
    setName(interfaceData.name);
    setDescription(interfaceData.description ?? "");
    setDisabled(interfaceData.disabled);
    setServer(interfaceData.server ?? "");
    setPort(interfaceData.port ?? "");
    setUsername(interfaceData.authentication?.username ?? "");
    setPassword("");
    setShowPassword(false);
    setSslCaCertificate(interfaceData.ssl?.ca_certificate ?? "");
    setDefaultRouteDistance(interfaceData.default_route_distance ?? "");
    setNoDefaultRoute(interfaceData.no_default_route);
    setNoPeerDns(interfaceData.no_peer_dns);
    setMtu(interfaceData.mtu ?? "");
    setVrf(interfaceData.vrf ?? "");
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
    pkiService.getConfig().then(setPki).catch(() => {});
  }, [open, existing]);

  const validateShared = (): string | null => {
    if (!server.trim()) return t("validation.serverRequired");
    if (port) {
      const p = Number(port);
      if (!Number.isInteger(p) || p < 1 || p > 65535) return t("validation.portRange");
    }
    if (defaultRouteDistance) {
      const d = Number(defaultRouteDistance);
      if (!Number.isInteger(d) || d < 1 || d > 255) return t("validation.defaultRouteDistanceRange");
    }
    if (mtu) {
      const m = Number(mtu);
      if (!Number.isInteger(m) || m < 68 || m > 1500) return t("validation.mtuRange");
    }
    return null;
  };

  const validateCreate = (): string | null => {
    const n = name.trim();
    if (!n) return t("validation.nameRequired");
    if (!SSTPC_NAME_RE.test(n)) return t("validation.nameFormat");
    if (existingInterfaces.includes(n)) return t("validation.nameExists", { name: n });
    return validateShared();
  };

  const handleSubmit = async () => {
    const write = sstpcWriteKind(existing);
    if (write.kind === "update") {
      if (!existing) return;
      const validationError = validateShared();
      if (validationError) { setError(validationError); return; }

      setLoading(true);
      setError(null);

      try {
        const updated: Partial<SstpcCreateConfig> = {};

        const trimOrNull = (v: string) => v.trim() || "";

        const descVal = trimOrNull(description);
        if (descVal !== (existing.description ?? "")) updated.description = descVal;

        if (disabled !== existing.disabled) updated.disabled = disabled;

        const serverVal = trimOrNull(server);
        if (serverVal !== (existing.server ?? "")) updated.server = serverVal;

        const portVal = trimOrNull(port);
        if (portVal !== (existing.port ?? "")) updated.port = portVal;

        const usernameVal = trimOrNull(username);
        if (usernameVal !== (existing.authentication?.username ?? "")) updated.username = usernameVal;

        // Password: only send if user typed something new
        if (password) updated.password = password;

        const caVal = sslCaCertificate;
        if (caVal !== (existing.ssl?.ca_certificate ?? "")) updated.ssl_ca_certificate = caVal;

        const drdVal = trimOrNull(defaultRouteDistance);
        if (drdVal !== (existing.default_route_distance ?? "")) updated.default_route_distance = drdVal;

        if (noDefaultRoute !== existing.no_default_route) updated.no_default_route = noDefaultRoute;
        if (noPeerDns !== existing.no_peer_dns) updated.no_peer_dns = noPeerDns;

        const mtuVal = trimOrNull(mtu);
        if (mtuVal !== (existing.mtu ?? "")) updated.mtu = mtuVal;

        const vrfVal = trimOrNull(vrf);
        if (vrfVal !== (existing.vrf ?? "")) updated.vrf = vrfVal;

        const result = await sstpcService.updateInterface(write.name, existing, updated);
        if (result.success) {
          onOpenChange(false);
          onSuccess();
        } else {
          setError(result.error || tc("operationFailed"));
        }
      } catch (err) {
        setError((err as ApiError).message || t("modal.updateFailed"));
      } finally {
        setLoading(false);
      }
      return;
    }

    const validationError = validateCreate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const config: SstpcCreateConfig = {
        name: name.trim(),
        description: description.trim() || undefined,
        disabled: disabled || undefined,
        server: server.trim(),
        port: port.trim() || undefined,
        username: username.trim() || undefined,
        password: password || undefined,
        ssl_ca_certificate: sslCaCertificate || undefined,
        default_route_distance: defaultRouteDistance.trim() || undefined,
        no_default_route: noDefaultRoute || undefined,
        no_peer_dns: noPeerDns || undefined,
        mtu: mtu.trim() || undefined,
        vrf: vrf.trim() || undefined,
      };

      const result = await sstpcService.createInterface(config);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || tc("operationFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("modal.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const lockedName = sstpcLockedName(existing, name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modal.editTitle", { name: existing.name }) : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("modal.editDescription")
              : t("modal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
            <TabsTrigger value="auth">{t("tabs.auth")}</TabsTrigger>
            <TabsTrigger value="routing">{t("tabs.routing")}</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Basic ── */}
          <TabsContent value="basic" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sstpc-name">{t("basic.interfaceName")}</Label>
              <Input
                id="sstpc-name"
                value={lockedName.value}
                onChange={(e) => setName(e.target.value)}
                placeholder="sstpc0"
                disabled={lockedName.disabled}
              />
              {isEdit ? (
                <p className="text-xs text-muted-foreground">
                  {t("basic.nameLocked")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sstpc-server">{t("basic.server")} <span className="text-destructive">*</span></Label>
              <Input
                id="sstpc-server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder={t("basic.serverPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("basic.serverHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sstpc-port">{t("basic.port")}</Label>
              <Input
                id="sstpc-port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="443"
                type="number"
                min={1}
                max={65535}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sstpc-description">{tc("description")}</Label>
              <Input
                id="sstpc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tc("optionalDescription")}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="sstpc-disabled"
                checked={disabled}
                onCheckedChange={(v) => setDisabled(!!v)}
              />
              <Label htmlFor="sstpc-disabled" className="cursor-pointer">
                {t("basic.disableInterface")}
              </Label>
            </div>
          </TabsContent>

          {/* ── Tab 2: Authentication & SSL ── */}
          <TabsContent value="auth" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sstpc-username">{t("auth.username")}</Label>
              <Input
                id="sstpc-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth.usernamePlaceholder")}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sstpc-password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="sstpc-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? t("auth.passwordKeepPlaceholder") : t("auth.passwordPlaceholder")}
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sstpc-sslCa">{t("auth.caCertificate")}</Label>
              <Select value={sslCaCertificate} onValueChange={setSslCaCertificate}>
                <SelectTrigger id="sstpc-sslCa">
                  <SelectValue placeholder={pki?.ca && pki.ca.length > 0 ? t("auth.selectCa") : t("auth.noCaInPki")} />
                </SelectTrigger>
                <SelectContent>
                  {pki?.ca && pki.ca.length > 0 ? (
                    pki.ca.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled>
                      {t("auth.noCaAvailable")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("auth.caHint")}
              </p>
            </div>
          </TabsContent>

          {/* ── Tab 3: Routing & Network ── */}
          <TabsContent value="routing" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sstpc-defaultRouteDistance">{t("routing.defaultRouteDistance")}</Label>
              <Input
                id="sstpc-defaultRouteDistance"
                value={defaultRouteDistance}
                onChange={(e) => setDefaultRouteDistance(e.target.value)}
                placeholder="210"
                type="number"
                min={1}
                max={255}
              />
              <p className="text-xs text-muted-foreground">{t("routing.defaultRouteDistanceHint")}</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="sstpc-noDefaultRoute"
                checked={noDefaultRoute}
                onCheckedChange={(v) => setNoDefaultRoute(!!v)}
              />
              <Label htmlFor="sstpc-noDefaultRoute" className="cursor-pointer">
                {t("routing.noDefaultRoute")}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="sstpc-noPeerDns"
                checked={noPeerDns}
                onCheckedChange={(v) => setNoPeerDns(!!v)}
              />
              <Label htmlFor="sstpc-noPeerDns" className="cursor-pointer">
                {t("routing.noPeerDns")}
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sstpc-mtu">MTU</Label>
              <Input
                id="sstpc-mtu"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1452"
                type="number"
                min={68}
                max={1500}
              />
              <p className="text-xs text-muted-foreground">{t("routing.mtuHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sstpc-vrf">VRF</Label>
              <VrfSelect
                id="sstpc-vrf"
                value={vrf}
                onValueChange={setVrf}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : tc("creating")}
              </>
            ) : isEdit ? (
              tc("saveChanges")
            ) : (
              t("modal.createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
