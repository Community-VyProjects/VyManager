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
import { AlertCircle, Loader2, FileText, Info } from "lucide-react";
import { pkiService, PKICA, PKICertificate, PKICapabilities, PKIX509Defaults } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingCert: PKICertificate | null;
  capabilities: PKICapabilities | null;
  availableCAs: PKICA[];
  x509Defaults: PKIX509Defaults;
}

export function CertificateModal({
  open,
  onOpenChange,
  onSuccess,
  existingCert,
  capabilities,
  availableCAs,
  x509Defaults,
}: CertificateModalProps) {
  const t = useTranslations("pkiCerts");
  const tc = useTranslations("common");
  const tp = useTranslations("pki");
  const isEdit = !!existingCert;
  const isAcme = !!existingCert?.acme;

  const [mode, setMode] = useState<"manual" | "acme" | "generate">("manual");
  const [name, setName] = useState("");

  // Manual fields
  const [certificate, setCertificate] = useState("");
  const [description, setDescription] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [revoke, setRevoke] = useState(false);

  // ACME fields
  const [domainNames, setDomainNames] = useState("");
  const [email, setEmail] = useState("");
  const [listenAddress, setListenAddress] = useState("");
  const [rsaKeySize, setRsaKeySize] = useState("");
  const [url, setUrl] = useState("");

  // Generate (CA-signed) fields
  const [genName, setGenName] = useState("");
  const [caName, setCaName] = useState("");
  const [keyType, setKeyType] = useState<"rsa" | "ec">("rsa");
  const [keySize, setKeySize] = useState("2048");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [locality, setLocality] = useState("");
  const [organization, setOrganization] = useState("");
  const [commonName, setCommonName] = useState("");
  const [days, setDays] = useState("365");
  const [sans, setSans] = useState("");
  const [encryptKey, setEncryptKey] = useState(false);
  const [passphrase, setPassphrase] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rsaKeySizesAcme = capabilities?.features.acme.rsa_key_sizes || ["2048", "3072", "4096"];
  const supportsIpv6 = capabilities?.features.acme.listen_address_ipv6;

  const rsaKeySizes = ["2048", "3072", "4096"];
  const ecKeySizes = ["256", "384", "521"];

  useEffect(() => {
    if (open) {
      if (existingCert) {
        setName(existingCert.name);
        if (existingCert.acme) {
          setMode("acme");
          setDomainNames(existingCert.acme.domain_names?.join(", ") || "");
          setEmail(existingCert.acme.email || "");
          setListenAddress(existingCert.acme.listen_address || "");
          setRsaKeySize(existingCert.acme.rsa_key_size || "");
          setUrl(existingCert.acme.url || "");
        } else {
          setMode("manual");
          setCertificate("");
          setDescription(existingCert.description || "");
          setPrivateKey("");
          setPasswordProtected(existingCert.password_protected);
          setRevoke(existingCert.revoke);
        }
      } else {
        setMode("manual");
        setName("");
        setCertificate("");
        setDescription("");
        setPrivateKey("");
        setPasswordProtected(false);
        setRevoke(false);
        setDomainNames("");
        setEmail("");
        setListenAddress("");
        setRsaKeySize("");
        setUrl("");
        setGenName("");
        setCaName("");
        setKeyType("rsa");
        setKeySize("2048");
        setCountry(x509Defaults.country || "");
        setState(x509Defaults.state || "");
        setLocality(x509Defaults.locality || "");
        setOrganization(x509Defaults.organization || "");
        setCommonName("");
        setDays("365");
        setSans("");
        setEncryptKey(false);
        setPassphrase("");
      }
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed form fields when the modal opens
  }, [open, existingCert]);

  useEffect(() => {
    if (keyType === "rsa" && !rsaKeySizes.includes(keySize)) {
      setKeySize("2048");
    } else if (keyType === "ec" && !ecKeySizes.includes(keySize)) {
      setKeySize("256");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset key size only when the key type changes
  }, [keyType]);

  const handleManualSubmit = async () => {
    if (!name.trim()) { setError(t("shared.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      const effectiveMode = isEdit ? (isAcme ? "acme" : "manual") : "manual";

      if (effectiveMode === "acme") {
        const domains = domainNames.split(",").map(s => s.trim()).filter(Boolean);
        result = await pkiService.updateACMECertificate(name.trim(), existingCert!, {
          domain_names: domains,
          email,
          listen_address: listenAddress,
          rsa_key_size: rsaKeySize,
          url,
        });
      } else if (isEdit) {
        result = await pkiService.updateCertificate(name.trim(), existingCert!, {
          certificate: certificate || undefined,
          description,
          private_key: privateKey || undefined,
          password_protected: passwordProtected,
          revoke,
        });
      } else {
        result = await pkiService.createCertificate(name.trim(), {
          certificate: certificate || undefined,
          description: description || undefined,
          private_key: privateKey || undefined,
          password_protected: passwordProtected || undefined,
          revoke: revoke || undefined,
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

  const handleAcmeSubmit = async () => {
    if (!name.trim()) { setError(t("shared.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      const domains = domainNames.split(",").map(s => s.trim()).filter(Boolean);
      const result = await pkiService.createACMECertificate(name.trim(), {
        domain_names: domains.length > 0 ? domains : undefined,
        email: email || undefined,
        listen_address: listenAddress || undefined,
        rsa_key_size: rsaKeySize || undefined,
        url: url || undefined,
      });

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
    if (!caName) { setError(t("cert.selectCARequired")); return; }
    if (!commonName.trim()) { setError(t("shared.commonNameRequired")); return; }
    if (encryptKey && !passphrase) { setError(t("shared.passphraseRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      const sanList = sans.split(",").map(s => s.trim()).filter(Boolean);

      const result = await pkiService.generateCertificate({
        name: genName.trim(),
        ca_name: caName,
        key_type: keyType,
        key_size: parseInt(keySize, 10),
        country: country || undefined,
        state: state || undefined,
        locality: locality || undefined,
        organization: organization || undefined,
        common_name: commonName.trim(),
        days: parseInt(days, 10) || 365,
        subject_alt_names: sanList.length > 0 ? sanList : undefined,
        encrypt_key: encryptKey,
        passphrase: encryptKey ? passphrase : undefined,
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

  const handleSubmit = () => {
    if (isEdit) {
      return handleManualSubmit();
    }
    if (mode === "generate") return handleGenerateSubmit();
    if (mode === "acme") return handleAcmeSubmit();
    return handleManualSubmit();
  };

  const effectiveMode = isEdit ? (isAcme ? "acme" : "manual") : mode;

  // CAs that have both a certificate and private key (needed for signing)
  const signableCAs = availableCAs.filter(ca => ca.certificate && ca.private_key && !ca.password_protected);

  const renderManualFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cert-pem">{t("shared.certificatePem")}</Label>
        <Textarea
          id="cert-pem"
          value={certificate}
          onChange={(e) => setCertificate(e.target.value)}
          placeholder={isEdit ? t("shared.leaveEmpty") : "-----BEGIN CERTIFICATE-----"}
          className="font-mono text-xs"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cert-desc">{tc("description")}</Label>
        <Input id="cert-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("shared.descriptionPlaceholder")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cert-key">{t("shared.privateKeyPem")}</Label>
        <Textarea
          id="cert-key"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder={isEdit ? t("shared.leaveEmpty") : "-----BEGIN PRIVATE KEY-----"}
          className="font-mono text-xs"
          rows={4}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="cert-pwd" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
        <Label htmlFor="cert-pwd">{t("shared.passwordProtected")}</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="cert-revoke" checked={revoke} onCheckedChange={(v) => setRevoke(!!v)} />
        <Label htmlFor="cert-revoke">{t("shared.revoke")}</Label>
      </div>
    </div>
  );

  const renderAcmeFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="acme-domains">{t("cert.domainNames")}</Label>
        <Input
          id="acme-domains"
          value={domainNames}
          onChange={(e) => setDomainNames(e.target.value)}
          // eslint-disable-next-line vymanager/no-untranslated-text -- example value
          placeholder="example.com, www.example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acme-email">{t("cert.email")}</Label>
        <Input
          id="acme-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acme-listen">{t("cert.listenAddress")}</Label>
        <Input
          id="acme-listen"
          value={listenAddress}
          onChange={(e) => setListenAddress(e.target.value)}
          placeholder={supportsIpv6 ? t("cert.listenIpv4or6") : t("cert.listenIpv4")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acme-rsa">{t("cert.rsaKeySize")}</Label>
        <Select value={rsaKeySize} onValueChange={setRsaKeySize}>
          <SelectTrigger id="acme-rsa">
            <SelectValue placeholder={t("cert.selectKeySize")} />
          </SelectTrigger>
          <SelectContent>
            {rsaKeySizesAcme.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="acme-url">{t("cert.acmeUrl")}</Label>
        <Input
          id="acme-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://acme-v02.api.letsencrypt.org/directory"
        />
      </div>
    </div>
  );

  const renderGenerateFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gen-cert-name">{tc("name")}</Label>
        <Input id="gen-cert-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-cert" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-cert-ca">{t("cert.signingCA")}</Label>
        {signableCAs.length > 0 ? (
          <Select value={caName} onValueChange={setCaName}>
            <SelectTrigger id="gen-cert-ca">
              <SelectValue placeholder={t("cert.selectCA")} />
            </SelectTrigger>
            <SelectContent>
              {signableCAs.map((ca) => (
                <SelectItem key={ca.name} value={ca.name}>{ca.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600">
              {t("cert.noSignableCAs")}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-cert-cn">{t("shared.commonName")}</Label>
        <Input id="gen-cert-cn" value={commonName} onChange={(e) => setCommonName(e.target.value)} placeholder="server.example.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-cert-sans">{t("cert.sans")}</Label>
        <Input
          id="gen-cert-sans"
          value={sans}
          onChange={(e) => setSans(e.target.value)}
          // eslint-disable-next-line vymanager/no-untranslated-text -- example value
          placeholder="server.example.com, 10.0.0.1, *.example.com"
        />
        <p className="text-xs text-muted-foreground">{t("cert.sansHelp")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="gen-cert-keytype">{t("shared.keyType")}</Label>
          <Select value={keyType} onValueChange={(v) => setKeyType(v as "rsa" | "ec")}>
            <SelectTrigger id="gen-cert-keytype">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rsa">RSA</SelectItem>
              <SelectItem value="ec">{t("shared.ecLabel")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gen-cert-keysize">{t("shared.keySize")}</Label>
          <Select value={keySize} onValueChange={setKeySize}>
            <SelectTrigger id="gen-cert-keysize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(keyType === "rsa" ? rsaKeySizes : ecKeySizes).map((size) => (
                <SelectItem key={size} value={size}>
                  {keyType === "rsa" ? t("shared.bits", { size }) : `${size} (P-${size})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-cert-days">{t("shared.validityDays")}</Label>
        <Input id="gen-cert-days" type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="365" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="gen-cert-country">{t("shared.country")}</Label>
          <Input id="gen-cert-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" maxLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gen-cert-state">{t("shared.state")}</Label>
          <Input id="gen-cert-state" value={state} onChange={(e) => setState(e.target.value)} placeholder={tp("x509.statePlaceholder")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="gen-cert-locality">{t("shared.locality")}</Label>
          <Input id="gen-cert-locality" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder={tp("x509.localityPlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gen-cert-org">{t("shared.organization")}</Label>
          <Input id="gen-cert-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder={t("cert.orgPlaceholder")} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="gen-cert-encrypt" checked={encryptKey} onCheckedChange={(v) => setEncryptKey(!!v)} />
          <Label htmlFor="gen-cert-encrypt">{t("shared.encryptPrivateKey")}</Label>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600">
            {t("cert.encryptWarning")}
          </p>
        </div>

        {encryptKey && (
          <div className="space-y-2">
            <Label htmlFor="gen-cert-passphrase">{t("shared.passphrase")}</Label>
            <Input
              id="gen-cert-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={t("shared.enterPassphrase")}
            />
          </div>
        )}
      </div>
    </div>
  );

  const getButtonLabel = () => {
    if (loading) {
      const loadingText = effectiveMode === "generate" ? t("shared.generating") : tc("saving");
      return <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{loadingText}</>;
    }
    if (isEdit) return t("shared.saveChanges");
    if (mode === "generate") return t("cert.titleGenerate");
    if (mode === "acme") return t("cert.createAcmeButton");
    return t("cert.importButton");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEdit ? t("cert.titleEdit") : mode === "generate" ? t("cert.titleGenerate") : t("cert.titleCreate")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("cert.editing", { name: existingCert?.name ?? "" })
              : mode === "generate"
                ? t("cert.generateDescription")
                : t("cert.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {!isEdit ? (
              <Tabs value={mode} onValueChange={(v) => { setMode(v as "manual" | "acme" | "generate"); setError(null); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="manual" className="flex-1">{t("shared.import")}</TabsTrigger>
                  <TabsTrigger value="acme" className="flex-1">ACME</TabsTrigger>
                  <TabsTrigger value="generate" className="flex-1">{t("shared.generate")}</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cert-name">{tc("name")}</Label>
                      <Input id="cert-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-cert" />
                    </div>
                    {renderManualFields()}
                  </div>
                </TabsContent>

                <TabsContent value="acme" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cert-name-acme">{tc("name")}</Label>
                      <Input id="cert-name-acme" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-cert" />
                    </div>
                    {renderAcmeFields()}
                  </div>
                </TabsContent>

                <TabsContent value="generate" className="mt-4">
                  {renderGenerateFields()}
                </TabsContent>
              </Tabs>
            ) : (
              effectiveMode === "acme" ? renderAcmeFields() : renderManualFields()
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
          <Button onClick={handleSubmit} disabled={loading || (mode === "generate" && !isEdit && signableCAs.length === 0)}>
            {getButtonLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
