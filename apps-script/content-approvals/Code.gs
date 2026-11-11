/**
 * BPP Content Approvals: a swipe-to-approve web app for finished content in Google Drive.
 *
 * Swipe right to approve, swipe left to decline with written feedback. When a piece has
 * enough approvals it shows up under "Ready" with its caption and a download link, and
 * whoever schedules it (Metricool, or the LinkedIn page for newsletters) marks it scheduled.
 *
 * What gets reviewed:
 * - The Queue tab of the "BPP Content Approvals" sheet. One row per piece: a Drive link, a title,
 *   the platforms it's meant for, a caption, an optional cover image link, and notes.
 *   Videos, images, PDFs and Google Docs (newsletters) all work.
 * - If the Queue tab is empty or missing, the app scans BPP Media for recent finished files instead.
 *   Set SOURCE to "both" to always do both.
 *
 * How access works (no shared secrets anywhere):
 * - Deploy as a web app that runs as "User accessing the web app" and is open to
 *   "Anyone with a Google account" (appsscript.json sets both).
 * - Every request runs with the viewer's own Google identity, so Google Drive sharing is the
 *   access list. A viewer must be able to open the BPP Media folder AND edit the
 *   "BPP Content Approvals" sheet, or the app shows nothing.
 * - Every vote is written to the Decisions tab of that sheet with the voter's email and a
 *   timestamp. The sheet is the audit log.
 *
 * Settings live in Project Settings > Script properties. All are optional:
 *   ROOT_FOLDER_ID          Drive folder for the scan and access check. Default: the folder named "BPP Media".
 *   SHEET_ID                The approvals sheet. Default: the sheet named "BPP Content Approvals" inside the root folder.
 *   SOURCE                  auto (Queue tab if it has rows, otherwise scan) | queue | scan | both. Default auto.
 *   REQUIRED_APPROVALS      Approvals needed before a piece is ready. Default 3 (Kenny, Eli and Daunte).
 *   LOOKBACK_DAYS           Scan only: files added in the last N days. Default 60.
 *   INCLUDE_FOLDER_PATTERN  Scan only: a file is reviewable if any folder on its path matches. Default "final|media assets".
 *   EXCLUDE_FOLDER_PATTERN  Scan only: folders skipped entirely. Default raw footage, inbox, archive and trending-audio copies.
 *   REVIEWERS               Optional comma list of emails allowed to vote. Blank = anyone who can edit the sheet.
 *   REVIEWER_NAMES          Optional "email=Name" pairs, comma separated, for display.
 */

var DEFAULTS = {
  ROOT_FOLDER_NAME: 'BPP Media',
  SHEET_NAME: 'BPP Content Approvals',
  SOURCE: 'auto',
  REQUIRED_APPROVALS: 3,
  LOOKBACK_DAYS: 60,
  INCLUDE_FOLDER_PATTERN: 'final|media assets',
  EXCLUDE_FOLDER_PATTERN: '(^|[^a-z])raw([^a-z]|$)|inbox|archive|trending-audio',
  REVIEWERS: '',
  REVIEWER_NAMES: ''
};

var HEADERS = ['Timestamp', 'Reviewer', 'File ID', 'File name', 'Decision', 'Feedback', 'Folder', 'Drive link'];
var QUEUE_HEADERS = ['Drive link', 'Title', 'Type', 'Platforms', 'Caption', 'Cover image', 'Notes'];
var FOLDER_MIME = 'application/vnd.google-apps.folder';
var DOC_MIME = 'application/vnd.google-apps.document';
var DECISIONS = ['approve', 'decline', 'undo', 'scheduled', 'reset'];
var ITEMS_CACHE_KEY = 'items_v2';
var ITEMS_CACHE_SECONDS = 600;

