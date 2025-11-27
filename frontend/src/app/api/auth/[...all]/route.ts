import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Export runtime config for Next.js 16
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST } = toNextJsHandler(auth);
