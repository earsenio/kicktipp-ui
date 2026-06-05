"use client";

import { useState } from "react";
import type { TableResponse } from "@/lib/types";
import { LeagueTable } from "./league-table";
import { Button } from "@/components/ui/button";
import { useKicktipp } from "@/hooks/use-kicktipp";
import { Loader2 } from "lucide-react";

type TableOption = "overall" | "home" | "away";

export function TableContent({ initialData }: { initialData: TableResponse }) {
  const [option, setOption] = useState<TableOption>("overall");

  const { data: fetched, loading } = useKicktipp<TableResponse>({
    tool: "get_table",
    args: option !== "overall" ? { option } : undefined,
    options: { skip: option === "overall" },
  });

  const data = option === "overall" ? initialData : fetched ?? initialData;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {data.label || "League Table"}
        </h1>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {(["overall", "home", "away"] as const).map((o) => (
          <Button
            key={o}
            variant={option === o ? "default" : "ghost"}
            size="sm"
            className="rounded-none capitalize"
            onClick={() => setOption(o)}
          >
            {o}
          </Button>
        ))}
      </div>

      <LeagueTable teams={data.teams} />

      <p className="text-xs text-muted-foreground text-center">
        Official standings from kicktipp.com
      </p>
    </div>
  );
}
