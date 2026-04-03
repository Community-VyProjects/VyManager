"use client";

import { useState, useEffect } from "react";
import { useOrgStore } from "@/store/org-store";
import { Organization } from "@/lib/api/org";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrgSwitcher() {
  const { currentOrg, orgs, switchOrg, loadOrgs } = useOrgStore();

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  if (!currentOrg || orgs.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-foreground">VyManager</h1>
        <p className="text-xs text-muted-foreground">VyOS Management</p>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity max-w-[180px]">
        <div className="flex-1 min-w-0 text-left">
          <h1 className="text-sm font-semibold text-foreground truncate">
            {currentOrg.name}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Organization
          </p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <Building2 className="h-3.5 w-3.5" />
          Organizations
        </DropdownMenuLabel>
        {orgs.map((org) => (
          <OrgMenuItem
            key={org.id}
            org={org}
            isActive={currentOrg.id === org.id}
            onSelect={() => switchOrg(org.id)}
          />
        ))}
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
      <div className="h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{org.name}</p>
      </div>
      {isActive && (
        <span className="text-xs text-primary font-medium shrink-0">Active</span>
      )}
    </DropdownMenuItem>
  );
}
