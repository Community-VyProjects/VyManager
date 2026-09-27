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
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { pkiService, PKIOpenVPNSharedSecret } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface OpenVPNSecretModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingSecret: PKIOpenVPNSharedSecret | null;
}

export function OpenVPNSecretModal({ open, onOpenChange, onSuccess, existingSecret }: OpenVPNSecretModalProps) {
  const t = useTranslations("pki");
  const tc = useTranslations("common");
  const isEdit = !!existingSecret;

  const [mode, setMode] = useState<"import" | "generate">("import");

  // Import fields
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [version, setVersion] = useState("");

  // Generate fields
  const [genName, setGenName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingSecret) {
        setMode("import");
        setName(existingSecret.name);
        setKey("");
        setVersion(existingSecret.version || "");
      } else {
        setMode("import");
        setName("");
        setKey("");
        setVersion("");
        setGenName("");
      }
      setError(null);
    }
  }, [open, existingSecret]);

  const handleImportSubmit = async () => {
    if (!name.trim()) { setError(t("shared.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (isEdit) {
        result = await pkiService.updateOpenVPNSecret(name.trim(), existingSecret!, {
          key: key || undefined,
          version,
        });
      } else {
        result = await pkiService.createOpenVPNSecret(name.trim(), {
          key: key || undefined,
          version: version || undefined,
        });
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || tc("operationFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubmit = async () => {
    if (!genName.trim()) { setError(t("shared.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await pkiService.generateOpenVPNSecret(genName.trim());

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("shared.generationFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("shared.generationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === "generate" && !isEdit ? handleGenerateSubmit : handleImportSubmit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {isEdit ? t("openvpn.titleEdit") : t("openvpn.titleAdd")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("openvpn.editing", { name: existingSecret?.name ?? "" }) : t("openvpn.importOrGenerate")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit ? (
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "import" | "generate"); setError(null); }}>
              <TabsList className="w-full">
                <TabsTrigger value="import" className="flex-1">{t("shared.import")}</TabsTrigger>
                <TabsTrigger value="generate" className="flex-1">{t("shared.generate")}</TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="ovpn-name">{tc("name")}</Label>
                  <Input id="ovpn-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-secret" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ovpn-key">{t("shared.key")}</Label>
                  <Textarea
                    id="ovpn-key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={t("openvpn.keyPlaceholder")}
                    className="font-mono text-xs"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ovpn-version">{t("shared.version")}</Label>
                  <Input id="ovpn-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder={t("shared.eg", { value: "1" })} />
                </div>
              </TabsContent>

              <TabsContent value="generate" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="gen-ovpn-name">{tc("name")}</Label>
                  <Input id="gen-ovpn-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-secret" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("openvpn.generateHint")}
                </p>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="ovpn-key-edit">{t("shared.key")}</Label>
                <Textarea
                  id="ovpn-key-edit"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={t("shared.leaveEmpty")}
                  className="font-mono text-xs"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ovpn-version-edit">{t("shared.version")}</Label>
                <Input id="ovpn-version-edit" value={version} onChange={(e) => setVersion(e.target.value)} placeholder={t("shared.eg", { value: "1" })} />
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === "generate" && !isEdit ? t("shared.generating") : tc("saving")}</>
            ) : isEdit ? t("shared.saveChanges") : mode === "generate" ? t("openvpn.generateButton") : t("openvpn.importButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
