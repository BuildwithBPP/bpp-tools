# BPP Tools

Internal tools hub and shared resources for Business Plans Plus LLC.

**Live Hub:** [buildwithbpp.github.io/bpp-tools](https://buildwithbpp.github.io/bpp-tools/)

---

## What Is This?

The BPP Tools Hub is a multi-page static site that puts everything BPP needs in one place. Instead of hunting through bookmarks, browser tabs, and Slack messages for the right tool, open the hub and click.

It runs on GitHub Pages (free, no server needed) and updates automatically every time someone pushes a change to this repo.

## How to Use the Hub

### Pages

The hub is organized into 7 pages, linked in the nav bar:

| Page | URL | What's There | When to Use It |
|------|-----|-------------|----------------|
| **Home** | `/bpp-tools/` | Quick stats, who's-on-what, links to Monday boards and HubSpot | Start of every day |
| **Pre-Call** | `/bpp-tools/pages/pre-call.html` | Discovery deck, ICP profiles, service packages, HubSpot pipeline, proposal template | Before a sales call or sending a proposal |
| **Kickoff** | `/bpp-tools/pages/kickoff.html` | Kickoff deck, onboarding checklist, client board, delivery playbook | Starting a new client engagement |
| **Ops** | `/bpp-tools/pages/ops.html` | CEO meeting agenda, weekly scorecard, quarterly review | Every Monday meeting and end-of-quarter reviews |
| **Finance** | `/bpp-tools/pages/finance.html` | QuickBooks, invoices, subscriptions, rev-share tracker | Managing money and billing |
| **Marketing** | `/bpp-tools/pages/marketing.html` | Content dashboard, Metricool, LinkedIn, content calendar | Planning and reviewing marketing |
| **Systems** | `/bpp-tools/pages/systems.html` | AI skills, every tool BPP uses (Google Drive, GitHub, Make, HubSpot, Monday, Power BI, Webflow, etc.) | Finding any tool quickly |

Each page has its own URL, so you can bookmark or share direct links to specific sections.

### Person Switcher

The three buttons in the top-right corner (Daunte, Kenny, Eli) highlight each person's most-used tools within whatever page you're on. Click a name to see your tools light up. Click again to turn it off.

### Ops Hub (Built In)

The Ops page has three sub-views:

- **Monday CEO Meeting**: The full 30-minute meeting agenda with checkboxes, partner columns, decisions, and parking lot. Hit "New Meeting" to clear it for the week.
- **Weekly Scorecard**: Input sales, delivery, and finance numbers before Monday's meeting. Hit "Calculate & Review" to generate the summary table with green/yellow/red signals.
- **Quarterly Review**: Enter revenue and expenses to auto-calculate net income, Rodney's 5% rev-share, per-partner distributions, profit margin, and QBI deduction estimate.

### AI Skill Dictionary

The Systems page links to the [Skill Dictionary](/bpp-tools/pages/skill-dictionary.html), a searchable reference of all 37 workspace skills and 9 plugins installed in Claude. Filter by category, search by name, or browse use cases.

### Reference Pages

Some tools open as separate pages in a new tab:

- **ICP Profiles** -- Ideal client profiles by tier
- **Service Packages** -- Launch Pad, Operator System, Scale System details
- **Delivery Playbook** -- SOPs and standards for every engagement
- **Data Source Map** -- Where BPP data lives and flows
- **Content Dashboard** -- Content performance metrics (embedded in Marketing page)

---

## How to Make Changes

### Quick edits (no coding needed)

1. Go to [github.com/BuildwithBPP/bpp-tools](https://github.com/BuildwithBPP/bpp-tools)
2. Navigate to the file you want to edit:
   - Home page content: `index.html`
   - Tab pages: `pages/pre-call.html`, `pages/ops.html`, etc.
   - Styles: `css/styles.css`
3. Click the pencil icon (Edit this file)
4. Make your change (add a link card, update a URL, change text)
5. Scroll down, write a short description of what you changed, and click "Commit changes"
6. Wait ~60 seconds. Your change is live.

### Adding a new link card

Find the page file you want to add it to (e.g., `pages/finance.html`), then copy this template:

```html
<a class="link-card" href="YOUR_URL_HERE" target="_blank" data-person="daunte kenny eli">
  <div class="lc-icon">EMOJI</div>
  <div class="lc-body">
    <div class="lc-title">Tool Name</div>
    <div class="lc-desc">One-line description</div>
  </div>
  <div class="lc-arrow">&rarr;</div>
</a>
```

- Replace `YOUR_URL_HERE` with the actual link
- Replace `EMOJI` with any emoji
- Set `data-person` to the names of who uses this tool most (any combination of `daunte`, `kenny`, `eli`)

### Updating styles

All pages share one CSS file: `css/styles.css`. Change it once and every page updates.

### Updating a reference page

Replace the file in the `pages/` folder. The hub picks it up on next load.

---

## Repo Structure

```
bpp-tools/
  index.html                   -- Home page (stats, who's-on-what, quick links)
  css/
    styles.css                 -- Shared styles for all pages
  pages/
    pre-call.html              -- Pre-Call toolkit
    kickoff.html               -- Kickoff toolkit
    ops.html                   -- Operations hub (meeting, scorecard, quarterly)
    finance.html               -- Finance tools
    marketing.html             -- Marketing tools + content dashboard iframe
    systems.html               -- Systems, platforms, and AI skills
    skill-dictionary.html      -- Searchable AI skill dictionary
    content-dashboard.html     -- Content performance dashboard
    delivery-playbook.html     -- Delivery SOPs and standards
    icp-profiles.html          -- Ideal client profiles
    service-packages.html      -- Service package details
    data-source-map.html       -- Data flow diagram
  context/                     -- BPP company overview and brand voice
  docs/                        -- Setup guides (git, Claude Code, etc.)
  CLAUDE.md                    -- Instructions for Claude AI sessions
  README.md                    -- This file
```

## Other BPP Repos

| Repo | What It Does |
|------|-------------|
| [bpp-webflow-site](https://github.com/BuildwithBPP/bpp-webflow-site) | Website code and Webflow tooling |
| [ruflo](https://github.com/BuildwithBPP/ruflo) | Agent orchestration platform (forked from ruvnet/ruflo) |

## Team

- **Daunte Benjamin**: Data & Operations
- **Kenny Hawkins**: Business Development & Client Growth
- **Eli Fisher**: Design, Sales & Client Experience
