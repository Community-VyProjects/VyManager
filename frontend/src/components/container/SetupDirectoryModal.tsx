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
import { AlertCircle, FolderOpen, Loader2 } from "lucide-react";
import { containerService } from "@/lib/api/container";

interface Props {
  open: boolean;
  onCreated: () => void;
}

export function SetupDirectoryModal({ open, onCreated }: Props) {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await containerService.createBaseDir();
      if (result.success) {
        onCreated();
      } else {
        setError(result.error || t("setupDir.failed"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("setupDir.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            {t("setupDir.title")}
          </DialogTitle>
          <DialogDescription>
            {t.rich("setupDir.description", {
              path: "/config/containers",
              mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground font-mono">
          /config/containers
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tc("creating")}
              </>
            ) : (
              t("setupDir.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
