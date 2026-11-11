# Content Approvals (swipe to approve)

A small Google Apps Script web app that shows finished BPP content from Google Drive one card at a time.

- **Swipe right** to approve.
- **Swipe left** to decline. A note is required so the editor knows what to fix.
- At **3 approvals** with no declines, a piece moves to **Ready for Metricool** with its caption and a download link. Whoever queues it in Metricool taps **Mark scheduled**.
- Declined pieces sit in **Needs changes** with every note. After the fix, **Send back to review** puts it back in everyone's queue.

The hub links to it from the Marketing page (`pages/dept-marketing.html`). The link comes from `data/content-approvals.json`.

## Where it fits in the content pipeline

It's the step between Post-Production and Scheduled in the [Content Pipeline SOP](../../pages/content-pipeline.html). The 2026-10 content reboot says Kenny, Eli and Daunte approve posts before anything is scheduled. This is where that happens, with a written record.

## What it reads

The **BPP Content Approvals** Google Sheet in BPP Media has two tabs:

- **Queue** (the review list). One row per piece. Columns are matched by name, so their order doesn't matter:

  | Column | What goes in it |
  |---|---|
  | Drive link | Share link to the video, image, PDF or Google Doc |
  | Title | What the card shows. Blank uses the file name |
  | Type | Reel, Talking head, Podcast clip, Newsletter, Carousel... shown as the card's badge |
  | Platforms | Where it's meant to go: `Instagram, Facebook, LinkedIn, TikTok, YouTube, Threads, X`. Each one gets a small icon on the card |
  | Caption | The post copy. It shows on the card and gets a Copy button in Ready |
  | Cover image | Optional link to an image to show instead of the file's own preview (newsletters use their cover) |
  | Notes | Anything reviewers should know |

  Newsletters are Google Docs. Their full text shows on the card and in the Read view.
- **Decisions** (the audit log). One row per swipe: time, reviewer email, file, decision, note. The latest swipe from each person counts. The app creates this tab on first use.

If the Queue tab is empty, the app scans BPP Media instead: every image, video and PDF added in the last 60 days under a folder with "Final" or "media assets" in its name, skipping raw footage, the inbox, archives and trending-audio copies. A `.txt` file with the same name as a video becomes its caption. Set the `SOURCE` script property to `both` to review the Queue and the scan together.

## Security model

- No passwords, tokens or shared secrets anywhere. This folder is safe in a public repo.
- The app runs **as the person using it**, so Google Drive sharing is the access list. You can only see and vote on content if you can already open BPP Media and edit the Decisions sheet. Anyone else gets an error and nothing else.
- It reads Drive with read-only permission. It never moves, edits or deletes content. The only thing it writes is a row in the Decisions sheet.
- Every vote is stamped with the voter's Google email.
- To limit voting to specific people, set the `REVIEWERS` script property to a comma list of emails.

## Setup (about 5 minutes, one time, Kenny)

1. Sign in to Google with the BPP admin account that owns BPP Media.
2. Check that the **BPP Content Approvals** sheet exists inside BPP Media (it does as of 2026-11-10, with the first 37 pieces in its Queue tab). Share it as **Editor** with each reviewer's Google account. They also need at least **Viewer** on BPP Media.
3. Go to [script.google.com](https://script.google.com) and click **New project**. Name it **BPP Content Approvals**.
4. Open **Project Settings** (gear icon) and check **Show "appsscript.json" manifest file in editor**.
5. Back in the editor, paste this folder's files:
   - `Code.gs` replaces the starter `Code.gs`.
   - `appsscript.json` replaces the manifest.
   - Use **+ > HTML** to add a file named `Index`, then paste `Index.html`.
6. Click **Deploy > New deployment > Web app**. The manifest already sets **Execute as: User accessing the web app** and **Who has access: Anyone with Google account**. Click **Deploy** and approve the permissions.
7. Copy the **Web app URL** (it ends in `/exec`). Put it in `data/content-approvals.json` as `webAppUrl`, or send it to Claude to do that. The Marketing page card then switches from SETUP to LIVE.

The first time each reviewer opens the link, Google asks them to approve the app. For accounts outside businessplansplus.co, Google shows a "Google hasn't verified this app" screen. Click **Advanced**, then **Go to BPP Content Approvals**. That's expected for an internal tool.

Optional: run `setup()` from the editor once. It writes the sheet header and logs the folder, the sheet, who can vote, and the first 10 files it found.

## Settings (Project Settings > Script properties, all optional)

| Property | Default | What it does |
|---|---|---|
| `SOURCE` | `auto` | `auto` uses the Queue tab when it has rows, otherwise the scan. Also `queue`, `scan` or `both` |
| `REQUIRED_APPROVALS` | `3` | Approvals needed before a piece is ready for Metricool |
| `LOOKBACK_DAYS` | `60` | Only files added in this window show up |
| `INCLUDE_FOLDER_PATTERN` | `final\|media assets` | A file is reviewable if any folder on its path matches |
| `EXCLUDE_FOLDER_PATTERN` | raw, inbox, archive, trending-audio | Folders skipped entirely |
| `REVIEWERS` | blank | Comma list of emails allowed to vote. Blank means anyone who can edit the sheet |
| `REVIEWER_NAMES` | blank | `email=Name` pairs, comma separated, for display |
| `ROOT_FOLDER_ID`, `SHEET_ID` | found by name | Filled in automatically on first run |

## Platform icons

The small platform icons come from Font Awesome Free's brand set (icons CC BY 4.0), loaded from jsDelivr at a pinned version. If that script can't load, the card still says "For Instagram, Facebook" in text.

## Updating the code

Change the files here, open a PR, then paste the new versions into the Apps Script editor and use **Deploy > Manage deployments > Edit > New version**. The `/exec` URL stays the same.
