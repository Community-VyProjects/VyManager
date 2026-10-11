"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InterfaceName } from "@/lib/api/show";
import {
  blockers,
  buildSetupConfig,
  isAddress,
  type SuricataConfig,
} from "@/lib/suricata-model";
import { InterfacePicker, IssueList } from "./SuricataFields";

const PRIVATE_RANGES = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];

export function SuricataSetup({
  interfaces,
  hasWrite,
  saving,
  onSave,
}: {
  interfaces: InterfaceName[];
  hasWrite: boolean;
  saving: boolean;
  onSave: (config: SuricataConfig) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [prefixes, setPrefixes] = useState(PRIVATE_RANGES);
  const [prefix, setPrefix] = useState("");
  const [prefixError, setPrefixError] = useState<string | null>(null);
  const [standard, setStandard] = useState(true);
  const [logging, setLogging] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  function addPrefix() {
    const value = prefix.trim();
    if (!isAddress(value) || !value.includes("/")) {
      setPrefixError("Use a network prefix, such as 192.0.2.0/24. A host address belongs in a group after setup.");
      return;
    }
    if (prefixes.includes(value)) {
      setPrefixError("That prefix is already listed.");
      return;
    }
    setPrefixes([...prefixes, value]);
    setPrefix("");
    setPrefixError(null);
  }

  function save() {
    const config = buildSetupConfig({
      interfaces: selected,
      homeNet: prefixes,
      includeStandardVariables: standard,
      logAlerts: logging,
    });
    const reasons = blockers(config);
    if (reasons.length > 0) {
      setLocalError(reasons[0]);
      return;
    }
    setLocalError(null);
    onSave(config);
  }

  const saveReason = selected.length === 0
    ? "Choose an interface to watch."
    : prefixes.length === 0
      ? "Add at least one prefix for your network."
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <section className="space-y-2" id="interfaces">
        <h2 className="text-lg font-semibold">1. Interfaces to watch</h2>
        <p className="text-sm text-muted-foreground">
          Suricata inspects traffic on the interfaces you select. It does not sit inline, and it does not drop packets from this page.
        </p>
        <InterfacePicker available={interfaces} selected={selected} onChange={setSelected} disabled={!hasWrite || saving} />
      </section>

      <section className="space-y-2" id="network">
        <h2 className="text-lg font-semibold">2. Your network</h2>
        <p className="text-sm text-muted-foreground">
          These prefixes become $HOME_NET. Everything else becomes $EXTERNAL_NET. Replace the private ranges if they are not the networks you actually use. Add IPv6 prefixes if you need them.
        </p>
        <div className="flex flex-wrap gap-2">
          {prefixes.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border px-3 py-1 text-sm"
              disabled={!hasWrite || saving}
              onClick={() => setPrefixes(prefixes.filter((value) => value !== item))}
            >
              {item} <span className="text-muted-foreground">remove</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={prefix}
            onChange={(event) => {
              setPrefix(event.target.value);
              setPrefixError(null);
            }}
            placeholder="192.0.2.0/24"
            disabled={!hasWrite || saving}
            aria-label="Network prefix"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addPrefix();
              }
            }}
          />
          <Button type="button" variant="outline" disabled={!hasWrite || saving || !prefix.trim()} onClick={addPrefix}>
            Add prefix
          </Button>
        </div>
        {prefixError ? <p className="text-sm text-destructive">{prefixError}</p> : null}
      </section>

      <section className="space-y-3" id="variables">
        <h2 className="text-lg font-semibold">3. Names rules expect</h2>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={standard} disabled={!hasWrite || saving} onCheckedChange={(checked) => setStandard(checked === true)} />
          <span>
            <span className="font-medium">Create the standard rule variables</span>
            <span className="mt-1 block text-muted-foreground">
              Adds the address and port names downloaded rules look for, such as web servers and SSH. Your network is always created so those rules can match it. The three capture port groups are always created because this device will not start Suricata without them.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={logging} disabled={!hasWrite || saving} onCheckedChange={(checked) => setLogging(checked === true)} />
          <span>
            <span className="font-medium">Record rule matches</span>
            <span className="mt-1 block text-muted-foreground">
              Writes alerts to eve.json. You can add connection and protocol logs after setup.
            </span>
          </span>
        </label>
      </section>

      {localError ? <IssueList items={[localError]} tone="block" /> : null}
      {saveReason && hasWrite ? <p className="text-sm text-muted-foreground">{saveReason}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="button" disabled={!hasWrite || saving || saveReason !== null} onClick={save}>
          {saving ? "Saving..." : "Save and start Suricata"}
        </Button>
        {!hasWrite ? <Label className="font-normal text-muted-foreground">You can view this page, but not change it.</Label> : null}
      </div>
    </div>
  );
}