/** Platform keys the page has icons for, and the words that map to each. */
var PLATFORMS = [
  ['instagram', /insta|\big\b|reels?\b/],
  ['facebook', /facebook|\bfb\b/],
  ['linkedin', /linked\s*in|\bli\b/],
  ['tiktok', /tik\s*tok|\btt\b/],
  ['youtube', /you\s*tube|\byt\b|shorts/],
  ['threads', /threads/],
  ['x', /twitter|\bx\b/],
  ['pinterest', /pinterest/]
];

/* ---------- web entry point ---------- */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('BPP Content Approvals')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- functions the page calls (google.script.run) ---------- */

/** Everything the page needs: who you are, your review queue, and the two status boards. */
function getState() {
  var me = authorize_();
  return buildState_(me, cfg_(), items_(false));
}

/** Same as getState, but reloads Drive and the Queue tab instead of using the 10-minute cache. */
function refreshState() {
  var me = authorize_();
  return buildState_(me, cfg_(), items_(true));
}

/**
 * Record a decision. decision is one of:
 *   approve | decline (feedback required) | undo (removes your last vote on this file)
 *   scheduled (it is queued to post) | reset (clears every vote so the file is reviewed again)
 */
function decide(fileId, decision, feedback) {
  var me = authorize_();
  if (DECISIONS.indexOf(decision) < 0) throw new Error('Unknown decision.');
  if (!isId_(fileId)) throw new Error('Bad file id.');
  feedback = String(feedback || '').replace(/\s+$/, '').slice(0, 2000);
  if (decision === 'decline' && feedback.replace(/\s/g, '').length < 3) {
    throw new Error('Add a short reason so the editor knows what to fix.');
  }
  var item = itemIndex_()[fileId];
  if (!item) throw new Error('That file is not in the review list anymore. Refresh and try again.');

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    decisionsSheet_().appendRow([
      new Date(), me, fileId, cell_(item.name), decision, cell_(feedback), cell_(item.folder), item.link
    ]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/** A preview image for a piece as a data: URI, or '' when Drive has none. Uses the cover image when one is set. */
function getThumb(fileId) {
  authorize_();
  var item = isId_(fileId) ? itemIndex_()[fileId] : null;
  if (!item) return '';
  var source = item.coverId || fileId;
  var cache = CacheService.getScriptCache();
  var key = 'th_' + source;
  var hit = cache.get(key);
  if (hit) return hit;

  var uri = '';
  var meta = driveGet_('files/' + source + '?fields=thumbnailLink,mimeType,size&supportsAllDrives=true');
  if (meta && meta.thumbnailLink) {
    uri = fetchDataUri_(meta.thumbnailLink.replace(/=s\d+$/, '=s1000'));
  }
  if (!uri && meta && String(meta.mimeType).indexOf('image/') === 0 && Number(meta.size || 0) < 2500000) {
    uri = fetchDataUri_('https://www.googleapis.com/drive/v3/files/' + source + '?alt=media&supportsAllDrives=true');
  }
  if (uri && uri.length < 95000) cache.put(key, uri, 21600);
  return uri;
}

/** The caption (Queue tab, or a same-name .txt next to the file), or the full text of a newsletter doc. */
function getCaption(fileId) {
  authorize_();
  var item = itemIndex_()[fileId];
  if (!item) return '';
  if (item.caption) return item.caption;
  var url = '';
  if (item.kind === 'doc') url = 'https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=text%2Fplain';
  else if (item.captionId) url = 'https://www.googleapis.com/drive/v3/files/' + item.captionId + '?alt=media&supportsAllDrives=true';
  if (!url) return '';
  var cache = CacheService.getScriptCache();
  var key = 'cap_' + fileId;
  var hit = cache.get(key);
  if (hit !== null) return hit;
  var res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  var text = res.getResponseCode() === 200 ? res.getContentText('UTF-8').replace(/^﻿/, '').slice(0, 20000) : '';
  if (text.length < 90000) cache.put(key, text, 1800);
  return text;
}

/** Optional: run once from the editor to check the setup. Writes nothing except sheet headers. */
function setup() {
  var c = cfg_();
  ensureConfig_(c);
  var ss = SpreadsheetApp.openById(c.SHEET_ID);
  decisionsSheet_();
  Logger.log('Root folder: ' + DriveApp.getFolderById(c.ROOT_FOLDER_ID).getName() + ' (' + c.ROOT_FOLDER_ID + ')');
  Logger.log('Approvals sheet: ' + ss.getUrl());
  Logger.log('Queue rows: ' + queueRows_().length);
  Logger.log('People who can vote (sheet editors): ' + ss.getEditors().map(function (u) { return u.getEmail(); }).join(', '));
  var items = items_(true);
  Logger.log('Pieces in review: ' + items.length);
  items.slice(0, 10).forEach(function (i) { Logger.log('  [' + i.platforms.join(', ') + '] ' + i.name); });
}

/* ---------- state ---------- */

function buildState_(me, c, items) {
  var names = reviewerNames_(c);
  var tally = tally_(decisions_());
  var queue = [], ready = [], changes = [], scheduled = 0;

  items.forEach(function (it) {
    var t = tally[it.id] || { votes: {}, scheduled: false };
    var votes = Object.keys(t.votes).map(function (by) {
      var v = t.votes[by];
      return { by: by, name: nameFor_(by, names), decision: v.decision, feedback: v.feedback, at: v.at };
    });
    var approvals = votes.filter(function (v) { return v.decision === 'approve'; });
    var declines = votes.filter(function (v) { return v.decision === 'decline'; });
    var mine = t.votes[me] ? t.votes[me].decision : '';
    var status = t.scheduled ? 'scheduled'
      : declines.length ? 'changes'
      : approvals.length >= c.REQUIRED_APPROVALS ? 'ready'
      : 'pending';
    var out = {
      id: it.id, name: it.name, kind: it.kind, type: it.type, platforms: it.platforms, notes: it.notes || '',
      folder: it.folder, created: it.created, link: it.link,
      hasCaption: !!(it.caption || it.captionId || it.kind === 'doc'),
      votes: votes, approvals: approvals.length, mine: mine, status: status
    };
    if (status === 'scheduled') { scheduled++; return; }
    if (status === 'ready') ready.push(out);
    if (status === 'changes') changes.push(out);
    if (!mine && status !== 'ready') queue.push(out);
  });

  return {
    me: me,
    meName: nameFor_(me, names),
    required: c.REQUIRED_APPROVALS,
    lookbackDays: c.LOOKBACK_DAYS,
    queue: queue,
    ready: ready,
    changes: changes,
    counts: { queue: queue.length, ready: ready.length, changes: changes.length, scheduled: scheduled, total: items.length },
    sheetUrl: 'https://docs.google.com/spreadsheets/d/' + c.SHEET_ID + '/edit',
    folderUrl: 'https://drive.google.com/drive/folders/' + c.ROOT_FOLDER_ID
  };
}

function decisions_() {
  var sh = decisionsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 6).getValues().map(function (r) {
    return {
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      by: String(r[1]).toLowerCase().trim(),
      id: String(r[2]).trim(),
      decision: String(r[4]).trim(),
      feedback: String(r[5])
    };
  });
}

/** Replays the log in order. The latest vote per reviewer wins; reset wipes a file's slate. */
function tally_(rows) {
  var t = {};
  rows.forEach(function (r) {
    if (!r.id) return;
    var f = t[r.id] || (t[r.id] = { votes: {}, scheduled: false });
    if (r.decision === 'approve' || r.decision === 'decline') {
      f.votes[r.by] = { decision: r.decision, feedback: r.decision === 'decline' ? r.feedback : '', at: r.at };
    } else if (r.decision === 'undo') {
      delete f.votes[r.by];
    } else if (r.decision === 'scheduled') {
      f.scheduled = true;
    } else if (r.decision === 'reset') {
      f.votes = {};
      f.scheduled = false;
    }
  });
  return t;
}

/* ---------- what's in review ---------- */

/** The pieces in review, from the Queue tab and/or a Drive scan, cached until the Queue tab changes. */
function items_(force) {
  var c = cfg_();
  ensureConfig_(c);
  var rows = queueRows_();
  var mode = String(c.SOURCE || 'auto').toLowerCase();
  if (mode === 'auto') mode = rows.length ? 'queue' : 'scan';
  var sig = mode + ':' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(rows)));
  if (!force) {
    var cached = getBig_(ITEMS_CACHE_KEY);
    if (cached) {
      var obj = JSON.parse(cached);
      if (obj.sig === sig) return obj.items;
    }
  }
  var items = [];
  if (mode === 'queue' || mode === 'both') items = items.concat(fromQueue_(rows));
  if (mode === 'scan' || mode === 'both') {
    var seen = {};
    items.forEach(function (i) { seen[i.id] = true; });
    scanDrive_(c).forEach(function (i) { if (!seen[i.id]) items.push(i); });
  }
  putBig_(ITEMS_CACHE_KEY, JSON.stringify({ sig: sig, items: items }), ITEMS_CACHE_SECONDS);
  return items;
}

