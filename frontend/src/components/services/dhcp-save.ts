import type { VyOSResponse } from "@/lib/types/api";

export function failedSaveMessage(result: VyOSResponse | null | undefined, fallback: string): string | null {
  if (!result || result.success !== false) return null;
  return result.error ?? fallback;
}
