import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = {
  company: Record<string, unknown>;
  question: Record<string, unknown>;
  prompt: Record<string, unknown> | null;
  userAnswer?: string;
  action?: string;
  userMessage?: string;
};

function buildSystemPrompt(b: Body): string {
  const p = (b.prompt ?? {}) as Record<string, unknown>;
  return [
    (p.role as string) ?? "You are an equity research workflow assistant.",
    "",
    `Task: ${(p.task as string) ?? "Help the user answer this ThesisPath question."}`,
    "",
    "== Company universe record (authoritative — do not reclassify) ==",
    JSON.stringify(b.company, null, 2),
    "",
    "== Question ==",
    JSON.stringify(b.question, null, 2),
    "",
    "== Analysis focus ==",
    JSON.stringify(p.analysisFocus ?? [], null, 2),
    "",
    "== Analysis rules (hard) ==",
    ...(((p.analysisRules as string[]) ?? []) as string[]).map((r) => `- ${r}`),
    "",
    "== Global guardrails ==",
    "- Do not give buy/sell/hold recommendations or price targets.",
    "- Stay strictly within the selected subtheme and company record.",
    "- Cite what type of evidence would be needed; never fabricate figures or dates.",
    "- Keep responses concise and structured (markdown, short sections, bullets).",
  ].join("\n");
}

function buildUserPrompt(b: Body): string {
  const parts: string[] = [];
  if (b.action === "answer_with_evidence") {
    parts.push(
      "Assistant action: **Give the answer using evidence**.",
      "Draft a full analyst-grade answer to the question above for this specific company.",
      "Structure the response as: (1) Direct answer in 2-3 sentences, (2) Key evidence — bullet list of the concrete data points, filings, disclosures, or public facts an analyst would cite (label each as 'Evidence needed:' when you cannot verify a specific number), (3) Assumptions and caveats, (4) What would change this view.",
      "Do NOT fabricate figures, dates, or quotes. Where a specific number is required, describe the exact source to pull it from (e.g. '10-K Item 7 MD&A, segment revenue table').",
    );
  } else if (b.action) {
    parts.push(`Assistant action requested: **${b.action}**`);
  }
  if (b.userAnswer?.trim()) {
    parts.push(`My current draft answer:\n"""\n${b.userAnswer}\n"""`);
  } else if (b.action !== "answer_with_evidence") {
    parts.push("I have not drafted an answer yet.");
  }
  if (b.userMessage?.trim()) parts.push(`Additional instruction: ${b.userMessage}`);
  parts.push("Respond in markdown.");
  return parts.join("\n\n");
}


export const Route = createFileRoute("/api/assist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        try {
          const result = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system: buildSystemPrompt(body),
            prompt: buildUserPrompt(body),
          });
          return Response.json({ text: result.text });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
