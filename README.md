# ThesisPath

**ThesisPath** is a structured stock research app for retail investors.

It helps users turn a ticker or company idea into a clear research brief by mapping the company to its sector, theme, subtheme, business model, risk profile, and analyst-style diligence questions.

ThesisPath is designed to improve the research process before an investor builds a thesis. It is not a stock picker, screener, or recommendation engine.

---

## What ThesisPath Does

ThesisPath starts with a company or ticker and creates a guided research workflow around five core areas:

1. **Business Model** — what the company does and who it serves
2. **Economics & Unit Drivers** — how the business makes money and what drives margins
3. **Risks & Failure Modes** — what can break the thesis
4. **Stock Drivers & Market Expectations** — what the market is likely focused on
5. **Analyst Diligence** — what a more serious investor would verify before forming a view

The questions are not generic. A semiconductor company, managed-care insurer, credit card lender, software company, utility, pharma company, ETF, and luxury brand each require a different research path.

---

## Core Idea

Most retail investors begin with a simple idea:

> “I like this stock.”

ThesisPath turns that idea into a structured research brief:

- What business am I actually buying?
- What economics matter for this type of company?
- What could make the thesis fail?
- What variables move the stock?
- What evidence do I still need?
- What would a more experienced analyst check?

---

## Key Features

- **Company Universe**: deterministic mapping of tickers to sector, theme, subtheme, business archetype, risk archetype, and question pack
- **Subtheme-Specific Question Packs**: tailored research questions for different types of companies and investment exposures
- **Question-Level AI Assistance**: AI help is scoped to a specific company, template, and question instead of producing generic stock analysis
- **Research Brief Workspace**: answer questions, record notes, track evidence, and flag open diligence items
- **Final Research Memo**: generate a structured memo from the user’s completed research
- **Local-First Storage**: research sessions can be saved in the browser and exported/imported as JSON

---

## Data Files

ThesisPath is powered by three curated data files.

### 1. `thesispath_stock_universe_v1.json`

The stock universe maps companies and ETFs to their research context.

Example fields:

- ticker
- company name
- sector
- theme
- subtheme
- business archetype
- risk archetype
- market cap bucket
- key business segments
- important metrics
- stock drivers
- red flags
- peer group
- question pack ID

This prevents known tickers from being misclassified by AI.

### 2. `thesispath_question_universe_v1.json`

The question universe contains the research question packs used by the app.

Each question pack includes:

- research sections
- analyst-style questions
- why each question matters
- required or optional metrics
- evidence checklist
- red flags
- common mistakes
- professional diligence checks

### 3. `thesispath_ai_prompt_universe_v1.json`

The AI prompt universe contains bounded prompts for each research question.

Each prompt defines:

- AI role
- task
- required context
- analysis rules
- evidence requirements
- red-flag heuristics
- strict output structure

AI is used to support the research workflow, not to replace it.

---

## Research Flow

1. User enters a ticker or company name
2. App looks up the company in the stock universe
3. App loads the matching sector/theme/subtheme research template
4. User works through the research questions
5. AI can assist with specific questions when requested
6. User saves notes, metrics, evidence, and open questions
7. App generates a final research memo

---

## Example Mappings

| Ticker | Research Context |
|---|---|
| NVDA | AI Compute & Semiconductors → AI Accelerators / GPUs |
| TSM | Semiconductors → Foundry |
| ASML | Semiconductors → Lithography Equipment |
| UNH | Healthcare → Managed Care / Health Insurance |
| COF | Financials → Credit Cards / Consumer Finance |
| JPM | Financials → Money Center Banks |
| LLY | Healthcare → GLP-1 / Obesity / Diabetes |
| V | Financials → Payment Networks |
| BX | Financials → Alternative Asset Managers |
| VST | Energy / Power → Merchant Power / Data Center Power |
| EWJ | Country ETF → Japan Equities |

---

## App Architecture

```txt
Ticker input
  ↓
Stock universe lookup
  ↓
Company metadata
  ↓
Question pack selection
  ↓
Research workspace
  ↓
Question-specific AI assistance
  ↓
Final research memo
```

Known companies should be classified by the stock universe first. AI assistance should operate inside the selected company and question context.

---

## Suggested Project Structure

```txt
public/
  data/
    thesispath_stock_universe_v1.json
    thesispath_question_universe_v1.json
    thesispath_ai_prompt_universe_v1.json

src/
  components/
  lib/
    data/
    storage/
    ai/
  pages/
  types/
```

---

## Technology Stack

Suggested stack:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zod
- LocalStorage or IndexedDB
- Optional serverless functions for AI assistance

---

## What ThesisPath Is Not

ThesisPath does not provide:

- buy/sell recommendations
- price targets
- return forecasts
- investment ratings
- personalized financial advice

It is a research workflow tool.

---

## Disclaimer

ThesisPath is for educational and research workflow purposes only. It is not investment advice. Users should verify important information with primary sources such as company filings, earnings releases, investor presentations, and regulatory disclosures.
