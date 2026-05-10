/**
 * bpp-recap-worker
 *
 * Receives POST from ops.html when Daunte clicks "Send Recap" or "Save Decisions".
 *
 * Two endpoints:
 *   POST /send-recap       - sends HTML recap email to BPP owners via MS Graph + commits decisions
 *   POST /save-decisions   - just commits decisions to GitHub (no email)
 *
 * Auth: Authorization: Bearer <SHARED_SECRET>
 *
 * Env (vars):  HUB_URL, ALLOWED_ORIGIN, GITHUB_REPO, DEFAULT_TO_EMAILS
 * Env (secrets): GITHUB_TOKEN, GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_SENDER_UPN, SHARED_SECRET
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

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "bpp-recap-worker" }, 200, corsHeaders);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    // Bearer auth
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
      if (url.pathname === "/send-recap") {
        return await handleSendRecap(payload, env, corsHeaders);
      }
      if (url.pathname === "/save-decisions") {
        return await handleSaveDecisions(payload, env, corsHeaders);
      }
      return json({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      console.error("Worker error", err);
      return json({ error: err.message || "Internal error" }, 500, corsHeaders);
    }
  },
};

// ---------- Send Recap ----------

async function handleSendRecap(payload, env, cors) {
  // Expected payload:
  // {
  //   week_of: "YYYY-MM-DD",
  //   north_star: "...",
  //   voice_update: "...",
  //   decisions: [{decision, owner, due_date}],
  //   commits: { Daunte: {strategic, operational, unblock}, Kenny: {...}, Eli: {...} }
  // }
  if (!payload.week_of) return json({ error: "week_of required" }, 400, cors);

  const html = renderRecapHtml(payload, env);
  const subject = `[BPP] Monday CEO Recap — Week of ${payload.week_of}`;
  const toEmails = (env.DEFAULT_TO_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);

  // 1. Send email via MS Graph
  const sendResult = await sendGraphMail(env, {
    subject,
    htmlBody: html,
    toRecipients: toEmails,
  });

  // 2. Commit decisions to GitHub (so next week's brief picks them up)
  const commitResult = await commitDecisionsToGitHub(env, payload);

  // 3. Mirror the recap markdown to the repo for archive
  const recapMd = renderRecapMarkdown(payload);
  const recapPath = `data/monday-recaps/${payload.week_of}.md`;
  await commitFileToGitHub(env, recapPath, recapMd, `Add Monday recap for week of ${payload.week_of}`);

  return json(
    { ok: true, sent_to: toEmails, decisions_committed: commitResult.count, recap_path: recapPath },
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

// ---------- Microsoft Graph: send mail (app-only) ----------

async function getGraphToken(env) {
  const tokenUrl = `https://login.microsoftonline.com/${env.GRAPH_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: env.GRAPH_CLIENT_ID,
    client_secret: env.GRAPH_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const r = await fetch(tokenUrl, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!r.ok) throw new Error(`Graph token fetch failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.access_token;
}

async function sendGraphMail(env, { subject, htmlBody, toRecipients }) {
  const token = await getGraphToken(env);
  const sender = env.GRAPH_SENDER_UPN || "daunte@buildwithbpp.com";
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;
  const message = {
    message: {
      subject,
      body: { contentType: "HTML", content: htmlBody },
      toRecipients: toRecipients.map((addr) => ({ emailAddress: { address: addr } })),
    },
    saveToSentItems: true,
  };
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Graph sendMail failed: ${r.status} ${text}`);
  }
  return { ok: true };
}

// ---------- GitHub: commit JSON + markdown ----------

async function commitDecisionsToGitHub(env, payload) {
  const path = "data/monday-decisions.json";
  // Fetch current file to get SHA + content
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

  // Find or create this week's entry
  let entry = weeks.find((w) => w.week_of === payload.week_of);
  if (!entry) {
    entry = { week_of: payload.week_of, decisions: [] };
    weeks.push(entry);
  }

  // Append new decisions
  const newDecisions = (payload.decisions || []).map((d) => ({
    decision: d.decision,
    owner: d.owner || null,
    due_date: d.due_date || null,
    status: d.status || "OPEN",
    set_date: d.set_date || payload.week_of,
  }));
  entry.decisions = entry.decisions.concat(newDecisions);

  // Apply status updates from payload.status_updates (if any)
  // Format: [{week_of, decision_idx, status}]
  if (Array.isArray(payload.status_updates)) {
    for (const upd of payload.status_updates) {
      const targetWeek = weeks.find((w) => w.week_of === upd.week_of);
      if (targetWeek && targetWeek.decisions[upd.decision_idx]) {
        targetWeek.decisions[upd.decision_idx].status = upd.status;
      }
    }
  }

  // Sort weeks newest first
  weeks.sort((a, b) => (b.week_of || "").localeCompare(a.week_of || ""));

  const updated = {
    _format: "Persistent decision tracker. New entries are pushed to weeks[].",
    _status_values: ["OPEN", "IN_FLIGHT", "DONE", "BLOCKED", "DROPPED"],
    weeks,
  };

  await ghPut(env, path, JSON.stringify(updated, null, 2), `Save Monday decisions for week of ${payload.week_of}`, current ? current.sha : null);
  return { count: newDecisions.length };
}

async function commitFileToGitHub(env, path, content, message) {
  const current = await ghGet(env, path);
  await ghPut(env, path, content, message, current ? current.sha : null);
}

async function ghGet(env, path) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "bpp-recap-worker" },
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

// ---------- Recap rendering ----------

const OWNER_COLOR = { Daunte: "#5987A5", Kenny: "#1a9e5c", Eli: "#F1BE5C" };

function renderRecapHtml(p, env) {
  const decisions = (p.decisions || [])
    .filter((d) => d.decision)
    .map((d, i) => `<li style="margin-bottom:6px;">${escapeHtml(d.decision)}${d.owner ? ` &mdash; <strong>${escapeHtml(d.owner)}</strong>` : ""}${d.due_date ? ` <span style="color:#64748B;font-size:11px;">(due ${escapeHtml(d.due_date)})</span>` : ""}</li>`)
    .join("");

  const commits = p.commits || {};
  const commitRows = ["Daunte", "Kenny", "Eli"]
    .map((owner) => {
      const c = commits[owner] || {};
      const lines = [];
      if (c.strategic) lines.push(`<div><span style="color:#64748B;font-size:11px;">Strategic:</span> ${escapeHtml(c.strategic)}</div>`);
      if (c.operational) lines.push(`<div><span style="color:#64748B;font-size:11px;">Operational:</span> ${escapeHtml(c.operational)}</div>`);
      if (c.unblock) lines.push(`<div><span style="color:#64748B;font-size:11px;">Unblock:</span> ${escapeHtml(c.unblock)}</div>`);
      if (!lines.length) return "";
      return `<tr><td style="vertical-align:top;padding:6px 12px 6px 0;width:80px;font-weight:700;color:${OWNER_COLOR[owner]};">${owner}</td><td style="vertical-align:top;padding:6px 0;color:#334155;">${lines.join("")}</td></tr>`;
    })
    .join("");

  const voiceBlock = p.voice_update
    ? `<div style="background:#FAF6EE;border-left:3px solid #5987A5;padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:12px;color:#334155;"><strong style="color:#5987A5;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Voice Updates</strong><br>${escapeHtml(p.voice_update).replace(/\n/g, "<br>")}</div>`
    : "";

  return `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;color:#1a2b3c;line-height:1.6;">
  <div style="font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.12em;font-size:11px;color:#64748B;margin-bottom:6px;">
    BPP MONDAY RECAP &middot; WEEK OF ${escapeHtml(p.week_of)}
  </div>
  <div style="font-family:Merriweather,Georgia,serif;font-size:20px;line-height:1.35;color:#044771;margin-bottom:18px;">
    ${escapeHtml(p.north_star || "Week of " + p.week_of)}
  </div>
  ${voiceBlock}
  <div style="background:#FAF6EE;border-left:4px solid #F1BE5C;padding:14px 18px;border-radius:6px;margin-bottom:16px;">
    <div style="font-family:Montserrat,sans-serif;font-size:11px;font-weight:700;color:#d4a648;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Decisions Made</div>
    <ol style="margin:0;padding-left:20px;font-size:13px;color:#1a2b3c;">${decisions || '<li style="color:#64748B;">(none captured)</li>'}</ol>
  </div>
  <div style="margin-bottom:16px;">
    <div style="font-family:Montserrat,sans-serif;font-size:11px;font-weight:700;color:#044771;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Owner Commits</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${commitRows || '<tr><td style="color:#64748B;font-size:12px;">(none captured)</td></tr>'}</table>
  </div>
  <a href="${env.HUB_URL}" style="display:inline-block;background:#044771;color:#fff;padding:12px 26px;text-decoration:none;border-radius:6px;font-family:Montserrat,sans-serif;font-weight:700;font-size:13px;letter-spacing:0.04em;">Open the Hub &rarr;</a>
  <div style="margin-top:32px;padding-top:14px;border-top:1px solid #E2E8F0;font-family:'Courier New',monospace;font-size:10px;color:#64748B;">
    sent via bpp-recap-worker &middot; archive: data/monday-recaps/${escapeHtml(p.week_of)}.md
  </div>
</div>`;
}

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
    lines.push(`- [${d.status || "OPEN"}] ${d.decision}${d.owner ? " — " + d.owner : ""}${d.set_date ? " — set: " + d.set_date : ""}${d.due_date ? " · due: " + d.due_date : ""}`);
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
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...(headers || {}) } });
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
