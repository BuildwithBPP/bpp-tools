/**
 * BPP Content Approvals: a swipe-to-approve web app for finished content in Google Drive.
 *
 * Swipe right to approve, swipe left to decline with written feedback. When a piece has
 * enough approvals it shows up under "Ready for Metricool" with its caption and a download
 * link, and whoever schedules it marks it scheduled.
 *
 * How access works (no shared secrets anywhere):
 * - Deploy as a web app that runs as "User accessing the web app" and is open to
 *   "Anyone with a Google account" (appsscript.json sets both).
 * - Every request runs with the viewer's own Google identity, so Google Drive sharing is the
 *   access list. A viewer must be able to open the BPP Media folder AND the
 *   "BPP Content Approvals" sheet, or the app shows nothing.
 * - Every vote is written to the Decisions tab of that sheet with the voter's email and a
 *   timestamp. The sheet is the audit log.
 *
 * Settings live in Project Settings > Script properties. All are optional:
 *   ROOT_FOLDER_ID          Drive folder to scan. Default: the folder named "BPP Media".
 *   SHEET_ID                Decisions sheet. Default: the sheet named "BPP Content Approvals" inside the root folder.
 *   REQUIRED_APPROVALS      Approvals needed before a piece is ready. Default 3 (Kenny, Eli and Daunte).
 *   LOOKBACK_DAYS           Only files added in the last N days are reviewed. Default 60.
 *   INCLUDE_FOLDER_PATTERN  A file is reviewable if any folder on its path matches. Default "final|media assets".
 *   EXCLUDE_FOLDER_PATTERN  Folders skipped entirely. Default raw footage, inbox, archive and trending-audio copies.
 *   REVIEWERS               Optional comma list of emails allowed to vote. Blank = anyone who can edit the sheet.
 *   REVIEWER_NAMES          Optional "email=Name" pairs, comma separated, for display.
 */

var DEFAULTS = {
  ROOT_FOLDER_NAME: 'BPP Media',
  SHEET_NAME: 'BPP Content Approvals',
  REQUIRED_APPROVALS: 3,
  LOOKBACK_DAYS: 60,
  INCLUDE_FOLDER_PATTERN: 'final|media assets',
  EXCLUDE_FOLDER_PATTERN: '(^|[^a-z])raw([^a-z]|$)|inbox|archive|trending-audio',
  REVIEWERS: '',
  REVIEWER_NAMES: ''
};

var HEADERS = ['Timestamp', 'Reviewer', 'File ID', 'File name', 'Decision', 'Feedback', 'Folder', 'Drive link'];
var FOLDER_MIME = 'application/vnd.google-apps.folder';
var DECISIONS = ['approve', 'decline', 'undo', 'scheduled', 'reset'];
var SCAN_CACHE_KEY = 'scan_v1';
var SCAN_CACHE_SECONDS = 600;

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
  var c = cfg_();
  var items = scan_(false);
  return buildState_(me, c, items);
}

/** Same as getState, but rescans Drive instead of using the 10-minute cache. */
function refreshState() {
  var me = authorize_();
  var c = cfg_();
  var items = scan_(true);
  return buildState_(me, c, items);
}

/**
 * Record a decision. decision is one of:
 *   approve | decline (feedback required) | undo (removes your last vote on this file)
 *   scheduled (it is queued in Metricool) | reset (clears every vote so the file is reviewed again)
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
  if (!item) throw new Error('That file is not in the review folders anymore. Refresh and try again.');

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    sheet_().appendRow([
      new Date(), me, fileId, cell_(item.name), decision, cell_(feedback), cell_(item.folder), item.link
    ]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/** A preview image for a file as a data: URI, or '' when Drive has no thumbnail. */
