import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Determine interface type based on naming conventions.
 */
export function getInterfaceType(interfaceName: string): string {
  if (interfaceName.startsWith("eth")) {
    // Check for VLAN subinterfaces (eth0.10, eth1.20, etc.)
    if (/\.(\d+)$/.test(interfaceName)) {
      return "VLAN (Subinterface)";
    }
    return "Physical (Ethernet)";
  } else if (interfaceName.startsWith("wlan")) {
    return "Wireless";
  } else if (interfaceName === "lo") {
    return "Loopback";
  } else if (interfaceName.startsWith("wg")) {
    return "VPN (WireGuard)";
  } else if (
    interfaceName.startsWith("vtun") ||
    interfaceName.startsWith("vti")
  ) {
    return "VPN (Virtual Tunnel)";
  } else if (interfaceName.startsWith("tun")) {
    return "VPN (Tunnel)";
  } else if (interfaceName.startsWith("vlan")) {
    return "VLAN (Virtual)";
  } else if (interfaceName.startsWith("br")) {
    return "Bridge";
  } else if (interfaceName.startsWith("pppoe")) {
    return "PPPoE";
  } else if (interfaceName.startsWith("bond")) {
    return "Bonding";
  } else if (interfaceName.startsWith("dummy")) {
    return "Dummy";
  } else if (interfaceName.startsWith("gre")) {
    return "GRE Tunnel";
  } else if (interfaceName.startsWith("ipip")) {
    return "IPIP Tunnel";
  } else if (interfaceName.startsWith("sit")) {
    return "SIT Tunnel";
  } else {
    return "Other";
  }
}

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const formatNumber = (num: number) => {
  return num.toLocaleString();
};
