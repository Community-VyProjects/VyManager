import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determine interface type based on naming conventions.
 */
export function getInterfaceType(interfaceName: string): string {
  if (interfaceName.startsWith('eth')) {
    return 'Physical (Ethernet)';
  } else if (interfaceName.startsWith('wlan')) {
    return 'Wireless';
  } else if (interfaceName === 'lo') {
    return 'Loopback';
  } else if (interfaceName.startsWith('wg')) {
    return 'VPN (WireGuard)';
  } else if (interfaceName.startsWith('vtun') || interfaceName.startsWith('vti')) {
    return 'VPN (Virtual Tunnel)';
  } else if (interfaceName.startsWith('tun')) {
    return 'VPN (Tunnel)';
  } else if (interfaceName.startsWith('vlan')) {
    return 'VLAN';
  } else if (interfaceName.startsWith('br')) {
    return 'Bridge';
  } else if (interfaceName.startsWith('pppoe')) {
    return 'PPPoE';
  } else if (interfaceName.startsWith('bond')) {
    return 'Bonding';
  } else if (interfaceName.startsWith('dummy')) {
    return 'Dummy';
  } else if (interfaceName.startsWith('gre')) {
    return 'GRE Tunnel';
  } else if (interfaceName.startsWith('ipip')) {
    return 'IPIP Tunnel';
  } else if (interfaceName.startsWith('sit')) {
    return 'SIT Tunnel';
  } else {
    return 'Other';
  }
}