function itemIndex_() {
  var idx = {};
  items_(false).forEach(function (i) { idx[i.id] = i; });
  return idx;
}

/** Reads the Queue tab. Columns are matched by header name, so their order doesn't matter. */
function queueRows_() {
  var sh = queueSheet_();
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getDisplayValues();
  var head = values[0].map(function (h) { return String(h).toLowerCase().trim(); });
  function col(names) {
    for (var i = 0; i < head.length; i++) if (names.indexOf(head[i]) >= 0) return i;
    return -1;
  }
  var cLink = col(['drive link', 'link', 'file', 'url']);
  var cTitle = col(['title', 'name']);
  var cType = col(['type', 'format']);
  var cPlat = col(['platforms', 'platform', 'channels', 'channel']);
  var cCap = col(['caption', 'copy']);
  var cCover = col(['cover image', 'cover', 'thumbnail']);
  var cNotes = col(['notes', 'note']);
  if (cLink < 0) return [];
  var rows = [];
  var seen = {};
  for (var r = 1; r < values.length; r++) {
    var v = values[r];
    var id = idFrom_(v[cLink]);
    if (!id || seen[id]) continue;
    seen[id] = true;
    rows.push({
      id: id,
      title: cTitle >= 0 ? String(v[cTitle]).trim() : '',
      type: cType >= 0 ? String(v[cType]).trim() : '',
      platforms: cPlat >= 0 ? String(v[cPlat]).trim() : '',
      caption: cCap >= 0 ? String(v[cCap]).trim() : '',
      cover: cCover >= 0 ? idFrom_(v[cCover]) : '',
      notes: cNotes >= 0 ? String(v[cNotes]).trim() : ''
    });
  }
  return rows;
}

