"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Power, PowerOff, X } from "lucide-react";
import { powerService, PowerStatusResponse } from "@/lib/api/power";

export function PowerActionBanner() {
  const [status, setStatus] = useState<PowerStatusResponse | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelledMessage, setShowCancelledMessage] = useState(false);

  // Poll status every 5 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await powerService.getStatus();
        setStatus(result);

        // If action was just cancelled, show message briefly
        if (result.cancelled && !showCancelledMessage) {
          setShowCancelledMessage(true);
          setTimeout(() => {
            setShowCancelledMessage(false);
            setStatus(null);
          }, 5000); // Show for 5 seconds
        }
      } catch (err) {
        // Ignore errors (user might not have active session)
        setStatus(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [showCancelledMessage]);

  // Update countdown every second
  useEffect(() => {
    if (!status?.scheduled || !status.scheduled_time) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const scheduledTime = new Date(status.scheduled_time!);
      const now = new Date();
      const diff = scheduledTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Executing now...");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // Update every second

    return () => clearInterval(interval);
  }, [status]);

  const handleCancel = async () => {
    if (!status?.action_type) return;

    setCancelling(true);
    try {
      if (status.action_type === "reboot") {
        await powerService.reboot({ action: "cancel" });
      } else {
        await powerService.poweroff({ action: "cancel" });
      }

      // Immediately check status to show cancelled message
      const result = await powerService.getStatus();
      setStatus(result);
      setShowCancelledMessage(true);
      setTimeout(() => {
        setShowCancelledMessage(false);
        setStatus(null);
      }, 5000);
    } catch (err: any) {
      console.error("Failed to cancel power action:", err);
    } finally {
      setCancelling(false);
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
                  {status.action_type === "reboot" ? "Reboot" : "Poweroff"} Cancelled
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Cancelled by {status.cancelled_by_name || "Unknown"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCancelledMessage(false);
                setStatus(null);
              }}
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
                System {isReboot ? "Reboot" : "Poweroff"} Scheduled
              </p>
              <p className={`text-xs ${subtextColor}`}>
                {countdown && `In ${countdown} • `}
                Scheduled by {status?.scheduled_by_name || "Unknown"}
                {status?.scheduled_time &&
                  ` • ${new Date(status.scheduled_time).toLocaleString()}`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
            className="border-current"
          >
            {cancelling ? "Cancelling..." : "Cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
