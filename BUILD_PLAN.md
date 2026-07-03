# Build Plan & Design Guide
## AI Stack Auditor — Kaggle AI Agents Capstone

**Version:** 2.0
**Companion to:** PRD.md, TRD.md, SUPABASE_SETUP_GUIDE.md, ANTIGRAVITY_BUILD_BRIEF.md

**Changelog from v1.0:** Lovable removed from the pipeline entirely (ran out of free
credits) — everything is now built in Antigravity. Added Supabase auth/DB setup as its own
milestone. Added ROI Intelligence Agent, Stack Simulator, dark/light theming, and PDF
export to the milestone list.

---

## 1. Build Philosophy

- Ship a **working end-to-end pipeline first** (even with a dumb/simple agent
  implementation), then improve individual agents.
- **Every agent output must be structured JSON**, validated against a schema.
- Priority order when time is short: **auth + data flow working → core screens functional
  → Agent Trace Panel animation → dark/light theming → remaining polish.** This order is
  deliberate — broken auth/data wiring is expensive to fix late; visual polish is cheap to
  add whenever time remains.

---

## 2. Milestones

### Milestone 0 — Setup (Day 0)
- [ ] Repo scaffold: `/frontend` (React+Tailwind+Framer Motion), `/backend` (FastAPI),
      `/data` (fixtures)
- [ ] Create Supabase project, run schema + RLS SQL (see SUPABASE_SETUP_GUIDE.md)
- [ ] Enable Supabase email/password auth, disable email confirmation for demo purposes
- [ ] `.env` config: Supabase URL/anon key (frontend), Supabase service_role key + LLM API
      key (backend only — never exposed to frontend)
- [ ] Build synthetic demo dataset (CSV with deliberate overlaps/waste/high-ROI outlier —
      see TRD §7)

### Milestone 1 — Auth + Data Flow (Day 0–1)
- [ ] Sign In / Register combined screen, with "Try Demo (no account)" bypass
- [ ] My Reports screen (list past audits, empty state, "+ New Audit")
- [ ] Confirm a signed-in user can create a business record, and RLS actually restricts
      access to their own rows (test with two accounts)

### Milestone 2 — Discovery + Job-Mapping (Day 1)
- [ ] CSV/invoice parser (pandas + pdfplumber)
- [ ] Discovery Agent: structured JSON output
- [ ] Seed `tool_knowledge_base` with ~50–100 known AI tools, categories, price ranges
- [ ] Job-Mapping Agent: retrieval-grounded classification
- [ ] `/audit/run` endpoint (partial pipeline), writes to Supabase via service_role key

### Milestone 3 — Waste Detection + ROI + Recommendations (Day 1–2)
- [ ] Waste Detection Agent: rule-based duplicate/cost-vs-seats logic + LLM judgment calls
- [ ] ROI Intelligence Agent: runs in parallel with Waste Detection, not after it
- [ ] Alternative Recommendation Agent: must check `roi_scores` before recommending
      cancellation
- [ ] Store `findings`, `roi_scores`, `recommendations`

### Milestone 4 — Action Agent, Report, Stack Simulator (Day 2)
- [ ] Aggregate findings/recommendations into a report object; compute totals
- [ ] `/simulate` endpoint for Stack Simulator (ephemeral, not persisted unless saved)
- [ ] PDF export via jspdf + html2canvas

### Milestone 5 — Frontend Dashboard (Day 2–3)
- [ ] Upload screen (file upload + "Use Demo Dataset")
- [ ] Agent Trace Panel — staggered reveal, status dots, one-line summaries per stage
      (the centerpiece — protect this even if other polish gets cut)
- [ ] Savings Dashboard — count-up hero number, stat cards, category chart, Download
      Report button, Save Report button
- [ ] Findings View — cards with confidence badges, expandable reasoning
- [ ] Recommendations View — Approve/Dismiss, live-updating confirmed total
- [ ] Stack Simulator UI — hypothetical input + result display

### Milestone 6 — Theming + Polish (Final day)
- [ ] Dark/light toggle via Tailwind `class` strategy, centralized color tokens — verify
      it applies on every screen, not just some