/** Looks up every Queue row in Drive (in parallel) and labels it with the folder it came from. */
function fromQueue_(rows) {
  if (!rows.length) return [];
  var metas = fetchMeta_(rows.map(function (r) { return r.id; }), 'id,name,mimeType,createdTime,webViewLink,size,parents,trashed');
  var parentIds = unique_(metas.map(function (m) { return m && m.parents ? m.parents[0] : ''; }));
  var parents = toMap_(fetchMeta_(parentIds, 'id,name,parents'));
  var grandIds = unique_(Object.keys(parents).map(function (k) { return parents[k].parents ? parents[k].parents[0] : ''; }));
  var grands = toMap_(fetchMeta_(grandIds, 'id,name'));

  var out = [];
  rows.forEach(function (r, i) {
    var m = metas[i];
    if (!m || m.trashed) return;
    var p = m.parents ? parents[m.parents[0]] : null;
    var g = p && p.parents ? grands[p.parents[0]] : null;
    var folder = p ? ((/final/i.test(p.name) && g) ? g.name : p.name) : '';
    var kind = kindOf_(m.mimeType);
    out.push({
      id: m.id,
      name: r.title || m.name,
      fileName: m.name,
      mime: m.mimeType,
      kind: kind,
      type: r.type || defaultType_(kind),
      platforms: platforms_(r.platforms, kind),
      caption: r.caption,
      coverId: r.cover,
      notes: r.notes,
      folder: folder,
      created: m.createdTime,
      link: m.webViewLink || ('https://drive.google.com/file/d/' + m.id + '/view'),
      size: Number(m.size || 0)
    });
  });
  return out;
}

