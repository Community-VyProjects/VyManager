"use client";

import { Building, ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrgStore } from "@/store/org-store";
import { cn } from "@/lib/utils";

/**
 * Organization switcher. Renders only when the caller belongs to more than
 * one organization (orgUiVisible); single-team deployments never see it.
 * Picking an org sets the acting org for the admin surface.
 */
export function OrgSwitcher({ onChange }: { onChange?: () => void }) {
  const { organizations, orgUiVisible, activeOrgId, setActiveOrg } =
    useOrgStore();

  if (!orgUiVisible || organizations.length < 2) return null;

  const active =
    organizations.find((o) => o.id === activeOrgId) ?? organizations[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
          aria-label="Switch organization"
        >
          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-foreground">
              {active?.name}
            </div>
            <div className="text-xs text-muted-foreground">Organization</div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => {
              setActiveOrg(org.id);
              onChange?.();
            }}
            className="flex items-center gap-2"
          >
            <Check
              className={cn(
                "h-4 w-4",
                org.id === active?.id ? "opacity-100" : "opacity-0"
              )}
            />
            <span className="flex-1 truncate">{org.name}</span>
            <span className="text-xs text-muted-foreground">
              {org.org_role}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
