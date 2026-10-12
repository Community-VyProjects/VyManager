/**
 * Drag-save payload and tab-change discard.
 * Run: npx tsx src/lib/api/nat-reorder.test.ts
 */
import type { DestinationNATRule, SourceNATRule } from "./nat";
import { buildNatReorderItems, discardReorderOnTypeChange } from "./nat-reorder";

function assert(cond: unknown, message: string): void {
  if (!cond) {
    console.error(message);
    process.exit(1);
  }
}

const redirectOnly: DestinationNATRule = {
  rule_number: 20,
  disable: false,
  exclude: false,
  log: false,
  protocol: "tcp",
  inbound_interface: { name: "eth2" },
  translation: { redirect: { port: "8080" } },
};

const backendOnly: DestinationNATRule = {
  rule_number: 10,
  disable: false,
  exclude: false,
  log: false,
  load_balance: { backends: [{ name: "10.0.0.2", weight: "50" }] },
};

const items = buildNatReorderItems("destination", [redirectOnly, backendOnly], [10, 20]);
assert(items[0].old_number === 20 && items[0].new_number === 10, "number mapping lost");
assert(items[0].rule_data.translation_redirect_port === "8080", "redirect port dropped");
assert(items[0].rule_data.inbound_interface_name === "eth2", "inbound interface dropped");
assert(!("translation_address" in items[0].rule_data), "empty translation address should be omitted");
assert(
  Array.isArray(items[1].rule_data.load_balance_backends) &&
    (items[1].rule_data.load_balance_backends as { name: string }[])[0]?.name === "10.0.0.2",
  "load-balance backend dropped",
);

const portOnly: SourceNATRule = {
  rule_number: 30,
  disable: false,
  exclude: false,
  log: false,
  translation: { port: "443" },
};
const sourceItems = buildNatReorderItems("source", [portOnly], [30]);
assert(sourceItems[0].rule_data.translation_port === "443", "source translation port dropped");

const pending = [{ rule_number: 20 }, { rule_number: 10 }];
const destinationRules = [{ rule_number: 100 }, { rule_number: 110 }];
const switched = discardReorderOnTypeChange("source", "destination", true, pending, destinationRules);
assert(switched.unchanged === false, "type change should apply");
assert(switched.hasChanges === false, "type change must discard pending reorder");
assert(switched.rules === destinationRules, "type change must load the new type's rules");

const same = discardReorderOnTypeChange("source", "source", true, pending, destinationRules);
assert(same.unchanged === true, "same type should keep the pending reorder");
assert(same.hasChanges === true, "same type must not clear hasChanges");
assert(same.rules === pending, "same type must keep pending rules");

console.log("nat reorder payload ok");
