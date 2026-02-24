"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CallbackUrlBoxProps {
  providerId: string;
}

export function CallbackUrlBox({ providerId }: CallbackUrlBoxProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  const callbackUrl = `${baseUrl}/api/auth/oauth2/callback/${providerId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
      <p className="text-xs font-medium text-foreground">
        Redirect / Callback URL
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Register this URL as an allowed redirect URI in your OAuth provider before saving.
      </p>
      <div className="flex items-center gap-2 mt-2">
        <code className="flex-1 rounded-md bg-background border border-border px-3 py-2 text-xs font-mono text-foreground break-all select-all">
          {callbackUrl}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
