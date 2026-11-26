"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ApiError } from "@/lib/types/api";
import type {
  AdminGroup,
  TeInterface,
  TrafficEngineeringCapabilities,
} from "@/lib/api/traffic-engineering";
import {
  teInterfaceFields,
  teInterfaceProblem,
  teRange,
  type TeInterfaceFields,
  type TeInterfaceNumberKey,
} from "@/lib/api/traffic-engineering-save-ops";
import { useTeProblemText } from "./useTeProblemText";

interface TeInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Commits the save; a rejection keeps the dialog open with the device error. */
  onSubmit: (fields: TeInterfaceFields) => Promise<void>;
  existingInterface: TeInterface | null;
  /** Every configured TE interface (the create picker leaves them out). */
  interfaces: TeInterface[];
  adminGroups: AdminGroup[];
  capabilities: TrafficEngineeringCapabilities | null;
}

const NUMBER_LABELS = {
  max_bandwidth: "interfaces.maxBw",
  max_reservable_bandwidth: "interfaces.maxReservBw",
  metric: "interfaces.metric",
} as const satisfies Record<TeInterfaceNumberKey, string>;

export function TeInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  interfaces,
  adminGroups,
  capabilities,
}: TeInterfaceModalProps) {
  const t = useTranslations("trafficEngineering");
  const tc = useTranslations("common");
  const isEditMode = existingInterface !== null;

  // The page remounts this dialog on every open, so the draft starts from the loaded interface.
  const [fields, setFields] = useState<TeInterfaceFields>(() => teInterfaceFields(existingInterface));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problemText = useTeProblemText();

  // Configured groups, plus any loaded name the list lacks, so an edit can still clear it.
  const groupNames = [
    ...adminGroups.map((group) => group.name),
    ...(existingInterface?.admin_groups ?? []).filter(
      (name) => !adminGroups.some((group) => group.name === name),
    ),
  ];
  const bitOf = (name: string) => adminGroups.find((group) => group.name === name)?.bit_position;
  const configuredNames = interfaces.map((iface) => iface.name);

  const toggleGroup = (name: string, checked: boolean) => {
    setFields((prev) => ({
      ...prev,
      adminGroups: checked
        ? [...prev.adminGroups.filter((g) => g !== name), name]
        : prev.adminGroups.filter((g) => g !== name),
    }));
  };

  const handleOpenChange = (next: boolean) => {
    // A close while the commit runs would drop its error.
    if (!next && loading) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const problem = teInterfaceProblem(fields, existingInterface, interfaces, capabilities);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(fields);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("errors.saveInterface"));
    } finally {
      setLoading(false);
    }
  };

  const numberField = (key: TeInterfaceNumberKey) => {
    const range = teRange(capabilities, key);
    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={`te-${key}`}>{t(NUMBER_LABELS[key])}</Label>
        <Input
          id={`te-${key}`}
          type="number"
          min={range?.min}
          max={range?.max}
          value={fields[key]}
          onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
          placeholder={tc("optional")}
          disabled={loading}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("interfaceModal.editTitle") : t("interfaceModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("interfaceModal.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="te-interface">{t("interfaces.interface")}</Label>
              {isEditMode ? (
                <Input id="te-interface" value={fields.name} disabled className="bg-muted" />
              ) : (
                <InterfaceSelect
                  id="te-interface"
                  value={fields.name}
                  onValueChange={(name) => setFields((prev) => ({ ...prev, name }))}
                  filter={(iface) => !configuredNames.includes(iface.name)}
                  disabled={loading}
                  placeholder={tc("selectInterface")}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t("adminGroups")}</Label>
              {groupNames.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  {t("interfaceModal.noGroups")}
                </p>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border max-h-40 overflow-y-auto">
                  {groupNames.map((name) => {
                    const bit = bitOf(name);
                    return (
                      <div key={name} className="flex items-center gap-3 px-3 py-2">
                        <Checkbox
                          id={`ag-${name}`}
                          checked={fields.adminGroups.includes(name)}
                          onCheckedChange={(checked) => toggleGroup(name, checked === true)}
                          disabled={loading}
                        />
                        <Label htmlFor={`ag-${name}`} className="cursor-pointer flex-1 font-normal">
                          <span className="font-mono">{name}</span>
                          {bit != null && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {t("interfaceModal.bit", { position: String(bit) })}
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {numberField("max_bandwidth")}
              {numberField("max_reservable_bandwidth")}
            </div>

            {numberField("metric")}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{error}</span>
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
                {isEditMode ? tc("saving") : tc("creating")}
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
