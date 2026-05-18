// BPP Tools Hub — shared navigation. Inject with: <div id="hub-nav"></div><script src="<path>/js/nav.js" data-page="home"></script>
(function () {
  var script = document.currentScript;
  var page = (script && script.getAttribute('data-page')) || '';
  // Depth: pages in /pages/ need '../' to reach root; index.html is at root.
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
  var html =
    '<nav class="hub-nav">' +
      '<a class="nav-logo" href="' + base + 'index.html" style="text-decoration:none;">' +
        '<div class="nav-logo-mark">B</div>' +
        '<div class="nav-brand">BPP <span>Tools</span></div>' +
      '</a>' +
      '<div class="nav-tabs">' + tabsHtml + '</div>' +
      '<div class="nav-people">' +
        '<button class="person-btn" onclick="togglePerson(\'daunte\',this)">Daunte</button>' +
        '<button class="person-btn" onclick="togglePerson(\'kenny\',this)">Kenny</button>' +
        '<button class="person-btn" onclick="togglePerson(\'eli\',this)">Eli</button>' +
      '</div>' +
    '</nav>';
  var mount = document.getElementById('hub-nav');
  if (mount) mount.outerHTML = html;
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
