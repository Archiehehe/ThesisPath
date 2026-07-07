import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThesisPath — Structured equity research workflow" },
      {
        name: "description",
        content:
          "Type any listed ticker (market cap over $2B). Lovable AI classifies the company into a subtheme-specific research question pack and helps you answer each question with evidence.",
      },
      { property: "og:title", content: "ThesisPath — Structured equity research" },
      {
        property: "og:description",
        content:
          "Type any ticker. Lovable AI resolves the company, loads its subtheme question pack, and answers every question with evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim().toUpperCase();
    if (t) navigate({ to: "/$ticker", params: { ticker: t } });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 20% 10%, oklch(0.3 0.12 264 / 0.5), transparent 60%), radial-gradient(500px circle at 85% 80%, oklch(0.35 0.15 200 / 0.35), transparent 60%)",
        }}
      />
      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">ThesisPath</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Research any ticker,
          <br />
          <span className="text-muted-foreground">one subtheme at a time.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Type a ticker for any listed company with a market cap over $2B. Lovable AI
          identifies the company, classifies it into the right subtheme, loads a bespoke
          research question pack, and helps you answer each question with cited evidence.
        </p>

        <form onSubmit={submit} className="mt-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="AAPL, NVDA, ASML, JPM…"
              className="h-12 pl-10 font-mono text-base uppercase tracking-wide"
              autoFocus
            />
          </div>
          <Button type="submit" size="lg" className="h-12 gap-2 px-6">
            <Sparkles className="h-4 w-4" />
            Research
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Press Enter — nothing is pre-loaded. Every company is resolved live by Lovable AI.
        </p>

        <div className="mt-12 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="mr-1 opacity-70">Try:</span>
          {["NVDA", "TSLA", "JPM", "ASML", "COST", "CRWD", "LLY"].map((t) => (
            <button
              key={t}
              onClick={() => navigate({ to: "/$ticker", params: { ticker: t } })}
              className="rounded-full border border-border px-3 py-1 font-mono hover:border-primary hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
