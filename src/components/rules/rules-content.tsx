"use client";

import { useMemo } from "react";
import type { RulesSection } from "@/lib/types";
import { Card } from "@/components/ui/card";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function RulesContent({ sections }: { sections: RulesSection[] }) {
  const headings = useMemo(
    () =>
      sections
        .filter((s) => s.type === "heading" && s.text)
        .map((s) => ({ text: s.text!, slug: slugify(s.text!) })),
    [sections]
  );

  return (
    <div className="max-w-4xl mx-auto flex gap-8">
      {headings.length > 1 && (
        <nav className="hidden lg:block w-48 shrink-0 sticky top-20 self-start">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Sections
          </h2>
          <ul className="space-y-1.5">
            {headings.map((h) => (
              <li key={h.slug}>
                <a
                  href={`#${h.slug}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-2"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="flex-1 space-y-5 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Rules</h1>

        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No rules available.
          </p>
        ) : (
          <Card className="p-6 space-y-4">
            {sections.map((section, i) => {
              if (section.type === "heading") {
                return (
                  <h2
                    key={i}
                    id={slugify(section.text || "")}
                    className="text-base font-semibold pt-3 first:pt-0 scroll-mt-20"
                  >
                    {section.text}
                  </h2>
                );
              }
              if (section.type === "paragraph") {
                return (
                  <p
                    key={i}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {section.text}
                  </p>
                );
              }
              if (
                section.type === "table" &&
                section.headers &&
                section.rows
              ) {
                return (
                  <div
                    key={i}
                    className="overflow-x-auto rounded border border-border"
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          {section.headers.map((h, j) => (
                            <th
                              key={j}
                              className="text-left p-2.5 font-medium text-xs"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, j) => (
                          <tr
                            key={j}
                            className="border-b border-border last:border-0"
                          >
                            {row.map((cell, k) => (
                              <td key={k} className="p-2.5 font-mono text-xs">
                                {cell}
                              </td>
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
          </Card>
        )}
      </div>
    </div>
  );
}
