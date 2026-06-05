"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Loader2 } from "lucide-react";
import { useKicktipp } from "@/hooks/use-kicktipp";
import type { RulesSection } from "@/lib/types";

export function RulesModal() {
  const [open, setOpen] = useState(false);
  const { data, loading } = useKicktipp<RulesSection[]>({
    tool: "get_rules",
    options: { skip: !open },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Rules"
      >
        <HelpCircle className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Rules</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-3 pt-2">
            {data.map((section, i) => {
              if (section.type === "heading") {
                return (
                  <h3 key={i} className="text-sm font-semibold pt-2 first:pt-0">
                    {section.text}
                  </h3>
                );
              }
              if (section.type === "paragraph") {
                return (
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                    {section.text}
                  </p>
                );
              }
              if (section.type === "table" && section.headers && section.rows) {
                return (
                  <div key={i} className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          {section.headers.map((h, j) => (
                            <th key={j} className="text-left p-2 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, j) => (
                          <tr key={j} className="border-b border-border last:border-0">
                            {row.map((cell, k) => (
                              <td key={k} className="p-2 font-mono">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No rules available.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
