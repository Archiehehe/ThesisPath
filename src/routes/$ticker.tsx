import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import {
  type CompaniesFile,
  type Company,
  type Pack,
  type PackIndex,
  type Question,
  packIdFor,
} from "@/lib/thesispath";

export const Route = createFileRoute("/$ticker")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.ticker} — ThesisPath research workspace` },
      {
        name: "description",
        content: `Work through the subtheme-specific ThesisPath question pack for ${params.ticker} with bounded AI assistance.`,
      },
    ],
  }),
  component: TickerPage,
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Ticker not in the curated universe.{" "}
      <Link to="/" className="underline">
        Back to search
      </Link>
    </div>
  ),
});

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load ${url}`);
  return r.json() as Promise<T>;
}

function TickerPage() {
  const { ticker } = Route.useParams();
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

  const curated = companies.data?.companies.find(
    (c) => c.ticker.toLowerCase() === ticker.toLowerCase(),
  );

  const resolved = useQuery({
    queryKey: ["resolve-ticker", ticker.toUpperCase()],
    enabled: !!companies.data && !curated,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const r = await fetch("/api/resolve-ticker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = (await r.json()) as { company?: Company; error?: string };
      if (!r.ok || !data.company) throw new Error(data.error ?? `HTTP ${r.status}`);
      return data.company;
    },
  });

  const company = curated ?? resolved.data;
  const packId = company && index.data ? packIdFor(company, index.data) : undefined;

  const pack = useQuery({
    queryKey: ["pack", packId],
    queryFn: () => fetchJson<Pack>(`/data/packs/${packId}.json`),
    enabled: !!packId,
    staleTime: Infinity,
  });

  if (companies.isLoading || index.isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!curated && resolved.isLoading) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        Resolving <span className="font-mono">{ticker.toUpperCase()}</span> with Lovable AI…
      </div>
    );
  }
  if (!company) {
    const msg = resolved.error instanceof Error ? resolved.error.message : "Ticker not found.";
    return (
      <div className="mx-auto max-w-lg p-10 text-center text-sm">
        <p className="text-muted-foreground">
          Couldn't resolve <span className="font-mono">{ticker.toUpperCase()}</span>.
        </p>
        <p className="mt-2 text-destructive">{msg}</p>
        <Link to="/" className="mt-4 inline-block underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> Universe
          </Link>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold">{company.ticker}</span>
            <h1 className="text-2xl font-semibold tracking-tight">{company.companyName}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {company.sector} · {company.theme} · {company.subtheme}
          </p>
          <CompanyMeta company={company} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {pack.isLoading && (
          <p className="text-sm text-muted-foreground">Loading question pack…</p>
        )}
        {pack.data && <PackView pack={pack.data} company={company} />}
      </main>
    </div>
  );
}

function CompanyMeta({ company }: { company: Company }) {
  const chips: [string, string | undefined][] = [
    ["Archetype", company.businessArchetype],
    ["Risk", company.riskArchetype],
    ["Revenue model", company.primaryRevenueModel],
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <Badge key={k} variant="secondary" className="font-normal">
            <span className="text-muted-foreground">{k}:</span>&nbsp;{v}
          </Badge>
        ))}
    </div>
  );
}

function PackView({ pack, company }: { pack: Pack; company: Company }) {
  const [activeSection, setActiveSection] = useState(pack.sections[0]?.sectionId);
  const section = pack.sections.find((s) => s.sectionId === activeSection) ?? pack.sections[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {pack.sections.map((s) => (
          <button
            key={s.sectionId}
            onClick={() => setActiveSection(s.sectionId)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              s.sectionId === section.sectionId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-accent"
            }`}
          >
            {s.sectionTitle}{" "}
            <span className="opacity-60">({s.questions.length})</span>
          </button>
        ))}
      </div>

      {section.analystFraming && (
        <p className="mb-6 rounded-md border-l-2 border-primary bg-muted/40 p-3 text-sm italic text-muted-foreground">
          {section.analystFraming}
        </p>
      )}

      <div className="space-y-4">
        {section.questions.map((q, i) => (
          <QuestionCard key={q.questionId} question={q} company={company} index={i + 1} />
        ))}
      </div>
    </div>
  );
}

const ACTIONS = [
  { id: "explain_question", label: "Explain question" },
  { id: "suggest_evidence", label: "Suggest evidence" },
  { id: "improve_answer", label: "Improve my draft" },
  { id: "find_gaps", label: "Find gaps" },
  { id: "flag_unsupported_claims", label: "Flag unsupported claims" },
  { id: "suggest_followups", label: "Follow-up questions" },
];

function QuestionCard({
  question,
  company,
  index,
}: {
  question: Question;
  company: Company;
  index: number;
}) {
  const [answer, setAnswer] = useState("");
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: string) {
    setLoading(action);
    setError(null);
    try {
      const r = await fetch("/api/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company,
          question,
          prompt: question.prompt ?? null,
          userAnswer: answer,
          action,
        }),
      });
      const data = (await r.json()) as { text?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setAiText(data.text ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start gap-2 text-base font-medium">
          <span className="text-muted-foreground">Q{index}.</span>
          <span>{question.question}</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{question.whyItMatters}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.expectedEvidence && question.expectedEvidence.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Expected evidence ({question.expectedEvidence.length})
            </summary>
            <ul className="mt-2 list-disc pl-5">
              {question.expectedEvidence.slice(0, 12).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </details>
        )}

        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Draft your answer with evidence…"
          rows={4}
        />

        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button
              key={a.id}
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => runAction(a.id)}
            >
              {loading === a.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {a.label}
            </Button>
          ))}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {aiText && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI assist
            </p>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{aiText}</ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
