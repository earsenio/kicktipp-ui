"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

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

export function CommunitySwitcher() {
  const [communities, setCommunities] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi("get_communities"),
      fetchApi("get_status"),
    ])
      .then(([comms, status]) => {
        setCommunities(comms as string[]);
        setCurrent((status as { community: string | null }).community);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleChange(name: string | null) {
    if (!name) return;
    try {
      await fetchApi("set_community", { name });
      setCurrent(name);
      toast.success(`Switched to ${name}`);
      window.location.reload();
    } catch {
      toast.error("Failed to switch community");
    }
  }

  if (loading || communities.length === 0) return null;

  return (
    <Select value={current ?? undefined} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select community" />
      </SelectTrigger>
      <SelectContent>
        {communities.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
