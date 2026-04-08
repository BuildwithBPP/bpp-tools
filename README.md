# BPP Tools

Internal tools hub and shared resources for Business Plans Plus LLC.

**Live Hub:** [buildwithbpp.github.io/bpp-tools](https://buildwithbpp.github.io/bpp-tools/)

---

## What Is This?

The BPP Tools Hub is a single-page web app that puts everything BPP needs in one place. Instead of hunting through bookmarks, browser tabs, and Slack messages for the right tool, open the hub and click.

It runs on GitHub Pages (free, no server needed) and updates automatically every time someone pushes a change to this repo.

## How to Use the Hub

### Tabs

The hub is organized into 7 tabs across the top:

| Tab | What's There | When to Use It |
|-----|-------------|----------------|
| **Home** | Quick stats, who's-on-what, links to Monday boards and HubSpot | Start of every day |
| **Pre-Call** | Discovery deck, ICP profiles, service packages, HubSpot pipeline, proposal template | Before a sales call or sending a proposal |
| **Kickoff** | Kickoff deck, onboarding checklist, client board, delivery playbook | Starting a new client engagement |
| **Ops** | CEO meeting agenda, weekly scorecard, quarterly review | Every Monday meeting and end-of-quarter reviews |
| **Finance** | QuickBooks, invoices, subscriptions, rev-share tracker | Managing money and billing |
| **Marketing** | Content dashboard, Metricool, LinkedIn, content calendar | Planning and reviewing marketing |
| **Systems** | Every tool BPP uses (Google Drive, GitHub, Make, HubSpot, Monday, Power BI, Webflow, etc.) | Finding any tool quickly |

### Person Switcher

The three buttons in the top-right corner (Daunte, Kenny, Eli) highlight each person's most-used tools within whatever tab you're on. Click a name to see your tools light up. Click again to turn it off.

### Ops Hub (Built In)

The Ops tab has three sub-views:

- **Monday CEO Meeting**: The full 30-minute meeting agenda with checkboxes, partner columns, decisions, and parking lot. Hit "New Meeting" to clear it for the week.
- **Weekly Scorecard**: Input sales, delivery, and finance numbers before Monday's meeting. Hit "Calculate & Review" to generate the summary table with green/yellow/red signals.
- **Quarterly Review**: Enter revenue and expenses to auto-calculate net income, Rodney's 5% rev-share, per-partner distributions, profit margin, and QBI deduction estimate.

### Reference Pages

Some tools open as separate pages in a new tab:

- **ICP Profiles** -- Ideal client profiles by tier
- **Service Packages** -- Launch Pad, Operator System, Scale System details
- **Delivery Playbook** -- SOPs and standards for every engagement
- **Data Source Map** -- Where BPP data lives and flows
- **Content Dashboard** -- Content performance metrics (embedded in Marketing tab)

---

## How to Make Changes

### Quick edits (no coding needed)

1. Go to [github.com/BuildwithBPP/bpp-tools](https://github.com/BuildwithBPP/bpp-tools)
2. Click on `index.html`
3. Click the pencil icon (Edit this file)
4. Make your change (add a link card, update a URL, change text)
5. Scroll down, write a short description of what you changed, and click "Commit changes"
6. Wait ~60 seconds. Your change is live.

### Adding a new link card

Find the tab section you want to add it to in `index.html`, then copy this template:

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

### Updating a reference page

Replace the file in the `pages/` folder. The hub picks it up on next load.

---

## Repo Structure

```
bpp-tools/
  index.html              -- The hub (single HTML file, all tabs)
  pages/
    content-dashboard.html -- Content performance dashboard
    delivery-playbook.html -- Delivery SOPs and standards
    icp-profiles.html      -- Ideal client profiles
    service-packages.html  -- Service package details
    data-source-map.html   -- Data flow diagram
  context/                 -- BPP company overview and brand voice
  docs/                    -- Setup guides (git, Claude Code, etc.)
  CLAUDE.md                -- Instructions for Claude AI sessions
  README.md                -- This file
```

## Other BPP Repos

| Repo | What It Does |
|------|-------------|
| [bpp-webflow-site](https://github.com/BuildwithBPP/bpp-webflow-site) | Website code and Webflow tooling |

## Team

- **Daunte Benjamin**: Data & Operations
- **Kenny Hawkins**: Business Development & Client Growth
- **Eli Fisher**: Design, Sales & Client Experience
