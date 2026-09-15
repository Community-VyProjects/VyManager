/** useSession can be empty for a tick after sign-in. Confirm before bouncing to login. */
export async function confirmLoggedIn(
  session: { user?: unknown } | null | undefined,
  getSession: () => Promise<{ data?: { user?: unknown } | null }>,
): Promise<boolean> {
  if (session?.user) return true;
  try {
    const result = await getSession();
    return Boolean(result?.data?.user);
  } catch {
    return false;
  }
}
