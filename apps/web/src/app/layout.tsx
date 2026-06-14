import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Octo",
  description: "A visual workspace for notes, diagrams, humans, and AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
