# Technical Requirements Document (TRD)
## AI Stack Auditor

**Version:** 2.0
**Companion to:** PRD.md, BUILD_PLAN.md, SUPABASE_SETUP_GUIDE.md

**Changelog from v1.0:** Backend build tool changed from Lovable+FastAPI split to
Antigravity-only. Database/auth changed from generic PostgreSQL to Supabase (Postgres +
built-in auth + RLS). Added ROI Intelligence Agent, Stack Simulator. Schema expanded with
`user_id` ownership and row-level security. Added dark/light theming requirements.

---

## 1. Architecture Overview

```
┌───────────────────────┐      ┌──────────────────────────┐
│  React Frontend         │────▶│  FastAPI Agent Service     │
│  (Tailwind + Framer      │◀────│  (Antigravity-built)       │
│   Motion, dark/light)    │      │  — orchestrates agents      │
└───────────┬─────────────┘      └────────────┬─────────────┘
            │                                   │
            ▼                                   ▼
   ┌──────────────────┐              ┌───────────────────────┐
   │  Supabase Auth      │              │  LLM Layer (Gemini /    │
   │  (sign up/in,       │              │  Claude — chosen per    │
   │   session mgmt)     │              │  agent's reasoning need)│
   └──────────────────┘              └───────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────────────┐
   │  Supabase Postgres (RLS-protected)                   │
   │  businesses, tools, findings, recommendations,       │
   │  reports — see schema §3                              │
   └──────────────────────────────────────────────────┘
```

The frontend talks to Supabase directly for auth and for reading/writing report data
(via the Supabase JS client, respecting RLS). The frontend talks to the FastAPI agent
service only to *run* an audit (`POST /audit/run`); the agent service uses a
`service_role` key (server-side only) to write results back into the same Supabase
Postgres instance.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React.js + Tailwind CSS + Framer Motion | Dashboard, upload UI, agent-trace view, theming |
| Backend | FastAPI (Python), built in Antigravity | Agent orchestration only — not auth/DB |
| Auth | Supabase Auth (email/password) | Native, RLS-integrated |
| Database | Supabase Postgres | Full relational schema, see §3 |
| LLM Layer | Gemini and/or Claude, chosen per agent | Antigravity supports both in one workspace |
| File Processing | pandas, pdfplumber / PyMuPDF | CSV, invoice, contract parsing |
| Knowledge Base | Static JSON/CSV seed, keyword-filtered retrieval | Grounds Job-Mapping + ROI agents |
| PDF Export | jspdf + html2canvas (client-side) | Download Report button |
| Deployment | Vercel (frontend) + Render/Fly.io (FastAPI service) | Supabase is already hosted |

---

## 3. Data Model (Supabase Postgres)

All tables use Row-Level Security scoped to `auth.uid()`. Full SQL — including RLS
policies — lives in `SUPABASE_SETUP_GUIDE.md`; schema summarized here.

### `businesses`
| Field | Type |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| name | text |
| created_at | timestamptz |

### `tools`
| Field | Type |
|---|---|
| id | uuid (PK) |
| business_id | FK → businesses |
| tool_name | text |
| vendor | text |
| category | text |
| plan_tier | text |
| monthly_cost | numeric |
| seats_purchased | int |
| seats_active_estimated | int (nullable — self-reported) |
| is_ai_addon | boolean |
| source | enum(csv, invoice, manual) |
| renewal_date | date (nullable) |

### `findings`
| Field | Type |
|---|---|
| id | uuid (PK) |
| business_id | FK |
| tool_id | FK (nullable) |
| finding_type | enum(duplicate, underused, overpriced_tier, inactive_seats, hidden_addon, renewal_risk) |
| description | text |
| confidence_score | numeric (0–1) |
| generated_by_agent | text |

### `roi_scores` (new)
| Field | Type |
|---|---|
| id | uuid (PK) |
| tool_id | FK → tools |
| roi_score | numeric |
| productivity_score | numeric |
| business_value_estimate | text |
| confidence_score | numeric (0–1) |

### `recommendations`
| Field | Type |
|---|---|
| id | uuid (PK) |
| finding_id | FK |
| action_type | enum(retain, downgrade, cancel, consolidate, review_renewal) |
| suggested_alternative | text (nullable) |
| estimated_monthly_savings | numeric |
| estimated_annual_savings | numeric |
| status | enum(draft, approved, dismissed) |

