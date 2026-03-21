# Git Basics for BPP

The 10 commands you need. Nothing else for the first month.

## Important: Claude Handles Git for You

In most cases, you tell Claude Code what to do and it runs the git commands. But it helps to understand what's happening. This guide explains the commands Claude runs on your behalf.

## The Mental Model

```
Your Machine (local)          GitHub (remote)
┌──────────────┐              ┌──────────────┐
│  You edit    │ -- push -->  │  Shared hub  │
│  files here  │ <-- pull --  │  for team    │
└──────────────┘              └──────────────┘
```

You work locally. GitHub is where everyone's work meets. `push` sends your work up. `pull` brings others' work down.

## The 10 Commands

### 1. Clone a repo (one time only)
```bash
gh repo clone BuildwithBPP/bpp-webflow-site
```
Downloads the repo to your machine. You only do this once per repo.

### 2. Pull the latest changes
```bash
git pull
```
Gets any changes your teammates pushed. **Do this before starting work.**

### 3. Create a new branch
```bash
git checkout -b yourname/what-youre-doing
```
A branch is your workspace. You make changes here without affecting `main`.
Example: `git checkout -b eli/fix-hero-copy`

### 4. Check what changed
```bash
git status
```
Shows which files you've modified, added, or deleted.

### 5. Stage files for commit
```bash
git add filename.md
```
Tells git "I want to include this file in my next save." You can also do `git add .` to stage everything.

### 6. Commit (save a snapshot)
```bash
git commit -m "what you changed and why"
```
Saves your staged changes with a message. Good messages describe *what* and *why*.

### 7. Push to GitHub
```bash
git push
```
Sends your commits to GitHub so the team can see them.

If it's your first push on a new branch:
```bash
git push -u origin yourname/branch-name
```

### 8. Create a pull request
```bash
gh pr create --title "What this change does" --body "Details here"
```
A pull request is how you ask the team to review and merge your changes.

### 9. Switch back to main
```bash
git checkout main
```
Goes back to the main branch. Always pull after switching: `git checkout main && git pull`

### 10. Delete your branch (after merge)
```bash
git branch -d yourname/branch-name
```
Clean up after your pull request is merged.

## The Typical Flow

1. `git pull` (get latest)
2. `git checkout -b yourname/task` (start a branch)
3. Make your changes
4. `git add .` (stage)
5. `git commit -m "message"` (save)
6. `git push` (send to GitHub)
7. `gh pr create` (ask for review)
8. After merge: `git checkout main && git pull`

## Common Questions

**"I made changes but forgot to create a branch first"**
No problem. Create the branch now: `git checkout -b yourname/task`. Your changes come with you.

**"I want to undo my changes"**
Ask Claude Code: "undo my changes to [filename]." It will figure out the right command.

**"Someone else changed the same file I did"**
This is called a merge conflict. Ask Daunte or Claude Code for help resolving it.

**"I accidentally committed something I shouldn't have"**
Tell Claude Code. Don't try to fix it yourself if you're not sure.
