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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { OspfArea } from "@/lib/api/ospf";

interface OspfAreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (area: OspfArea) => Promise<void>;
  existingArea?: OspfArea | null;
  accessListNames?: string[];
}

export function OspfAreaModal({
  open,
  onOpenChange,
  onSubmit,
  existingArea,
  accessListNames = [],
}: OspfAreaModalProps) {
  const isEditMode = !!existingArea;

  const [areaId, setAreaId] = useState("");
  const [areaType, setAreaType] = useState("");
  const [noSummary, setNoSummary] = useState(false);
  const [defaultCost, setDefaultCost] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);
  const [newNetwork, setNewNetwork] = useState("");
  const [authentication, setAuthentication] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [exportList, setExportList] = useState("");
  const [importList, setImportList] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingArea) {
        setAreaId(existingArea.area_id);
        setAreaType(existingArea.area_type || "");
        setNoSummary(existingArea.area_type_no_summary);
        setDefaultCost(existingArea.area_type_default_cost != null ? String(existingArea.area_type_default_cost) : "");
        setNetworks([...existingArea.networks]);
        setAuthentication(existingArea.authentication || "");
        setShortcut(existingArea.shortcut || "");
        setExportList(existingArea.export_list || "");
        setImportList(existingArea.import_list || "");
      } else {
        resetForm();
      }
    }
  }, [open, existingArea]);

  const resetForm = () => {
    setAreaId("");
    setAreaType("");
    setNoSummary(false);
    setDefaultCost("");
    setNetworks([]);
    setNewNetwork("");
    setAuthentication("");
    setShortcut("");
    setExportList("");
    setImportList("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addNetwork = () => {
    const net = newNetwork.trim();
    if (!net) return;
    if (networks.includes(net)) {
      setError("Network already exists");
      return;
    }
    setNetworks([...networks, net]);
    setNewNetwork("");
    setError(null);
  };

  const removeNetwork = (idx: number) => {
    setNetworks(networks.filter((_, i) => i !== idx));
  };

  const validateForm = (): string | null => {
    if (!areaId.trim()) return "Area ID is required";
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
      const area: OspfArea = {
        area_id: areaId.trim(),
        area_type: areaType || null,
        area_type_no_summary: noSummary,
        area_type_default_cost: defaultCost.trim() ? parseInt(defaultCost.trim(), 10) : null,
        networks,
        ranges: existingArea?.ranges || [],
        authentication: authentication || null,
        shortcut: shortcut || null,
        export_list: exportList.trim() || null,
        import_list: importList.trim() || null,
        virtual_links: existingArea?.virtual_links || [],
      };

      await onSubmit(area);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const showStubNssaOptions = areaType === "stub" || areaType === "nssa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit OSPF Area" : "Add OSPF Area"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify OSPF area ${existingArea?.area_id} configuration.`
              : "Configure a new OSPF area."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pb-2">
            {/* Area ID */}
            <div className="space-y-2">
              <Label htmlFor="ospf-area-id">Area ID</Label>
              <Input
                id="ospf-area-id"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                placeholder="0.0.0.0 or integer"
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Area identifier in dotted-decimal or integer format.
              </p>
            </div>

            {/* Area Type */}
            <div className="space-y-2">
              <Label htmlFor="ospf-area-type">Area Type</Label>
              <Select value={areaType} onValueChange={setAreaType}>
                <SelectTrigger id="ospf-area-type">
                  <SelectValue placeholder="Normal (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="stub">Stub</SelectItem>
                  <SelectItem value="nssa">NSSA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stub/NSSA options */}
            {showStubNssaOptions && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ospf-area-no-summary"
                    checked={noSummary}
                    onCheckedChange={(checked) => setNoSummary(checked === true)}
                  />
                  <Label htmlFor="ospf-area-no-summary" className="cursor-pointer">
                    No Summary (Totally {areaType === "stub" ? "Stubby" : "NSSA"})
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospf-area-default-cost">Default Cost</Label>
                  <Input
                    id="ospf-area-default-cost"
                    type="number"
                    value={defaultCost}
                    onChange={(e) => setDefaultCost(e.target.value)}
                    placeholder="Default cost for injected default route"
                    min={0}
                  />
                </div>
              </div>
            )}

            {/* Networks */}
            <div className="space-y-2">
              <Label>Networks</Label>
              <div className="flex gap-2">
                <Input
                  value={newNetwork}
                  onChange={(e) => setNewNetwork(e.target.value)}
                  placeholder="e.g. 10.0.0.0/24"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNetwork())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addNetwork}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {networks.length > 0 && (
                <div className="space-y-1 mt-2">
                  {networks.map((net, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <span className="text-sm font-mono">{net}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeNetwork(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                CIDR prefixes to include in this area.
              </p>
            </div>

            {/* Authentication */}
            <div className="space-y-2">
              <Label htmlFor="ospf-area-auth">Authentication</Label>
              <Select value={authentication} onValueChange={setAuthentication}>
                <SelectTrigger id="ospf-area-auth">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="plaintext-password">Plaintext Password</SelectItem>
                  <SelectItem value="md5">MD5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shortcut */}
            <div className="space-y-2">
              <Label htmlFor="ospf-area-shortcut">Shortcut</Label>
              <Select value={shortcut} onValueChange={setShortcut}>
                <SelectTrigger id="ospf-area-shortcut">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="enable">Enable</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export/Import Lists */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ospf-area-export">Export List</Label>
                <Select
                  value={exportList}
                  onValueChange={(v) => setExportList(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="ospf-area-export">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {accessListNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ospf-area-import">Import List</Label>
                <Select
                  value={importList}
                  onValueChange={(v) => setImportList(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="ospf-area-import">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {accessListNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
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
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Area"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
