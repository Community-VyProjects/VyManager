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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Key, Info } from "lucide-react";
import { pkiService, PKIDH } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface DHModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingDH: PKIDH | null;
}

export function DHModal({ open, onOpenChange, onSuccess, existingDH }: DHModalProps) {
  const isEdit = !!existingDH;

  const [mode, setMode] = useState<"import" | "generate">("import");

  // Import fields
  const [name, setName] = useState("");
  const [parameters, setParameters] = useState("");

  // Generate fields
  const [genName, setGenName] = useState("");
  const [keySize, setKeySize] = useState("2048");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dhKeySizes = ["2048", "3072", "4096"];

  useEffect(() => {
    if (open) {
      if (existingDH) {
        setMode("import");
        setName(existingDH.name);
        setParameters("");
      } else {
        setMode("import");
        setName("");
        setParameters("");
        setGenName("");
        setKeySize("2048");
      }
      setError(null);
    }
  }, [open, existingDH]);

  const handleImportSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (isEdit) {
        result = await pkiService.updateDH(name.trim(), existingDH!, {
          parameters: parameters || undefined,
        });
      } else {
        result = await pkiService.createDH(name.trim(), {
          parameters: parameters || undefined,
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
      const result = await pkiService.generateDH({
        name: genName.trim(),
        key_size: parseInt(keySize, 10),
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
            {isEdit ? "Edit" : "Add"} DH Parameters
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing DH: ${existingDH?.name}` : "Import existing DH parameters or generate new ones"}
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
                  <Label htmlFor="dh-name">Name</Label>
                  <Input id="dh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-dh" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dh-params">Parameters (PEM)</Label>
                  <Textarea
                    id="dh-params"
                    value={parameters}
                    onChange={(e) => setParameters(e.target.value)}
                    placeholder="-----BEGIN DH PARAMETERS-----"
                    className="font-mono text-xs"
                    rows={6}
                  />
                </div>
              </TabsContent>

              <TabsContent value="generate" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="gen-dh-name">Name</Label>
                  <Input id="gen-dh-name" value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="my-dh" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gen-dh-keysize">Key Size</Label>
                  <Select value={keySize} onValueChange={setKeySize}>
                    <SelectTrigger id="gen-dh-keysize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dhKeySizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size} bits
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600">
                    DH parameter generation is computationally intensive and may take a minute or more for larger key sizes.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="dh-params-edit">Parameters (PEM)</Label>
                <Textarea
                  id="dh-params-edit"
                  value={parameters}
                  onChange={(e) => setParameters(e.target.value)}
                  placeholder="Leave empty to keep current"
                  className="font-mono text-xs"
                  rows={6}
                />
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
            ) : isEdit ? "Save Changes" : mode === "generate" ? "Generate DH Parameters" : "Import DH Parameters"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
