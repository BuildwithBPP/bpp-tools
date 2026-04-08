# BPP Tools - Claude Code Instructions

This is the BPP team hub repo. Shared context, onboarding docs, and cross-project utilities for the Business Plans Plus development team.

## Who We Are

Business Plans Plus (BPP) is a growth consulting firm in Temple Terrace, FL. We help growth-stage entrepreneurs build operating systems that make their business easier to run.

**Team:**
- Daunte Benjamin: Co-Owner, Data & Operations (Lead Developer)
- Kenny Hawkins: Co-Owner, Business Development & Client Growth
- Eli Fisher: Co-Owner, Design, Sales & Client Experience

**Website:** buildwithbpp.com

## Git Operations

**Claude handles all git operations for this team.** When someone says to save, push, commit, or create a PR, handle it. Explain what you're doing so the team learns by watching.

### Rules
- Write clear commit messages
- For feature work, create a branch: `yourname/what-you-did` and merge via PR
- Small fixes and content updates can go directly to `main`
- Delete branches after merge

## Repo Structure

```
bpp-tools/
  index.html                   # Home page (stats, who's-on-what, quick links)
  CLAUDE.md                    # You are here
  README.md                    # Team overview and usage guide

  css/
    styles.css                 # Shared CSS for all pages (design system, nav, cards, ops hub)

  pages/
    pre-call.html              # Pre-Call toolkit (discovery, ICP, proposals)
    kickoff.html               # Kickoff toolkit (onboarding, playbook)
    ops.html                   # Operations hub (meeting agenda, scorecard, quarterly review)
    finance.html               # Finance tools (QuickBooks, invoices, subscriptions)
    marketing.html             # Marketing tools + content dashboard iframe
    systems.html               # Systems, platforms, and AI skills
    skill-dictionary.html      # Searchable AI skill dictionary (37 skills + 9 plugins)
    content-dashboard.html     # Content performance dashboard (reference page)
    delivery-playbook.html     # Delivery SOPs and standards (reference page)
    icp-profiles.html          # Ideal client profiles (reference page)
    service-packages.html      # Service package details (reference page)
    data-source-map.html       # Data flow diagram (reference page)

  context/                     # BPP company context (copied from OneDrive)
    bpp-overview.md            # Company info, services, pricing, ICP
    brand-voice.md             # Brand voice guide for all written output

  docs/                        # Team onboarding and reference
    getting-started.md         # Dev environment setup (Mac + Windows)
    git-basics.md              # The 10 git commands you need
    claude-code-basics.md      # How to use Claude Code
```

## Brand Voice

Read `context/brand-voice.md` for all written output. Key rules:
- Direct, confident, entrepreneur-friendly
- No em dashes, no "leverage" as a verb, no filler phrases
- Numbers like a business owner: "~$3.8K/month"

## Architecture Notes

- Each hub tab is a standalone HTML page in `pages/`. The Home page is `index.html` at the root.
- All pages share `css/styles.css` for consistent styling. Change it once, every page updates.
- Nav bar, person switcher, and footer are duplicated on each page (no framework, no build step).
- The Ops page (`pages/ops.html`) has significant embedded JS: meeting agenda, scorecard calculations, quarterly review formulas. Edit carefully.
- Reference pages (ICP profiles, service packages, etc.) are self-contained HTML files linked from the hub but not styled by `styles.css`.
- The content dashboard is loaded via iframe in `pages/marketing.html`.

## Other BPP Repos

| Repo | Purpose |
|------|---------|
| `BuildwithBPP/bpp-webflow-site` | Website code, Webflow export, SEO/copy tools |
| `BuildwithBPP/ruflo` | Agent orchestration platform (forked from ruvnet/ruflo) |

## How Memory Works Across BPP

| What | Where | Updated By |
|------|-------|-----------|
| Business memory (clients, decisions) | OneDrive: `_claude/memory.md` | Anyone via Cowork |
| Website dev context | `bpp-webflow-site` repo CLAUDE.md | Daunte/Eli via Claude Code |
| Team dev knowledge | This repo: `docs/` | Anyone via Claude Code |
| Brand voice / company overview | OneDrive (source), this repo (copy) | Daunte |

Documentation about *how to build something* lives in the project repo.
Documentation about *the business* lives in OneDrive.
This repo bridges the gap with shared context and onboarding docs.
