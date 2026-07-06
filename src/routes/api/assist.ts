import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = {
  company: Record<string, unknown>;
  question: Record<string, unknown>;
  prompt: Record<string, unknown> | null;
  userAnswer?: string;
  action?: string;
  messages: UIMessage[];
};

function buildSystemPrompt(b: Body): string {
  const p = b.prompt ?? {};
  const c = b.company;
  const q = b.question;
  return [
    (p as any).role ?? "You are an equity research workflow assistant.",
    "",
    `Task: ${(p as any).task ?? "Help the user answer this ThesisPath question."}`,
    "",
    "== Company universe record (authoritative — do not reclassify) ==",
    JSON.stringify(c, null, 2),
    "",
    "== Question ==",
    JSON.stringify(q, null, 2),
    "",
    "== Analysis focus ==",
    JSON.stringify((p as any).analysisFocus ?? [], null, 2),
    "",
    "== Analysis rules (hard) ==",
    ...(((p as any).analysisRules ?? []) as string[]).map((r) => `- ${r}`),
    "",
    "== Global guardrails ==",
    "- Do not give buy/sell/hold recommendations or price targets.",
    "- Stay strictly within the selected subtheme and company record.",
    "- Cite what type of evidence would be needed; do not fabricate figures.",
    "- Keep answers concise and structured (markdown, short sections).",
    "",
    b.userAnswer ? `== User's current draft answer ==\n${b.userAnswer}` : "",
    b.action ? `== Requested assistant action ==\n${b.action}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/api/assist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }
        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: buildSystemPrompt(body),
          messages: await convertToModelMessages(body.messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