### `reports`
| Field | Type |
|---|---|
| id | uuid (PK) |
| business_id | FK |
| generated_at | timestamptz |
| total_monthly_savings | numeric |
| total_annual_savings | numeric |

### `tool_knowledge_base` (seed/reference, not per-tenant, no RLS needed)
| Field | Type |
|---|---|
| tool_name | text |
| known_categories | text[] |
| typical_price_range | text |
| known_alternatives | text[] |

---

## 4. Agent Specifications

### 4.1 Discovery Agent
Input: raw CSV rows / parsed invoice text / manual tool list.
Output: `{tool_name, vendor, cost, plan_tier, is_ai_addon}[]`.

### 4.2 Job-Mapping Agent
Input: discovered tool list. Grounded via retrieval against `tool_knowledge_base`.
Output: `{tool_name, category, confidence}[]`.

### 4.3 Waste Detection Agent
Input: categorized tools + usage estimates + renewal dates.
Process: same-category duplicate detection and cost-vs-seats math should be
**rule-based**, not LLM-inferred; reserve LLM reasoning for judgment calls like "is this
tier justified."
Output: `findings[]`.

### 4.4 ROI Intelligence Agent (new)
Input: tool list + cost data + usage estimates.
Process: estimate productivity/business impact per tool, compute an ROI score,
independent of and in parallel with Waste Detection (both consume the same tool list,
neither depends on the other's output).
Output: `roi_scores[]` — `{tool_id, roi_score, productivity_score, business_value_estimate,
confidence_score}`.

### 4.5 Alternative Recommendation Agent
Input: `findings[]` + `roi_scores[]` + `tool_knowledge_base`.
Process: for each finding, propose retain/downgrade/consolidate/cancel — **must check
`roi_scores` before recommending cancellation**, so a high-ROI tool isn't flagged purely
for being expensive.
Output: `recommendations[]` (status = draft).

### 4.6 Stack Simulator (new — runs independently of main pipeline)
Input: current tool inventory + a user-specified hypothetical (e.g. "replace Claude with
Gemini," "reduce AI spend by 20%").
Process: re-runs cost/impact math against the hypothetical without touching real data or
writing to `findings`/`recommendations`.
Output: `{predicted_monthly_cost, productivity_impact, risk_score, recommendation}` —
ephemeral, not persisted unless the user explicitly saves it.

### 4.7 Action Agent
Input: `recommendations[]`.
Output: `report` object + rendered PDF export data.
Constraint: never auto-executes; all output requires explicit user approval in UI.

---

## 5. API Endpoints (FastAPI — agent orchestration only)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/audit/run` | Trigger full agent pipeline (Discovery → Job-Mapping → Waste → ROI → Recommendation → Action) for a business; writes results to Supabase |
| POST | `/simulate` | Run Stack Simulator against a hypothetical, returns ephemeral result |
| GET | `/demo/dataset` | Return the pre-built synthetic demo dataset for "Try Demo" mode |

Auth, report retrieval, and approve/dismiss actions go **directly from frontend to
Supabase** (via the JS client + RLS) — they don't need to route through FastAPI.

---

## 6. Non-Functional Requirements

- **Latency:** full pipeline run on demo dataset completes in <60s
- **Transparency:** every finding/recommendation/ROI score must be traceable to source
  data + the agent that generated it
- **Privacy:** uploaded invoice data processed transiently by the agent service; only
  structured results (not raw files) persist to Supabase; RLS ensures users only ever
  access their own data
- **Reliability:** LLM calls wrapped with structured-output (JSON schema) validation and
  retry-on-parse-failure logic
- **Theming:** dark/light mode implemented via Tailwind `class` strategy with centralized
  color tokens — no per-component hardcoded colors, so the toggle is guaranteed to apply
  everywhere
- **Auth fallback:** "Try Demo" mode must function with zero Supabase calls, as a
  guaranteed-working path independent of live auth

---

## 7. Synthetic Demo Dataset Requirements

- 1–2 sample companies with 15–25 line items each
- Deliberately include: 2+ overlapping tools in the same category, 1 hidden AI add-on
  inside a larger SaaS bill, 1 clearly underused premium tier, 1 upcoming renewal on a
  low-usage tool, 1 tool that is expensive but should score high on ROI (to demonstrate the
  ROI Agent isn't just flagging cost)
- Stored as CSV fixtures + loaded via `/demo/dataset`
