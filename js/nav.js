// BPP Tools Hub — shared navigation. Inject with: <div id="hub-nav"></div><script src="<path>/js/nav.js" data-page="home"></script>
(function () {
  var script = document.currentScript;
  var page = (script && script.getAttribute('data-page')) || '';
  // Depth: pages in /pages/ need '../' to reach root; index.html is at root.
  // Assumes exactly two depth levels: root and /pages/. Does not support /pages/subdir/.
  var atRoot = !/\/pages\//.test(location.pathname);
  var base = atRoot ? '' : '../';
  var tabs = [
    { id: 'home',        label: 'Home',        emoji: '🏠', href: base + 'index.html' },
    { id: 'departments', label: 'Departments', emoji: '🏢', href: base + 'pages/departments.html' },
    { id: 'library',     label: 'Library',     emoji: '📚', href: base + 'pages/library.html' },
    { id: 'strategy',    label: 'Strategy',    emoji: '🎯', href: base + 'pages/strategy.html' }
  ];
  var tabsHtml = tabs.map(function (t) {
    return '<a class="hub-tab' + (t.id === page ? ' on' : '') + '" href="' + t.href + '">' +
           '<span class="tab-emoji">' + t.emoji + '</span> ' + t.label + '</a>';
  }).join('');
  var searchHtml =
    '<div class="nav-search" role="search">' +
      '<span class="nav-search-icon" aria-hidden="true">🔍</span>' +
      '<input id="nav-search-input" class="nav-search-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search BPP Tools" aria-label="Search BPP Tools" aria-controls="nav-search-dropdown" aria-expanded="false">' +
      '<span class="nav-search-hint" aria-hidden="true">/</span>' +
      '<div id="nav-search-dropdown" class="nav-search-dropdown" role="listbox" hidden></div>' +
    '</div>';
  // .nav-collapse is display:contents on desktop (children lay out in the bar, ordered by CSS
  // `order`) and becomes the slide-in drawer at <=768px. One DOM instance of every control, so
  // the person filter and privacy toggle can never desync between the two layouts.
  var html =
    '<nav class="hub-nav">' +
      '<a class="nav-logo" href="' + base + 'index.html" style="text-decoration:none;">' +
        '<div class="nav-logo-mark">B</div>' +
        '<div class="nav-brand">BPP <span>Tools</span></div>' +
      '</a>' +
      '<div class="nav-collapse" id="nav-collapse">' +
        '<div class="nav-drawer-head">' +
          '<span class="nav-drawer-title">Menu</span>' +
          '<button type="button" class="nav-drawer-close" aria-label="Close menu">&times;</button>' +
        '</div>' +
        '<div class="nav-tabs">' + tabsHtml + '</div>' +
        '<span class="nav-drawer-label">Filter by person</span>' +
        '<div class="nav-people">' +
          '<button class="person-btn" onclick="togglePerson(\'daunte\',this)">Daunte</button>' +
          '<button class="person-btn" onclick="togglePerson(\'kenny\',this)">Kenny</button>' +
          '<button class="person-btn" onclick="togglePerson(\'eli\',this)">Eli</button>' +
        '</div>' +
      '</div>' +
      searchHtml +
      '<button type="button" class="nav-icon-btn nav-search-btn" aria-label="Search" aria-expanded="false" aria-controls="nav-search-input">🔍</button>' +
      '<button type="button" class="nav-icon-btn nav-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="nav-collapse">☰</button>' +
    '</nav>' +
    '<div class="nav-backdrop" hidden></div>';
  var mount = document.getElementById('hub-nav');
  if (mount) mount.outerHTML = html;

  // -- Mobile drawer + collapsible search --
  (function () {
    var body = document.body;
    var menuBtn = document.querySelector('.nav-menu-btn');
    var searchBtn = document.querySelector('.nav-search-btn');
    var closeBtn = document.querySelector('.nav-drawer-close');
    var backdrop = document.querySelector('.nav-backdrop');
    var drawer = document.getElementById('nav-collapse');
    if (!menuBtn || !searchBtn || !drawer) return;

    function setDrawer(open) {
      var was = body.getAttribute('data-nav') === 'open';
      if (open) body.setAttribute('data-nav', 'open'); else body.removeAttribute('data-nav');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (backdrop) backdrop.hidden = !open;
      if (open) setSearch(false);
      // Move focus with the surface so keyboard and screen-reader users follow the drawer.
      // Only on a real transition, so a no-op close never steals focus from the page.
      if (open && !was) { var first = drawer.querySelector('.nav-drawer-close'); if (first) first.focus(); }
      else if (!open && was) menuBtn.focus();
    }
    function setSearch(open) {
      if (open) body.setAttribute('data-navsearch', 'open'); else body.removeAttribute('data-navsearch');
      searchBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var si = document.getElementById('nav-search-input');
      if (open && si) si.focus();
    }

    menuBtn.addEventListener('click', function () { setDrawer(body.getAttribute('data-nav') !== 'open'); });
    searchBtn.addEventListener('click', function () { setSearch(body.getAttribute('data-navsearch') !== 'open'); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setDrawer(false); });
    if (backdrop) backdrop.addEventListener('click', function () { setDrawer(false); });

    // Navigating away from a drawer link should not leave the drawer latched open on bfcache restore.
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (body.getAttribute('data-nav') === 'open') { e.preventDefault(); setDrawer(false); }
      else if (body.getAttribute('data-navsearch') === 'open') { setSearch(false); }
    });

    // Crossing back to desktop must clear mobile-only state, or the body stays scroll-locked.
    var mqDesktop = window.matchMedia('(min-width:769px)');
    var onDesktop = function (e) { if (e.matches) { setDrawer(false); body.removeAttribute('data-navsearch'); } };
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onDesktop);
    else if (mqDesktop.addListener) mqDesktop.addListener(onDesktop);
  })();

  // -- Privacy toggle: auto-appears only on pages with maskable financial figures (.pii/.mask). Defaults to Protected. --
  (function () {
    function initPrivacy() {
      if (!document.querySelector('.pii, .mask')) return;
      if (!document.body.hasAttribute('data-privacy')) document.body.setAttribute('data-privacy', 'on');
      // Mount inside .nav-collapse so the toggle rides into the mobile drawer with the other controls.
      var pnav = document.getElementById('nav-collapse') || document.querySelector('.hub-nav');
      if (!pnav || document.querySelector('.privacy-toggle')) return;
      var pbtn = document.createElement('button');
      pbtn.type = 'button';
      pbtn.className = 'privacy-toggle';
      pbtn.title = 'Show or hide financial figures';
      pbtn.innerHTML = '<span class="pt-dot"></span><span class="pt-label">Protected</span>';
      pbtn.addEventListener('click', function () {
        var on = document.body.getAttribute('data-privacy') === 'on';
        document.body.setAttribute('data-privacy', on ? 'off' : 'on');
        pbtn.classList.toggle('revealed', on);
        pbtn.querySelector('.pt-label').textContent = on ? 'Revealed' : 'Protected';
      });
      pnav.appendChild(pbtn);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPrivacy);
    else initPrivacy();
  })();

  // -- Search --
  // The search index is BUILT AT RUNTIME from pages/library.html and pages/departments.html.
  // To add a page to search, just add its card to one of those two pages — no JSON to maintain.
  var pages = [];
  var activeIdx = -1;
  var currentResults = [];

  var input = document.getElementById('nav-search-input');
  var dropdown = document.getElementById('nav-search-dropdown');

  function isInternalHref(h) {
    if (!h) return false;
    return !/^(https?:|mailto:|tel:|#)/i.test(h);
  }

  function parseLinkCards(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var out = [];
    doc.querySelectorAll('.link-card').forEach(function (card) {
      var href = card.getAttribute('href');
      if (!isInternalHref(href)) return;
      var titleEl = card.querySelector('.lc-title');
      var descEl = card.querySelector('.lc-desc');
      if (!titleEl) return;
      out.push({
        title: titleEl.textContent.replace(/\s+/g, ' ').trim(),
        desc: descEl ? descEl.textContent.replace(/\s+/g, ' ').trim() : '',
        href: 'pages/' + href.replace(/^\.\//, '')
      });
    });
    return out;
  }

  function parseDeptTiles(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var out = [];
    doc.querySelectorAll('.dept-tile').forEach(function (tile) {
      var href = tile.getAttribute('href');
      if (!isInternalHref(href)) return;
      var nameEl = tile.querySelector('.dept-tile-name');
      var ownsEl = tile.querySelector('.dept-tile-owns');
      var driEl = tile.querySelector('.dept-tile-dri');
      if (!nameEl) return;
      var desc = ownsEl ? ownsEl.textContent.replace(/\s+/g, ' ').trim() : '';
      var dri = driEl ? driEl.textContent.replace(/\s+/g, ' ').trim() : '';
      if (dri) desc = desc ? desc + ' · ' + dri : dri;
      out.push({
        title: nameEl.textContent.replace(/\s+/g, ' ').trim(),
        desc: desc,
        href: 'pages/' + href.replace(/^\.\//, '')
      });
    });
    return out;
  }

  // Seed with the 4 top-level nav tabs so they're always searchable
  // even if library.html / departments.html fail to load.
  var navSeed = [
    { title: 'Home',        desc: 'BPP Tools Hub — quick actions, cash, AR, active clients', href: 'index.html' },
    { title: 'Departments', desc: 'All 6 departments and their DRIs',                        href: 'pages/departments.html' },
    { title: 'Library',     desc: 'Every page in the Hub, grouped by what it is',            href: 'pages/library.html' },
    { title: 'Strategy',    desc: 'Strategic plan, business plan, synthesis, KPIs',          href: 'pages/strategy.html' }
  ];

  function dedupe(list) {
    var seen = {};
    return list.filter(function (p) {
      if (seen[p.href]) return false;
      seen[p.href] = true;
      return true;
    });
  }

  Promise.all([
    fetch(base + 'pages/library.html').then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }),
    fetch(base + 'pages/departments.html').then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
  ]).then(function (texts) {
    var fromLibrary = texts[0] ? parseLinkCards(texts[0]) : [];
    var fromDepts = texts[1] ? parseDeptTiles(texts[1]) : [];
    pages = dedupe(navSeed.concat(fromLibrary).concat(fromDepts));
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    var lower = text.toLowerCase();
    var ql = q.toLowerCase();
    var i = lower.indexOf(ql);
    if (i < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, i)) +
           '<mark>' + escapeHtml(text.slice(i, i + q.length)) + '</mark>' +
           escapeHtml(text.slice(i + q.length));
  }

  function search(q) {
    if (!q) return [];
    var ql = q.toLowerCase();
    var titleHits = [];
    var descHits = [];
    pages.forEach(function (p) {
      var titleHit = p.title && p.title.toLowerCase().indexOf(ql) >= 0;
      var descHit = p.desc && p.desc.toLowerCase().indexOf(ql) >= 0;
      if (titleHit) titleHits.push(p);
      else if (descHit) descHits.push(p);
    });
    return titleHits.concat(descHits).slice(0, 8);
  }

  function render(q) {
    currentResults = search(q);
    activeIdx = -1;
    if (!q) {
      dropdown.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      dropdown.innerHTML = '';
      return;
    }
    if (currentResults.length === 0) {
      dropdown.innerHTML =
        '<div class="nav-search-empty">No results for "' + escapeHtml(q) + '"</div>' +
        '<a class="nav-search-result fallback" href="' + base + 'pages/library.html">' +
          '<span class="nsr-title">Browse the full Library →</span>' +
        '</a>';
    } else {
      dropdown.innerHTML = currentResults.map(function (p, i) {
        return '<a class="nav-search-result" role="option" data-idx="' + i + '" href="' + base + escapeHtml(p.href) + '">' +
                 '<span class="nsr-title">' + highlight(p.title, q) + '</span>' +
                 '<span class="nsr-desc">' + highlight(p.desc, q) + '</span>' +
               '</a>';
      }).join('');
    }
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function setActive(idx) {
    var items = dropdown.querySelectorAll('.nav-search-result:not(.fallback)');
    items.forEach(function (el) { el.classList.remove('active'); });
    if (idx < 0 || idx >= items.length) { activeIdx = -1; return; }
    activeIdx = idx;
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  function closeDropdown() {
    dropdown.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  }

  if (input && dropdown) {
    input.addEventListener('input', function () { render(input.value.trim()); });
    input.addEventListener('focus', function () { if (input.value.trim()) render(input.value.trim()); });
    input.addEventListener('keydown', function (e) {
      var items = dropdown.querySelectorAll('.nav-search-result:not(.fallback)');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(activeIdx + 1 >= items.length ? 0 : activeIdx + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(activeIdx - 1 < 0 ? items.length - 1 : activeIdx - 1);
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0 && items[activeIdx]) {
          e.preventDefault();
          window.location.href = items[activeIdx].getAttribute('href');
        }
      } else if (e.key === 'Escape') {
        if (!dropdown.hidden) { e.preventDefault(); closeDropdown(); }
        else { input.blur(); }
      }
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-search')) closeDropdown();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== '/') return;
      var t = e.target;
      var tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      e.preventDefault();
      input.focus();
      input.select();
    });
  }
})();

