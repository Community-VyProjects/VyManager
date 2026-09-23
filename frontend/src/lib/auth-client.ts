import { createAuthClient } from "better-auth/react";
import { genericOAuthClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  plugins: [
    genericOAuthClient(),
    twoFactorClient({
      onTwoFactorRedirect({ twoFactorMethods }) {
        if (typeof window === "undefined") return;
        if (window.location.pathname === "/login") return;
        const q = new URLSearchParams({ twoFactor: "1" });
        if (twoFactorMethods?.length) q.set("methods", twoFactorMethods.join(","));
        window.location.href = `/login?${q.toString()}`;
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
