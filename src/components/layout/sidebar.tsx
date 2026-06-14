"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Trophy,
  Calendar,
  BarChart3,
  Star,
  Users,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Goal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Predict", icon: Goal },
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/bonus", label: "Bonus", icon: Star },
  { href: "/players", label: "Players", icon: Users },
  { href: "/rules", label: "Rules", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-sidebar fixed top-0 left-0 bottom-0 z-40 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className={cn("flex items-center gap-2 px-4 h-14 border-b border-border", collapsed && "justify-center px-2")}>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight truncate">TippKick</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", !collapsed && "ml-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/matchday")
              : pathname.startsWith(item.href.split("/").slice(0, 2).join("/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-md mx-2 my-0.5",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Link
          href="/setup"
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors",
            pathname === "/setup" && "bg-accent text-accent-foreground font-medium",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
