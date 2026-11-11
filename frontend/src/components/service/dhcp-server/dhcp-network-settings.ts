import type { DHCPBatchOperation, DHCPSharedNetwork } from "@/lib/api/dhcp";

export interface NetworkSettingsDraft {
  description: string;
  authoritative: boolean;
  pingCheck: boolean;
  nameServers: string[];
  domainName: string;
  domainSearch: string[];
}

export function networkSettingsDraft(network: DHCPSharedNetwork): NetworkSettingsDraft {
  return {
    description: network.description ?? "",
    authoritative: network.authoritative,
    pingCheck: network.ping_check,
    nameServers: [...network.name_servers],
    domainName: network.domain_name ?? "",
    domainSearch: [...network.domain_search],
  };
}

function filled(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

/** Batch ops that move the stored shared network to the draft. */
export function networkSettingsOps(
  network: DHCPSharedNetwork,
  draft: NetworkSettingsDraft,
): DHCPBatchOperation[] {
  const ops: DHCPBatchOperation[] = [];
  const flag = (next: boolean, prev: boolean, setOp: string, deleteOp: string) => {
    if (next !== prev) ops.push({ op: next ? setOp : deleteOp });
  };
  const scalar = (next: string, prev: string, setOp: string, deleteOp: string) => {
    const value = next.trim();
    if (value === prev) return;
    ops.push(value ? { op: setOp, value } : { op: deleteOp });
  };
  const multi = (next: string[], prev: string[], setOp: string, deleteOp: string) => {
    const wanted = filled(next);
    for (const value of prev) {
      if (!wanted.includes(value)) ops.push({ op: deleteOp, value });
    }
    for (const value of wanted) {
      if (!prev.includes(value)) ops.push({ op: setOp, value });
    }
  };

  scalar(
    draft.description,
    network.description ?? "",
    "set_shared_network_description",
    "delete_shared_network_description",
  );
  flag(
    draft.authoritative,
    network.authoritative,
    "set_shared_network_authoritative",
    "delete_shared_network_authoritative",
  );
  flag(
    draft.pingCheck,
    network.ping_check,
    "set_shared_network_ping_check",
    "delete_shared_network_ping_check",
  );
  multi(
    draft.nameServers,
    network.name_servers,
    "set_shared_network_name_server",
    "delete_shared_network_name_server",
  );
  scalar(
    draft.domainName,
    network.domain_name ?? "",
    "set_shared_network_domain_name",
    "delete_shared_network_domain_name",
  );
  multi(
    draft.domainSearch,
    network.domain_search,
    "set_shared_network_domain_search",
    "delete_shared_network_domain_search",
  );
  return ops;
}
