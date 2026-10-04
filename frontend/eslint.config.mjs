import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noUntranslatedText from "./eslint-rules/no-untranslated-text.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // UI text must come from next-intl messages (see messages/README.md).
  {
    files: ["src/**/*.tsx"],
    ignores: [
      "src/**/*.test.tsx",
      // Not imported anywhere (kept for reference); translate them if they get used again.
      "src/components/network/CreateEthernetModal.tsx",
      "src/components/network/EditEthernetModal.tsx",
      "src/components/routing/ViewRoutingTableModal.tsx",
      "src/components/routing/DeleteRoutingTableModal.tsx",
      "src/components/routing/DeleteTableRouteModal.tsx",
      "src/components/firewall/zones/ZonePolicyModal.tsx",
      "src/components/firewall/CountrySelect.tsx",
    ],
    plugins: { vymanager: { rules: { "no-untranslated-text": noUntranslatedText } } },
    rules: {
      "vymanager/no-untranslated-text": [
        "error",
        {
          // Tokens that stay the same in every locale. If a word has a translation, use t().
          // Do not disable a translated label.
          allow: [
            "VyOS", "VyManager",
            "Cisco", "Babel", "Splunk", "Loki", "Telegraf", "Zabbix", "Prometheus", "Podman", "Discord",
            "VyProjects Org", "Syslog", "Switchdev",
            // Units
            "Kbps", "Mbps", "Gbps",
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
