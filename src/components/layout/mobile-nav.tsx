"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Trophy, Star, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Calendar,
  BarChart3,
  Users,
  BookOpen,
  Settings,
  Home,
} from "lucide-react";
import { useState } from "react";

const mainTabs = [
  { href: "/", label: "Predict", icon: Clock },
  { href: "/leaderboard", label: "Board", icon: Trophy },
  { href: "/bonus", label: "Bonus", icon: Star },
];

const moreItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/players", label: "Players", icon: Users },
  { href: "/rules", label: "Rules", icon: BookOpen },
  { href: "/setup", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/matchday")
      : pathname.startsWith(href.split("/").slice(0, 2).join("/"));

  const isMoreActive =
    moreItems.some((item) => isActive(item.href)) &&
    !mainTabs.some((tab) => isActive(tab.href));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] glass-nav pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-[52px]">
        {mainTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 transition-colors select-none",
                active
                  ? "text-primary font-bold"
                  : "text-white/35"
              )}
            >
              <tab.icon
                className="h-[22px] w-[22px]"
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className="text-[10px]">{tab.label}</span>
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 transition-colors select-none",
              isMoreActive
                ? "text-primary font-bold"
                : "text-white/35"
            )}
          >
            <MoreHorizontal
              className="h-[22px] w-[22px]"
              strokeWidth={isMoreActive ? 2.2 : 1.8}
            />
            <span className="text-[10px]">More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1.5 py-3">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-[14px] transition-colors",
                    isActive(item.href)
                      ? "bg-white/[0.03] border border-white/[0.05]"
                      : "text-white/55 hover:bg-white/[0.03]"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
