"use client";

import { useState, useEffect } from "react";
import { useOrgStore } from "@/store/org-store";
import { Organization } from "@/lib/api/org";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Clock, Beaker } from "lucide-react";
import { cn } from "@/lib/utils";

function getTimeRemaining(expiresAt: string): string {
  const now = new Date().getTime();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function OrgSwitcher() {
  const { currentOrg, orgs, switchOrg, loadOrgs } = useOrgStore();
  const [, setTick] = useState(0);

  // Load orgs on mount
  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  // Tick every minute to update demo countdown
  useEffect(() => {
    const hasDemos = orgs.some((o) => o.is_demo);
    if (!hasDemos) return;

    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [orgs]);

  if (!currentOrg || orgs.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-foreground">VyManager</h1>
        <p className="text-xs text-muted-foreground">VyOS Management</p>
      </div>
    );
  }

  const permanentOrgs = orgs.filter((o) => !o.is_demo);
  const demoOrgs = orgs.filter((o) => o.is_demo);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity max-w-[180px]">
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {currentOrg.name}
            </h1>
            {currentOrg.is_demo && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                DEMO
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {currentOrg.is_demo && currentOrg.expires_at
              ? `${getTimeRemaining(currentOrg.expires_at)} remaining`
              : "Organization"}
          </p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {permanentOrgs.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Organizations
            </DropdownMenuLabel>
            {permanentOrgs.map((org) => (
              <OrgMenuItem
                key={org.id}
                org={org}
                isActive={currentOrg.id === org.id}
                onSelect={() => switchOrg(org.id)}
              />
            ))}
          </>
        )}

        {demoOrgs.length > 0 && (
          <>
            {permanentOrgs.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <Beaker className="h-3.5 w-3.5" />
              Demo Environments
            </DropdownMenuLabel>
            {demoOrgs.map((org) => (
              <OrgMenuItem
                key={org.id}
                org={org}
                isActive={currentOrg.id === org.id}
                onSelect={() => switchOrg(org.id)}
              />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OrgMenuItem({
  org,
  isActive,
  onSelect,
}: {
  org: Organization;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn("flex items-center gap-3 cursor-pointer", isActive && "bg-accent")}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          org.is_demo ? "bg-amber-500" : "bg-emerald-500"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{org.name}</p>
        {org.is_demo && org.expires_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getTimeRemaining(org.expires_at)} remaining
          </p>
        )}
      </div>
      {isActive && (
        <span className="text-xs text-primary font-medium shrink-0">Active</span>
      )}
    </DropdownMenuItem>
  );
}