/** Walks the root folder breadth first, a few dozen folders per Drive query. */
function scanDrive_(c) {
  var include = new RegExp(c.INCLUDE_FOLDER_PATTERN, 'i');
  var exclude = new RegExp(c.EXCLUDE_FOLDER_PATTERN, 'i');
  var since = new Date(Date.now() - c.LOOKBACK_DAYS * 86400000).toISOString();
  var folders = {};
  folders[c.ROOT_FOLDER_ID] = { path: '', include: false };
  var frontier = [c.ROOT_FOLDER_ID];
  var media = [];
  var captions = {};

  for (var depth = 0; depth < 8 && frontier.length; depth++) {
    var next = [];
    for (var i = 0; i < frontier.length; i += 30) {
      var chunk = frontier.slice(i, i + 30);
      var q = '(' + chunk.map(function (id) { return "'" + id + "' in parents"; }).join(' or ') + ')' +
        " and trashed = false and (mimeType = '" + FOLDER_MIME + "' or ((" +
        "mimeType contains 'image/' or mimeType contains 'video/' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = '" + DOC_MIME + "'" +
        ") and createdTime > '" + since + "'))";
      driveList_(q, 'id,name,mimeType,parents,createdTime,webViewLink,size').forEach(function (f) {
        var parentId = (f.parents || []).filter(function (p) { return folders[p]; })[0];
        var parent = folders[parentId];
        if (!parent) return;
        if (f.mimeType === FOLDER_MIME) {
          if (exclude.test(f.name) || folders[f.id]) return;
          folders[f.id] = {
            path: parent.path ? parent.path + ' / ' + f.name : f.name,
            include: parent.include || include.test(f.name)
          };
          next.push(f.id);
          return;
        }
        if (!parent.include) return;
        var base = parentId + '/' + f.name.replace(/\.[^.]+$/, '').toLowerCase();
        if (f.mimeType === 'text/plain') { captions[base] = f.id; return; }
        var kind = kindOf_(f.mimeType);
        media.push({
          id: f.id,
          name: f.name,
          fileName: f.name,
          mime: f.mimeType,
          kind: kind,
          type: defaultType_(kind),
          platforms: platforms_(parent.path + ' ' + f.name, kind),
          folder: parent.path,
          created: f.createdTime,
          link: f.webViewLink || ('https://drive.google.com/file/d/' + f.id + '/view'),
          size: Number(f.size || 0),
          base: base
        });
      });
    }
    frontier = next;
  }

  media.forEach(function (m) { m.captionId = captions[m.base] || ''; delete m.base; });
  media.sort(function (a, b) { return a.created < b.created ? 1 : -1; });
  return media.slice(0, 400);
}

function kindOf_(mime) {
  mime = String(mime || '');
  if (mime.indexOf('video/') === 0) return 'video';
  if (mime.indexOf('image/') === 0) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === DOC_MIME) return 'doc';
  return 'file';
}

function defaultType_(kind) {
  return { video: 'Video', image: 'Image', pdf: 'PDF', doc: 'Newsletter' }[kind] || 'File';
}

/** Turns "IG, FB and LinkedIn" into ['instagram', 'facebook', 'linkedin']. Falls back by file type. */
function platforms_(text, kind) {
  var s = String(text || '').toLowerCase();
  var out = [];
  PLATFORMS.forEach(function (p) { if (p[1].test(s)) out.push(p[0]); });
  if (out.length) return out;
  return (kind === 'doc' || kind === 'pdf') ? ['linkedin'] : ['instagram', 'facebook'];
}

