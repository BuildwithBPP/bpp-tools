/**
 * bpp-recap-worker
 *
 * Lightweight save-only Worker for the Monday CEO meeting flow.
 *
 * Endpoints (all POST, all auth via `Authorization: Bearer <SHARED_SECRET>`):
 *   POST /save-recap       saves recap markdown + decisions JSON to bpp-tools repo
 *   POST /save-decisions   saves decisions JSON only
 *   POST /save-tracker     saves the delivery-tracker snapshot JSON (Gantt + velocity)
 *   GET  /health           returns 200
 *
 * The actual email send happens from Claude Code via the ms365 MCP
 * (matches the personal morning-brief pattern). The Worker is purely
 * a "browser → GitHub" bridge so ops.html can persist data without
 * the user needing to open Claude Code mid-flow.
 *
 * Env (vars):    ALLOWED_ORIGIN, GITHUB_REPO
 * Env (secrets): GITHUB_TOKEN, SHARED_SECRET
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "bpp-recap-worker", mode: "save-only" }, 200, corsHeaders);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${env.SHARED_SECRET}`) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    try {
      if (url.pathname === "/save-recap") {
        return await handleSaveRecap(payload, env, corsHeaders);
      }
      if (url.pathname === "/save-decisions") {
        return await handleSaveDecisions(payload, env, corsHeaders);
      }
      if (url.pathname === "/save-tracker") {
        return await handleSaveTracker(payload, env, corsHeaders);
      }
      return json({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      console.error("Worker error", err);
      return json({ error: err.message || "Internal error" }, 500, corsHeaders);
    }
  },
};

// ---------- Save Recap (markdown + decisions) ----------

async function handleSaveRecap(payload, env, cors) {
  if (!payload.week_of) return json({ error: "week_of required" }, 400, cors);

  // 1. Append decisions to monday-decisions.json
  const commitResult = await commitDecisionsToGitHub(env, payload);

  // 2. Write the recap markdown to data/monday-recaps/<week_of>.md
  const recapMd = renderRecapMarkdown(payload);
  const recapPath = `data/monday-recaps/${payload.week_of}.md`;
  await commitFileToGitHub(env, recapPath, recapMd, `Save Monday recap for week of ${payload.week_of}`);

  return json(
    {
      ok: true,
      decisions_committed: commitResult.count,
      recap_path: recapPath,
      next_step: `In Claude Code, run: /monday-recap ${payload.week_of} (or ask "send the monday recap email")`,
    },
    200,
    cors
  );
}

// ---------- Save Decisions Only ----------

async function handleSaveDecisions(payload, env, cors) {
  if (!payload.week_of) return json({ error: "week_of required" }, 400, cors);
  const result = await commitDecisionsToGitHub(env, payload);
  return json({ ok: true, decisions_committed: result.count }, 200, cors);
}

// ---------- Save Delivery Tracker snapshot ----------

async function handleSaveTracker(payload, env, cors) {
  // The whole snapshot is built offline (bpp-delivery-tracker skill / build.py)
  // and posted as-is. Validate shape, then overwrite the committed file.
  if (!payload || (!payload.gantt && !payload.velocity)) {
    return json({ error: "gantt or velocity required" }, 400, cors);
  }
  const path = "data/delivery-tracker.json";
  await commitFileToGitHub(env, path, JSON.stringify(payload, null, 2), "Refresh delivery-tracker snapshot");
  const clients = (payload.gantt && payload.gantt.clients) ? payload.gantt.clients.length : 0;
  const sprints = (payload.velocity && payload.velocity.history) ? payload.velocity.history.length : 0;
  return json({ ok: true, path, clients, sprints }, 200, cors);
}

// ---------- GitHub commit helpers ----------

async function commitDecisionsToGitHub(env, payload) {
  const path = "data/monday-decisions.json";
  const current = await ghGet(env, path);
  let weeks = [];
  if (current && current.content) {
    try {
      const decoded = atob(current.content.replace(/\n/g, ""));
      const parsed = JSON.parse(decoded);
      weeks = parsed.weeks || [];
    } catch (e) {
      console.error("Could not parse existing monday-decisions.json", e);
    }
  }

  let entry = weeks.find((w) => w.week_of === payload.week_of);
  if (!entry) {
    entry = { week_of: payload.week_of, decisions: [] };
    weeks.push(entry);
  }

  const newDecisions = (payload.decisions || []).map((d) => ({
    decision: d.decision,
    owner: d.owner || null,
    due_date: d.due_date || null,
    status: d.status || "OPEN",
    set_date: d.set_date || payload.week_of,
  }));
  entry.decisions = entry.decisions.concat(newDecisions);

  if (Array.isArray(payload.status_updates)) {
    for (const upd of payload.status_updates) {
      const targetWeek = weeks.find((w) => w.week_of === upd.week_of);
      if (targetWeek && targetWeek.decisions[upd.decision_idx]) {
        targetWeek.decisions[upd.decision_idx].status = upd.status;
      }
    }
  }

  weeks.sort((a, b) => (b.week_of || "").localeCompare(a.week_of || ""));

  const updated = {
    _format: "Persistent decision tracker. New entries are pushed to weeks[].",
    _status_values: ["OPEN", "IN_FLIGHT", "DONE", "BLOCKED", "DROPPED"],
    weeks,
  };

  await ghPut(
    env,
    path,
    JSON.stringify(updated, null, 2),
    `Save Monday decisions for week of ${payload.week_of}`,
    current ? current.sha : null
  );
  return { count: newDecisions.length };
}

async function commitFileToGitHub(env, path, content, message) {
  const current = await ghGet(env, path);
  await ghPut(env, path, content, message, current ? current.sha : null);
}

async function ghGet(env, path) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "bpp-recap-worker",
    },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path} failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

async function ghPut(env, path, content, message, sha) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: "main",
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "bpp-recap-worker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GitHub PUT ${path} failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

// ---------- Recap markdown ----------

function renderRecapMarkdown(p) {
  const lines = [];
  lines.push(`# Monday Recap — Week of ${p.week_of}`);
  lines.push("");
  if (p.north_star) {
    lines.push("## North Star");
    lines.push(p.north_star);
    lines.push("");
  }
  if (p.voice_update) {
    lines.push("## Voice updates / corrections");
    lines.push(p.voice_update);
    lines.push("");
  }
  lines.push("## Decisions made");
  for (const d of p.decisions || []) {
    if (!d.decision) continue;
    lines.push(
      `- [${d.status || "OPEN"}] ${d.decision}${d.owner ? " — " + d.owner : ""}${d.set_date ? " — set: " + d.set_date : ""}${d.due_date ? " · due: " + d.due_date : ""}`
    );
  }
  lines.push("");
  lines.push("## Owner commits");
  for (const owner of ["Daunte", "Kenny", "Eli"]) {
    const c = (p.commits || {})[owner];
    if (!c) continue;
    if (!c.strategic && !c.operational && !c.unblock) continue;
    lines.push(`### ${owner}`);
    if (c.strategic) lines.push(`- Strategic: ${c.strategic}`);
    if (c.operational) lines.push(`- Operational: ${c.operational}`);
    if (c.unblock) lines.push(`- Unblock: ${c.unblock}`);
    lines.push("");
  }
  return lines.join("\n");
}

// ---------- Helpers ----------

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
  });
}
