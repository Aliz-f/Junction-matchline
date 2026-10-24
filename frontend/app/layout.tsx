/**
 * Root layout (FE-01).
 *
 * Loads `/meta` server-side so the shell can show the authoritative server /
 * demo clock on first paint, then renders the responsive shell around the page.
 */
import type { Metadata, Viewport } from "next";
import { loadMeta } from "@/lib/demo/mode";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Matchline", template: "%s · Matchline" },
  description:
    "A personalized football Journey: match-by-match progress, a stadium map, favourite-team impact, community rooms and private post-match What-if analysis.",
  applicationName: "Matchline",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default async function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const { mode, meta } = await loadMeta();

  return (
    <html lang="en-GB">
      <body className="font-sans">
        <AppShell mode={mode} meta={meta}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