/* ---------- Drive helpers ---------- */

/** files.get for many ids at once. Returns metadata objects (or null) in the same order. */
function fetchMeta_(ids, fields) {
  var token = ScriptApp.getOAuthToken();
  var out = [];
  for (var i = 0; i < ids.length; i += 40) {
    var chunk = ids.slice(i, i + 40);
    var responses = UrlFetchApp.fetchAll(chunk.map(function (id) {
      return {
        url: 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) +
          '?supportsAllDrives=true&fields=' + encodeURIComponent(fields),
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true
      };
    }));
    responses.forEach(function (res) {
      out.push(res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : null);
    });
  }
  return out;
}

function driveList_(q, fields) {
  var files = [];
  var pageToken = '';
  do {
    var params = {
      q: q,
      pageSize: 1000,
      fields: 'nextPageToken,files(' + fields + ')',
      corpora: 'allDrives',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    };
    if (pageToken) params.pageToken = pageToken;
    var body = driveGet_('files?' + Object.keys(params).map(function (k) {
      return k + '=' + encodeURIComponent(params[k]);
    }).join('&'), true);
    files = files.concat(body.files || []);
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return files;
}

function driveGet_(path, mustSucceed) {
  var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/' + path, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    if (mustSucceed) throw new Error('Google Drive returned ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
    return null;
  }
  return JSON.parse(res.getContentText());
}

