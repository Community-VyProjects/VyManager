// English is the source of truth: one JSON file per namespace, registered here
// (keep alphabetical). Other locales use the same file names under
// messages/<locale>/; a missing file or key falls back to English.
import common from "./common.json";
import language from "./language.json";
import login from "./login.json";
import onboarding from "./onboarding.json";
import sidebar from "./sidebar.json";

const messages = {
  common,
  language,
  login,
  onboarding,
  sidebar,
};

export default messages;
