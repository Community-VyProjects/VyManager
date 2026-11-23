"use client";

import { useState, type ReactNode } from "react";
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
import { useTranslations } from "next-intl";
import type { ApiError } from "@/lib/types/api";

export interface IsisConfirm {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Commits the change; a rejection keeps the dialog open with the device error. */
  run: () => Promise<unknown>;
}

interface IsisConfirmDialogProps {
  confirm: IsisConfirm | null;
  onClose: () => void;
}

/** Cancel / Apply for a page control that changes router config. Closes only after a commit succeeds. */
export function IsisConfirmDialog({ confirm, onClose }: IsisConfirmDialogProps) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!confirm) return;
    setLoading(true);
    setError(null);
    try {
      await confirm.run();
      onClose();
    } catch (err: unknown) {
      setError((err as ApiError).message || t("confirm.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog
      open={!!confirm}
      onOpenChange={(next) => {
        if (next || loading) return;
        setError(null);
        onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={confirm?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirm?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
