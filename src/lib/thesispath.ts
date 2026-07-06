export type Company = {
  ticker: string;
  companyName: string;
  exchange?: string;
  country?: string;
  assetType?: string;
  sector?: string;
  theme?: string;
  subtheme?: string;
  industryDescription?: string;
  businessArchetype?: string;
  riskArchetype?: string;
  primaryRevenueModel?: string;
  primaryCustomerType?: string;
  economicModel?: string;
  keyBusinessSegments?: string[];
  importantMetrics?: string[];
  stockDrivers?: string[];
  redFlags?: string[];
};

export type Question = {
  questionId: string;
  questionPackId: string;
  sector: string;
  theme: string;
  subtheme: string;
  sectionId: string;
  sectionTitle: string;
  question: string;
  whyItMatters: string;
  answerType: string;
  expectedEvidence?: string[];
  prompt?: Record<string, unknown> | null;
};

export type Section = {
  sectionId: string;
  sectionTitle: string;
  universalPurpose?: string;
  analystFraming?: string;
  questions: Question[];
};

export type Pack = {
  questionPackId: string;
  sector: string;
  theme: string;
  subtheme: string;
  businessArchetypes?: string[];
  riskArchetypes?: string[];
  keyMetrics?: string[];
  redFlags?: string[];
  professionalChecks?: string[];
  sections: Section[];
};

export type PackIndex = {
  sectionModel: { id: string; title: string }[];
  packs: { questionPackId: string; sector: string; theme: string; subtheme: string }[];
  guardrails: string[];
  assistantActions: string[];
};

export type CompaniesFile = {
  lookupRules: string[];
  companies: Company[];
};

export function packIdFor(c: Company): string {
  // pack ids in the data are `${sector}__${theme}__${subtheme}` with lowercased,
  // underscore-normalized tokens (letters/digits only).
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, " ")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  return `${norm(c.sector ?? "")}__${norm(c.theme ?? "")}__${norm(c.subtheme ?? "")}`;
}
