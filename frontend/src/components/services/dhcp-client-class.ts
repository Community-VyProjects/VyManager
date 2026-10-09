import type { DHCPBatchOperation, DHCPClientClass } from "@/lib/api/dhcp";

export interface ClientClassDraft {
  name: string;
  disable: boolean;
  circuitId: string;
  remoteId: string;
  originalName: string | null;
}

export function clientClassOperations(
  draft: ClientClassDraft,
  stored: DHCPClientClass | undefined,
): DHCPBatchOperation[] {
  const name = draft.name.trim();
  const previous = draft.originalName;
  const renaming = Boolean(previous && previous !== name);
  const operations: DHCPBatchOperation[] = [];
  if (renaming && previous) {
    operations.push({ op: "delete_client_class", value: previous });
  }
  operations.push({ op: "set_client_class", value: name });
  if (draft.disable) {
    operations.push({ op: "set_client_class_disable", value: name });
  } else if (!renaming && stored?.disable) {
    operations.push({ op: "delete_client_class_disable", value: name });
  }
  const circuit = draft.circuitId.trim();
  if (circuit) {
    operations.push({ op: "set_client_class_circuit_id", value: `${name}|${circuit}` });
  } else if (!renaming && stored?.circuit_id) {
    operations.push({ op: "delete_client_class_circuit_id", value: name });
  }
  const remote = draft.remoteId.trim();
  if (remote) {
    operations.push({ op: "set_client_class_remote_id", value: `${name}|${remote}` });
  } else if (!renaming && stored?.remote_id) {
    operations.push({ op: "delete_client_class_remote_id", value: name });
  }
  return operations;
}

export function duplicateClassName(
  name: string,
  rows: { name: string }[],
  originalName: string | null,
): string | null {
  const cleaned = name.trim();
  const taken = rows.some((item) => item.name === cleaned && item.name !== originalName);
  return taken ? "A client class with that name already exists" : null;
}
