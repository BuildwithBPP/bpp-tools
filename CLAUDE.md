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
- Never commit directly to `main`. Create a branch: `yourname/what-you-did`
- Merge via pull request
- Delete branch after merge
- Write clear commit messages

## Repo Structure

```
bpp-tools/
  CLAUDE.md                    # You are here
  README.md                    # Team overview

  context/                     # BPP company context (copied from OneDrive)
    bpp-overview.md            # Company info, services, pricing, ICP
    brand-voice.md             # Brand voice guide for all written output

  docs/                        # Team onboarding and reference
    getting-started.md         # Dev environment setup (Mac + Windows)
    git-basics.md              # The 10 git commands you need
    claude-code-basics.md      # How to use Claude Code

  shared/                      # Cross-project utilities
    utils/                     # Shared Python helpers (as needed)
```

## Brand Voice

Read `context/brand-voice.md` for all written output. Key rules:
- Direct, confident, entrepreneur-friendly
- No em dashes, no "leverage" as a verb, no filler phrases
- Numbers like a business owner: "~$3.8K/month"

## Other BPP Repos

| Repo | Purpose |
|------|---------|
| `BuildwithBPP/bpp-webflow-site` | Website code, Webflow export, SEO/copy tools |
| `BuildwithBPP/bpp-proposal-tool` | RFP automation product (future) |

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