- [ ] Persist theme choice in localStorage, default to system preference
- [ ] Error handling: malformed CSV, empty upload, LLM parse failure fallback
- [ ] Deploy: frontend → Vercel, backend → Render
- [ ] Record backup demo video (in case live network/auth fails during judging)

---

## 3. Suggested Repo Structure

```
ai-stack-auditor/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SignInRegister.jsx
│   │   │   ├── MyReportsPage.jsx
│   │   │   ├── UploadPanel.jsx
│   │   │   ├── AgentTracePanel.jsx
│   │   │   ├── SavingsDashboard.jsx
│   │   │   ├── FindingsView.jsx
│   │   │   ├── RecommendationsView.jsx
│   │   │   ├── StackSimulator.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── lib/
│   │   │   └── supabaseClient.js
│   │   └── App.jsx
│   ├── tailwind.config.js   # darkMode: 'class', shared color tokens
│   └── package.json
├── backend/
│   ├── agents/
│   │   ├── discovery_agent.py
│   │   ├── job_mapping_agent.py
│   │   ├── waste_detection_agent.py
│   │   ├── roi_intelligence_agent.py
│   │   ├── recommendation_agent.py
│   │   ├── stack_simulator.py
│   │   └── action_agent.py
│   ├── orchestrator.py
│   ├── schemas.py           # Pydantic structured-output schemas
│   ├── supabase_client.py   # service_role client, server-side only
│   ├── knowledge_base/
│   │   └── ai_tools_seed.json
│   ├── routes/
│   │   ├── audit.py
│   │   ├── simulate.py
│   │   └── demo.py
│   └── main.py
├── data/
│   └── demo_dataset.csv
├── SUPABASE_SETUP_GUIDE.md
└── README.md
```

---

## 4. Agent Implementation Notes

- **Structured output first.** Every LLM call requests JSON matching a Pydantic schema;
  validate, retry once on parse failure with an explicit correction prompt.
- **Ground with retrieval, not memory.** Job-Mapping and ROI agents should receive the
  relevant slice of `tool_knowledge_base` in-context.
- **Waste Detection stays partly rule-based.** Duplicate-category detection and
  cost-vs-seats math are deterministic. Reserve LLM reasoning for judgment calls.
- **ROI Intelligence runs in parallel with Waste Detection**, not downstream of it — both
  consume the same tool list independently (this corrects a sequencing issue from the
  earlier draft diagram).
- **Recommendation Agent must cross-check ROI before suggesting cancellation** — this is
  what prevents the product from looking "cancel-happy."
- **Stack Simulator never writes to `findings`/`recommendations`** — it's sandboxed and
  ephemeral by design.
- **Action Agent never calls a cancellation/billing API.** Report + status field only.

---

## 5. Demo Script (for judging)

1. "Companies are drowning in overlapping AI subscriptions with no visibility." (10s)
2. Sign in live (or hit "Try Demo" if auth is a risk on stage) → My Reports screen.
3. Load demo dataset → "Run Audit."
4. Agent Trace panel lights up agent-by-agent — this *is* the agentic story, make it
   visible.
5. Land on Savings Dashboard: "$X/month, $Y/year identified, N tools flagged — but also,
   here's a tool we recommend **keeping** despite its cost, because ROI Intelligence
   scored it highly." (This line is important — it's your "we're not just cost-cutting
   blindly" moment.)
6. Open Stack Simulator: "What if we swapped Claude for Gemini?" — show live recalculation.
7. Expand one finding → source data → reasoning → confidence → recommendation → Approve.
8. Download the PDF report on stage.
9. Toggle dark/light mode once, casually, to show it's real.
10. Close: "Generic SaaS tools track cost. We understand AI task-level overlap — and we
    tell you what to keep, not just what to cut."

---

## 6. Design Notes (UI)

- Dashboard number-first: the $ savings figure is the largest element on screen, above the
  fold, in both themes.
- Confidence badge (High/Medium/Low) on every finding and ROI score — trust signal for
  users and judges.
- Agent Trace Panel reads like a narrated log, not raw JSON — e.g. "ROI Intelligence Agent
  scored Notion AI 8.4/10 — high usage across 40 seats justifies the premium tier."
- Define color tokens once (Tailwind config or CSS variables); never hardcode colors in
  individual components, or the dark/light toggle will miss screens.
