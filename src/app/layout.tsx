import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Tippkick",
  description: "Open-source web UI for kicktipp.com — sports prediction game",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tippkick",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
        {/* Umami web analytics */}
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="992bba0c-54b1-40c3-811f-07a14e396912"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
