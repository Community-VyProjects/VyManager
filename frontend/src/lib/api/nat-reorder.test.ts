/**
 * Drag-save payload, and reorderRules surfaces a rejected commit.
 * Run: npx tsx src/lib/api/nat-reorder.test.ts
 */
import { apiClient } from "./client";
import type { DestinationNATRule, SourceNATRule } from "./nat";
import { natService } from "./nat";
import { buildNatReorderItems } from "./nat-reorder";

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

async function main(): Promise<void> {
  const originalPost = apiClient.post.bind(apiClient);
  apiClient.post = (async () => ({
    success: false,
    error: "translation requires address and/or port",
  })) as typeof apiClient.post;
  try {
    let threw = false;
    try {
      await natService.reorderRules("destination", []);
    } catch (err) {
      threw = true;
      const message = err instanceof Error ? err.message : String(err);
      assert(message.includes("translation requires"), "reorderRules hid the VyOS error");
    }
    assert(threw, "reorderRules did not throw on success=false");
  } finally {
    apiClient.post = originalPost;
  }
  console.log("nat reorder payload ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
