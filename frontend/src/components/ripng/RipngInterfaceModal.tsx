"use client";

import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipNgInterface } from "@/lib/api/ripng";
import { ripngInterfaceProblem, ripngProblemArgs } from "@/lib/api/ripng-save-ops";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import type { ApiError } from "@/lib/types/api";

interface RipngInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: RipNgInterface) => Promise<void>;
  existingInterface?: RipNgInterface | null;
  /** Interfaces that already have a RIPng node; Add offers only the others. */
  configuredInterfaces: string[];
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function RipngInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  configuredInterfaces,
}: RipngInterfaceModalProps) {
  const t = useTranslations("ripng");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;

  const [name, setName] = useState(existingInterface?.name ?? "");
  const [splitHorizon, setSplitHorizon] = useState(existingInterface?.split_horizon ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const config: RipNgInterface = { name, split_horizon: splitHorizon || null };
    const problem = ripngInterfaceProblem(existingInterface ?? null, config, configuredInterfaces);
    if (problem) {
      setError(t(`validation.${problem.key}`, ripngProblemArgs(problem)));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onSubmit(config);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("interfaceModal.editTitle") : t("interfaceModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("interfaceModal.editDescription", { name: existingInterface?.name ?? "" })
              : t("interfaceModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4">
            {/* Interface */}
            <div className="space-y-2">
              <Label htmlFor="ripng-iface-name">{t("interfaces.interface")}</Label>
              <InterfaceSelect
                id="ripng-iface-name"
                value={name}
                onValueChange={setName}
                disabled={isEditMode || loading}
                className={isEditMode ? "bg-muted" : ""}
                placeholder={tc("selectInterface")}
                filter={(item) => isEditMode || !configuredInterfaces.includes(item.name)}
              />
            </div>

            {/* Split Horizon */}
            <div className="space-y-2">
              <Label htmlFor="ripng-iface-split-horizon">{t("interfaces.splitHorizon")}</Label>
              <Select
                value={splitHorizon || NONE_SENTINEL}
                onValueChange={(v) => setSplitHorizon(v === NONE_SENTINEL ? "" : v)}
                disabled={loading}
              >
                <SelectTrigger id="ripng-iface-split-horizon">
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                  <SelectItem value="disable">{t("interfaceModal.disable")}</SelectItem>
                  <SelectItem value="poison-reverse">{t("interfaceModal.poisonReverse")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("modal.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              tc("addInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
