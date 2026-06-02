"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Goal, Trophy, Calendar, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table2,
  BarChart3,
  Star,
  Users,
  BookOpen,
  Settings,
} from "lucide-react";
import { useState } from "react";

const mainTabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/matchday/1", label: "Matchday", icon: Goal },
  { href: "/leaderboard", label: "Board", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: Calendar },
];

const moreItems = [
  { href: "/table", label: "Table", icon: Table2 },
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/bonus", label: "Bonus", icon: Star },
  { href: "/players", label: "Players", icon: Users },
  { href: "/rules", label: "Rules", icon: BookOpen },
  { href: "/setup", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("/").slice(0, 2).join("/"));

  const isMoreActive = moreItems.some((item) => isActive(item.href));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {mainTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors",
              isActive(tab.href) ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors",
              isMoreActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors",
                    isActive(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
