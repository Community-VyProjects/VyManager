"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, Power } from "lucide-react";

interface NoInstanceAlertProps {
  title?: string;
  message?: string;
}

/**
 * NoInstanceAlert Component
 *
 * Displays a user-friendly message when no VyOS instance is connected.
 * Provides a call-to-action button to navigate to /sites for connection.
 */
export function NoInstanceAlert({
  title = "No VyOS Instance Connected",
  message = "You need to connect to a VyOS instance before accessing this page. Please select an instance from the Site Manager.",
}: NoInstanceAlertProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full">
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-center text-foreground mb-2">
            {title}
          </h2>

          {/* Message */}
          <p className="text-sm text-muted-foreground text-center mb-6">
            {message}
          </p>

          {/* Action Button */}
          <Button
            onClick={() => router.push("/sites")}
            className="w-full"
            size="lg"
          >
            <Power className="h-4 w-4 mr-2" />
            Connect to Instance
          </Button>
        </div>
      </div>
    </div>
  );
}
