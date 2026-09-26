import type { Locale } from "./config";
import type messages from "../../messages/en";

// Type-checks message keys against the English source file.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
