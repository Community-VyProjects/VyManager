"use client";

import { useState, useEffect } from "react";
import { Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SearchOverlay } from "./SearchOverlay";

interface SearchCommandProps {
  className?: string;
  variant?: "sidebar" | "compact";
}

export function SearchCommand({ className, variant = "sidebar" }: SearchCommandProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full justify-start gap-2 text-muted-foreground font-normal hover:text-foreground transition-all",
          variant === "sidebar" && "h-9 px-3",
          className
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left text-sm truncate">Search everything…</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px]">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </Button>

      <SearchOverlay open={open} onOpenChange={setOpen} />
    </>
  );
}
