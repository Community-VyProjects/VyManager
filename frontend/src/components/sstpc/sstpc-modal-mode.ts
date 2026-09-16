export function sstpcModalIsEdit(
  existing: { name: string } | null | undefined,
): existing is { name: string } {
  return existing != null;
}

export function sstpcLockedName(
  existing: { name: string } | null | undefined,
  draft: string,
): { value: string; disabled: boolean } {
  if (existing) {
    return { value: existing.name, disabled: true };
  }
  return { value: draft, disabled: false };
}

export function sstpcWriteKind(
  existing: { name: string } | null | undefined,
): { kind: "update"; name: string } | { kind: "create" } {
  if (existing) {
    return { kind: "update", name: existing.name };
  }
  return { kind: "create" };
}
