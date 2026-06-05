import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { ShortcutsProvider } from "@/components/layout/shortcuts-provider";
import { PageTransition } from "@/components/layout/page-transition";

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
  title: "Kicktipp",
  description: "Modern web UI for kicktipp.com — sports prediction dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KickTipp",
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
      <body className="min-h-full">
        <ThemeProvider>
          <ShortcutsProvider>
            <div className="flex h-full">
              <Sidebar />
              <div className="flex-1 flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
            </div>
            <MobileNav />
            <Toaster richColors position="top-right" />
          </ShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
