"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, AlertTriangle, Power, PowerOff, X } from "lucide-react";
import { powerService, PowerStatusResponse } from "@/lib/api/power";
import type { ApiError } from "@/lib/types/api";

interface PowerActionBannerProps {
  powerStatus: PowerStatusResponse | null;
}

/** Identifies one cancellation, so its notice shows once however often it is pushed. */
function cancelNoticeKey(status: PowerStatusResponse): string | null {
  if (!status.cancelled) return null;
  return `${status.action_type ?? ""}|${status.scheduled_time ?? ""}|${status.cancelled_by ?? ""}`;
}

export function PowerActionBanner({ powerStatus }: PowerActionBannerProps) {
  const t = useTranslations("power.banner");
  const [local, setLocal] = useState<{
    from: PowerStatusResponse | null;
    status: PowerStatusResponse;
  } | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  // The SSE-driven prop wins; a status fetched after a cancel shows until the
  // next push replaces the prop.
  const status = local && local.from === powerStatus ? local.status : powerStatus;
  const noticeKey = status ? cancelNoticeKey(status) : null;
  const showCancelledMessage = noticeKey !== null && noticeKey !== dismissedNotice;

  // A cancellation notice shows for 5 seconds, once per cancellation.
  useEffect(() => {
    if (!showCancelledMessage) return;
    const timer = setTimeout(() => setDismissedNotice(noticeKey), 5000);
    return () => clearTimeout(timer);
  }, [showCancelledMessage, noticeKey]);

  // Update countdown every second
  useEffect(() => {
    if (!status?.scheduled || !status.scheduled_time) return;

    const updateCountdown = () => {
      const scheduledTime = new Date(status.scheduled_time!);
      const now = new Date();
      const diff = scheduledTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(t("executingNow"));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(t("countdownHours", { hours, minutes, seconds }));
      } else if (minutes > 0) {
        setCountdown(t("countdownMinutes", { minutes, seconds }));
      } else {
        setCountdown(t("countdownSeconds", { seconds }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status, t]);

  const closeConfirm = () => {
    if (cancelling) return;
    setConfirmOpen(false);
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    if (!status?.action_type) return;

    setCancelling(true);
    setCancelError(null);
    try {
      if (status.action_type === "reboot") {
        await powerService.reboot({ action: "cancel" });
      } else {
        await powerService.poweroff({ action: "cancel" });
      }
    } catch (err) {
      setCancelError((err as ApiError).message || t("cancelFailed"));
      setCancelling(false);
      return;
    }
    setCancelling(false);
    setConfirmOpen(false);

    // SSE will push updated status shortly; also fetch eagerly
    try {
      const result = await powerService.getStatus();
      setLocal({ from: powerStatus, status: result });
    } catch {
      // The SSE refresh delivers the same status
    }
  };

  // Don't show banner if no scheduled action
  if (!status?.scheduled && !showCancelledMessage) {
    return null;
  }

  // Show cancelled message
  if (showCancelledMessage && status?.cancelled) {
    return (
      <div className="bg-green-50 dark:bg-green-950/20 border-b border-green-200 dark:border-green-900">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Power className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  {status.action_type === "reboot" ? t("rebootCancelled") : t("poweroffCancelled")}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {t("cancelledBy", { name: status.cancelled_by_name || t("unknown") })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissedNotice(noticeKey)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isReboot = status?.action_type === "reboot";
  const bgColor = isReboot
    ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
  const textColor = isReboot
    ? "text-orange-900 dark:text-orange-100"
    : "text-red-900 dark:text-red-100";
  const subtextColor = isReboot
    ? "text-orange-700 dark:text-orange-300"
    : "text-red-700 dark:text-red-300";
  const iconColor = isReboot
    ? "text-orange-600 dark:text-orange-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className={`${bgColor} border-b`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isReboot ? (
              <Power className={`h-5 w-5 ${iconColor} animate-pulse`} />
            ) : (
              <PowerOff className={`h-5 w-5 ${iconColor} animate-pulse`} />
            )}
            <div>
              <p className={`text-sm font-medium ${textColor}`}>
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {isReboot ? t("rebootScheduled") : t("poweroffScheduled")}
              </p>
              <p className={`text-xs ${subtextColor}`}>
                {countdown && t("inCountdown", { countdown })}
                {t("scheduledBy", { name: status?.scheduled_by_name || t("unknown") })}
                {status?.scheduled_time &&
                  ` • ${new Date(status.scheduled_time).toLocaleString()}`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={cancelling}
            className="border-current"
          >
            {cancelling ? t("cancelling") : isReboot ? t("cancelReboot") : t("cancelPoweroff")}
          </Button>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{isReboot ? t("cancelRebootTitle") : t("cancelPoweroffTitle")}</DialogTitle>
            <DialogDescription>
              {t("scheduledBy", { name: status?.scheduled_by_name || t("unknown") })}
              {status?.scheduled_time &&
                ` • ${new Date(status.scheduled_time).toLocaleString()}`}
            </DialogDescription>
          </DialogHeader>

          {cancelError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{cancelError}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm} disabled={cancelling}>
              {t("keepScheduled")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelling}>
              {cancelling ? t("cancelling") : isReboot ? t("cancelReboot") : t("cancelPoweroff")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
