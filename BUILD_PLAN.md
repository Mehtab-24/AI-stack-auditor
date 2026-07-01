# Build Plan & Design Guide
## AI Stack Auditor — Kaggle AI Agents Capstone

**Companion to:** PRD.md, TRD.md

---

## 1. Build Philosophy

- Ship a **working end-to-end pipeline first** (even with a dumb/simple agent
  implementation), then improve individual agents. A thin, complete slice beats a deep,
  broken one.
- **Every agent output must be structured JSON**, validated against a schema, so the
  frontend never has to parse free text.
- **De-risk the demo, not just the code** — build the synthetic dataset and the agent-trace
  UI early, since these are what judges actually see.

---

## 2. Milestones (suggested for a short hackathon timeline)

### Milestone 0 — Setup (Day 0)
- [ ] Repo scaffold: `/frontend` (React+Tailwind), `/backend` (FastAPI), `/data` (fixtures)
- [ ] PostgreSQL schema migration (tables from TRD §3)
- [ ] `.env` config for LLM API key
- [ ] Build synthetic demo dataset (CSV with deliberate overlaps/waste — see TRD §7)

### Milestone 1 — Discovery + Job-Mapping (Day 1)
- [ ] CSV/invoice parser (pandas + pdfplumber)
- [ ] Discovery Agent: LLM call with structured JSON output schema
- [ ] Seed `tool_knowledge_base` with ~50–100 known AI tools, categories, price ranges
- [ ] Job-Mapping Agent: retrieval-grounded classification
- [ ] Store results in `tools` table
- [ ] Basic API endpoint `/upload` + `/audit/run` (partial pipeline)

### Milestone 2 — Waste Detection + Recommendations (Day 1–2)
- [ ] Waste Detection Agent: rule-assisted + LLM reasoning (start with rules for
      duplicate-category detection; use LLM for nuanced judgment like "is this tier
      justified")
- [ ] Confidence scoring logic
- [ ] Alternative Recommendation Agent: LLM call grounded in knowledge base alternatives
- [ ] Store `findings` and `recommendations`

### Milestone 3 — Action Agent + Report (Day 2)
- [ ] Aggregate findings/recommendations into a report object
- [ ] Compute total monthly/annual savings
- [ ] Export as PDF/CSV
- [ ] `/audit/{id}/report` endpoint

### Milestone 4 — Frontend Dashboard (Day 2–3)
- [ ] Upload screen (file upload + "use demo dataset" button)
- [ ] Findings view: card per finding, confidence badge, source data link
- [ ] Recommendations view: approve/dismiss buttons (status-only, no live action)
- [ ] Savings summary dashboard (monthly/annual $ totals, chart)
- [ ] **Agent Trace panel** — expandable view showing which agent produced which finding
      and why (critical for judge trust + differentiation)

### Milestone 5 — Polish & Demo Readiness (Final day)
- [ ] End-to-end run on demo dataset under 60s
- [ ] Error handling: malformed CSV, empty upload, LLM parse failure fallback
- [ ] Deploy: frontend → Vercel, backend → Render
- [ ] Record backup demo video (in case live network fails during judging)
- [ ] One-pager pitch aligned with PRD differentiation table

---

## 3. Suggested Repo Structure

```
ai-stack-auditor/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadPanel.jsx
│   │   │   ├── FindingsView.jsx
│   │   │   ├── RecommendationsView.jsx
│   │   │   ├── SavingsDashboard.jsx
│   │   │   └── AgentTracePanel.jsx
│   │   └── App.jsx
│   └── package.json
├── backend/
│   ├── agents/
│   │   ├── discovery_agent.py
│   │   ├── job_mapping_agent.py
│   │   ├── waste_detection_agent.py
│   │   ├── recommendation_agent.py
│   │   └── action_agent.py
│   ├── orchestrator.py
│   ├── models.py          # SQLAlchemy models matching TRD §3
│   ├── schemas.py         # Pydantic structured-output schemas
│   ├── knowledge_base/
│   │   └── ai_tools_seed.json
│   ├── routes/
│   │   ├── upload.py
│   │   ├── audit.py
│   │   └── demo.py
│   └── main.py
├── data/
│   └── demo_dataset.csv
└── README.md
```

---

## 4. Agent Implementation Notes

- **Structured output first.** Every LLM call should request JSON matching a Pydantic
  schema. Validate; on failure, retry once with an explicit "your last output was invalid
  JSON, return only valid JSON" correction prompt.
- **Ground with retrieval, not memory.** Job-Mapping and Recommendation agents should
  receive the relevant slice of `tool_knowledge_base` in-context (simple keyword filter is
  fine for MVP — no need for a full vector DB unless time allows).
- **Keep the Waste Detection Agent partly rule-based.** Same-category duplicate detection
  and cost-vs-seats math are deterministic — don't outsource that to the LLM. Reserve LLM
  reasoning for judgment calls (e.g., "is this premium tier justified given stated usage").
- **Never let the Action Agent call an external cancellation/billing API.** Its only output
  is a formatted report + status field. This is a hard constraint, not an MVP shortcut.

---

## 5. Demo Script (for judging)

1. "Companies are drowning in overlapping AI subscriptions with no visibility." (10s)
2. Load demo dataset live → show upload → click "Run Audit."
3. Show Agent Trace panel lighting up agent-by-agent (Discovery → Job-Mapping → Waste →
   Recommendation → Action) — this *is* the agentic story, make it visible.
4. Land on Savings Dashboard: "$X/month, $Y/year in identified savings, N tools flagged."
5. Expand one finding: show source line item → reasoning → confidence score →
   recommendation → "Approve" button (draft, not auto-executed).
6. Close: differentiation line — "Generic SaaS tools track cost. We understand AI task-level
   overlap."

---

## 6. Design Notes (UI)

- Keep the dashboard number-first: the $ savings figure should be the largest element on
  screen, above the fold.
- Use a confidence badge (High/Medium/Low or a percentage) on every finding — this is your
  trust signal to both users and judges.
- Agent Trace panel should read like a short narrated log, not raw JSON — e.g. "Waste
  Detection Agent flagged Jasper AI ($49/mo) as duplicate of existing Copy.ai subscription
  ($36/mo) — same job: content writing."
