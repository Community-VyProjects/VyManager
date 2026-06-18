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
import { AlertCircle, Loader2, Key, Info } from "lucide-react";
import { pkiService, PKIKeyPair } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface KeyPairModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingKeyPair: PKIKeyPair | null;
}

export function KeyPairModal({ open, onOpenChange, onSuccess, existingKeyPair }: KeyPairModalProps) {
  const isEdit = !!existingKeyPair;

  const [mode, setMode] = useState<"import" | "generate">("import");

  // Import fields
  const [name, setName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(false);

  // Generate fields
  const [genName, setGenName] = useState("");
  const [keyType, setKeyType] = useState<"rsa" | "ec">("rsa");
  const [keySize, setKeySize] = useState("2048");
  const [encryptKey, setEncryptKey] = useState(false);
  const [passphrase, setPassphrase] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rsaKeySizes = ["2048", "3072", "4096"];
  const ecKeySizes = ["256", "384", "521"];

  useEffect(() => {
    if (open) {
      if (existingKeyPair) {
        setMode("import");
        setName(existingKeyPair.name);
        setPrivateKey("");
        setPublicKey("");
        setPasswordProtected(existingKeyPair.password_protected);
      } else {
        setMode("import");
        setName("");
        setPrivateKey("");
        setPublicKey("");
        setPasswordProtected(false);
        setGenName("");
        setKeyType("rsa");
        setKeySize("2048");
        setEncryptKey(false);
        setPassphrase("");
      }
      setError(null);
    }
  }, [open, existingKeyPair]);

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
      let result;
      if (isEdit) {
        result = await pkiService.updateKeyPair(name.trim(), existingKeyPair!, {
          private_key: privateKey || undefined,
          public_key: publicKey || undefined,
          password_protected: passwordProtected,
        });
      } else {
        result = await pkiService.createKeyPair(name.trim(), {
          private_key: privateKey || undefined,
          public_key: publicKey || undefined,
          password_protected: passwordProtected || undefined,
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
    if (encryptKey && !passphrase) { setError("Passphrase is required when encrypting the key"); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await pkiService.generateKeyPair({
        name: genName.trim(),
        key_type: keyType,
        key_size: parseInt(keySize, 10),
        encrypt_key: encryptKey,
        passphrase: encryptKey ? passphrase : undefined,
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

  const handleSubmit = mode === "generate" && !isEdit ? handleGenerateSubmit : handleImportSubmit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {isEdit ? "Edit" : "Add"} Key Pair
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing key pair: ${existingKeyPair?.name}` : "Import an existing key pair or generate a new one"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {!isEdit ? (
              <Tabs value={mode} onValueChange={(v) => { setMode(v as "import" | "generate"); setError(null); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="import" className="flex-1">Import</TabsTrigger>
                  <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
                </TabsList>

                <TabsContent value="import" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="kp-name">Name</Label>
                    <Input id="kp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-keypair" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kp-privkey">Private Key (PEM)</Label>
                    <Textarea
                      id="kp-privkey"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      className="font-mono text-xs"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kp-pubkey">Public Key (PEM)</Label>
                    <Textarea
                      id="kp-pubkey"
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      placeholder="-----BEGIN PUBLIC KEY-----"
                      className="font-mono text-xs"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="kp-pwd" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
                    <Label htmlFor="kp-pwd">Password Protected</Label>
                  </div>
                </TabsContent>

                <TabsContent value="generate" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="gen-kp-name">Name</Label>
                    <Input id="gen-kp-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-keypair" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gen-kp-keytype">Key Type</Label>
                      <Select value={keyType} onValueChange={(v) => setKeyType(v as "rsa" | "ec")}>
                        <SelectTrigger id="gen-kp-keytype">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rsa">RSA</SelectItem>
                          <SelectItem value="ec">EC (Elliptic Curve)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gen-kp-keysize">Key Size</Label>
                      <Select value={keySize} onValueChange={setKeySize}>
                        <SelectTrigger id="gen-kp-keysize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(keyType === "rsa" ? rsaKeySizes : ecKeySizes).map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}{keyType === "rsa" ? " bits" : ` (P-${size})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="gen-kp-encrypt" checked={encryptKey} onCheckedChange={(v) => setEncryptKey(!!v)} />
                      <Label htmlFor="gen-kp-encrypt">Encrypt Private Key</Label>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                      <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600">
                        If you plan to use the generated key on this router, do not encrypt the private key.
                      </p>
                    </div>

                    {encryptKey && (
                      <div className="space-y-2">
                        <Label htmlFor="gen-kp-passphrase">Passphrase</Label>
                        <Input
                          id="gen-kp-passphrase"
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
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="kp-privkey-edit">Private Key (PEM)</Label>
                  <Textarea
                    id="kp-privkey-edit"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="font-mono text-xs"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kp-pubkey-edit">Public Key (PEM)</Label>
                  <Textarea
                    id="kp-pubkey-edit"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="font-mono text-xs"
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="kp-pwd-edit" checked={passwordProtected} onCheckedChange={(v) => setPasswordProtected(!!v)} />
                  <Label htmlFor="kp-pwd-edit">Password Protected</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === "generate" && !isEdit ? "Generating..." : "Saving..."}</>
            ) : isEdit ? "Save Changes" : mode === "generate" ? "Generate Key Pair" : "Import Key Pair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
