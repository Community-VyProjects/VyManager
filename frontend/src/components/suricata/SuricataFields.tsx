"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { InterfaceName } from "@/lib/api/show";
import { isSuricataInterfaceName } from "@/lib/suricata-model";

export function IssueList({
  items,
  tone,
}: {
  items: string[];
  tone: "block" | "warn";
}) {
  if (items.length === 0) return null;
  const block = tone === "block";
  return (
    <div
      className={
        block
          ? "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          : "rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
      }
    >
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function InterfacePicker({
  available,
  selected,
  onChange,
  disabled,
}: {
  available: InterfaceName[];
  selected: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const names = useMemo(() => {
    const all = new Set(available.map((item) => item.name));
    for (const name of selected) all.add(name);
    return [...all].sort();
  }, [available, selected]);

  const shown = names.filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));
  const descriptions = new Map(available.map((item) => [item.name, item.description]));

  function toggle(name: string, checked: boolean) {
    if (checked) onChange([...selected, name].filter((item, index, list) => list.indexOf(item) === index));
    else onChange(selected.filter((item) => item !== name));
  }

  function addCustom() {
    const name = custom.trim();
    if (!isSuricataInterfaceName(name)) {
      setCustomError("Use a router interface name such as eth0, eth0.10, or bond0.");
      return;
    }
    setCustomError(null);
    setCustom("");
    toggle(name, true);
  }

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter interfaces"
        disabled={disabled}
        aria-label="Filter interfaces"
      />
      <div className="max-h-52 overflow-auto rounded-md border">
        {shown.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No interfaces match.</p>
        ) : (
          shown.map((name) => {
            const id = `suricata-iface-${name}`;
            const description = descriptions.get(name);
            return (
              <label key={name} htmlFor={id} className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
                <Checkbox
                  id={id}
                  checked={selected.includes(name)}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggle(name, checked === true)}
                />
                <span className="text-sm">
                  <span className="font-medium">{name}</span>
                  {description ? <span className="ml-2 text-muted-foreground">{description}</span> : null}
                </span>
              </label>
            );
          })
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            setCustomError(null);
          }}
          placeholder="Other interface name"
          disabled={disabled}
          aria-label="Other interface name"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
        />
        <Button type="button" variant="outline" disabled={disabled || !custom.trim()} onClick={addCustom}>
          Add
        </Button>
      </div>
      {customError ? <p className="text-sm text-destructive">{customError}</p> : null}
      <p className="text-sm text-muted-foreground">
        <Label className="font-normal text-muted-foreground">
          {selected.length === 0 ? "None selected." : `Watching ${selected.length}.`}
        </Label>{" "}
        Traffic on these interfaces is inspected. This does not block it.
      </p>
    </div>
  );
}
