import { callTool } from "@/lib/mcp-client";
import type { BetsResponse } from "@/lib/types";
import { BatchBetForm } from "@/components/match/batch-bet-form";

export const dynamic = "force-dynamic";

export default async function MatchdayPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const matchday = parseInt(n, 10) || 1;

  let data: BetsResponse | null = null;
  let error: string | null = null;

  try {
    data = (await callTool("get_bets", { matchday })) as BetsResponse;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load matchday";
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load matchday</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <BatchBetForm
      matchday={matchday}
      title={data.title}
      matches={data.matches}
    />
  );
}
