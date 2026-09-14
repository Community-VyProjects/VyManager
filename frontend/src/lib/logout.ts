import { signOut } from "@/lib/auth-client";
import { sessionService } from "@/lib/api/session";

/** Drop the VyOS instance session, delete the login row, then clear the cookie. */
export async function signOutFully(disconnect?: () => Promise<void>): Promise<void> {
  if (disconnect) {
    try {
      await disconnect();
    } catch {
      /* still drop the login session */
    }
  }
  try {
    await sessionService.logoutAuth();
  } catch {
    /* cookie clear still runs */
  }
  await signOut();
}
