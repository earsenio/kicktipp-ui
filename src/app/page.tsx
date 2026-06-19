"use client";

import { PredictView } from "@/components/match/predict-view";

// Today is the default landing view — the Predict view filtered to today's games.
export default function HomePage() {
  return <PredictView todayOnly />;
}
