"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Step = "connection" | "community" | "player" | "done";

async function fetchApi(tool: string, args?: Record<string, unknown>) {
  const res = await apiFetch("/api/kicktipp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, args }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("connection");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [communities, setCommunities] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/kicktipp/status")
      .then((r) => {
        setConnected(r.ok);
        if (r.ok) return r.json();
      })
      .then((json) => {
        if (json?.data?.community) {
          router.replace("/");
        }
      })
      .catch(() => setConnected(false));
  }, [router]);

  const loadCommunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi("get_communities");
      setCommunities(data as string[]);
      setStep("community");
    } catch (err) {
      setCommunities([]);
      setError(err instanceof Error ? err.message : "Failed to load communities");
    } finally {
      setLoading(false);
    }
  };

  const selectCommunity = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi("set_community", { name });
      const data = await fetchApi("get_players");
      setPlayers(data as string[]);
      setStep("player");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select community");
    } finally {
      setLoading(false);
    }
  };

  const selectPlayer = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi("set_player", { name });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select player");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your kicktipp account and select your community
        </p>
      </div>

      <div className="space-y-4">
        <StepCard
          title="1. Connection"
          active={step === "connection"}
          done={connected === true && step !== "connection"}
        >
          {connected === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection...
            </div>
          ) : connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-accent-green">
                <CheckCircle2 className="h-4 w-4" />
                Connected to kicktipp.com
              </div>
              {step === "connection" && (
                <Button onClick={loadCommunities} disabled={loading} size="sm">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-accent-red">
                <XCircle className="h-4 w-4" />
                Not connected
              </div>
              <p className="text-xs text-muted-foreground">
                Set KICKTIPP_EMAIL and KICKTIPP_PASSWORD in your environment variables, then restart the server.
              </p>
            </div>
          )}
        </StepCard>

        <StepCard
          title="2. Community"
          active={step === "community"}
          done={step === "player" || step === "done"}
        >
          {step === "community" && (
            <div className="space-y-2">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {communities.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No communities found. Join one on kicktipp.com first.
                  </p>
                  <Button onClick={loadCommunities} disabled={loading} size="sm" variant="outline">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Retry
                  </Button>
                </div>
              ) : (
                communities.map((c) => (
                  <Button
                    key={c}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={loading}
                    onClick={() => selectCommunity(c)}
                  >
                    {c}
                  </Button>
                ))
              )}
            </div>
          )}
        </StepCard>

        <StepCard
          title="3. Player Identity"
          active={step === "player"}
          done={step === "done"}
        >
          {step === "player" && (
            <div className="space-y-2">
              {players.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No players found, or the community hasn&apos;t started yet.
                  </p>
                  <Button size="sm" onClick={() => setStep("done")}>
                    Skip for now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                players.map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={loading}
                    onClick={() => selectPlayer(p)}
                  >
                    {p}
                  </Button>
                ))
              )}
            </div>
          )}
        </StepCard>

        <StepCard title="4. Done" active={step === "done"} done={false}>
          {step === "done" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-accent-green">
                <CheckCircle2 className="h-4 w-4" />
                You&apos;re all set!
              </div>
              <a href="/">
                <Button size="sm">
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          )}
        </StepCard>
      </div>
    </div>
  );
}

function StepCard({
  title,
  active,
  done,
  children,
}: {
  title: string;
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "p-4 transition-all border-2",
        active && "border-primary",
        done && "border-accent-green/30 opacity-60",
        !active && !done && "opacity-40"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-accent-green" />
        ) : (
          <div
            className={cn(
              "h-4 w-4 rounded-full border-2",
              active ? "border-primary" : "border-muted-foreground"
            )}
          />
        )}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {(active || done) && children}
    </Card>
  );
}
