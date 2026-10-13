"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

/**
 * Message key for a navigation title: "Static & Failover" -> "staticFailover",
 * "DHCPv6 Server" -> "dhcpv6Server".
 *
 * Titles in lib/navigation.ts stay English because they double as stable ids
 * (sidebar open state, search index, permission filtering); they are only
 * translated when rendered.
 */
export function navTitleKey(title: string): string {
  return title
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
}

/**
 * Returns a function that translates a navigation title. Titles without an
 * entry in messages/<locale>/navigation.json (acronyms such as NAT, VRF, QoS)
 * are shown unchanged.
 */
export function useNavTitle() {
  const t = useTranslations("navigation");
  return useCallback(
    (title: string) => {
      const key = navTitleKey(title) as Parameters<typeof t>[0];
      return t.has(key) ? t(key) : title;
    },
    [t]
  );
}
