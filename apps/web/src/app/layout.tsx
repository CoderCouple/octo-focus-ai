import type { Metadata } from "next";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";
// Hoist tldraw's CSS to the root so dynamic-imported canvas chunks don't have
// to ship their own (and risk loading the chunk before the CSS arrives).
import "tldraw/tldraw.css";

export const metadata: Metadata = {
  title: "OctoFocusAI",
  description: "The AI workspace for Humans and Agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
