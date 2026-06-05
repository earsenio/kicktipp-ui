"use client";

import type { OverviewResponse } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewHeatmap } from "@/components/stats/overview-heatmap";
import { OverviewChart } from "@/components/stats/overview-chart";
import { OverviewStreaks } from "@/components/stats/overview-streaks";
import { Grid3X3, LineChart, Flame } from "lucide-react";

export function OverviewContent({ data }: { data: OverviewResponse }) {
  return (
    <div className="space-y-5 max-w-full mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.label}</p>
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList>
          <TabsTrigger value="heatmap">
            <Grid3X3 className="h-3.5 w-3.5" />
            Heatmap
          </TabsTrigger>
          <TabsTrigger value="chart">
            <LineChart className="h-3.5 w-3.5" />
            Chart
          </TabsTrigger>
          <TabsTrigger value="streaks">
            <Flame className="h-3.5 w-3.5" />
            Streaks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap">
          <OverviewHeatmap data={data} />
        </TabsContent>
        <TabsContent value="chart">
          <OverviewChart data={data} />
        </TabsContent>
        <TabsContent value="streaks">
          <OverviewStreaks data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
