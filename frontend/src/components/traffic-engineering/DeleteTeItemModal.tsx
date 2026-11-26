"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ApiError } from "@/lib/types/api";

/** One admin group, one interface, or the whole `protocols traffic-engineering` tree. */
export type TeDeleteKind = "group" | "interface" | "all";

interface DeleteTeItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: TeDeleteKind;
  /** Group or interface name; unused for the whole-tree delete. */
  name: string;
  /** Commits the delete and closes the dialog; a rejection keeps it open with the device error. */
  onConfirm: () => Promise<void>;
}

const TEXT = {
  group: { title: "deleteGroup.title", description: "deleteGroup.description", confirm: "deleteGroup.title", failed: "errors.deleteGroup" },
  interface: {
    title: "deleteInterface.title",
    description: "deleteInterface.description",
    confirm: "deleteInterface.confirm",
    failed: "errors.deleteInterface",
  },
  all: { title: "deleteAll.title", description: "deleteAll.description", confirm: "deleteAll.title", failed: "errors.deleteAll" },
} as const;

export function DeleteTeItemModal({ open, onOpenChange, kind, name, onConfirm }: DeleteTeItemModalProps) {
  const t = useTranslations("trafficEngineering");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = TEXT[kind];

  const handleConfirm = async (event: React.MouseEvent) => {
    // AlertDialogAction closes on click; close only after the commit succeeds.
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError((err as ApiError).message || t(text.failed));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(text.title)}</AlertDialogTitle>
          <AlertDialogDescription>
            {kind === "all"
              ? t("deleteAll.description")
              : t.rich(text.description, {
                  name,
                  mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tc("deleting")}
              </>
            ) : (
              t(text.confirm)
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
