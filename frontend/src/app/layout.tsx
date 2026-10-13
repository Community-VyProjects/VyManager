import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { UnifiedViewProvider } from "@/contexts/UnifiedViewContext";
import { AppLayout } from "@/components/layout/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VyManager",
  description: "Professional VyOS Management Interface",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const publicWs = process.env.PUBLIC_WS_URL || process.env.NEXT_PUBLIC_WS_URL || "";
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {publicWs ? <meta name="vymanager-ws-base" content={publicWs} /> : null}
        <NextIntlClientProvider>
          <ThemeProvider>
            <SearchProvider>
              <UnifiedViewProvider>
                <AppLayout>{children}</AppLayout>
              </UnifiedViewProvider>
            </SearchProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
