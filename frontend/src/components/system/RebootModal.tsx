"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Power } from "lucide-react";
import { powerService } from "@/lib/api/power";
import { ApiError } from "@/lib/types/api";

interface RebootModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RebootModal({ open, onOpenChange, onSuccess }: RebootModalProps) {
  const t = useTranslations("power");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"now" | "at" | "in">("now");
  const [timeValue, setTimeValue] = useState("");
  const [minutesValue, setMinutesValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let value: string | undefined;

      if (action === "at") {
        if (!timeValue.trim()) {
          setError(t("modal.enterTime"));
          setLoading(false);
          return;
        }
        value = timeValue;
      } else if (action === "in") {
        if (!minutesValue.trim()) {
          setError(t("modal.enterMinutes"));
          setLoading(false);
          return;
        }
        value = minutesValue;
      }

      await powerService.reboot({ action, value });

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("reboot.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAction("now");
    setTimeValue("");
    setMinutesValue("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-orange-500" />
            {t("reboot.title")}
          </DialogTitle>
          <DialogDescription>
            {t("reboot.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Reboot Options */}
          <div className="space-y-4">
            <Label>{t("reboot.options")}</Label>
            <RadioGroup value={action} onValueChange={(value) => setAction(value as "now" | "at" | "in")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="now" id="now" />
                <Label htmlFor="now" className="font-normal cursor-pointer">
                  {t("reboot.now")}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="at" id="at" />
                <Label htmlFor="at" className="font-normal cursor-pointer">
                  {t("reboot.at")}
                </Label>
              </div>

              {action === "at" && (
                <div className="ml-6 mt-2">
                  <Label htmlFor="time" className="text-sm text-muted-foreground">
                    {t("modal.timeLabel")}
                  </Label>
                  <Input
                    id="time"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    placeholder="19:30"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("modal.timeHint")}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in" id="in" />
                <Label htmlFor="in" className="font-normal cursor-pointer">
                  {t("reboot.in")}
                </Label>
              </div>

              {action === "in" && (
                <div className="ml-6 mt-2">
                  <Label htmlFor="minutes" className="text-sm text-muted-foreground">
                    {t("modal.minutesLabel")}
                  </Label>
                  <Input
                    id="minutes"
                    type="number"
                    min="1"
                    value={minutesValue}
                    onChange={(e) => setMinutesValue(e.target.value)}
                    placeholder="5"
                    className="mt-1"
                  />
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">{t("reboot.warning")}</p>
                <p className="mt-1">
                  {action === "now"
                    ? t("reboot.warningNow")
                    : t("reboot.warningScheduled")}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? t("modal.scheduling") : action === "now" ? t("reboot.submitNow") : t("reboot.submitSchedule")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
