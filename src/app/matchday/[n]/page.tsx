import { MatchdayClient } from "./matchday-client";

export function generateStaticParams() {
  return Array.from({ length: 34 }, (_, i) => ({ n: String(i + 1) }));
}

export default async function MatchdayPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  return <MatchdayClient n={n} />;
}
