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
    if (!name.trim()) { setError("Name is required"); return; }

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

    setLoading(true);
    setError(null);

    try {
      const result = await pkiService.generateOpenVPNSecret(genName.trim());

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {isEdit ? "Edit" : "Add"} OpenVPN Shared Secret
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing secret: ${existingSecret?.name}` : "Import an existing shared secret or generate a new one"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit ? (
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "import" | "generate"); setError(null); }}>
              <TabsList className="w-full">
                <TabsTrigger value="import" className="flex-1">Import</TabsTrigger>
                <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="ovpn-name">Name</Label>
                  <Input id="ovpn-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-secret" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ovpn-key">Key</Label>
                  <Textarea
                    id="ovpn-key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Shared secret key"
                    className="font-mono text-xs"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ovpn-version">Version</Label>
                  <Input id="ovpn-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g., 1" />
                </div>
              </TabsContent>

              <TabsContent value="generate" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="gen-ovpn-name">Name</Label>
                  <Input id="gen-ovpn-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-secret" />
                </div>
                <p className="text-xs text-muted-foreground">
                  The shared secret will be generated and installed on the device automatically using VyOS's built-in generator.
                </p>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="ovpn-key-edit">Key</Label>
                <Textarea
                  id="ovpn-key-edit"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Leave empty to keep current"
                  className="font-mono text-xs"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ovpn-version-edit">Version</Label>
                <Input id="ovpn-version-edit" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g., 1" />
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === "generate" && !isEdit ? "Generating..." : "Saving..."}</>
            ) : isEdit ? "Save Changes" : mode === "generate" ? "Generate Secret" : "Import Secret"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
