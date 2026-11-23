import type { HAField } from "@/lib/api/high-availability-save-ops";

/** The highAvailability message key that labels each range-checked field. */
export const HA_FIELD_LABELS = {
  vrid: "vrid",
  priority: "priority",
  advertise_interval: "vrrpModal.advertiseInterval",
  preempt_delay: "vrrpModal.preemptDelay",
  startup_delay: "globals.startupDelayLabel",
  garp_interval: "intervalSeconds",
  garp_master_delay: "garpMasterDelay",
  garp_master_refresh: "garpMasterRefresh",
  garp_master_refresh_repeat: "garpMasterRefreshRepeat",
  garp_master_repeat: "garpMasterRepeat",
  health_check_failure_count: "failureCount",
  health_check_interval: "intervalSeconds",
  health_check_timeout: "scriptTimeout",
  port: "port",
  delay_loop: "vsModal.delayLoop",
  fwmark: "vsModal.fwMark",
  connection_timeout: "vsModal.connectionTimeout",
  persistence_timeout: "vsModal.persistenceTimeout",
} as const satisfies Record<HAField, string>;
