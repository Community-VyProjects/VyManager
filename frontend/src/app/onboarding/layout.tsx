import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding - VyManager",
  description: "Setup your VyManager instance",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No authentication check - onboarding must be accessible without auth
  return <>{children}</>;
}
