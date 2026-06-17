#!/usr/bin/env python3
"""Audit how every frontend modal sources and displays its interface list.

Run from anywhere:  python3 scripts/audit_interface_pickers.py

Buckets each component that has an interface picker:
  SELF_FETCH   - <InterfaceSelect/> with no `interfaces=` prop (fetches the
                 shared /vyos/show/all-interfaces endpoint itself; kernel list +
                 descriptions on 1.5). The desired default.
  PREFILTERED  - <InterfaceSelect interfaces={...}/> fed a narrowed list. Shows
                 whether that list comes from getAllInterfaces or some OTHER
                 source (e.g. ethernet-only) which intentionally limits choices.
  RAW_SELECT   - fetches getAllInterfaces but renders a plain <Select> (no
                 shared component => different look, no descriptions).
  LEGACY_CONFIG- builds the list by walking the config tree / config snapshot
                 (the old pattern; should be zero).
"""
import os, re, glob, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "frontend", "src")
ROOT = os.path.abspath(ROOT)


def interface_select_blocks(txt):
    """Yield the opening-tag text of each <InterfaceSelect ...> element."""
    for m in re.finditer(r"<InterfaceSelect\b", txt):
        depth, i = 0, m.end()
        while i < len(txt):
            c = txt[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c == ">" and depth == 0:
                yield txt[m.start():i + 1]
                break
            i += 1


def main():
    self_fetch, prefiltered, raw_select, legacy = [], [], [], []

    for f in sorted(glob.glob(os.path.join(ROOT, "components", "**", "*.tsx"), recursive=True)):
        txt = open(f).read()
        rel = os.path.relpath(f, ROOT)
        uses_is = "<InterfaceSelect" in txt
        calls_fetch = "getAllInterfaces" in txt
        # old pattern: config-snapshot / manual interface-type walking
        if "configService.getSnapshot" in txt and ("interfaceTypes" in txt or "interfacesConfig" in txt):
            legacy.append(rel)

        if uses_is:
            blocks = list(interface_select_blocks(txt))
            if any("interfaces=" in b for b in blocks):
                src = "getAllInterfaces" if calls_fetch else "OTHER source"
                prefiltered.append((rel, src))
            else:
                self_fetch.append(rel)
        elif calls_fetch and rel != "components/ui/interface-select.tsx":
            raw_select.append(rel)

    def dump(title, items):
        print(f"\n===== {title} : {len(items)} =====")
        for it in items:
            print("  " + (f"{it[0]}   <= {it[1]}" if isinstance(it, tuple) else it))

    dump("LEGACY_CONFIG (old pattern - should be 0)", legacy)
    dump("SELF_FETCH <InterfaceSelect/> (kernel list + descriptions)", self_fetch)
    dump("PREFILTERED list -> <InterfaceSelect interfaces=...>", prefiltered)
    dump("RAW <Select> (fetches list but no InterfaceSelect)", raw_select)

    return 1 if legacy else 0


if __name__ == "__main__":
    sys.exit(main())
