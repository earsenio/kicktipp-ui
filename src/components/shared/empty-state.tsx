"use client";

import { Button } from "@/components/ui/button";
import {
  Calendar,
  Trophy,
  BarChart3,
  HelpCircle,
  Users,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  matchday: Calendar,
  leaderboard: Trophy,
  schedule: Calendar,
  bonus: HelpCircle,
  players: Users,
  overview: BarChart3,
};

interface EmptyStateProps {
  page: keyof typeof icons;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ page, title, description, action }: EmptyStateProps) {
  const Icon = icons[page] || LayoutGrid;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="mb-4 rounded-xl bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && (
        <div className="mt-4">
          {action.href ? (
            <a href={action.href}>
              <Button size="sm">{action.label}</Button>
            </a>
          ) : (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
