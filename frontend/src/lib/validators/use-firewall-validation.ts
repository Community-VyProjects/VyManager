"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { getIPAddressError, getMACAddressError, getPortError } from "./firewall";

/**
 * Localized versions of the firewall field validators. Same signatures as the
 * getters in ./firewall, which stay English (and the source of truth for the
 * validation rules); this hook only swaps the message text.
 */
export function useFirewallValidation() {
  const t = useTranslations("firewallValidation");
  return useMemo(
    () => ({
      getIPAddressError: (input: string, protocol: "ipv4" | "ipv6"): string | null =>
        getIPAddressError(input, protocol) === null
          ? null
          : t(protocol === "ipv4" ? "invalidIpv4" : "invalidIpv6"),
      getMACAddressError: (mac: string): string | null =>
        getMACAddressError(mac) === null ? null : t("invalidMac"),
      getPortError: (port: string): string | null =>
        getPortError(port) === null ? null : t("invalidPort"),
    }),
    [t]
  );
}
