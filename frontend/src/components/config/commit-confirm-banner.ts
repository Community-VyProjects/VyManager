import type { CommitConfirmStatus } from "@/lib/api/config";

/** What VyOS does when the timer runs out if the router sets no action. */
export const DEFAULT_COMMIT_CONFIRM_ACTION = "reboot";

export type CommitConfirmActionKey = "actionReboot" | "actionReload" | "actionRollback";

/** The banner message key for the router's commit-confirm action, or null for an unknown one. */
export function commitConfirmActionKey(action?: string | null): CommitConfirmActionKey | null {
  switch (action ?? DEFAULT_COMMIT_CONFIRM_ACTION) {
    case "reboot":
      return "actionReboot";
    case "reload":
      return "actionReload";
    case "rollback":
      return "actionRollback";
    default:
      return null;
  }
}

/** A reboot boots the saved config, so unsaved changes are lost with the pending one. */
export function commitConfirmRebootWarns(action?: string | null): boolean {
  return (action ?? DEFAULT_COMMIT_CONFIRM_ACTION) === "reboot";
}

export type CommitConfirmStarter =
  | { key: "startedBy"; name: string }
  | { key: "startedByOther" }
  | null;

/**
 * Who started the pending commit-confirm. The backend leaves the name out
 * when an instance row of another organization points at the same router.
 */
export function commitConfirmStarter(cc: CommitConfirmStatus): CommitConfirmStarter {
  if (cc.started_by_name) return { key: "startedBy", name: cc.started_by_name };
  if (cc.started_by_id) return { key: "startedByOther" };
  return null;
}
