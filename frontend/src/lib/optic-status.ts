/**
 * Optic column / DDM severity.
 *
 * Healthy means a module EEPROM was read and it has no alarm or warning.
 * "Operation not supported" means this port has no EEPROM (copper or virtual).
 * "not present" means a cage was read and the module is missing. That stays
 * a warning, with the diagnostics button, because it is not the same fault.
 */

export type OpticSeverity = "unknown" | "none" | "absent" | "ok" | "warning" | "alarm";

export interface OpticReading {
  present?: boolean;
  unsupported?: boolean;
  transceiver?: string | null;
  vendor?: string | null;
  part_number?: string | null;
  serial_number?: string | null;
  measurements?: Record<string, unknown> | null;
  alarms?: string[] | null;
  warnings?: string[] | null;
  raw?: string | null;
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

function eepromUnsupported(status: OpticReading): boolean {
  if (status.unsupported) return true;
  return (status.raw ?? "").toLowerCase().includes("operation not supported");
}

function modulePulled(status: OpticReading): boolean {
  const raw = `${status.raw ?? ""} ${status.transceiver ?? ""}`.toLowerCase();
  return raw.includes("not present") || raw.includes("no transceiver") || raw.includes("no module");
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
  if (hasOpticalModule(status)) {
    if (status.alarms?.length) return "alarm";
    if (status.warnings?.length) return "warning";
    return "ok";
  }
  if (eepromUnsupported(status)) return "none";
  if (modulePulled(status)) return "absent";
  return "unknown";
}

/** Word shown in the ethernet Optic column. null means the reading has not loaded. */
export function opticColumnLabel(severity: OpticSeverity): string | null {
  if (severity === "none") return "N/A";
  if (severity === "absent" || severity === "warning") return "Warning";
  if (severity === "ok") return "Healthy";
  if (severity === "alarm") return "Alarm";
  return null;
}

/** Hide diagnostics only when the port has no EEPROM. An empty cage, or a read we could not classify, still opens. */
export function opticDiagnosticsAvailable(severity: OpticSeverity): boolean {
  return severity !== "none";
}

/** Dashboard card grade. Keeps the old absent rule, and does not call copper Absent. */
export function dashboardOpticSeverity(
  port: OpticReading,
): "ok" | "warning" | "critical" | "absent" | "none" {
  if (eepromUnsupported(port)) return "none";
  if (!port.present || !port.transceiver) return "absent";
  if (port.alarms?.length) return "critical";
  if (port.warnings?.length) return "warning";
  return "ok";
}