// -- Mobile safety nets: tables and grids --
// These run over EVERY page from the shared layer, so the ~25 pages with their own <style>
// blocks and no @media of their own get fixed without being edited one by one.
(function () {
  var MOBILE = '(max-width:768px)';

  // Tables -> stacked label/value cards. Each <td> is stamped with its column header, which the
  // stylesheet renders as the row label. Tables too irregular to stack (colspans, mismatched row
  // widths, no header) fall back to their own scroll container so the PAGE never scrolls sideways.
  // A page can opt out or force a mode by setting data-mobile="stack|scroll|off" itself.
  function ensureScrollWrap(t) {
    var p = t.parentElement;
    // Respect a wrapper the page already provides (several use inline overflow-x:auto).
    if (!p || p.classList.contains('table-scroll') || /auto|scroll/.test(p.style.overflowX)) return;
    var w = document.createElement('div');
    w.className = 'table-scroll';
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  }

  function labelRows(rows, labels) {
    Array.prototype.forEach.call(rows, function (r) {
      if (r.parentNode.tagName === 'THEAD') return;
      Array.prototype.forEach.call(r.children, function (c, i) {
        if (!c.hasAttribute('data-l')) c.setAttribute('data-l', labels[i] || '');
      });
    });
  }

  function stackTables() {
    Array.prototype.forEach.call(document.querySelectorAll('table'), function (t) {
      var headRow = t.querySelector('thead tr');
      var ths = headRow ? headRow.querySelectorAll('th') : [];

      // Already classified as stacked: rows injected later (ops.html builds #brief-capacity from
      // JSON after load) still need their labels, so re-stamp instead of skipping the table.
      if (t.getAttribute('data-mobile') === 'stack') {
        labelRows(t.querySelectorAll('tbody tr'), Array.prototype.map.call(ths, function (th) {
          return th.textContent.replace(/\s+/g, ' ').trim();
        }));
        return;
      }
      if (t.hasAttribute('data-mobile')) return;

      var bodyRows = t.querySelectorAll('tbody tr');
      // An empty tbody means the data has not arrived yet (or never will — ops.html leaves
      // #brief-ar-scenarios empty when there is no AR data). Don't commit to a verdict with no
      // rows to inspect, but DO contain the table now, or a header-only table renders at its
      // natural width and pushes the page out. data-mobile stays unset so a later pass can
      // still stack it once rows appear.
      if (t.querySelector('tbody') && !bodyRows.length) { ensureScrollWrap(t); return; }
      var rows = bodyRows.length ? bodyRows : t.querySelectorAll('tr');

      var ok = ths.length >= 2 && ths.length <= 8 && rows.length > 0;
      // Spanning cells break the one-label-per-cell mapping.
      if (ok && t.querySelector('[colspan]:not([colspan="1"]),[rowspan]:not([rowspan="1"])')) ok = false;
      // Every body row must line up with the header, or labels would be wrong (worse than unstyled).
      if (ok) {
        for (var i = 0; i < rows.length; i++) {
          if (rows[i].parentNode.tagName === 'THEAD') continue;
          if (rows[i].children.length !== ths.length) { ok = false; break; }
        }
      }

      if (ok) {
        labelRows(rows, Array.prototype.map.call(ths, function (th) {
          return th.textContent.replace(/\s+/g, ' ').trim();
        }));
        t.setAttribute('data-mobile', 'stack');
      } else {
        t.setAttribute('data-mobile', 'scroll');
        ensureScrollWrap(t);
      }
    });
  }

  // Multi-column grids declared in page-local <style> blocks (197 of them) or inline styles never
  // collapse on their own. Rather than guess, measure: if a track would render narrower than 150px
  // it is unreadable on a phone, so drop that grid to one column.
  var COLLAPSED = [];
  function collapseGrids() {
    var els = document.querySelectorAll('body *');
    Array.prototype.forEach.call(els, function (el) {
      // A multi-column grid needs at least two children — cheap filter before the costly
      // getComputedStyle call, which is the only way to see page-local <style> declarations.
      if (el.children.length < 2) return;
      if (el.hasAttribute('data-grid-collapsed')) return;
      var cs = getComputedStyle(el);
      if (cs.display !== 'grid' && cs.display !== 'inline-grid') return;
      var tracks = cs.gridTemplateColumns.split(' ').filter(Boolean);
      var narrowest = Math.min.apply(null, tracks.map(parseFloat).filter(function (n) { return !isNaN(n); }));
      // Two ways a grid fails on a phone: tracks too narrow to read, or the grid wider than its
      // parent. The second bites even a single-column grid, because `1fr` means minmax(auto,1fr)
      // — the track refuses to shrink below its content's min-content width and pushes the page
      // sideways. minmax(0,1fr) plus min-width:0 on the children removes that floor.
      var overflows = el.scrollWidth > el.clientWidth + 1 ||
        (el.parentElement && el.getBoundingClientRect().width > el.parentElement.getBoundingClientRect().width + 1);
      var tooNarrow = tracks.length >= 2 && isFinite(narrowest) && narrowest < 150;
      if (!overflows && !tooNarrow) return;
      el.setAttribute('data-grid-collapsed', el.style.gridTemplateColumns || '');
      el.style.setProperty('grid-template-columns', 'minmax(0,1fr)', 'important');
      Array.prototype.forEach.call(el.children, function (c) { c.style.setProperty('min-width', '0', 'important'); });
      COLLAPSED.push(el);
    });
  }
  function restoreGrids() {
    COLLAPSED.forEach(function (el) {
      var orig = el.getAttribute('data-grid-collapsed');
      el.style.removeProperty('grid-template-columns');
      if (orig) el.style.gridTemplateColumns = orig;
      Array.prototype.forEach.call(el.children, function (c) { c.style.removeProperty('min-width'); });
      el.removeAttribute('data-grid-collapsed');
    });
    COLLAPSED = [];
  }

  // Button-like links. Pages define chips, pills and CTA links with their own classes and their
  // own padding, so no selector list would catch them all. Measure instead: anything that renders
  // as a block/inline-block/flex link is a button and needs 44px. Links that compute to
  // display:inline are running prose and are left alone.
  var TAPPED = [];
  function enforceTapTargets() {
    var els = document.querySelectorAll('a[href],button');
    Array.prototype.forEach.call(els, function (el) {
      if (el.closest('.hub-nav') || el.hasAttribute('data-tap-fixed')) return;
      var cs = getComputedStyle(el);
      if (cs.display === 'inline' || cs.display === 'none') return;
      var r = el.getBoundingClientRect();
      if (!r.height || r.height >= 44) return;
      el.setAttribute('data-tap-fixed', '');
      el.style.setProperty('min-height', '44px', 'important');
      // Centre the label in its new box, but only for simple inline content — turning a link that
      // wraps block children into a flex row would rearrange the page.
      if (cs.display === 'inline-block' || cs.display === 'inline-flex') {
        el.style.setProperty('display', 'inline-flex', 'important');
        el.style.setProperty('align-items', 'center', 'important');
      }
      TAPPED.push(el);
    });
  }
  function restoreTapTargets() {
    TAPPED.forEach(function (el) {
      el.style.removeProperty('min-height');
      el.style.removeProperty('align-items');
      if (el.style.display === 'inline-flex') el.style.removeProperty('display');
      el.removeAttribute('data-tap-fixed');
    });
    TAPPED = [];
  }

  // Single-line flex rows (breadcrumb chips, tag strips, badge rows) overflow instead of wrapping.
  // Wrapping is always preferable to a sideways-scrolling strip on a phone.
  var WRAPPED = [];
  function wrapOverflowingRows() {
    var els = document.querySelectorAll('body *');
    Array.prototype.forEach.call(els, function (el) {
      if (el.children.length < 2 || el.hasAttribute('data-row-wrapped')) return;
      if (el.closest('.hub-nav')) return;
      var cs = getComputedStyle(el);
      if (cs.display !== 'flex' && cs.display !== 'inline-flex') return;
      // Row containers only. Allowing wrap on a COLUMN container makes it spill into extra
      // columns to the right — the exact horizontal overflow this pass exists to remove.
      if (cs.flexDirection.indexOf('row') !== 0) return;
      if (cs.flexWrap !== 'nowrap') return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      el.setAttribute('data-row-wrapped', '');
      el.style.setProperty('flex-wrap', 'wrap', 'important');
      WRAPPED.push(el);
    });
  }
  function restoreRows() {
    WRAPPED.forEach(function (el) {
      el.style.removeProperty('flex-wrap');
      el.removeAttribute('data-row-wrapped');
    });
    WRAPPED = [];
  }

  // Last line of defence. Anything still wider than the screen after the passes above is doing it
  // via a hard min-width or white-space:nowrap set in a page's own <style>. Relax those two
  // properties on the offenders only — measured, so pages that already fit are never touched.
  // Content inside a clipping ancestor (a .table-scroll) is skipped: it is meant to be wide.
  var RELAXED = [];
  function relaxOverflowing() {
    var vw = document.documentElement.clientWidth;
    var els = document.querySelectorAll('body *');
    Array.prototype.forEach.call(els, function (el) {
      if (el.hasAttribute('data-relaxed') || el.closest('.hub-nav') || el.closest('.nav-collapse')) return;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 1) return;
      for (var a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        var acs = getComputedStyle(a);
        if (/hidden|auto|scroll|clip/.test(acs.overflowX)) return;
      }
      var cs = getComputedStyle(el);
      var touched = false;
      if (cs.whiteSpace === 'nowrap') { el.style.setProperty('white-space', 'normal', 'important'); touched = true; }
      if (parseFloat(cs.minWidth) > 0) { el.style.setProperty('min-width', '0', 'important'); touched = true; }
      if (touched) { el.setAttribute('data-relaxed', ''); RELAXED.push(el); }
    });
  }
  function restoreRelaxed() {
    RELAXED.forEach(function (el) {
      el.style.removeProperty('white-space');
      el.style.removeProperty('min-width');
      el.removeAttribute('data-relaxed');
    });
    RELAXED = [];
  }

  var mq = window.matchMedia(MOBILE);
  function apply() {
    if (mq.matches) {
      stackTables(); collapseGrids(); wrapOverflowingRows(); enforceTapTargets();
      relaxOverflowing(); // must run last — it reacts to whatever the earlier passes left over
    } else {
      restoreGrids(); restoreRows(); restoreTapTargets(); restoreRelaxed();
    }
  }

  // Several pages (delivery-tracker, dashboards) build their tables from JSON after load, so a
  // one-shot pass would miss them. Watch for late-arriving tables and re-run, debounced.
  var pending = null;
  function schedule() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; apply(); }, 120);
  }

  function init() {
    apply();
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'TABLE' || n.tagName === 'TR' || n.tagName === 'TBODY' || n.querySelector) { schedule(); return; }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });

    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// Person switcher — used by the nav (kept global so existing pages keep working).
function togglePerson(name, el) {
  var body = document.body;
  var btns = document.querySelectorAll('.person-btn');
  if (body.getAttribute('data-person') === name) {
    body.removeAttribute('data-person');
    btns.forEach(function (b) { b.className = 'person-btn'; });
  } else {
    body.setAttribute('data-person', name);
    btns.forEach(function (b) { b.className = 'person-btn'; });
    el.classList.add('active-' + name);
  }
}
