export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installClientPeerCapture } = await import("./lib/client-peer");
  installClientPeerCapture();
}
