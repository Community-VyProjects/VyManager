"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Network, Database } from "lucide-react";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ClickableSubnetProps {
  subnet: string;
  networkName?: string;
  data?: unknown; // Full subnet data
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  showIcon?: boolean;
}

export function ClickableSubnet({
  subnet,
  networkName,
  data,
  children,
  className,
  variant = "link",
  size = "sm",
  showIcon = true
}: ClickableSubnetProps) {
  const t = useTranslations("sharedUi");
  const { openUnifiedView } = useUnifiedView();

  const handleClick = () => {
    if (data) {
      openUnifiedView('subnet', data);
    } else {
      // Fallback with minimal data
      const subnetData = {
        network: { name: networkName || t("clickable.unknownNetwork") },
        subnet: {
          subnet,
          name_servers: [],
          static_mappings: [],
        }
      };
      openUnifiedView('subnet', subnetData);
    }
  };

  if (children) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("h-auto p-0 font-normal", className)}
        onClick={handleClick}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("h-auto p-2", className)}
      onClick={handleClick}
    >
      {showIcon && <Network className="h-3 w-3 mr-1" />}
      {subnet}
    </Button>
  );
}

interface ClickableClientProps {
  clientName: string;
  interfaceName?: string;
  data?: unknown; // Full client/peer data
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  showIcon?: boolean;
}

export function ClickableClient({
  clientName,
  interfaceName,
  data,
  children,
  className,
  variant = "link",
  size = "sm",
  showIcon = true
}: ClickableClientProps) {
  const t = useTranslations("sharedUi");
  const { openUnifiedView } = useUnifiedView();

  const handleClick = () => {
    if (data) {
      openUnifiedView('client', data);
    } else {
      // Fallback with minimal data
      const clientData = {
        interface: { name: interfaceName || t("clickable.unknownInterface") },
        peer: {
          name: clientName,
          allowed_ips: [],
        }
      };
      openUnifiedView('client', clientData);
    }
  };

  if (children) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("h-auto p-0 font-normal", className)}
        onClick={handleClick}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("h-auto p-2", className)}
      onClick={handleClick}
    >
      {showIcon && <Database className="h-3 w-3 mr-1" />}
      {clientName}
    </Button>
  );
}