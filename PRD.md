# Product Requirements Document (PRD)
## AI Stack Auditor — Agent-Based AI Spend Rationalization Platform

**Version:** 2.0
**Prepared for:** Kaggle Vibe Coding — AI Agents Capstone Project
**Status:** Updated for Antigravity build (auth, persistence, expanded agent set)

**Changelog from v1.0:** Added user auth + persisted reports as an MVP feature (previously
a non-goal). Added ROI Intelligence Agent and Stack Simulator to the agent pipeline. Moved
Prompt Optimization Agent and AI Router Agent to Future Scope. Build tooling changed from
Lovable+Antigravity split to Antigravity-only.

---

## 1. Problem Statement

Startups and SMBs are rapidly adopting AI tools across writing, coding, meetings, design,
analytics, support, and search. Because purchases are often made independently by
individual teams or employees, companies accumulate:

- Overlapping subscriptions serving the same business job
- Hidden AI add-ons bundled into existing SaaS products
- Inactive or underused seats
- Premium tiers not justified by actual usage
- Renewals approved without visibility into value delivered

Startups and SMBs are especially exposed because they typically lack procurement systems,
SaaS governance processes, or centralized visibility into AI-specific spend.

**Core insight:** Existing SaaS spend-management tools (Zylo, Torii, Vendr, BetterCloud, etc.)
track *cost*, not *functional overlap between AI tools*. None of them understand that
"Jasper" and "Copy.ai" serve the same job, or that a $20/mo ChatGPT Plus seat may already
cover what a team is separately paying for elsewhere. That gap is the product opportunity.

---

## 2. Goals

### Primary goal (MVP / hackathon)
Given a company's uploaded spend data (CSV/invoices/manual tool list), autonomously:
1. Discover all AI-related tools and hidden AI add-ons
2. Map each tool to the business job it performs
3. Detect waste, overlap, and inefficiency
4. Weigh cost against business value (ROI), not just flag cost alone
5. Recommend a leaner, cheaper equivalent stack
6. Let users simulate "what if" changes before committing
7. Produce a manager-ready savings report, saved to their account and downloadable

### Secondary goals (post-MVP)
- Continuous monitoring / renewal alerts
- Direct SaaS integrations (no manual upload required)
- Policy guardrails to prevent future tool sprawl
- Peer benchmarking ("companies like yours use X")

### Explicit non-goals (MVP)
- The system does **not** cancel, downgrade, or modify any live subscription.
  All Action Agent output is a **recommendation for human approval**.
- The system does **not** pull live usage telemetry via SSO/API in the MVP. Usage signals
  are self-reported/estimated inputs, clearly labeled as such in the UI.
- No team/multi-user sharing of a single report, no enterprise SSO, no billing/payments.

> **Changed from v1.0:** user authentication and persisted report history are now IN scope
> (previously excluded as "multi-tenant auth" for MVP). This was added because it
> meaningfully strengthens the product's credibility as more than a single-session demo.

---

## 3. Target Users

**Primary:** Founders, ops leads, and finance managers at startups/SMBs (10–200 employees)
who've adopted AI tools informally and have no procurement process.

**Secondary:** IT admins and team managers at agencies/tech-enabled businesses who need
visibility into decentralized AI tool decisions.

**User characteristics:**
- Price-sensitive, time-poor, non-technical decision makers
- Want a clear dollar number and a short action list, not a raw data dump
- Want to revisit past audits over time, not just a one-off report

---

## 4. Core Features (MVP Scope)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | AI Spend Discovery | Ingest CSV/invoice/manual tool list; identify AI tools & hidden AI add-ons | P0 |
| 2 | Tool-to-Task Mapping | Classify each tool by business job (coding, writing, meetings, design, support, analytics, search) | P0 |
| 3 | Waste & Overlap Detection | Flag duplicate-function tools, underused subscriptions, costly tiers, inactive seats | P0 |
| 4 | ROI Intelligence | Score each tool's business value vs. cost so high-cost-but-justified tools aren't flagged as waste | P0 |
| 5 | Alternative Recommendations | Suggest cheaper/consolidated tool combos with confidence scores | P0 |
| 6 | Stack Simulator | Let users simulate "what if we replaced X with Y" before committing to a change | P1 |
| 7 | Savings Estimation & Action Plan | Dashboard with $ savings, retain/downgrade/cancel/renew-review suggestions | P0 |
| 8 | Agent Trace / Reasoning View | Show what each agent found and why (transparency for judges & users) | P0 |
| 9 | User Auth + Saved Reports | Sign up/sign in; past audits persist per user and can be revisited | P0 |
| 10 | Downloadable Report | Export a report as PDF | P0 |
| 11 | Dark / Light Mode | Theme toggle applied consistently across the app | P1 |
| 12 | Synthetic Demo Dataset + "Try Demo" mode | Pre-built sample data usable without an account | P0 |
| 13 | Renewal Risk Flags | Highlight upcoming renewals paired with low-usage or overlap findings | P1 |

