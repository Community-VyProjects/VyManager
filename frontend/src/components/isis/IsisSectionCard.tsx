"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Pencil, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface IsisSectionCardProps {
  title: string;
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  error: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  className?: string;
  children: ReactNode;
}

/** A card whose fields are read-only until Edit; Save commits them in one batch. */
export function IsisSectionCard({
  title,
  canEdit,
  editing,
  saving,
  error,
  onEdit,
  onCancel,
  onSave,
  className,
  children,
}: IsisSectionCardProps) {
  const tc = useTranslations("common");
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          {canEdit && (
            !editing ? (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit} aria-label={tc("edit")}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel} disabled={saving}
                  aria-label={tc("cancel")}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" className="h-7 px-2" onClick={onSave} disabled={saving} aria-label={tc("save")}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          )}
        </div>
        {error && (
          <div className="mb-3 p-2 rounded-md bg-destructive/10 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
