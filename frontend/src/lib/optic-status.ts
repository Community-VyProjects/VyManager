/**
 * Optic column / DDM severity.
 *
 * "Healthy" means a module EEPROM was read and it has no alarm or warning.
 * A copper PHY, virtual NIC, or empty cage has no optical transceiver.
 * ethtool answers those with "Operation not supported" or "not present",
 * which is not a health grade.
 */

export type OpticSeverity = "unknown" | "none" | "ok" | "warning" | "alarm";

export interface OpticReading {
  present?: boolean;
  transceiver?: string | null;
  vendor?: string | null;
  part_number?: string | null;
  serial_number?: string | null;
  measurements?: Record<string, unknown> | null;
  alarms?: string[] | null;
  warnings?: string[] | null;
}

const BOGUS_IDENTITY = new Set(["none", "n/a", "na", "unknown", "unspecified"]);

function usableIdentity(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return false;
  const lowered = value.trim().toLowerCase();
  if (BOGUS_IDENTITY.has(lowered)) return false;
  return !(
    lowered.includes("not present")
    || lowered.includes("no transceiver")
    || lowered.includes("no module")
    || lowered.includes("not supported")
    || lowered.includes("netlink error")
  );
}

export function hasOpticalModule(status: OpticReading | null | undefined): boolean {
  if (!status?.present) return false;
  if ([status.transceiver, status.vendor, status.part_number, status.serial_number].some(usableIdentity)) {
    return true;
  }
  return Object.keys(status.measurements ?? {}).length > 0;
}

export function opticSeverity(status: OpticReading | null | undefined): OpticSeverity {
  if (!status) return "unknown";
  if (!hasOpticalModule(status)) return "none";
  if (status.alarms?.length) return "alarm";
  if (status.warnings?.length) return "warning";
  return "ok";
}

/** Word shown in the ethernet Optic column. null means the reading has not loaded. */
export function opticColumnLabel(severity: OpticSeverity): string | null {
  if (severity === "none") return "N/A";
  if (severity === "ok") return "Healthy";
  if (severity === "warning") return "Warning";
  if (severity === "alarm") return "Alarm";
  return null;
}

/** The diagnostics button is only useful when a module was read, or the read failed. */
export function opticDiagnosticsAvailable(severity: OpticSeverity): boolean {
  return severity !== "none";
}
