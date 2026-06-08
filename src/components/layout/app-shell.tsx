// App shell: renders sidebar + header on authenticated pages, bare layout on /login.
"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ShortcutsProvider } from "@/components/layout/shortcuts-provider";
import { PageTransition } from "@/components/layout/page-transition";
import { MatchdayProvider } from "@/components/match/matchday-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <ShortcutsProvider>
      <div className="flex min-h-dvh overflow-x-hidden">
        <Sidebar />
        <MatchdayProvider>
          <div className="flex-1 flex flex-col min-h-dvh min-w-0 pt-14 md:ml-56">
            <Header />
            <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </MatchdayProvider>
      </div>
      <MobileNav />
    </ShortcutsProvider>
  );
}
