export function openvpnModalIsEdit(
  existing: { name: string } | null | undefined,
): existing is { name: string } {
  return existing != null;
}

export function openvpnLockedName(
  existing: { name: string } | null | undefined,
  draft: string,
): { value: string; disabled: boolean } {
  if (existing) {
    return { value: existing.name, disabled: true };
  }
  return { value: draft, disabled: false };
}

export function openvpnWriteKind(
  existing: { name: string } | null | undefined,
): { kind: "update"; name: string } | { kind: "create" } {
  if (existing) {
    return { kind: "update", name: existing.name };
  }
  return { kind: "create" };
}
