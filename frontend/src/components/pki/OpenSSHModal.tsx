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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Terminal } from "lucide-react";
import { pkiService, PKIOpenSSH } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface OpenSSHModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingKey: PKIOpenSSH | null;
}

export function OpenSSHModal({ open, onOpenChange, onSuccess, existingKey }: OpenSSHModalProps) {
  const t = useTranslations("pki");
  const tc = useTranslations("common");
  const isEdit = !!existingKey;

  const [mode, setMode] = useState<"import" | "generate">("import");

  // Import fields
  const [name, setName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [publicType, setPublicType] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(false);

  // Generate fields
  const [genName, setGenName] = useState("");
  const [keySize, setKeySize] = useState("2048");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rsaKeySizes = ["2048", "3072", "4096"];

  useEffect(() => {
    if (open) {
      if (existingKey) {
        setMode("import");
        setName(existingKey.name);
        setPrivateKey("");
        setPublicKey("");
        setPublicType(existingKey.public_type || "");
        setPasswordProtected(existingKey.password_protected);
      } else {
        setMode("import");
        setName("");
        setPrivateKey("");
        setPublicKey("");
        setPublicType("");
        setPasswordProtected(false);
        setGenName("");
        setKeySize("2048");
      }
      setError(null);
    }
  }, [open, existingKey]);

  const handleImportSubmit = async () => {
    if (!name.trim()) { setError(t("shared.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (isEdit) {
        result = await pkiService.updateOpenSSH(name.trim(), existingKey!, {
          private_key: privateKey || undefined,
          public_key: publicKey || undefined,
          public_type: publicType,
          password_protected: passwordProtected,
        });
      } else {
        result = await pkiService.createOpenSSH(name.trim(), {
          private_key: privateKey || undefined,
          public_key: publicKey || undefined,
          public_type: publicType || undefined,
          password_protected: passwordProtected || undefined,
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
      const result = await pkiService.generateOpenSSH({
        name: genName.trim(),
        key_size: parseInt(keySize, 10),
      });

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
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {isEdit ? t("openssh.titleEdit") : t("openssh.titleAdd")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("openssh.editing", { name: existingKey?.name ?? "" }) : t("openssh.importOrGenerate")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {!isEdit ? (
              <Tabs value={mode} onValueChange={(v) => { setMode(v as "import" | "generate"); setError(null); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="import" className="flex-1">{t("shared.import")}</TabsTrigger>
                  <TabsTrigger value="generate" className="flex-1">{t("shared.generate")}</TabsTrigger>
                </TabsList>

                <TabsContent value="import" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ssh-name">{tc("name")}</Label>
                    <Input id="ssh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-ssh-key" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ssh-privkey">{t("shared.privateKeyPem")}</Label>
                    <Textarea
                      id="ssh-privkey"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      className="font-mono text-xs"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ssh-pubkey">{t("shared.publicKey")}</Label>
                    <Textarea
                      id="ssh-pubkey"
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      // eslint-disable-next-line vymanager/no-untranslated-text -- example value
                      placeholder="ssh-rsa AAAA..."
                      className="font-mono text-xs"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ssh-type">{t("shared.publicKeyType")}</Label>
                    <Select value={publicType} onValueChange={setPublicType}>
                      <SelectTrigger id="ssh-type">
                        <SelectValue placeholder={t("shared.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ssh-rsa">ssh-rsa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="ssh-pwd" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
                    <Label htmlFor="ssh-pwd">{t("shared.passwordProtected")}</Label>
                  </div>
                </TabsContent>

                <TabsContent value="generate" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gen-ssh-name">{tc("name")}</Label>
                    <Input id="gen-ssh-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-ssh-key" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gen-ssh-keysize">{t("shared.rsaKeySize")}</Label>
                    <Select value={keySize} onValueChange={setKeySize}>
                      <SelectTrigger id="gen-ssh-keysize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rsaKeySizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {t("shared.bits", { size })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("openssh.generateHint")}
                  </p>
                </TabsContent>
              </Tabs>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ssh-privkey-edit">{t("shared.privateKeyPem")}</Label>
                  <Textarea
                    id="ssh-privkey-edit"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder={t("shared.leaveEmpty")}
                    className="font-mono text-xs"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssh-pubkey-edit">{t("shared.publicKey")}</Label>
                  <Textarea
                    id="ssh-pubkey-edit"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder={t("shared.leaveEmpty")}
                    className="font-mono text-xs"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssh-type-edit">{t("shared.publicKeyType")}</Label>
                  <Select value={publicType} onValueChange={setPublicType}>
                    <SelectTrigger id="ssh-type-edit">
                      <SelectValue placeholder={t("shared.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssh-rsa">ssh-rsa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="ssh-pwd-edit" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
                  <Label htmlFor="ssh-pwd-edit">{t("shared.passwordProtected")}</Label>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

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
            ) : isEdit ? t("shared.saveChanges") : mode === "generate" ? t("openssh.generateButton") : t("openssh.importButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
