import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/providers/AppProviders";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";
import "goey-toast/styles.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Framelo is a browser-based device mockup and animation studio. Drop in a screenshot, place it on a device, animate it with keyframes and export in seconds.",
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
    { media: "(prefers-color-scheme: light)", color: "#ececed" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Resolves the theme before the first paint. It has to be inline and
          blocking: anything deferred would let the page paint dark and then
          snap to light, which is worse than having no light theme at all.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
