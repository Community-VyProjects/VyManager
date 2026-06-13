"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Network } from "lucide-react";

/**
 * Interface picker for the QoS stats views. An empty `value` means "All
 * interfaces". The list is the set of interfaces that currently have QoS
 * applied, so a previously-selected interface that lost its policy simply
 * won't appear (callers fall back to "All").
 */
export function QoSInterfaceSelect({
  interfaces,
  value,
  onChange,
}: {
  interfaces: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs font-mono max-w-[200px]"
          title={value || "All interfaces"}
        >
          <Network className="h-3 w-3 mr-1 shrink-0" />
          <span className="truncate">{value || "All interfaces"}</span>
          <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Watch interface</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange("")}>
          <div className="flex items-center justify-between w-full">
            <span>All interfaces</span>
            {value === "" && <span className="ml-2 text-primary">✓</span>}
          </div>
        </DropdownMenuItem>
        {interfaces.length === 0 ? (
          <DropdownMenuItem disabled>No QoS interfaces</DropdownMenuItem>
        ) : (
          interfaces.map((name) => (
            <DropdownMenuItem key={name} onClick={() => onChange(name)}>
              <div className="flex items-center justify-between w-full gap-4">
                <span className="font-mono text-xs">{name}</span>
                {value === name && <span className="text-primary shrink-0">✓</span>}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
