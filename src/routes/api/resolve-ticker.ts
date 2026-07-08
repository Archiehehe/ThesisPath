import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import packsIndex from "@/lib/packs-index.json";

type Body = { ticker: string };

type ResolvedCompany = {
  ticker: string;
  companyName: string;
  exchange?: string;
  country?: string;
  assetType?: string;
  sector: string;
  theme: string;
  subtheme: string;
  industryDescription?: string;
  businessArchetype?: string;
  riskArchetype?: string;
  primaryRevenueModel?: string;
  primaryCustomerType?: string;
  keyBusinessSegments?: string[];
  importantMetrics?: string[];
  stockDrivers?: string[];
  redFlags?: string[];
  marketCapUsdB?: number;
  aiResolved?: true;
};

type PackIndexEntry = {
  questionPackId: string;
  sector: string;
  theme: string;
  subtheme: string;
};

type QuoteFact = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  exchange?: string;
  fullExchangeName?: string;
  quoteType?: string;
  marketCap?: number;
  currency?: string;
  marketState?: string;
};

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

function toUsdBillions(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round((value / 1_000_000_000) * 10) / 10
    : undefined;
}

async function fetchQuoteFact(ticker: string): Promise<QuoteFact | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "ThesisPath/1.0" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      quoteResponse?: { result?: QuoteFact[] };
    };
    return data.quoteResponse?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/resolve-ticker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { ticker } = (await request.json()) as Body;
        if (!ticker || typeof ticker !== "string") {
          return Response.json({ error: "ticker required" }, { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "Missing LOVABLE_API_KEY" }, { status: 500 });

        // Bundle the taxonomy instead of fetching it from the deployed origin; server-side
        // self-fetches can fail before the AI call on preview deployments.
        const idx = packsIndex as { packs: PackIndexEntry[] };

        const requestedTicker = ticker.trim().toUpperCase();
        const quoteFact = await fetchQuoteFact(requestedTicker);
        const quoteContext = quoteFact
          ? JSON.stringify(
              {
                ticker: quoteFact.symbol,
                name: quoteFact.longName ?? quoteFact.shortName,
                exchange: quoteFact.fullExchangeName ?? quoteFact.exchange,
                quoteType: quoteFact.quoteType,
                currency: quoteFact.currency,
                marketCapUsdB: toUsdBillions(quoteFact.marketCap),
                marketState: quoteFact.marketState,
              },
              null,
              2,
            )
          : "No live quote facts were available. Resolve from your company/ticker knowledge.";

        const catalog = idx.packs
          .map((p) => `${p.sector} | ${p.theme} | ${p.subtheme}`)
          .join("\n");

        const gateway = createLovableAiGatewayProvider(key);
        const system = [
          "You classify publicly-listed equities (and ETFs) for an equity research app.",
          "You have a REFERENCE taxonomy of sector|theme|subtheme triples. Prefer an exact match from it when one accurately fits.",
          "If NO triple in the reference taxonomy is a good fit (new IPO, spin-off, niche ticker, recent listing, non-US listing, ETF not in list, etc.), invent an accurate sector/theme/subtheme yourself using your own knowledge. Do not force a bad match.",
          "Use the live quote facts as authoritative for ticker symbol, company/fund name, and exchange when provided. If facts are missing but you know the listed security, still resolve it from your own knowledge.",
          "Be careful with ambiguous tickers: e.g. SpaceX is private and NOT publicly traded — do not confuse similarly-named tickers with private companies.",
          'Only return {"error": "<short reason>"} when the ticker is clearly not a real listed security anywhere in the world.',
          "Do not reject companies for small market cap. Market cap is optional context only.",
          "Return valid JSON only. No prose, no code fences.",
        ].join("\n");

        const prompt = [
          `Ticker requested: ${requestedTicker}`,
          "",
          "Live quote/context facts, if available (authoritative for name/exchange when present):",
          quoteContext,
          "",
          "REFERENCE taxonomy (prefer an exact match; otherwise invent accurate free-form values):",
          catalog,
          "",
          "Return JSON with this shape (omit unknown optional fields):",
          `{
  "ticker": "string (uppercase primary listing)",
  "companyName": "string",
  "exchange": "string",
  "country": "string",
  "assetType": "Stock" | "ETF" | "Fund" | "ADR",
  "sector": "string (from taxonomy if matches, else your own accurate label)",
  "theme": "string (from taxonomy if matches, else your own accurate label)",
  "subtheme": "string (from taxonomy if matches, else your own accurate label)",
  "industryDescription": "1-2 sentence business description",
  "businessArchetype": "short label",
  "riskArchetype": "short label",
  "primaryRevenueModel": "short label",
  "primaryCustomerType": "short label",
  "keyBusinessSegments": ["..."],
  "importantMetrics": ["..."],
  "stockDrivers": ["..."],
  "redFlags": ["..."],
  "marketCapUsdB": number (approximate, in USD billions, if known)
}`,
        ].join("\n");

        try {
          const { text } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system,
            prompt,
          });
          const parsed = extractJson(text) as Record<string, unknown>;
          if (parsed.error) {
            return Response.json({ error: String(parsed.error) }, { status: 404 });
          }
          if (!parsed.sector || !parsed.theme || !parsed.subtheme) {
            return Response.json(
              { error: "AI did not return a sector/theme/subtheme." },
              { status: 422 },
            );
          }

          const company: ResolvedCompany = {
            ...(parsed as ResolvedCompany),
            ticker: String(parsed.ticker ?? quoteFact?.symbol ?? requestedTicker).toUpperCase(),
            companyName: String(
              parsed.companyName ?? quoteFact?.longName ?? quoteFact?.shortName ?? requestedTicker,
            ),
            exchange: String(
              parsed.exchange ?? quoteFact?.fullExchangeName ?? quoteFact?.exchange ?? "Unknown",
            ),
            assetType: String(parsed.assetType ?? quoteFact?.quoteType ?? "Stock"),
            marketCapUsdB:
              typeof parsed.marketCapUsdB === "number"
                ? parsed.marketCapUsdB
                : toUsdBillions(quoteFact?.marketCap),
            aiResolved: true,
          };
          return Response.json({ company });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
