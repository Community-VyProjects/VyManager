import type { ContainerSection } from "@/lib/api/container-save-ops";

/** The `containers` modal heading that names each row list in a per-row error. */
export const SECTION_LABEL_KEYS = {
  devices: "modal.deviceMappings",
  environments: "modal.environmentVariables",
  labels: "modal.labels",
  ports: "modal.portMappings",
  sysctl: "modal.sysctlParameters",
  tmpfs: "modal.tmpfsMounts",
  volumes: "modal.volumeMounts",
} as const satisfies Record<ContainerSection, string>;
