# Product Requirements Document (PRD)
## AI Stack Auditor — Agent-Based AI Spend Rationalization Platform

**Version:** 1.0
**Prepared for:** Kaggle Vibe Coding — AI Agents Capstone Project
**Status:** Draft for MVP build

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
4. Recommend a leaner, cheaper equivalent stack
5. Produce a manager-ready savings report

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
- No multi-tenant billing, auth-hardening, or enterprise SSO in MVP.

---

## 3. Target Users

**Primary:** Founders, ops leads, and finance managers at startups/SMBs (10–200 employees)
who've adopted AI tools informally and have no procurement process.

**Secondary:** IT admins and team managers at agencies/tech-enabled businesses who need
visibility into decentralized AI tool decisions.

**User characteristics:**
- Price-sensitive, time-poor, non-technical decision makers
- Want a clear dollar number and a short action list, not a raw data dump

---

## 4. Core Features (MVP Scope)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | AI Spend Discovery | Ingest CSV/invoice/manual tool list; identify AI tools & hidden AI add-ons | P0 |
| 2 | Tool-to-Task Mapping | Classify each tool by business job (coding, writing, meetings, design, support, analytics, search) | P0 |
| 3 | Waste & Overlap Detection | Flag duplicate-function tools, underused subscriptions, costly tiers, inactive seats | P0 |
| 4 | Alternative Recommendations | Suggest cheaper/consolidated tool combos with confidence scores | P0 |
| 5 | Savings Estimation & Action Plan | Dashboard with $ savings, retain/downgrade/cancel/renew-review suggestions, exportable report | P0 |
| 6 | Agent Trace / Reasoning View | Show what each agent found and why (transparency for judges & users) | P1 |
| 7 | Synthetic Demo Dataset | Pre-built sample company data for live demo | P0 |
| 8 | Renewal Risk Flags | Highlight upcoming renewals paired with low-usage or overlap findings | P1 |

---

## 5. User Flow

1. User uploads a CSV of software expenses and/or a few invoices (or picks a demo dataset).
2. **Discovery Agent** extracts AI-related line items and hidden AI add-ons.
3. **Job-Mapping Agent** classifies each tool by business task, grounded against a curated
   AI-tool knowledge base (not free-form LLM guessing).
4. **Waste Detection Agent** finds duplicate functions, underused subscriptions, and
   unjustified plan costs, each with a confidence score.
5. **Alternative Recommendation Agent** proposes a leaner stack.
6. **Action Agent** compiles a savings report: retain / downgrade / cancel / review-renewal,
   with estimated monthly & annual savings — presented as **draft recommendations requiring
   user confirmation**, never auto-executed.
7. User reviews the dashboard, expands agent reasoning per finding, and exports a report.

---

## 6. Success Metrics (Hackathon Demo)

- Demo dataset produces at least 3 distinct waste/overlap findings with clear reasoning
- Estimated savings figure is computed transparently (traceable to specific line items)
- End-to-end flow (upload → report) completes in under 60 seconds on stage
- Judges can see agent-by-agent reasoning, not just a final answer

---

## 7. Differentiation / Competitive Positioning

| | Generic SaaS spend tools | AI Stack Auditor |
|---|---|---|
| Tracks cost | Yes | Yes |
| Understands AI task-level functional overlap | No | Yes |
| Detects hidden AI add-ons inside existing SaaS | No | Yes |
| Recommends task-equivalent cheaper alternatives | No | Yes |
| Multi-agent transparent reasoning | No | Yes |

Positioning statement: **"A specialized rationalization layer for AI-specific software
spend — not general SaaS management."**

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Usage data is estimated, not real | Label clearly as "estimated usage confidence" in UI; never present as fact |
| LLM misclassifies unfamiliar tools | Ground Job-Mapping Agent with curated tool knowledge base + retrieval |
| Bad recommendation causes real harm if acted on | All actions are drafts requiring explicit user confirmation; confidence scores shown |
| Financial data sensitivity | Process transiently per session; do not persist raw invoices beyond session unless user opts in |
| Scope too large for hackathon timeline | De-risk by allowing Job-Mapping + Waste Detection to share a single structured LLM call in v0 if needed |

---

## 9. Out of Scope for MVP
- Direct API/SaaS integrations
- Automated cancellations/downgrades
- Multi-tenant auth & billing
- Peer benchmarking
- Real-time usage telemetry (SSO/API-based)
