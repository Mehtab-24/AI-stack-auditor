export type Category =
  | "coding"
  | "writing"
  | "meetings"
  | "design"
  | "support"
  | "analytics"
  | "search";

export type FindingType =
  | "Duplicate"
  | "Underused"
  | "Overpriced Tier"
  | "Inactive Seats"
  | "Hidden Add-on"
  | "Renewal Risk";

export type Confidence = "High" | "Medium" | "Low";

export type Agent =
  | "Discovery Agent"
  | "Job-Mapping Agent"
  | "Waste & Overlap Agent"
  | "ROI Reasoning Agent"
  | "Alternative Recommendation Agent"
  | "Stack Simulator Agent"
  | "Action Agent";

export interface Tool {
  id: string;
  name: string;
  vendor: string;
  category: Category;
  monthlyCost: number;
  seats: number;
  activeSeats: number;
  flagged: boolean;
}

export interface Finding {
  id: string;
  toolId: string;
  type: FindingType;
  confidence: Confidence;
  agent: Agent;
  reasoning: string;
  suggestedAlternative?: string;
  monthlySavings: number;
}

export type ActionType = "Retain" | "Downgrade" | "Cancel" | "Consolidate" | "Review Renewal";

export interface Recommendation {
  id: string;
  findingId: string;
  toolName: string;
  action: ActionType;
  monthlySavings: number;
  annualSavings: number;
  rationale: string;
}

export const tools: Tool[] = [
  { id: "t1", name: "GitHub Copilot", vendor: "GitHub", category: "coding", monthlyCost: 190, seats: 10, activeSeats: 9, flagged: false },
  { id: "t2", name: "Cursor Pro", vendor: "Anysphere", category: "coding", monthlyCost: 200, seats: 10, activeSeats: 4, flagged: true },
  { id: "t3", name: "Tabnine Enterprise", vendor: "Tabnine", category: "coding", monthlyCost: 150, seats: 10, activeSeats: 2, flagged: true },
  { id: "t4", name: "Jasper AI", vendor: "Jasper", category: "writing", monthlyCost: 49, seats: 3, activeSeats: 1, flagged: true },
  { id: "t5", name: "Copy.ai", vendor: "Copy.ai", category: "writing", monthlyCost: 36, seats: 3, activeSeats: 3, flagged: false },
  { id: "t6", name: "Writer.com", vendor: "Writer", category: "writing", monthlyCost: 108, seats: 6, activeSeats: 5, flagged: false },
  { id: "t7", name: "Otter.ai Business", vendor: "Otter", category: "meetings", monthlyCost: 120, seats: 8, activeSeats: 7, flagged: false },
  { id: "t8", name: "Fireflies.ai", vendor: "Fireflies", category: "meetings", monthlyCost: 152, seats: 8, activeSeats: 2, flagged: true },
  { id: "t9", name: "Fathom Premium", vendor: "Fathom", category: "meetings", monthlyCost: 96, seats: 8, activeSeats: 1, flagged: true },
  { id: "t10", name: "Midjourney Pro", vendor: "Midjourney", category: "design", monthlyCost: 60, seats: 2, activeSeats: 2, flagged: false },
  { id: "t11", name: "Figma AI Add-on", vendor: "Figma", category: "design", monthlyCost: 75, seats: 15, activeSeats: 3, flagged: true },
  { id: "t12", name: "Intercom Fin AI", vendor: "Intercom", category: "support", monthlyCost: 395, seats: 5, activeSeats: 5, flagged: false },
  { id: "t13", name: "Ada Support AI", vendor: "Ada", category: "support", monthlyCost: 480, seats: 5, activeSeats: 2, flagged: true },
  { id: "t14", name: "Hex Magic", vendor: "Hex", category: "analytics", monthlyCost: 240, seats: 4, activeSeats: 4, flagged: false },
  { id: "t15", name: "Mode AI Assist", vendor: "Mode", category: "analytics", monthlyCost: 180, seats: 4, activeSeats: 1, flagged: true },
  { id: "t16", name: "Perplexity Enterprise", vendor: "Perplexity", category: "search", monthlyCost: 400, seats: 20, activeSeats: 18, flagged: false },
  { id: "t17", name: "Glean", vendor: "Glean", category: "search", monthlyCost: 600, seats: 20, activeSeats: 19, flagged: false },
  { id: "t18", name: "Notion AI Add-on", vendor: "Notion", category: "writing", monthlyCost: 80, seats: 10, activeSeats: 4, flagged: true },
];

