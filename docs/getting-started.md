# Getting Started with BPP Development

Setup guide for joining the BPP development team. Covers both Mac and Windows.

## Step 1: Install Git

### Mac
Git comes with Xcode command line tools. Open Terminal and run:
```bash
git --version
```
If it's not installed, macOS will prompt you to install the command line tools. Click Install.

### Windows
Download and install Git for Windows: https://git-scm.com/download/win

Use all default options during installation. This gives you Git Bash (a terminal that works like Mac/Linux).

## Step 2: Install GitHub CLI

### Mac
```bash
brew install gh
```
(If you don't have Homebrew: https://brew.sh)

### Windows
Download from: https://cli.github.com

Or with winget:
```
winget install GitHub.cli
```

## Step 3: Authenticate with GitHub

Run this in Terminal (Mac) or Git Bash (Windows):
```bash
gh auth login
```

Choose:
1. GitHub.com
2. HTTPS
3. Login with a web browser
4. Follow the browser prompts

## Step 4: Clone the Repos

```bash
mkdir -p ~/Developer
cd ~/Developer
gh repo clone BuildwithBPP/bpp-tools
gh repo clone BuildwithBPP/bpp-webflow-site
```

You now have local copies of both repos.

## Step 5: Install Claude Code

Follow the setup guide from Anthropic. Once installed, you can open Claude Code in any repo:

```bash
cd ~/Developer/bpp-webflow-site
claude
```

Claude Code automatically reads the CLAUDE.md file in that directory and knows the full project context.

## Step 6: Set Up API Tokens (for bpp-webflow-site)

```bash
cd ~/Developer/bpp-webflow-site
cp .env.example .env
```

Then edit `.env` and fill in the token values. Ask Daunte for the current tokens.

## You're Ready

- **Working on the website?** `cd ~/Developer/bpp-webflow-site && claude`
- **Learning git or looking up docs?** `cd ~/Developer/bpp-tools && claude`
- **Working on client stuff?** Use Cowork in the OneDrive BPP Workspace (no git needed)

## Need Help?

- Git commands: [git-basics.md](git-basics.md)
- Claude Code tips: [claude-code-basics.md](claude-code-basics.md)
- Ask Daunte
