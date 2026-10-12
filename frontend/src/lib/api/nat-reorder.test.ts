/**
 * Drag-save must include the leaves VyOS verify requires.
 * Run: npx tsx src/lib/api/nat-reorder.test.ts
 */
import { natService, type DestinationNATRule, type SourceNATRule } from "./nat";

function assert(cond: unknown, message: string): void {
  if (!cond) {
    console.error(message);
    process.exit(1);
  }
}

const redirectOnly: DestinationNATRule = {
  rule_number: 10,
  disable: false,
  exclude: false,
  log: false,
  protocol: "tcp",
  inbound_interface: { name: "eth2" },
  translation: { redirect: { port: "8080" } },
};

const redirectData = natService.ruleDataForReorder("destination", redirectOnly);
assert(redirectData.translation_redirect_port === "8080", "redirect port dropped");
assert(redirectData.inbound_interface_name === "eth2", "inbound interface dropped");
assert(!("translation_address" in redirectData), "empty translation address should be omitted");

const backendOnly: DestinationNATRule = {
  rule_number: 20,
  disable: false,
  exclude: false,
  log: false,
  load_balance: { backends: [{ name: "10.0.0.2", weight: "50" }] },
};
const backendData = natService.ruleDataForReorder("destination", backendOnly);
assert(
  Array.isArray(backendData.load_balance_backends) &&
    (backendData.load_balance_backends as { name: string }[])[0]?.name === "10.0.0.2",
  "load-balance backend dropped",
);

const portOnly: SourceNATRule = {
  rule_number: 30,
  disable: false,
  exclude: false,
  log: false,
  translation: { port: "443" },
};
const portData = natService.ruleDataForReorder("source", portOnly);
assert(portData.translation_port === "443", "source translation port dropped");

console.log("nat reorder payload ok");