---

## 5. Agent Pipeline (updated)

1. **Discovery Agent** — extracts AI-related line items and hidden AI add-ons
2. **Job-Mapping Agent** — classifies each tool by business task, grounded against a
   curated AI-tool knowledge base
3. **Waste Detection Agent** — finds duplicate functions, underused subscriptions, and
   unjustified plan costs, each with a confidence score
4. **ROI Intelligence Agent** — scores business value vs. cost per tool, so the system can
   distinguish "expensive but justified" from "expensive and wasteful"
5. **Alternative Recommendation Agent** — proposes a leaner stack, informed by both Waste
   Detection and ROI findings
6. **Stack Simulator** — runs independently of the main pipeline; lets a user test a
   hypothetical change (e.g. "replace Claude with Gemini") without touching real data
7. **Action Agent** — compiles a savings report: retain / downgrade / cancel /
   review-renewal, with estimated monthly & annual savings — presented as **draft
   recommendations requiring user confirmation**, never auto-executed

> Prompt Optimization Agent and AI Router Agent were considered and **moved to Future
> Scope** (see §10) — they require a different data source (raw prompt/token logs) and
> serve a different buyer (developers optimizing LLM calls, not ops leads managing
> subscriptions), which would dilute the product's core positioning if built into the MVP.

---

## 6. User Flow

1. User lands on Sign In / Register, or chooses "Try Demo" to skip auth.
2. Signed-in users see **My Reports** (past audits) with a "+ New Audit" option.
3. User uploads a CSV/invoices, or picks the demo dataset.
4. Discovery → Job-Mapping → Waste Detection → ROI Intelligence agents run, visualized in
   the **Agent Trace Panel**.
5. Alternative Recommendation Agent proposes changes; user may branch into the **Stack
   Simulator** to test hypotheticals before deciding.
6. Action Agent compiles the final report; user reviews findings/recommendations, approves
   or dismisses each, and can **download the report as a PDF**.
7. If signed in, the report is saved to their account automatically and reappears in My
   Reports.

---

## 7. Success Metrics (Hackathon Demo)

- Demo dataset produces at least 3 distinct waste/overlap findings with clear reasoning
- At least one ROI finding shows a tool retained *despite* high cost, demonstrating the
  system isn't just "flag everything expensive"
- Estimated savings figure is computed transparently (traceable to specific line items)
- End-to-end flow (upload → report) completes in under 60 seconds on stage
- Judges can see agent-by-agent reasoning, not just a final answer
- Sign-up → run audit → save → revisit in My Reports works live, without errors
- Dark/light toggle works identically across every screen

---

## 8. Differentiation / Competitive Positioning

| | Generic SaaS spend tools | AI Stack Auditor |
|---|---|---|
| Tracks cost | Yes | Yes |
| Understands AI task-level functional overlap | No | Yes |
| Detects hidden AI add-ons inside existing SaaS | No | Yes |
| Weighs cost against business value (ROI), not just cost alone | No | Yes |
| Lets users simulate changes before committing | No | Yes |
| Recommends task-equivalent cheaper alternatives | No | Yes |
| Multi-agent transparent reasoning | No | Yes |

Positioning statement: **"A specialized rationalization layer for AI-specific software
spend — not general SaaS management."**

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Usage data is estimated, not real | Label clearly as "estimated usage confidence" in UI; never present as fact |
| LLM misclassifies unfamiliar tools | Ground Job-Mapping Agent with curated tool knowledge base + retrieval |
| Bad recommendation causes real harm if acted on | All actions are drafts requiring explicit user confirmation; confidence scores shown |
| Financial data sensitivity | RLS-protected per-user storage in Supabase; users control what's saved |
| System looks "cancel-happy" without ROI context | ROI Intelligence Agent explicitly surfaces "retained despite cost" cases |
| Scope too large for hackathon timeline | Priority order: auth+data flow → core screens → Agent Trace animation → polish (see BUILD_PLAN) |
| Auth breaks live on stage | "Try Demo" mode bypasses auth entirely as a guaranteed fallback |

---

## 10. Future Scope (explicitly out of MVP, kept for roadmap credibility)
- **Prompt Optimization Agent** — analyzes raw prompt/token usage logs to reduce LLM API
  costs (different data source: requires prompt-level logs, not subscription data)
- **AI Router Agent** — recommends cheaper models for specific workloads (different buyer:
  developers, not ops/finance decision-makers)
- Direct SaaS integrations (no manual upload required)
- Peer benchmarking against similar companies
- Real-time usage telemetry via SSO/API
- Team/multi-user report sharing, enterprise SSO, billing
