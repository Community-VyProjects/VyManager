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
import { AlertCircle, Loader2, ShieldCheck, Info } from "lucide-react";
import { pkiService, PKICA, PKIX509Defaults } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface CAModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingCA: PKICA | null;
  x509Defaults: PKIX509Defaults;
}

export function CAModal({ open, onOpenChange, onSuccess, existingCA, x509Defaults }: CAModalProps) {
  const t = useTranslations("pkiCerts");
  const tc = useTranslations("common");
  const isEdit = !!existingCA;

  const [mode, setMode] = useState<"import" | "generate">("import");

  // Import fields
  const [name, setName] = useState("");
  const [certificate, setCertificate] = useState("");
  const [description, setDescription] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [crl, setCrl] = useState("");

  // Generate fields
  const [genName, setGenName] = useState("");
  const [keyType, setKeyType] = useState<"rsa" | "ec">("rsa");
  const [keySize, setKeySize] = useState("2048");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [locality, setLocality] = useState("");
  const [organization, setOrganization] = useState("");
  const [commonName, setCommonName] = useState("");
  const [days, setDays] = useState("3650");
  const [encryptKey, setEncryptKey] = useState(false);
  const [passphrase, setPassphrase] = useState("");

  // Shared fields
  const [revoke, setRevoke] = useState(false);
  const [systemInstall, setSystemInstall] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rsaKeySizes = ["2048", "3072", "4096"];
  const ecKeySizes = ["256", "384", "521"];

  useEffect(() => {
    if (open) {
      if (existingCA) {
        setMode("import");
        setName(existingCA.name);
        setCertificate("");
        setDescription(existingCA.description || "");
        setPrivateKey("");
        setPasswordProtected(existingCA.password_protected);
        setCrl(existingCA.crl?.join("\n") || "");
        setRevoke(existingCA.revoke);
        setSystemInstall(existingCA.system_install);
      } else {
        setMode("import");
        setName("");
        setCertificate("");
        setDescription("");
        setPrivateKey("");
        setPasswordProtected(false);
        setCrl("");
        setGenName("");
        setKeyType("rsa");
        setKeySize("2048");
        setCountry(x509Defaults.country || "");
        setState(x509Defaults.state || "");
        setLocality(x509Defaults.locality || "");
        setOrganization(x509Defaults.organization || "");
        setCommonName("");
        setDays("3650");
        setEncryptKey(false);
        setPassphrase("");
        setRevoke(false);
        setSystemInstall(false);
      }
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed form fields when the modal opens
  }, [open, existingCA]);

  // Update key size options when key type changes
  useEffect(() => {
    if (keyType === "rsa" && !rsaKeySizes.includes(keySize)) {
      setKeySize("2048");
    } else if (keyType === "ec" && !ecKeySizes.includes(keySize)) {
      setKeySize("256");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset key size only when the key type changes
  }, [keyType]);

  const handleImportSubmit = async () => {
    if (!name.trim()) { setError(t("shared.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      const crlList = crl.split("\n").map(s => s.trim()).filter(Boolean);
      let result;
      if (isEdit) {
        result = await pkiService.updateCA(name.trim(), existingCA!, {
          certificate: certificate || undefined,
          description,
          private_key: privateKey || undefined,
          password_protected: passwordProtected,
          crl: crlList.length > 0 ? crlList : undefined,
          revoke,
          system_install: systemInstall,
        });
      } else {
        result = await pkiService.createCA(name.trim(), {
          certificate: certificate || undefined,
          description: description || undefined,
          private_key: privateKey || undefined,
          password_protected: passwordProtected || undefined,
          crl: crlList.length > 0 ? crlList : undefined,
          revoke: revoke || undefined,
          system_install: systemInstall || undefined,
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
    if (!commonName.trim()) { setError(t("shared.commonNameRequired")); return; }
    if (encryptKey && !passphrase) { setError(t("shared.passphraseRequired")); return; }

    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1) { setError(t("ca.daysPositive")); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await pkiService.generateCA({
        name: genName.trim(),
        key_type: keyType,
        key_size: parseInt(keySize, 10),
        country: country || undefined,
        state: state || undefined,
        locality: locality || undefined,
        organization: organization || undefined,
        common_name: commonName.trim(),
        days: daysNum,
        encrypt_key: encryptKey,
        passphrase: encryptKey ? passphrase : undefined,
        revoke,
        system_install: systemInstall,
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

  const handleSubmit = mode === "generate" ? handleGenerateSubmit : handleImportSubmit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {isEdit ? t("ca.titleEdit") : t("ca.titleAdd")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("ca.editing", { name: existingCA?.name ?? "" }) : t("ca.importOrGenerate")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {!isEdit && (
              <Tabs value={mode} onValueChange={(v) => { setMode(v as "import" | "generate"); setError(null); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="import" className="flex-1">{t("shared.import")}</TabsTrigger>
                  <TabsTrigger value="generate" className="flex-1">{t("shared.generate")}</TabsTrigger>
                </TabsList>

                <TabsContent value="import" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ca-name">{tc("name")}</Label>
                    <Input id="ca-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-ca" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ca-cert">{t("shared.certificatePem")}</Label>
                    <Textarea
                      id="ca-cert"
                      value={certificate}
                      onChange={(e) => setCertificate(e.target.value)}
                      placeholder="-----BEGIN CERTIFICATE-----"
                      className="font-mono text-xs"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ca-desc">{tc("description")}</Label>
                    <Input id="ca-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("shared.descriptionPlaceholder")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ca-key">{t("shared.privateKeyPem")}</Label>
                    <Textarea
                      id="ca-key"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      className="font-mono text-xs"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="ca-pwd" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
                    <Label htmlFor="ca-pwd">{t("shared.passwordProtected")}</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ca-crl">{t("ca.crl")}</Label>
                    <Textarea
                      id="ca-crl"
                      value={crl}
                      onChange={(e) => setCrl(e.target.value)}
                      placeholder={t("ca.crlPlaceholder")}
                      className="font-mono text-xs"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="generate" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gen-name">{tc("name")}</Label>
                    <Input id="gen-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-ca" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gen-cn">{t("shared.commonName")}</Label>
                    <Input id="gen-cn" value={commonName} onChange={(e) => setCommonName(e.target.value)} placeholder={t("ca.cnPlaceholder")} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gen-keytype">{t("shared.keyType")}</Label>
                      <Select value={keyType} onValueChange={(v) => setKeyType(v as "rsa" | "ec")}>
                        <SelectTrigger id="gen-keytype">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rsa">RSA</SelectItem>
                          <SelectItem value="ec">{t("shared.ecLabel")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gen-keysize">{t("shared.keySize")}</Label>
                      <Select value={keySize} onValueChange={setKeySize}>
                        <SelectTrigger id="gen-keysize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(keyType === "rsa" ? rsaKeySizes : ecKeySizes).map((size) => (
                            <SelectItem key={size} value={size}>
                              {keyType === "rsa" ? t("shared.bits", { size }) : keyType === "ec" ? `${size} (P-${size})` : size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gen-country">{t("shared.country")}</Label>
                      <Input id="gen-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" maxLength={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gen-state">{t("shared.state")}</Label>
                      <Input id="gen-state" value={state} onChange={(e) => setState(e.target.value)} placeholder="California" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gen-locality">{t("shared.locality")}</Label>
                      <Input id="gen-locality" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="San Francisco" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gen-org">{t("shared.organization")}</Label>
                      <Input id="gen-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder={t("ca.orgPlaceholder")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gen-days">{t("shared.validityDays")}</Label>
                    <Input id="gen-days" type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="3650" min={1} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="gen-encrypt" checked={encryptKey} onCheckedChange={(v) => setEncryptKey(!!v)} />
                      <Label htmlFor="gen-encrypt">{t("shared.encryptPrivateKey")}</Label>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                      <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600">
                        {t("shared.encryptKeyWarning")}
                      </p>
                    </div>

                    {encryptKey && (
                      <div className="space-y-2">
                        <Label htmlFor="gen-passphrase">{t("shared.passphrase")}</Label>
                        <Input
                          id="gen-passphrase"
                          type="password"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          placeholder={t("shared.enterPassphrase")}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Edit mode - import fields only */}
            {isEdit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ca-cert-edit">{t("shared.certificatePem")}</Label>
                  <Textarea
                    id="ca-cert-edit"
                    value={certificate}
                    onChange={(e) => setCertificate(e.target.value)}
                    placeholder={t("shared.leaveEmpty")}
                    className="font-mono text-xs"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ca-desc-edit">{tc("description")}</Label>
                  <Input id="ca-desc-edit" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("shared.descriptionPlaceholder")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ca-key-edit">{t("shared.privateKeyPem")}</Label>
                  <Textarea
                    id="ca-key-edit"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder={t("shared.leaveEmpty")}
                    className="font-mono text-xs"
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="ca-pwd-edit" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
                  <Label htmlFor="ca-pwd-edit">{t("shared.passwordProtected")}</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ca-crl-edit">{t("ca.crl")}</Label>
                  <Textarea
                    id="ca-crl-edit"
                    value={crl}
                    onChange={(e) => setCrl(e.target.value)}
                    placeholder={t("ca.crlPlaceholder")}
                    className="font-mono text-xs"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Shared fields */}
            <div className="flex items-center space-x-2">
              <Checkbox id="ca-revoke-shared" checked={revoke} onCheckedChange={(v) => setRevoke(!!v)} />
              <Label htmlFor="ca-revoke-shared">{t("shared.revoke")}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="ca-sysinstall-shared" checked={systemInstall} onCheckedChange={(v) => setSystemInstall(!!v)} />
              <Label htmlFor="ca-sysinstall-shared">{t("ca.systemInstall")}</Label>
            </div>
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
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === "generate" ? t("shared.generating") : tc("saving")}</>
            ) : isEdit ? t("shared.saveChanges") : mode === "generate" ? t("ca.generateButton") : t("ca.importButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
