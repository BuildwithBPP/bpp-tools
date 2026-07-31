export interface DepartmentAsset {
  title: string;
  description: string;
  href: string;
}

export interface Department {
  slug: string;
  name: string;
  dri: string | null;
  researcher?: string;
  status: "live" | "parked";
  collaborators: string[];
  charter: string;
  outcomes: string[];
  kpis: string[];
  routines: string[];
  assets: DepartmentAsset[];
  dependencies: string[];
}

const currentHub = "https://buildwithbpp.github.io/bpp-tools/";

export const departments: Department[] = [
  {
    slug: "sales-business-development",
    name: "Sales & Business Development",
    dri: "Kenny",
    status: "live",
    collaborators: ["Eli", "Daunte"],
    charter: "Create qualified demand, move opportunities to clear decisions, and keep the seller workflow current.",
    outcomes: ["Healthy qualified pipeline", "Clear next actions", "Consistent conversion", "Approved offer discipline"],
    kpis: ["Open and weighted pipeline", "Hot opportunities", "Stage conversion", "Closed-won revenue", "Next-action coverage"],
    routines: ["Weekly pipeline review", "Same-day CRM updates", "Proposal follow-up", "Monthly offer and objection review"],
    assets: [
      { title: "Seller Start Here", description: "Current qualification-to-follow-up workflow.", href: `${currentHub}pages/seller-start.html` },
      { title: "Sales Playbook", description: "Packages, discovery, objections, and proposal guidance.", href: `${currentHub}pages/package-cheat-sheet.html` },
      { title: "Growth", description: "HQ pipeline and offer view.", href: "/growth/" }
    ],
    dependencies: ["Approved offers", "Current ICP definitions", "Delivery capacity", "Current proof assets"]
  },
  {
    slug: "marketing-content",
    name: "Marketing & Content",
    dri: "Kenny",
    status: "live",
    collaborators: ["Eli"],
    charter: "Build consistent awareness and proof that supports the commercial system.",
    outcomes: ["Qualified attention", "Consistent publishing", "Useful proof library", "Sales-aligned campaigns"],
    kpis: ["Publishing cadence", "Qualified reach", "Website engagement", "Content-sourced leads", "Proof assets available"],
    routines: ["Weekly content planning", "Publishing QA", "Monthly performance review", "Sales feedback loop"],
    assets: [
      { title: "Content Dashboard", description: "Publishing and platform performance history.", href: `${currentHub}pages/content-dashboard.html` },
      { title: "Marketing System", description: "Canonical marketing workflow.", href: `${currentHub}pages/marketing-sop.html` },
      { title: "Growth", description: "HQ commercial priorities and approved offers.", href: "/growth/" }
    ],
    dependencies: ["Sales feedback", "Approved case studies", "Brand voice", "Current analytics sources"]
  },
  {
    slug: "client-delivery-design",
    name: "Client Delivery & Design",
    dri: "Eli",
    status: "live",
    collaborators: ["Daunte", "Kenny"],
    charter: "Turn sold scope into a clear client journey, dependable milestones, and strong work product.",
    outcomes: ["Healthy engagements", "On-time milestones", "Strong client experience", "Consistent quality"],
    kpis: ["Active engagement health", "Past-due milestones", "On-time delivery", "Client feedback", "Available capacity"],
    routines: ["Closed-won handoff", "Weekly delivery review", "Milestone QA", "Closeout and lessons learned"],
    assets: [
      { title: "Delivery Tracker", description: "Current milestone and deadline view.", href: `${currentHub}pages/delivery-tracker.html` },
      { title: "Client Journey Playbook", description: "Delivery standards and quality controls.", href: `${currentHub}pages/delivery-playbook.html` },
      { title: "Delivery", description: "HQ engagement health view.", href: "/delivery/" }
    ],
    dependencies: ["Clean sales handoff", "Current Monday.com data", "Owner capacity", "Approved scope"]
  },
  {
    slug: "finance-operations",
    name: "Finance & Operations",
    dri: "Daunte",
    status: "live",
    collaborators: ["Kenny", "Eli"],
    charter: "Keep BPP financially visible, operationally disciplined, and ready for owner decisions.",
    outcomes: ["Cash visibility", "Reliable reporting", "Clear operating rhythm", "Documented decisions"],
    kpis: ["Revenue versus plan", "Net margin", "Cash buffer", "Monthly close timeliness", "Sprint reliability"],
    routines: ["Monthly close", "Monday owner brief", "Sprint planning and review", "Quarterly business review"],
    assets: [
      { title: "Performance Dashboard", description: "Comprehensive financial and operating performance view.", href: `${currentHub}pages/performance-dashboard.html` },
      { title: "Business Plan", description: "Plan of Record and governing targets.", href: `${currentHub}pages/business-plan.html` },
      { title: "Performance", description: "HQ executive scorecard.", href: "/performance/" }
    ],
    dependencies: ["QuickBooks", "HubSpot", "Monday.com", "Owner follow-through"]
  },
  {
    slug: "ai-workforce-tech",
    name: "AI Workforce & Tech",
    dri: "Daunte",
    status: "live",
    collaborators: ["Kenny", "Eli"],
    charter: "Build safe, reusable capabilities that shorten recurring work without tying BPP to one model.",
    outcomes: ["Reliable automation", "Governed capabilities", "Safe system access", "Technical continuity"],
    kpis: ["Capability adoption", "Successful automated runs", "Validation failures", "Open security risks", "Time saved"],
    routines: ["Capability review", "Failure and workaround logging", "Security review", "Repository and dependency review"],
    assets: [
      { title: "Skill Dictionary", description: "Generated inventory of AI capabilities.", href: `${currentHub}pages/skill-dictionary.html` },
      { title: "Technical Landscape", description: "Repository and system boundaries.", href: "/company/technical-landscape/" },
      { title: "Data Source Map", description: "System-of-record and reporting paths.", href: `${currentHub}pages/data-source-map.html` }
    ],
    dependencies: ["Approved system access", "Validation rules", "Business owners", "Credential governance"]
  },
  {
    slug: "hr-people-ops",
    name: "HR & People Ops",
    dri: null,
    researcher: "Daunte researching",
    status: "parked",
    collaborators: [],
    charter: "Keep accountability, role clarity, and team decisions aligned with the operating model.",
    outcomes: ["Clear ownership", "Visible capacity", "Working agreements", "Timely people decisions"],
    kpis: ["Roles with a named DRI", "Capacity risk", "Open people decisions", "Working-agreement follow-through"],
    routines: ["Quarterly role review", "Capacity review", "Decision documentation", "Hiring-threshold review"],
    assets: [
      { title: "Operating Model Synthesis", description: "Ratified owner accountability model.", href: `${currentHub}pages/synthesis.html` },
      { title: "Team and AI Workforce", description: "Current team and workforce view.", href: `${currentHub}pages/team.html` },
      { title: "Company", description: "Plan, organization, and governance.", href: "/company/" }
    ],
    dependencies: ["Current roles", "Compensation decisions", "Capacity evidence", "Owner alignment"]
  }
];