export const findings: Finding[] = [
  {
    id: "f1",
    toolId: "t4",
    type: "Duplicate",
    confidence: "High",
    agent: "Waste Detection Agent",
    reasoning:
      "Waste Detection Agent flagged Jasper AI ($49/mo) as duplicate of Copy.ai ($36/mo) — both perform the same job: marketing content writing. Copy.ai has higher active usage.",
    suggestedAlternative: "Consolidate into Copy.ai",
    monthlySavings: 49,
  },
  {
    id: "f2",
    toolId: "t3",
    type: "Underused",
    confidence: "High",
    agent: "Waste Detection Agent",
    reasoning:
      "Tabnine Enterprise has 10 seats provisioned but only 2 active in the last 30 days. Coding assistance is already covered by GitHub Copilot at 90% seat utilization.",
    suggestedAlternative: "Cancel Tabnine, keep GitHub Copilot",
    monthlySavings: 150,
  },
  {
    id: "f3",
    toolId: "t8",
    type: "Duplicate",
    confidence: "Medium",
    agent: "Job-Mapping Agent",
    reasoning:
      "Fireflies.ai and Otter.ai Business overlap in meeting-transcription jobs. Otter has 87% active seats vs Fireflies' 25%.",
    suggestedAlternative: "Cancel Fireflies.ai",
    monthlySavings: 152,
  },
  {
    id: "f4",
    toolId: "t9",
    type: "Inactive Seats",
    confidence: "High",
    agent: "Waste Detection Agent",
    reasoning:
      "Fathom Premium: 7 of 8 seats have not logged a session in 45+ days. Downgrade to 1-seat plan or cancel.",
    suggestedAlternative: "Downgrade to single seat",
    monthlySavings: 84,
  },
  {
    id: "f5",
    toolId: "t11",
    type: "Hidden Add-on",
    confidence: "Medium",
    agent: "Discovery Agent",
    reasoning:
      "Figma AI Add-on ($75/mo) is bundled inside the Figma Organization line item and was not itemized in the invoice. Only 20% of seats use AI features.",
    suggestedAlternative: "Remove AI add-on from plan",
    monthlySavings: 75,
  },
  {
    id: "f6",
    toolId: "t13",
    type: "Overpriced Tier",
    confidence: "High",
    agent: "Alternative Recommendation Agent",
    reasoning:
      "Ada Support AI Enterprise tier ($480/mo) is underused — 2/5 seats active. Intercom Fin AI already covers primary support automation.",
    suggestedAlternative: "Cancel Ada, consolidate to Intercom Fin",
    monthlySavings: 480,
  },
  {
    id: "f7",
    toolId: "t15",
    type: "Renewal Risk",
    confidence: "Medium",
    agent: "Action Agent",
    reasoning:
      "Mode AI Assist renews in 18 days. 1 of 4 seats active last month. Hex Magic covers the same analytics-copilot job at higher utilization.",
    suggestedAlternative: "Do not renew Mode AI Assist",
    monthlySavings: 180,
  },
  {
    id: "f8",
    toolId: "t18",
    type: "Underused",
    confidence: "Low",
    agent: "Waste Detection Agent",
    reasoning:
      "Notion AI Add-on: 4 of 10 seats active. Overlaps with Copy.ai for drafting. Consider downgrading to per-seat billing.",
    suggestedAlternative: "Downgrade Notion AI seats",
    monthlySavings: 40,
  },
];

const actionForFinding: Record<FindingType, ActionType> = {
  Duplicate: "Consolidate",
  Underused: "Downgrade",
  "Overpriced Tier": "Cancel",
  "Inactive Seats": "Downgrade",
  "Hidden Add-on": "Cancel",
  "Renewal Risk": "Review Renewal",
};

export const recommendations: Recommendation[] = findings.map((f) => {
  const tool = tools.find((t) => t.id === f.toolId)!;
  return {
    id: `r-${f.id}`,
    findingId: f.id,
    toolName: tool.name,
    action: actionForFinding[f.type],
    monthlySavings: f.monthlySavings,
    annualSavings: f.monthlySavings * 12,
    rationale: f.suggestedAlternative ?? f.reasoning,
  };
});

export const totalMonthlySavings = findings.reduce((s, f) => s + f.monthlySavings, 0);
export const totalAnnualSavings = totalMonthlySavings * 12;
export const totalToolsDiscovered = tools.length;
export const totalToolsFlagged = tools.filter((t) => t.flagged).length;

export const spendByCategory = (() => {
  const map = new Map<Category, number>();
  for (const t of tools) map.set(t.category, (map.get(t.category) ?? 0) + t.monthlyCost);
  return Array.from(map.entries()).map(([category, spend]) => ({ category, spend }));
})();

export const agentTraceSteps: {
  agent: Agent;
  label: string;
  running: string;
  result: string;
}[] = [
  {
    agent: "Discovery Agent",
    label: "Discovery",
    running: "Scanning uploaded data for AI tools...",
    result: `Found ${tools.length} AI tools across ${new Set(tools.map((t) => t.vendor)).size} vendors`,
  },
  {
    agent: "Job-Mapping Agent",
    label: "Job Mapping",
    running: "Classifying tools by business function...",
    result: "Mapped tools to 7 job categories — 3 overlaps detected",
  },
  {
    agent: "Waste & Overlap Agent",
    label: "Waste & Overlap",
    running: "Detecting overlap and underused subscriptions...",
    result: `Flagged ${totalToolsFlagged} tools with usage below threshold`,
  },
  {
    agent: "ROI Reasoning Agent",
    label: "ROI Reasoning",
    running: "Analyzing subscription ROI vs cost-value tiers...",
    result: "Determined ROI metrics - Copy.ai and Copilot confirmed high value, Cursor Pro low value",
  },
  {
    agent: "Alternative Recommendation Agent",
    label: "Alternatives",
    running: "Finding cheaper equivalents...",
    result: `Identified ${findings.length} consolidation & downgrade opportunities`,
  },
  {
    agent: "Stack Simulator Agent",
    label: "Stack Simulator",
    running: "Simulating post-consolidation coverage of critical jobs...",
    result: "Simulated future state - 100% job coverage maintained with leaner footprint",
  },
  {
    agent: "Action Agent",
    label: "Report",
    running: "Compiling savings report...",
    result: `Draft report ready — $${totalMonthlySavings.toLocaleString()}/mo potential savings`,
  },
];
