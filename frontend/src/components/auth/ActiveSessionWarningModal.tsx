"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Monitor, Loader2 } from "lucide-react";

interface AuthSessionInfo {
  token: string;
  created_at: string;
  expires_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_current: boolean;
}

interface ActiveSessionWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: AuthSessionInfo[];
  onContinue: () => Promise<void>;
  onCancel: () => void;
}

export function ActiveSessionWarningModal({
  open,
  onOpenChange,
  sessions,
  onContinue,
  onCancel,
}: ActiveSessionWarningModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      await onContinue();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke other sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const formatUserAgent = (userAgent?: string | null): string => {
    if (!userAgent) return "Unknown device";

    // Simple user agent parsing
    if (userAgent.includes("Chrome")) return "Chrome Browser";
    if (userAgent.includes("Firefox")) return "Firefox Browser";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari Browser";
    if (userAgent.includes("Edge")) return "Edge Browser";

    return "Web Browser";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Active Session Detected</DialogTitle>
          <DialogDescription>
            You're already signed in on {sessions.length > 1 ? "other devices" : "another device"}.
            Do you want to sign out of {sessions.length > 1 ? "those sessions" : "that session"} and continue here?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Security Notice
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Continuing will sign you out of your other active {sessions.length > 1 ? "sessions" : "session"}.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Active Sessions List */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Active {sessions.length > 1 ? "Sessions" : "Session"}:</p>
            {sessions.map((session, index) => (
              <div
                key={session.token}
                className="rounded-lg border border-border bg-muted/50 p-3"
              >
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {formatUserAgent(session.user_agent)}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {session.ip_address && (
                        <p className="truncate">IP: {session.ip_address}</p>
                      )}
                      <p>Signed in {formatDate(session.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out other {sessions.length > 1 ? "sessions" : "session"}...
              </>
            ) : (
              <>Continue & Sign Out Other {sessions.length > 1 ? "Sessions" : "Session"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
