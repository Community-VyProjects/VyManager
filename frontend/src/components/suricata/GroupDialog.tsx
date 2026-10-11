"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  groupPreview,
  isAddress,
  isGroupName,
  isPort,
  slugGroupName,
  variableName,
  type SuricataGroup,
  type SuricataMember,
} from "@/lib/suricata-model";

export function GroupDialog({
  open,
  kind,
  initial,
  others,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  kind: "address" | "port";
  initial: SuricataGroup | null;
  others: string[];
  onOpenChange: (open: boolean) => void;
  onSave: (group: SuricataGroup) => void;
}) {
  const editing = initial !== null;
  const [nameInput, setNameInput] = useState(initial?.name ?? "");
  const [members, setMembers] = useState<SuricataMember[]>(initial?.members ?? []);
  const [refs, setRefs] = useState<SuricataMember[]>(initial?.groups ?? []);
  const [entry, setEntry] = useState("");
  const [excludeEntry, setExcludeEntry] = useState(false);
  const [refName, setRefName] = useState("");
  const [excludeRef, setExcludeRef] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = editing ? initial.name : slugGroupName(nameInput);
  const noun = kind === "address" ? "address or prefix" : "port or range";
  const check = kind === "address" ? isAddress : isPort;

  function addMember() {
    const value = entry.trim();
    if (!check(value)) {
      setError(kind === "address"
        ? "Use an address or network prefix, such as 10.1.0.0/16. A prefix must be the network address, not a host inside it."
        : "Use a port from 1 to 65535, or a range such as 1000-1005.");
      return;
    }
    if (members.some((item) => item.value === value && item.exclude === excludeEntry)) {
      setError("That entry is already in the group.");
      return;
    }
    setMembers([...members, { value, exclude: excludeEntry }]);
    setEntry("");
    setExcludeEntry(false);
    setError(null);
  }

  function addRef() {
    if (!isGroupName(refName)) {
      setError("Choose another group.");
      return;
    }
    if (refName === name) {
      setError("A group cannot include itself.");
      return;
    }
    if (refs.some((item) => item.value === refName && item.exclude === excludeRef)) {
      setError("That group is already included.");
      return;
    }
    setRefs([...refs, { value: refName, exclude: excludeRef }]);
    setRefName("");
    setExcludeRef(false);
    setError(null);
  }

  function save() {
    if (!isGroupName(name)) {
      setError("Name the group with lowercase letters, digits, and hyphens. Rules will see it as a variable.");
      return;
    }
    if (!editing && others.includes(name)) {
      setError("A group with that name already exists.");
      return;
    }
    onSave({ name, members, groups: refs });
    onOpenChange(false);
  }

  const draft: SuricataGroup = { name: name || "name", members, groups: refs };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${initial.name}` : `New ${kind} group`}</DialogTitle>
          <DialogDescription>
            {name
              ? `Detection rules see this as $${variableName(name)}.`
              : "The name becomes the variable rules match against."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="suricata-group-name">Name</Label>
            <Input
              id="suricata-group-name"
              value={editing ? initial.name : nameInput}
              disabled={editing}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="web-servers"
            />
            {!editing && nameInput && name !== nameInput.trim() ? (
              <p className="text-xs text-muted-foreground">Saved as {name || "(empty)"}.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="suricata-group-entry">{kind === "address" ? "Addresses" : "Ports"}</Label>
            <MemberList
              items={members}
              nested={false}
              onChange={setMembers}
            />
            <div className="flex gap-2">
              <Input
                id="suricata-group-entry"
                value={entry}
                onChange={(event) => setEntry(event.target.value)}
                placeholder={noun}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMember();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addMember} disabled={!entry.trim()}>
                Add
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={excludeEntry} onCheckedChange={(checked) => setExcludeEntry(checked === true)} />
              Exclude this {kind === "address" ? "address" : "port"} instead of including it
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suricata-group-ref">Include another group</Label>
            <MemberList items={refs} nested onChange={setRefs} />
            <div className="flex gap-2">
              <select
                id="suricata-group-ref"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={refName}
                onChange={(event) => setRefName(event.target.value)}
              >
                <option value="">Choose a group</option>
                {others.filter((item) => item !== name).map((item) => (
                  <option key={item} value={item}>${variableName(item)}</option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={addRef} disabled={!refName}>
                Add
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={excludeRef} onCheckedChange={(checked) => setExcludeRef(checked === true)} />
              Exclude that group
            </label>
          </div>

          <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs">{name ? groupPreview(draft) : "Name the group to see the variable."}</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberList({
  items,
  nested,
  onChange,
}: {
  items: SuricataMember[];
  nested: boolean;
  onChange: (items: SuricataMember[]) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={`${item.exclude}-${item.value}`} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
          <span className="font-mono">
            {item.exclude ? "not " : ""}
            {nested ? `$${variableName(item.value)}` : item.value}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(items.filter((candidate) => candidate !== item))}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
