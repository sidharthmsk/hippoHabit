import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { readTheme } from "@/lib/settings";
import { themeColors, themeCss } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "hippoHabit",
  description: "A quiet habit tracker for one person",
  appleWebApp: {
    capable: true,
    title: "hippoHabit",
    statusBarStyle: "default",
  },
};

export async function generateViewport(): Promise<Viewport> {
  await connection();
  const colors = themeColors(readTheme(getDb()));
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: colors.light },
      { media: "(prefers-color-scheme: dark)", color: colors.dark },
    ],
    width: "device-width",
    initialScale: 1,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Theme lives in the database, so every page renders at request time.
  await connection();
  const css = themeCss(readTheme(getDb()));

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <style id="app-theme">{css}</style>
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
