import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// Interface-valued fields use InterfaceSelect / InterfaceMultiSelect, not free
// text. These checks catch the shapes the old text inputs had.

const FRONTEND = fileURLToPath(new URL("../..", import.meta.url));
const SRC = join(FRONTEND, "src");
const MESSAGES_EN = join(FRONTEND, "messages", "en");

// Files whose free-text interface inputs are tracked elsewhere.
const ALLOWED_FILES = new Set([
  // Not imported anywhere; removal is tracked in #1057.
  "src/components/interfaces/InterfaceFormModal.tsx",
]);

// English strings that name an interface without being a text-field example.
const ALLOWED_MESSAGES = new Set([
  "appsCatalog.json:apps.ntopng.fields.interface.description", // help text under the picker
  "bgp.json:form.updateSourcePlaceholder", // update-source is an address or an interface
  "firewallGroups.json:memberPlaceholders.interfaceGroup", // interface-group members accept wildcards
  "suricata.json:interfaceNameError", // validation text for the capture-interface list
]);

const INTERFACE_EXAMPLE = /\beth\d/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) out.push(path);
  }
  return out;
}

/** Opening tags of text inputs and VrfSelect, braces balanced so `=>` does not end a tag. */
function textInputTags(source: string): string[] {
  const tags: string[] = [];
  const start = /<(Input|input|VrfSelect)\b/g;
  let match: RegExpExecArray | null;
  while ((match = start.exec(source))) {
    let depth = 0;
    let i = match.index + match[0].length;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
    }
    tags.push(source.slice(match.index, i + 1));
  }
  return tags;
}

/** True when an input tag looks like a free-text interface field. */
function isFreeTextInterfaceField(tag: string): boolean {
  if (INTERFACE_EXAMPLE.test(tag)) return true;
  return /value=\{[^}]*\b(mirror_?(ingress|egress)|redirect)\b[^}]*\}/i.test(tag);
}

function flatten(node: unknown, prefix: string, out: Map<string, string>) {
  if (typeof node === "string") {
    out.set(prefix, node);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
  }
}

describe("isFreeTextInterfaceField", () => {
  it("flags a literal interface placeholder", () => {
    assert.equal(isFreeTextInterfaceField('<Input value={x} placeholder="eth0" />'), true);
  });

  it("flags a translated interface example", () => {
    assert.equal(isFreeTextInterfaceField('<Input placeholder={t("example", { value: "eth1" })} />'), true);
  });

  it("flags mirror and redirect values on text inputs and VrfSelect", () => {
    assert.equal(isFreeTextInterfaceField("<Input value={mirrorIngress} />"), true);
    assert.equal(isFreeTextInterfaceField("<Input value={form.mirror_egress} />"), true);
    assert.equal(isFreeTextInterfaceField("<VrfSelect value={form.redirect} />"), true);
  });

  it("leaves new-interface names and URL redirects alone", () => {
    assert.equal(isFreeTextInterfaceField('<Input value={name} placeholder="bond0" />'), false);
    assert.equal(isFreeTextInterfaceField('<Input value={redirectUrl} placeholder="block.vyos.net" />'), false);
    assert.equal(isFreeTextInterfaceField("<Input value={form.redirect_url} />"), false);
    assert.equal(isFreeTextInterfaceField("<Input value={mirrorHostName} />"), false);
  });

  it("splits each input, input and VrfSelect tag at its own closing bracket", () => {
    const tags = textInputTags('<Input value={a} /> <input placeholder="eth0" /> <VrfSelect value={b} />');
    assert.deepEqual(tags, ["<Input value={a} />", '<input placeholder="eth0" />', "<VrfSelect value={b} />"]);
    assert.deepEqual(tags.map(isFreeTextInterfaceField), [false, true, false]);
  });

  it("reads past arrow functions inside attributes", () => {
    const [tag] = textInputTags('<Input onChange={(e) => set(e.target.value)} placeholder="eth0" />');
    assert.equal(isFreeTextInterfaceField(tag), true);
  });
});

describe("interface-valued fields", () => {
  it("have no free-text inputs left in components", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(FRONTEND, file);
      if (ALLOWED_FILES.has(rel)) continue;
      for (const tag of textInputTags(readFileSync(file, "utf8"))) {
        if (isFreeTextInterfaceField(tag)) offenders.push(`${rel}: ${tag.replace(/\s+/g, " ").slice(0, 120)}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  it("have no interface example strings left in the English catalog", () => {
    const offenders: string[] = [];
    for (const name of readdirSync(MESSAGES_EN).filter((n) => n.endsWith(".json"))) {
      const strings = new Map<string, string>();
      flatten(JSON.parse(readFileSync(join(MESSAGES_EN, name), "utf8")), "", strings);
      for (const [path, value] of strings) {
        const id = `${name}:${path}`;
        if (INTERFACE_EXAMPLE.test(value) && !ALLOWED_MESSAGES.has(id)) offenders.push(`${id} = ${value}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  // Fields that must name an existing interface of one kind: the element id,
  // the value handler, and the exact filter the picker must apply.
  const KIND_PICKERS = [
    {
      file: "components/virtual-ethernet/EditVirtualEthernetModal.tsx",
      id: "e-peerName",
      handler: "onValueChange={setPeerName}",
      filter: "filter={(iface) => /^veth\\d+$/.test(iface.name) && iface.name !== interfaceData.name}",
    },
    {
      file: "components/nhrp/NhrpTunnelModal.tsx",
      id: "tunnel-name",
      handler: 'onValueChange={(v) => update("name", v)}',
      filter: "filter={(iface) => /^tun\\d+$/.test(iface.name)}",
    },
  ];

  for (const picker of KIND_PICKERS) {
    it(`pick ${picker.id} from configured interfaces of its kind`, () => {
      const source = readFileSync(join(SRC, picker.file), "utf8");
      const at = source.indexOf(`id="${picker.id}"`);
      assert.notEqual(at, -1, picker.id);
      const opening = source.lastIndexOf("<", at);
      const tag = source.slice(opening, source.indexOf("/>", opening) + 2);
      assert.match(tag, /^<InterfaceSelect\b/);
      assert.ok(tag.includes(picker.handler), picker.handler);
      assert.ok(tag.includes(picker.filter), picker.filter);
      assert.doesNotMatch(tag, /noneOption/);
    });
  }

  it("allowlists only entries that still exist", () => {
    for (const rel of ALLOWED_FILES) {
      assert.ok(walk(SRC).some((f) => relative(FRONTEND, f) === rel), rel);
    }
    for (const id of ALLOWED_MESSAGES) {
      const [name, path] = id.split(":");
      const strings = new Map<string, string>();
      flatten(JSON.parse(readFileSync(join(MESSAGES_EN, name), "utf8")), "", strings);
      assert.ok(INTERFACE_EXAMPLE.test(strings.get(path) ?? ""), id);
    }
  });
});
