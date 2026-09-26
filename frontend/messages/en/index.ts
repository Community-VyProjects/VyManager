// English is the source of truth: one JSON file per namespace, registered here
// (keep alphabetical). Other locales use the same file names under
// messages/<locale>/; a missing file or key falls back to English.
import common from "./common.json";
import dashboard from "./dashboard.json";
import language from "./language.json";
import login from "./login.json";
import navigation from "./navigation.json";
import onboarding from "./onboarding.json";
import search from "./search.json";
import sidebar from "./sidebar.json";
import sites from "./sites.json";

const messages = {
  common,
  dashboard,
  language,
  login,
  navigation,
  onboarding,
  search,
  sidebar,
  sites,
};

export default messages;
