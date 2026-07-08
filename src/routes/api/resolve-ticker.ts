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

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model output");
  return JSON.parse(raw.slice(start, end + 1));
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

        const catalog = idx.packs
          .map((p) => `${p.sector} | ${p.theme} | ${p.subtheme}`)
          .join("\n");

        const gateway = createLovableAiGatewayProvider(key);
        const system = [
          "You classify publicly-listed equities into a fixed research taxonomy.",
          "You must ONLY use one of the allowed sector|theme|subtheme triples below.",
          "You must return valid JSON. No prose, no code fences.",
          "If the ticker is not a real listed security, or market cap is under 2 billion USD,",
          'return {"error": "<short reason>"} instead of a company object.',
          "Never fabricate ticker symbols. Use the primary listing exchange.",
        ].join("\n");

        const prompt = [
          `Ticker: ${ticker.trim().toUpperCase()}`,
          "",
          "Allowed taxonomy (pick the single closest match; copy the strings EXACTLY):",
          catalog,
          "",
          "Return JSON with this shape (omit unknown optional fields):",
          `{
  "ticker": "string (uppercase primary listing)",
  "companyName": "string",
  "exchange": "string",
  "country": "string",
  "assetType": "Stock" | "ETF",
  "sector": "one of allowed",
  "theme": "one of allowed",
  "subtheme": "one of allowed",
  "industryDescription": "1-2 sentence business description",
  "businessArchetype": "short label",
  "riskArchetype": "short label",
  "primaryRevenueModel": "short label",
  "primaryCustomerType": "short label",
  "keyBusinessSegments": ["..."],
  "importantMetrics": ["..."],
  "stockDrivers": ["..."],
  "redFlags": ["..."],
  "marketCapUsdB": number (approximate, in USD billions)
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
          // Validate taxonomy
          const match = idx.packs.find(
            (p) =>
              p.sector === parsed.sector &&
              p.theme === parsed.theme &&
              p.subtheme === parsed.subtheme,
          );
          if (!match) {
            return Response.json(
              { error: "AI returned a subtheme outside the allowed taxonomy." },
              { status: 422 },
            );
          }
          const mc = Number(parsed.marketCapUsdB ?? 0);
          if (mc && mc < 2) {
            return Response.json(
              { error: `Market cap ~$${mc}B is below the $2B threshold.` },
              { status: 404 },
            );
          }
          const company: ResolvedCompany = {
            ...(parsed as ResolvedCompany),
            ticker: String(parsed.ticker ?? ticker).toUpperCase(),
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
