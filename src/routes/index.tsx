import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { CompaniesFile, PackIndex } from "@/lib/thesispath";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThesisPath — Structured equity research workflow" },
      {
        name: "description",
        content:
          "Pick a ticker, work through a subtheme-specific research question pack, and get bounded AI assistance grounded in a curated stock universe.",
      },
      { property: "og:title", content: "ThesisPath — Structured equity research" },
      {
        property: "og:description",
        content:
          "Subtheme-specific question packs and bounded AI assist for every stock in a curated universe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load ${url}`);
  return r.json() as Promise<T>;
}

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: () => fetchJson<CompaniesFile>("/data/companies.json"),
    staleTime: Infinity,
  });
  const index = useQuery({
    queryKey: ["packs-index"],
    queryFn: () => fetchJson<PackIndex>("/data/packs-index.json"),
    staleTime: Infinity,
  });

  const filtered = useMemo(() => {
    const list = companies.data?.companies ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list.slice(0, 60);
    return list
      .filter(
        (c) =>
          c.ticker.toLowerCase().includes(term) ||
          c.companyName.toLowerCase().includes(term) ||
          (c.subtheme ?? "").toLowerCase().includes(term) ||
          (c.theme ?? "").toLowerCase().includes(term) ||
          (c.sector ?? "").toLowerCase().includes(term),
      )
      .slice(0, 80);
  }, [q, companies.data]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">ThesisPath</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Structured equity research, one subtheme at a time
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Search any listed ticker (market cap over $2B). The curated universe of{" "}
            {companies.data?.companies.length ?? "…"} names below opens instantly; anything
            else is classified into one of {index.data?.packs.length ?? "…"} question packs by
            Lovable AI on the fly.
          </p>
          <form
            className="mt-6 flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = q.trim().toUpperCase();
              if (t) navigate({ to: "/$ticker", params: { ticker: t } });
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ticker (e.g. AAPL), company, subtheme…"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Open
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Press Enter to research any ticker with Lovable AI.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {companies.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading universe…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.ticker}
                to="/$ticker"
                params={{ ticker: c.ticker }}
                className="block"
              >
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{c.ticker}</span>
                      <span className="text-xs text-muted-foreground">{c.assetType}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium">{c.companyName}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {c.sector}
                      {c.subtheme ? ` · ${c.subtheme}` : ""}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No matches.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
