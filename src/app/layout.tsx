import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { ShortcutsProvider } from "@/components/layout/shortcuts-provider";
import { PageTransition } from "@/components/layout/page-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kicktipp",
  description: "Modern web UI for kicktipp.com — sports prediction dashboard",
  manifest: "/manifest.json",
  themeColor: "#22c55e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KickTipp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
