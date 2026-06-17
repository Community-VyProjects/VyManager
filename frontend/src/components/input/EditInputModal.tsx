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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { inputService, type InputInterface, type InputCapabilities } from "@/lib/api/input";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface EditInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: InputInterface | null;
  capabilities: InputCapabilities | null;
}

export function EditInputModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  capabilities,
}: EditInputModalProps) {
  const [description, setDescription] = useState("");
  const [redirect, setRedirect] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interfaceData) {
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
      setDescription(interfaceData.description ?? "");
      setRedirect(interfaceData.redirect ?? "");
      setDisabled(interfaceData.disable ?? false);
      setError(null);
    }
  }, [interfaceData]);

  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const result = await inputService.updateInterface(interfaceData.name, interfaceData, {
        description: description.trim() || null,
        redirect: redirect.trim() || null,
        disabled,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update input interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Edit Input Interface
          </DialogTitle>
          <DialogDescription>
            Editing interface{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
              {interfaceData.name}
            </code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Interface Name</Label>
            <code className="block rounded bg-muted px-3 py-2 font-mono text-sm text-foreground">
              {interfaceData.name}
            </code>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label>Redirect To</Label>
            <InterfaceSelect
              value={redirect || "none"}
              onValueChange={(v) => setRedirect(v === "none" ? "" : v)}
              interfaces={availableInterfaces}
              noneOption={{ label: "None", value: "none" }}
              placeholder="None"
            />
            <p className="text-xs text-muted-foreground">Redirect incoming packets to a destination interface</p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="edit-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
            <Label htmlFor="edit-disabled" className="font-normal">Disable Interface</Label>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