function fetchDataUri_(url) {
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return '';
  var blob = res.getBlob();
  var type = blob.getContentType() || 'image/jpeg';
  if (type.indexOf('image/') !== 0) return '';
  return 'data:' + type + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

/** Pulls a Drive file id out of a share link, an open?id= link, or a bare id. */
function idFrom_(text) {
  var s = String(text || '').trim();
  var m = s.match(/\/d\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || s.match(/^([A-Za-z0-9_-]{10,})$/);
  return m ? m[1] : '';
}

/* ---------- identity and config ---------- */

/**
 * Confirms the viewer is signed in and can open both the root folder and the approvals sheet.
 * The item and thumbnail caches are shared across users, so nothing is served before this passes.
 */
function authorize_() {
  var email = (Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  if (!email) throw new Error('Sign in to Google to use this page.');
  var c = cfg_();
  if (c.REVIEWERS) {
    var list = c.REVIEWERS.toLowerCase().split(/[\s,;]+/).filter(String);
    if (list.indexOf(email) < 0) throw new Error(email + ' is not on the reviewer list. Ask Kenny to add you.');
  }
  var userCache = CacheService.getUserCache();
  if (userCache.get('ok') === email) return email;
  ensureConfig_(c);
  try {
    DriveApp.getFolderById(c.ROOT_FOLDER_ID).getName();
    SpreadsheetApp.openById(c.SHEET_ID).getName();
  } catch (e) {
    throw new Error(email + ' cannot open the BPP Media folder or the BPP Content Approvals sheet. Ask Kenny to share both with you (sheet as Editor).');
  }
  userCache.put('ok', email, 600);
  return email;
}

function cfg_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var c = {};
  Object.keys(DEFAULTS).forEach(function (k) { c[k] = (p[k] !== undefined && p[k] !== '') ? p[k] : DEFAULTS[k]; });
  c.REQUIRED_APPROVALS = Math.max(1, Number(c.REQUIRED_APPROVALS) || 3);
  c.LOOKBACK_DAYS = Math.max(1, Number(c.LOOKBACK_DAYS) || 60);
  c.ROOT_FOLDER_ID = p.ROOT_FOLDER_ID || '';
  c.SHEET_ID = p.SHEET_ID || '';
  return c;
}

/** Finds the root folder and the approvals sheet by name the first time, then remembers their ids. */
function ensureConfig_(c) {
  var props = PropertiesService.getScriptProperties();
  if (!c.ROOT_FOLDER_ID) {
    var folders = DriveApp.getFoldersByName(c.ROOT_FOLDER_NAME);
    if (!folders.hasNext()) throw new Error('No folder named "' + c.ROOT_FOLDER_NAME + '" is shared with you.');
    c.ROOT_FOLDER_ID = folders.next().getId();
    props.setProperty('ROOT_FOLDER_ID', c.ROOT_FOLDER_ID);
  }
  if (!c.SHEET_ID) {
    var files = DriveApp.getFolderById(c.ROOT_FOLDER_ID).getFilesByName(c.SHEET_NAME);
    if (!files.hasNext()) {
      throw new Error('No sheet named "' + c.SHEET_NAME + '" in ' + c.ROOT_FOLDER_NAME + '. Create one there, or set SHEET_ID in Script properties.');
    }
    c.SHEET_ID = files.next().getId();
    props.setProperty('SHEET_ID', c.SHEET_ID);
  }
}

/** The Queue tab: named "Queue", or any tab whose first header is a link column. */
function queueSheet_() {
  var c = cfg_();
  ensureConfig_(c);
  var sheets = SpreadsheetApp.openById(c.SHEET_ID).getSheets();
  for (var i = 0; i < sheets.length; i++) if (/^queue$/i.test(sheets[i].getName())) return sheets[i];
  for (var j = 0; j < sheets.length; j++) {
    if (sheets[j].getName() === 'Decisions' || sheets[j].getLastRow() < 1) continue;
    var first = String(sheets[j].getRange(1, 1).getDisplayValue()).toLowerCase().trim();
    if (/^(drive link|link|file|url)$/.test(first)) return sheets[j];
  }
  return null;
}

/** The Decisions tab, created with its header row the first time it's needed. */
function decisionsSheet_() {
  var c = cfg_();
  ensureConfig_(c);
  var ss = SpreadsheetApp.openById(c.SHEET_ID);
  var sh = ss.getSheetByName('Decisions');
  if (!sh) {
    var first = ss.getSheets()[0];
    if (first.getLastRow() === 0 && ss.getSheets().length === 1) {
      sh = first.setName('Decisions');
      ss.insertSheet('Queue', 0).appendRow(QUEUE_HEADERS);
    } else {
      sh = ss.insertSheet('Decisions');
    }
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function reviewerNames_(c) {
  var map = {};
  String(c.REVIEWER_NAMES || '').split(',').forEach(function (pair) {
    var bits = pair.split('=');
    if (bits.length === 2) map[bits[0].trim().toLowerCase()] = bits[1].trim();
  });
  return map;
}

function nameFor_(email, names) {
  if (names[email]) return names[email];
  var local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/* ---------- small helpers ---------- */

function isId_(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{10,}$/.test(id);
}

/** Stops a cell from being read as a formula. */
function cell_(s) {
  s = String(s == null ? '' : s);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function unique_(list) {
  var seen = {};
  return list.filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
}

function toMap_(list) {
  var m = {};
  list.forEach(function (x) { if (x && x.id) m[x.id] = x; });
  return m;
}

function putBig_(key, value, seconds) {
  var cache = CacheService.getScriptCache();
  var size = 90000;
  var parts = Math.ceil(value.length / size) || 1;
  var obj = {};
  obj[key] = String(parts);
  for (var i = 0; i < parts; i++) obj[key + '_' + i] = value.slice(i * size, (i + 1) * size);
  cache.putAll(obj, seconds);
}

function getBig_(key) {
  var cache = CacheService.getScriptCache();
  var parts = Number(cache.get(key) || 0);
  if (!parts) return null;
  var keys = [];
  for (var i = 0; i < parts; i++) keys.push(key + '_' + i);
  var got = cache.getAll(keys);
  var out = '';
  for (var j = 0; j < parts; j++) {
    if (got[key + '_' + j] == null) return null;
    out += got[key + '_' + j];
  }
  return out;
}
