import type { ComponentType } from "react";
import type { WizardProps } from "./apps-catalog";

/**
 * Custom wizard overrides for apps that need deploy logic beyond what
 * installConfig in apps-catalog.ts can express (e.g. multi-container stacks,
 * post-install API calls, conditional image selection).
 *
 * Most apps should NOT need an entry here — just set installConfig on the
 * AppDef and the GenericAppWizard handles everything automatically.
 *
 * To add a custom wizard:
 *   1. Create  frontend/src/components/container/MyAppWizard.tsx
 *      (use WizardProps from @/lib/apps-catalog as the component's props type)
 *   2. Import it and add one line below:
 *      "my-app-id": MyAppWizard,
 */
export const WIZARD_REGISTRY: Record<string, ComponentType<WizardProps>> = {
  // "my-app-id": MyAppWizard,
};
