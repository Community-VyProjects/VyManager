/**
 * Create vs edit mode for a unified record modal.
 *
 * A modal that handles both create and edit takes `existing`: the record being
 * edited, or null/undefined when creating. These helpers derive the three
 * decisions that follow from it, so the identity lock and the create vs update
 * dispatch are testable without rendering React.
 */

/** True when the modal is editing an existing record rather than creating one. */
export function modalIsEdit<T>(existing: T | null | undefined): existing is T {
  return existing != null;
}

/**
 * Value and disabled state for an identity field (one that cannot change after
 * create, such as an interface name or its encapsulation). On edit the stored
 * value wins and the control is locked; on create the draft is editable.
 */
export function lockedIdentity<T>(
  existing: T | null | undefined,
  read: (record: T) => string | null | undefined,
  draft: string,
): { value: string; disabled: boolean } {
  if (modalIsEdit(existing)) {
    return { value: read(existing) ?? "", disabled: true };
  }
  return { value: draft, disabled: false };
}

/**
 * Which write the submit handler must perform. Returning the name from the
 * stored record, not from form state, keeps an edit from being retargeted at a
 * different record by a stale or tampered name field.
 */
export function modalWriteKind<T extends { name: string }>(
  existing: T | null | undefined,
): { kind: "update"; name: string } | { kind: "create" } {
  if (modalIsEdit(existing)) {
    return { kind: "update", name: existing.name };
  }
  return { kind: "create" };
}
