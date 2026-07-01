# Technical Requirements Document (TRD)
## AI Stack Auditor

**Version:** 1.0
**Companion to:** PRD.md, BUILD_PLAN.md

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  React Frontend  │────▶│  FastAPI Backend  │────▶│  PostgreSQL          │
│  (Dashboard/UI)  │◀────│  (Orchestrator)   │◀────│  (tools, findings,   │
└─────────────────┘     └────────┬──────────┘     │   reports, spend)    │
                                  │                 └─────────────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │   Agent Orchestration      │
                    │   Layer (sequential/DAG)   │
                    └────────────┬───────────────┘
                                  │
        ┌─────────────┬──────────┼──────────┬──────────────┐
        ▼             ▼          ▼          ▼              ▼
   Discovery    Job-Mapping   Waste      Recommendation   Action
     Agent         Agent    Detection       Agent          Agent
        │             │      Agent           │              │
        └─────────────┴──────┬───────────────┴──────────────┘
                              ▼
                    ┌───────────────────┐
                    │  LLM Layer (Gemini │
                    │  or equivalent)    │
                    │  + Tool Knowledge  │
                    │  Base (RAG)        │
                    └───────────────────┘
```

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React.js + Tailwind CSS | Dashboard, upload UI, agent-trace view |
| Backend | FastAPI (Python) | Agent orchestration, REST APIs |
| Database | PostgreSQL | Businesses, tools, findings, reports |
| LLM Layer | Gemini (or Claude/GPT equivalent) | Classification, reasoning, recommendation generation |
| File Processing | pandas, pdfplumber / PyMuPDF | CSV, invoice, contract parsing |
| Knowledge Base | Static JSON/CSV seed + pgvector or simple keyword match | Grounds Job-Mapping Agent |
| Deployment | Vercel (frontend) + Render/Fly.io (backend) | Rapid hackathon hosting |

---

## 3. Data Model (PostgreSQL)

### `businesses`
| Field | Type |
|---|---|
| id | UUID (PK) |
| name | text |
| created_at | timestamp |

### `tools`
| Field | Type |
|---|---|
| id | UUID (PK) |
| business_id | FK → businesses |
| tool_name | text |
| vendor | text |
| category | text (job mapping, e.g. "coding_assistant") |
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
| id | UUID (PK) |
| business_id | FK |
| tool_id | FK (nullable if cross-tool finding) |
| finding_type | enum(duplicate, underused, overpriced_tier, inactive_seats, hidden_addon, renewal_risk) |
| description | text |
| confidence_score | numeric (0–1) |
| generated_by_agent | text |

### `recommendations`
| Field | Type |
|---|---|
| id | UUID (PK) |
| finding_id | FK |
| action_type | enum(retain, downgrade, cancel, consolidate, review_renewal) |
| suggested_alternative | text (nullable) |
| estimated_monthly_savings | numeric |
| estimated_annual_savings | numeric |
| status | enum(draft, approved, dismissed) — user must approve |

### `reports`
| Field | Type |
|---|---|
| id | UUID (PK) |
| business_id | FK |
| generated_at | timestamp |
| total_monthly_savings | numeric |
| total_annual_savings | numeric |
| export_url | text (nullable) |

### `tool_knowledge_base` (seed/reference data, not per-tenant)
| Field | Type |
|---|---|
| tool_name | text |
| known_categories | text[] |
| typical_price_range | text |
| known_alternatives | text[] |

---

## 4. Agent Specifications

Each agent is a discrete function/service with a defined input/output contract. Agents can
be implemented as sequential LLM calls with structured (JSON) output, orchestrated by
FastAPI — not a single monolithic prompt.

### 4.1 Discovery Agent
- **Input:** raw CSV rows / parsed invoice text / manual tool list
- **Process:** extract line items, match against known AI vendor patterns, flag AI add-ons
  bundled inside larger SaaS line items (e.g. "Notion AI" inside a Notion invoice)
- **Output:** structured list of `{tool_name, vendor, cost, plan_tier, is_ai_addon}`

### 4.2 Job-Mapping Agent
- **Input:** discovered tool list
- **Process:** classify each tool into a business-job taxonomy, grounded via retrieval
  against `tool_knowledge_base`; falls back to LLM reasoning with explicit "low confidence"
  flag for unknown tools
- **Output:** `{tool_name, category, confidence}`

### 4.3 Waste Detection Agent
- **Input:** categorized tool list + self-reported usage estimates + renewal dates
- **Process:** detect same-category duplicates, low usage vs. cost ratio, tier mismatches,
  upcoming renewals on flagged tools
- **Output:** `findings[]` with `finding_type` and `confidence_score`

### 4.4 Alternative Recommendation Agent
- **Input:** findings + tool knowledge base
- **Process:** for each finding, propose retain/downgrade/consolidate/cancel with a
  suggested alternative tool if applicable
- **Output:** `recommendations[]` (status = draft)

### 4.5 Action Agent
- **Input:** recommendations
- **Process:** aggregate into a manager-ready report; compute total savings; format for
  export (PDF/CSV)
- **Output:** `report` object + rendered export file
- **Constraint:** never auto-executes; all output requires explicit user approval in UI

---

## 5. API Endpoints (FastAPI)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/upload` | Accept CSV/invoice/manual tool list |
| POST | `/audit/run` | Trigger full agent pipeline for a business |
| GET | `/audit/{business_id}/findings` | Retrieve findings |
| GET | `/audit/{business_id}/recommendations` | Retrieve recommendations |
| POST | `/recommendations/{id}/approve` | User approves a recommendation (status update only) |
| GET | `/audit/{business_id}/report` | Retrieve/export final report |
| GET | `/demo/dataset` | Load a pre-built synthetic demo dataset |

---

## 6. Non-Functional Requirements

- **Latency:** full pipeline run on demo dataset completes in <60s
- **Transparency:** every finding/recommendation must be traceable to source data + agent
- **Privacy:** uploaded invoice data processed transiently; not persisted beyond session
  unless user explicitly opts in
- **Reliability:** LLM calls wrapped with structured-output validation (JSON schema) and
  retry-on-parse-failure logic
- **Extensibility:** agent pipeline should run as an orchestrated DAG so agents can later be
  parallelized or replaced independently

---

## 7. Synthetic Demo Dataset Requirements

- 1–2 sample companies with 15–25 line items each
- Deliberately include: 2+ overlapping tools in the same category, 1 hidden AI add-on
  inside a larger SaaS bill, 1 clearly underused premium tier, 1 upcoming renewal on a
  low-usage tool
- Stored as CSV fixtures + loaded via `/demo/dataset`
