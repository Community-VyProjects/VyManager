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
import { FeatureGroup } from "@/lib/api/user-management";
import type { ApiError } from "@/lib/types/api";
import { usePermissions } from "@/hooks/usePermissions";

interface PowerActionBannerProps {
  powerStatus: PowerStatusResponse | null;
}

/** Identifies one cancellation, so its notice shows once however often it is pushed. */
function cancelNoticeKey(status: PowerStatusResponse): string | null {
  if (!status.cancelled || !status.id) return null;
  return status.id;
}

/** The stored row of the pending action, so the confirm dialog belongs to it alone. */
function scheduleKey(status: PowerStatusResponse | null): string | null {
  if (!status?.scheduled || !status.id) return null;
  return status.id;
}

export function PowerActionBanner({ powerStatus: status }: PowerActionBannerProps) {
  const t = useTranslations("power.banner");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const [countdown, setCountdown] = useState<{ for: string; text: string } | null>(null);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  const currentSchedule = scheduleKey(status);
  const confirmOpen = confirmFor !== null && confirmFor === currentSchedule;
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
    const scheduledFor = status?.scheduled ? status.scheduled_time : undefined;
    if (!scheduledFor) return;

    const updateCountdown = () => {
      const setText = (text: string) => setCountdown({ for: scheduledFor, text });
      const scheduledTime = new Date(scheduledFor);
      const now = new Date();
      const diff = scheduledTime.getTime() - now.getTime();

      if (diff <= 0) {
        setText(t("executingNow"));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setText(t("countdownHours", { hours, minutes, seconds }));
      } else if (minutes > 0) {
        setText(t("countdownMinutes", { minutes, seconds }));
      } else {
        setText(t("countdownSeconds", { seconds }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status, t]);

  const openConfirm = () => {
    setCancelError(null);
    setConfirmFor(currentSchedule);
  };

  const closeConfirm = () => {
    if (cancelling) return;
    setConfirmFor(null);
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
    // The cancel route sends the power_status signal; useBannerEvents then
    // re-reads GET /status and the prop switches to the cancelled notice.
    setCancelling(false);
    setConfirmFor(null);
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
                {countdown && countdown.for === status?.scheduled_time &&
                  t("inCountdown", { countdown: countdown.text })}
                {t("scheduledBy", { name: status?.scheduled_by_name || t("unknown") })}
                {status?.scheduled_time &&
                  ` • ${new Date(status.scheduled_time).toLocaleString()}`}
              </p>
            </div>
          </div>

          {canWrite(FeatureGroup.POWER) && (
            <Button
              variant="outline"
              size="sm"
              onClick={openConfirm}
              disabled={cancelling}
              className="border-current"
            >
              {cancelling ? t("cancelling") : tc("cancel")}
            </Button>
          )}
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
              {tc("cancel")}
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
