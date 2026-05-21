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
  var html =
    '<nav class="hub-nav">' +
      '<a class="nav-logo" href="' + base + 'index.html" style="text-decoration:none;">' +
        '<div class="nav-logo-mark">B</div>' +
        '<div class="nav-brand">BPP <span>Tools</span></div>' +
      '</a>' +
      '<div class="nav-tabs">' + tabsHtml + '</div>' +
      searchHtml +
      '<div class="nav-people">' +
        '<button class="person-btn" onclick="togglePerson(\'daunte\',this)">Daunte</button>' +
        '<button class="person-btn" onclick="togglePerson(\'kenny\',this)">Kenny</button>' +
        '<button class="person-btn" onclick="togglePerson(\'eli\',this)">Eli</button>' +
      '</div>' +
    '</nav>';
  var mount = document.getElementById('hub-nav');
  if (mount) mount.outerHTML = html;

  // -- Search --
  var pages = [];
  var activeIdx = -1;
  var currentResults = [];

  var input = document.getElementById('nav-search-input');
  var dropdown = document.getElementById('nav-search-dropdown');

  fetch(base + 'data/search-index.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && Array.isArray(d.pages)) pages = d.pages; })
    .catch(function () { /* silent — search just won't return results */ });

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
