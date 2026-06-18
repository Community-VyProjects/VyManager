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
    if (!name.trim()) { setError("Name is required"); return; }

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
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubmit = async () => {
    if (!genName.trim()) { setError("Name is required"); return; }
    if (!commonName.trim()) { setError("Common Name is required"); return; }
    if (encryptKey && !passphrase) { setError("Passphrase is required when encrypting the key"); return; }

    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1) { setError("Days must be a positive number"); return; }

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
        setError(result.error || "Generation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Generation failed");
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
            {isEdit ? "Edit" : "Add"} Certificate Authority
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing CA: ${existingCA?.name}` : "Import an existing CA or generate a new self-signed CA"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {!isEdit && (
              <Tabs value={mode} onValueChange={(v) => { setMode(v as "import" | "generate"); setError(null); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="import" className="flex-1">Import</TabsTrigger>
                  <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
                </TabsList>

                <TabsContent value="import" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ca-name">Name</Label>
                    <Input id="ca-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-ca" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ca-cert">Certificate (PEM)</Label>
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
                    <Label htmlFor="ca-desc">Description</Label>
                    <Input id="ca-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ca-key">Private Key (PEM)</Label>
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
                    <Label htmlFor="ca-pwd">Password Protected</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ca-crl">CRL (one per line)</Label>
                    <Textarea
                      id="ca-crl"
                      value={crl}
                      onChange={(e) => setCrl(e.target.value)}
                      placeholder="Certificate Revocation List entries"
                      className="font-mono text-xs"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="generate" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gen-name">Name</Label>
                    <Input id="gen-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-ca" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gen-cn">Common Name (CN)</Label>
                    <Input id="gen-cn" value={commonName} onChange={(e) => setCommonName(e.target.value)} placeholder="My Root CA" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gen-keytype">Key Type</Label>
                      <Select value={keyType} onValueChange={(v) => setKeyType(v as "rsa" | "ec")}>
                        <SelectTrigger id="gen-keytype">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rsa">RSA</SelectItem>
                          <SelectItem value="ec">EC (Elliptic Curve)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gen-keysize">Key Size</Label>
                      <Select value={keySize} onValueChange={setKeySize}>
                        <SelectTrigger id="gen-keysize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(keyType === "rsa" ? rsaKeySizes : ecKeySizes).map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}{keyType === "rsa" ? " bits" : keyType === "ec" ? ` (P-${size})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gen-country">Country</Label>
                      <Input id="gen-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" maxLength={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gen-state">State</Label>
                      <Input id="gen-state" value={state} onChange={(e) => setState(e.target.value)} placeholder="California" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gen-locality">Locality</Label>
                      <Input id="gen-locality" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="San Francisco" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gen-org">Organization</Label>
                      <Input id="gen-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="My Company" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gen-days">Validity (days)</Label>
                    <Input id="gen-days" type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="3650" min={1} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="gen-encrypt" checked={encryptKey} onCheckedChange={(v) => setEncryptKey(!!v)} />
                      <Label htmlFor="gen-encrypt">Encrypt Private Key</Label>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                      <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600">
                        If you plan to use the generated key on this router, do not encrypt the private key.
                      </p>
                    </div>

                    {encryptKey && (
                      <div className="space-y-2">
                        <Label htmlFor="gen-passphrase">Passphrase</Label>
                        <Input
                          id="gen-passphrase"
                          type="password"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          placeholder="Enter passphrase"
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
                  <Label htmlFor="ca-cert-edit">Certificate (PEM)</Label>
                  <Textarea
                    id="ca-cert-edit"
                    value={certificate}
                    onChange={(e) => setCertificate(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="font-mono text-xs"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ca-desc-edit">Description</Label>
                  <Input id="ca-desc-edit" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ca-key-edit">Private Key (PEM)</Label>
                  <Textarea
                    id="ca-key-edit"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="font-mono text-xs"
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="ca-pwd-edit" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
                  <Label htmlFor="ca-pwd-edit">Password Protected</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ca-crl-edit">CRL (one per line)</Label>
                  <Textarea
                    id="ca-crl-edit"
                    value={crl}
                    onChange={(e) => setCrl(e.target.value)}
                    placeholder="Certificate Revocation List entries"
                    className="font-mono text-xs"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Shared fields */}
            <div className="flex items-center space-x-2">
              <Checkbox id="ca-revoke-shared" checked={revoke} onCheckedChange={(v) => setRevoke(!!v)} />
              <Label htmlFor="ca-revoke-shared">Revoke</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="ca-sysinstall-shared" checked={systemInstall} onCheckedChange={(v) => setSystemInstall(!!v)} />
              <Label htmlFor="ca-sysinstall-shared">System Install</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === "generate" ? "Generating..." : "Saving..."}</>
            ) : isEdit ? "Save Changes" : mode === "generate" ? "Generate CA" : "Import CA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
