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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipNgDistributeListInterface } from "@/lib/api/ripng";

interface RipngDistributeListInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipNgDistributeListInterface) => Promise<void>;
  existingEntry?: RipNgDistributeListInterface | null;
  existingInterfaces: string[];
  availableInterfaces: string[];
  accessListNames: string[];
  prefixListNames: string[];
}

export function RipngDistributeListInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingInterfaces,
  availableInterfaces,
  accessListNames,
  prefixListNames,
}: RipngDistributeListInterfaceModalProps) {
  const isEditMode = !!existingEntry;

  const [iface, setIface] = useState("");
  const [aclIn, setAclIn] = useState("");
  const [aclOut, setAclOut] = useState("");
  const [plIn, setPlIn] = useState("");
  const [plOut, setPlOut] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableInterfaces = isEditMode
    ? availableInterfaces
    : availableInterfaces.filter((i) => !existingInterfaces.includes(i));

  useEffect(() => {
    if (!open) return;
    if (existingEntry) {
      setIface(existingEntry.interface);
      setAclIn(existingEntry.access_list_in || "");
      setAclOut(existingEntry.access_list_out || "");
      setPlIn(existingEntry.prefix_list_in || "");
      setPlOut(existingEntry.prefix_list_out || "");
    } else {
      setIface("");
      setAclIn("");
      setAclOut("");
      setPlIn("");
      setPlOut("");
      setError(null);
    }
  }, [open, existingEntry]);

  const handleClose = () => {
    setIface("");
    setAclIn("");
    setAclOut("");
    setPlIn("");
    setPlOut("");
    setError(null);
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (!iface) return "Please select an interface";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry: RipNgDistributeListInterface = {
      interface: iface,
      access_list_in: aclIn || null,
      access_list_out: aclOut || null,
      prefix_list_in: plIn || null,
      prefix_list_out: plOut || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(entry);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const renderAclSelect = (value: string, onChange: (v: string) => void, id: string) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {accessListNames.map((al) => (
          <SelectItem key={al} value={al} className="font-mono">{al}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderPlSelect = (value: string, onChange: (v: string) => void, id: string) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {prefixListNames.map((pl) => (
          <SelectItem key={pl} value={pl} className="font-mono">{pl}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Interface Filter" : "Add Interface Filter"}
          </DialogTitle>
          <DialogDescription>
            Configure distribute list filters for a specific interface.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Interface */}
          <div className="space-y-2">
            <Label>Interface</Label>
            <Select value={iface} onValueChange={setIface} disabled={isEditMode}>
              <SelectTrigger className={isEditMode ? "bg-muted" : ""}>
                <SelectValue placeholder="Select interface" />
              </SelectTrigger>
              <SelectContent>
                {selectableInterfaces.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-acl-in">Access List In</Label>
              {renderAclSelect(aclIn, setAclIn, "ripng-dl-acl-in")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-acl-out">Access List Out</Label>
              {renderAclSelect(aclOut, setAclOut, "ripng-dl-acl-out")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-pl-in">Prefix List In</Label>
              {renderPlSelect(plIn, setPlIn, "ripng-dl-pl-in")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-pl-out">Prefix List Out</Label>
              {renderPlSelect(plOut, setPlOut, "ripng-dl-pl-out")}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Adding..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Filter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
