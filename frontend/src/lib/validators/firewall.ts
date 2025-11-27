/**
 * Firewall validation utilities for IP addresses, MAC addresses, and ports
 */

/**
 * Validate IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  if (!ip || ip.trim() === "") return true; // Empty is valid (optional field)

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);

  if (!match) return false;

  // Check each octet is 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return false;
  }

  return true;
}

/**
 * Validate IPv6 address
 */
export function isValidIPv6(ip: string): boolean {
  if (!ip || ip.trim() === "") return true; // Empty is valid (optional field)

  // IPv6 regex - supports full, compressed, and mixed notation
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  return ipv6Regex.test(ip);
}

/**
 * Validate IPv4 CIDR notation
 */
export function isValidIPv4CIDR(cidr: string): boolean {
  if (!cidr || cidr.trim() === "") return true; // Empty is valid (optional field)

  const parts = cidr.split("/");
  if (parts.length !== 2) return false;

  const [ip, prefix] = parts;

  // Validate IP part
  if (!isValidIPv4(ip)) return false;

  // Validate prefix (0-32)
  const prefixNum = parseInt(prefix, 10);
  if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) return false;

  return true;
}

/**
 * Validate IPv6 CIDR notation
 */
export function isValidIPv6CIDR(cidr: string): boolean {
  if (!cidr || cidr.trim() === "") return true; // Empty is valid (optional field)

  const parts = cidr.split("/");
  if (parts.length !== 2) return false;

  const [ip, prefix] = parts;

  // Validate IP part
  if (!isValidIPv6(ip)) return false;

  // Validate prefix (0-128)
  const prefixNum = parseInt(prefix, 10);
  if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 128) return false;

  return true;
}

/**
 * Validate IPv4 range (x.x.x.x-x.x.x.x)
 */
export function isValidIPv4Range(range: string): boolean {
  if (!range || range.trim() === "") return true; // Empty is valid (optional field)

  const parts = range.split("-");
  if (parts.length !== 2) return false;

  const [start, end] = parts.map(p => p.trim());

  return isValidIPv4(start) && isValidIPv4(end);
}

/**
 * Validate IPv6 range
 */
export function isValidIPv6Range(range: string): boolean {
  if (!range || range.trim() === "") return true; // Empty is valid (optional field)

  const parts = range.split("-");
  if (parts.length !== 2) return false;

  const [start, end] = parts.map(p => p.trim());

  return isValidIPv6(start) && isValidIPv6(end);
}

/**
 * Validate IPv4 address, CIDR, or range
 */
export function isValidIPv4AddressInput(input: string): boolean {
  if (!input || input.trim() === "") return true; // Empty is valid (optional field)

  const trimmed = input.trim();

  // Check for inversion prefix
  const value = trimmed.startsWith("!") ? trimmed.substring(1) : trimmed;

  // Try each format
  return (
    isValidIPv4(value) ||
    isValidIPv4CIDR(value) ||
    isValidIPv4Range(value)
  );
}

/**
 * Validate IPv6 address, CIDR, or range
 */
export function isValidIPv6AddressInput(input: string): boolean {
  if (!input || input.trim() === "") return true; // Empty is valid (optional field)

  const trimmed = input.trim();

  // Check for inversion prefix
  const value = trimmed.startsWith("!") ? trimmed.substring(1) : trimmed;

  // Try each format
  return (
    isValidIPv6(value) ||
    isValidIPv6CIDR(value) ||
    isValidIPv6Range(value)
  );
}

/**
 * Validate MAC address (only colon format)
 */
export function isValidMACAddress(mac: string): boolean {
  if (!mac || mac.trim() === "") return true; // Empty is valid (optional field)

  const trimmed = mac.trim();

  // Format: aa:bb:cc:dd:ee:ff (colon only)
  const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;

  return macRegex.test(trimmed);
}

/**
 * Known port names (common services)
 */
const KNOWN_PORT_NAMES = [
  "ftp", "ssh", "telnet", "smtp", "dns", "http", "https", "pop3", "imap",
  "snmp", "ldap", "ntp", "smb", "mysql", "postgresql", "redis", "mongodb"
];

/**
 * Validate single port number (1-65535)
 */
export function isValidPortNumber(port: string): boolean {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

/**
 * Validate port range (1024-65535)
 */
export function isValidPortRange(range: string): boolean {
  const parts = range.split("-");
  if (parts.length !== 2) return false;

  const [start, end] = parts.map(p => p.trim());

  if (!isValidPortNumber(start) || !isValidPortNumber(end)) return false;

  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);

  return startNum < endNum;
}

/**
 * Validate port name (named service)
 */
export function isValidPortName(name: string): boolean {
  return KNOWN_PORT_NAMES.includes(name.toLowerCase());
}

/**
 * Validate single port entry (number, range, or name)
 */
export function isValidPortEntry(entry: string): boolean {
  const trimmed = entry.trim();

  if (trimmed === "") return false;

  // Check if it's a port name
  if (isValidPortName(trimmed)) return true;

  // Check if it's a range
  if (trimmed.includes("-")) return isValidPortRange(trimmed);

  // Check if it's a number
  return isValidPortNumber(trimmed);
}

/**
 * Validate port input (can be comma-separated list of ports, ranges, or names)
 * Examples: "80", "80,443", "telnet,http,123,1001-1005"
 */
export function isValidPortInput(input: string): boolean {
  if (!input || input.trim() === "") return true; // Empty is valid (optional field)

  const entries = input.split(",").map(e => e.trim());

  // Each entry must be valid
  return entries.every(entry => isValidPortEntry(entry));
}

/**
 * Get validation error message for IP address
 */
export function getIPAddressError(input: string, protocol: "ipv4" | "ipv6"): string | null {
  if (!input || input.trim() === "") return null;

  const trimmed = input.trim();
  const value = trimmed.startsWith("!") ? trimmed.substring(1) : trimmed;

  if (protocol === "ipv4") {
    if (!isValidIPv4AddressInput(input)) {
      return "Invalid IPv4 address. Use format: 192.168.1.1, 192.168.1.0/24, or 192.168.1.1-192.168.1.10";
    }
  } else {
    if (!isValidIPv6AddressInput(input)) {
      return "Invalid IPv6 address. Use format: 2001:db8::1, 2001:db8::/32, or 2001:db8::1-2001:db8::10";
    }
  }

  return null;
}

/**
 * Get validation error message for MAC address
 */
export function getMACAddressError(mac: string): string | null {
  if (!mac || mac.trim() === "") return null;

  if (!isValidMACAddress(mac)) {
    return "Invalid MAC address. Use format: aa:bb:cc:dd:ee:ff";
  }

  return null;
}

/**
 * Get validation error message for port
 */
export function getPortError(port: string): string | null {
  if (!port || port.trim() === "") return null;

  if (!isValidPortInput(port)) {
    return "Invalid port. Use port number (1-65535), range (1024-2048), service name (http, ssh), or comma-separated list (80,443,8080-8090)";
  }

  return null;
}
