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
import { inputService, type InputCapabilities } from "@/lib/api/input";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface CreateInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: InputCapabilities | null;
  existingInterfaces: string[];
}

export function CreateInputModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
}: CreateInputModalProps) {
  const [name, setName] = useState("ifb0");
  const [description, setDescription] = useState("");
  const [redirect, setRedirect] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`ifb${i}`)) {
      i++;
    }
    return `ifb${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setRedirect("");
    setDisabled(false);
    setError(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^ifb\d+$/.test(name)) return "Name must be ifb0, ifb1, etc.";
    if (existingInterfaces.includes(name)) return `Interface ${name} already exists`;
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: Parameters<typeof inputService.createInterface>[0] = {
        name,
      };

      if (description.trim()) config.description = description.trim();
      if (redirect.trim()) config.redirect = redirect.trim();
      if (disabled) config.disabled = true;

      const result = await inputService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create input interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Create Input Interface
          </DialogTitle>
          <DialogDescription>
            Create a new Input Functional Block (IFB) interface for traffic redirection and shaping.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Interface Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ifb0"
            />
            <p className="text-xs text-muted-foreground">Must match pattern: ifb0, ifb1, ifb2, ...</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
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
            <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} id="disabled" />
            <Label htmlFor="disabled" className="font-normal">Disable Interface</Label>
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
                Creating...
              </>
            ) : (
              "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