function getThumb(fileId) {
  authorize_();
  if (!isId_(fileId) || !itemIndex_()[fileId]) return '';
  var cache = CacheService.getScriptCache();
  var key = 'th_' + fileId;
  var hit = cache.get(key);
  if (hit) return hit;

  var item = itemIndex_()[fileId];
  var uri = '';
  var meta = driveGet_('files/' + fileId + '?fields=thumbnailLink,hasThumbnail&supportsAllDrives=true');
  if (meta && meta.thumbnailLink) {
    uri = fetchDataUri_(meta.thumbnailLink.replace(/=s\d+$/, '=s1000'));
  }
  if (!uri && item.kind === 'image' && item.size && item.size < 2500000) {
    uri = fetchDataUri_('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media&supportsAllDrives=true');
  }
  if (uri && uri.length < 95000) cache.put(key, uri, 21600);
  return uri;
}

/** The caption text that sits next to a reel (same file name, .txt), or ''. */
function getCaption(fileId) {
  authorize_();
  var item = itemIndex_()[fileId];
  if (!item || !item.captionId) return '';
  var cache = CacheService.getScriptCache();
  var key = 'cap_' + item.captionId;
  var hit = cache.get(key);
  if (hit !== null) return hit;
  var res = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + item.captionId + '?alt=media&supportsAllDrives=true',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
  );
  var text = res.getResponseCode() === 200 ? res.getContentText('UTF-8').slice(0, 5000) : '';
  cache.put(key, text, 21600);
  return text;
}

/** Optional: run once from the editor to check the setup. Writes nothing except the sheet header. */
function setup() {
  var c = cfg_();
  ensureConfig_(c);
  var ss = SpreadsheetApp.openById(c.SHEET_ID);
  Logger.log('Root folder: ' + DriveApp.getFolderById(c.ROOT_FOLDER_ID).getName() + ' (' + c.ROOT_FOLDER_ID + ')');
  Logger.log('Decisions sheet: ' + ss.getUrl());
  Logger.log('People who can vote (sheet editors): ' + ss.getEditors().map(function (u) { return u.getEmail(); }).join(', '));
  var items = scan_(true);
  Logger.log('Reviewable files found: ' + items.length);
  items.slice(0, 10).forEach(function (i) { Logger.log('  ' + i.folder + ' / ' + i.name); });
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
      id: it.id, name: it.name, kind: it.kind, mime: it.mime, folder: it.folder,
      created: it.created, link: it.link, hasCaption: !!it.captionId,
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
  var sh = sheet_();
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

/* ---------- Drive scan ---------- */

/** Walks the root folder breadth first, a few dozen folders per Drive query, and caches the result. */
function scan_(force) {
  var c = cfg_();
  ensureConfig_(c);
  if (!force) {
    var cached = getBig_(SCAN_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  }

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
        "mimeType contains 'image/' or mimeType contains 'video/' or mimeType = 'application/pdf' or mimeType = 'text/plain'" +
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
        media.push({
          id: f.id,
          name: f.name,
          mime: f.mimeType,
          kind: f.mimeType.indexOf('video/') === 0 ? 'video' : f.mimeType.indexOf('image/') === 0 ? 'image' : 'pdf',
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
  media = media.slice(0, 400);
  putBig_(SCAN_CACHE_KEY, JSON.stringify(media), SCAN_CACHE_SECONDS);
  return media;
}

function itemIndex_() {
  var idx = {};
  scan_(false).forEach(function (i) { idx[i.id] = i; });
  return idx;
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

/* ---------- identity and config ---------- */

/**
 * Confirms the viewer is signed in and can open both the root folder and the decisions sheet.
 * The scan and thumbnail caches are shared across users, so nothing is served before this passes.
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

/** Finds the root folder and the decisions sheet by name the first time, then remembers their ids. */
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

function sheet_() {
  var c = cfg_();
  ensureConfig_(c);
  var ss = SpreadsheetApp.openById(c.SHEET_ID);
  var sh = ss.getSheetByName('Decisions');
  if (!sh) {
    sh = ss.getSheets()[0];
    if (sh.getLastRow() > 0) sh = ss.insertSheet('Decisions');
    else sh.setName('Decisions');
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
