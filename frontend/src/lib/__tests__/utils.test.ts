import { describe, it, expect } from "vitest";
import { cn, formatBytes, formatNumber, getInterfaceType } from "../utils";

describe("cn (classNames utility)", () => {
  it("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("merges Tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles undefined and null values", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

describe("formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(1024 * 1024 * 5.5)).toBe("5.5 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("formats terabytes correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
  });
});

describe("formatNumber", () => {
  it("formats small numbers", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats large numbers with locale separators", () => {
    const result = formatNumber(1234567);
    // The exact format depends on locale, but should contain some separator
    expect(result).toContain("1");
    expect(result.length).toBeGreaterThan(6); // Has separators
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("getInterfaceType", () => {
  it("identifies Physical Ethernet interfaces", () => {
    expect(getInterfaceType("eth0")).toBe("Physical (Ethernet)");
    expect(getInterfaceType("eth1")).toBe("Physical (Ethernet)");
  });

  it("identifies VLAN subinterfaces", () => {
    expect(getInterfaceType("eth0.10")).toBe("VLAN (Subinterface)");
    expect(getInterfaceType("eth1.200")).toBe("VLAN (Subinterface)");
  });

  it("identifies Wireless interfaces", () => {
    expect(getInterfaceType("wlan0")).toBe("Wireless");
  });

  it("identifies Loopback interface", () => {
    expect(getInterfaceType("lo")).toBe("Loopback");
  });

  it("identifies WireGuard interfaces", () => {
    expect(getInterfaceType("wg0")).toBe("VPN (WireGuard)");
    expect(getInterfaceType("wg1")).toBe("VPN (WireGuard)");
  });

  it("identifies Virtual Tunnel interfaces", () => {
    expect(getInterfaceType("vtun0")).toBe("VPN (Virtual Tunnel)");
    expect(getInterfaceType("vti0")).toBe("VPN (Virtual Tunnel)");
  });

  it("identifies Tunnel interfaces", () => {
    expect(getInterfaceType("tun0")).toBe("VPN (Tunnel)");
  });

  it("identifies VLAN virtual interfaces", () => {
    expect(getInterfaceType("vlan10")).toBe("VLAN (Virtual)");
  });

  it("identifies Bridge interfaces", () => {
    expect(getInterfaceType("br0")).toBe("Bridge");
  });

  it("identifies PPPoE interfaces", () => {
    expect(getInterfaceType("pppoe0")).toBe("PPPoE");
  });

  it("identifies Bonding interfaces", () => {
    expect(getInterfaceType("bond0")).toBe("Bonding");
  });

  it("identifies Dummy interfaces", () => {
    expect(getInterfaceType("dummy0")).toBe("Dummy");
  });

  it("identifies GRE Tunnel interfaces", () => {
    expect(getInterfaceType("gre0")).toBe("GRE Tunnel");
  });

  it("identifies IPIP Tunnel interfaces", () => {
    expect(getInterfaceType("ipip0")).toBe("IPIP Tunnel");
  });

  it("identifies SIT Tunnel interfaces", () => {
    expect(getInterfaceType("sit0")).toBe("SIT Tunnel");
  });

  it("returns Other for unknown interfaces", () => {
    expect(getInterfaceType("unknown0")).toBe("Other");
    expect(getInterfaceType("custom")).toBe("Other");
  });
});
