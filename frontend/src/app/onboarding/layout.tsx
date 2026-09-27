import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No authentication check - onboarding must be accessible without auth
  return <>{children}</>;
}
