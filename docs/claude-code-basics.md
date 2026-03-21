# Claude Code Basics for BPP

How to use Claude Code for development work.

## What Is Claude Code?

Claude Code is a CLI tool that lets Claude work directly with your code. It can:
- Read and edit files
- Run commands (git, python, npm, etc.)
- Search your codebase
- Create pull requests
- Follow instructions from CLAUDE.md

It's like having a developer sitting next to you who knows the entire project.

## How to Start a Session

Open Terminal (Mac) or Git Bash (Windows), navigate to a repo, and run:
```bash
cd ~/Developer/bpp-webflow-site
claude
```

Claude Code automatically reads the CLAUDE.md in that directory. It knows the project context, the brand voice, the page IDs, everything.

## Key Concepts

### CLAUDE.md
Every repo has a CLAUDE.md at the root. This is Claude Code's instruction manual for that project. It loads automatically every session. When the project changes, update the CLAUDE.md in the same commit.

### Workflows
Markdown files in `workflows/` that define step-by-step processes. Claude Code reads these and follows them. Example: `workflows/page-audit.md` tells Claude exactly how to audit a page.

### Tools
Python scripts in `tools/` or `scripts/` that do deterministic work. Claude Code runs these rather than trying to do everything itself. This keeps things reliable.

## Things You Can Say

**Website work:**
- "Audit the About page"
- "Fix the typos on the homepage"
- "Write alt text for all images on the Packages page"
- "Generate SEO meta tags for all pages"
- "Add the scroll animation script to the site"

**Git operations:**
- "Push this to GitHub"
- "Create a PR for these changes"
- "Pull the latest"
- "Show me what changed"

**General:**
- "What's the status of the sprint board?"
- "Read the page-audit workflow"
- "What files are in this repo?"

## Tips

### Be specific
"Fix the hero section copy to match our brand voice" is better than "make the website better."

### Let Claude handle git
You don't need to run git commands. Just say "push this" or "create a PR" and Claude handles it.

### Check the workflows first
Before asking Claude to do something complex, check if there's a workflow for it in `workflows/`. If there is, say "follow the page-audit workflow for the About page."

### Review before publishing
Claude will never publish to the live site without asking you first. Always review changes before saying "publish."

## How It Connects to Cowork

| Task | Use This |
|------|----------|
| Client proposals, meeting notes, emails | Cowork (OneDrive BPP Workspace) |
| Website development, code, scripts | Claude Code (git repos) |
| Business strategy, planning | Either one works |

Different tools for different jobs. Cowork is the front office. Claude Code is the back office.
