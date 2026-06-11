/*!
 * r26-fx.js — buildwithbpp.com 2026 redesign experience layer
 * Self-mounting: attach as a hosted page script (footer) on the r26 redesign
 * pages only. Pairs with the registered `r26motion` script (Lenis smooth
 * scroll + scroll reveals + count-up) and does NOT re-init any of that.
 *
 * What it adds:
 *  - Home hero: vanilla 2D-canvas faux-3D node-network in [data-hero-3d] —
 *    8 navy/steel nodes + thin gold lines assemble (~1.2s), then slow orbit
 *    with a faint gold pulse. NO WebGL on the home page. Mobile and
 *    reduced-motion render one static assembled frame; no-JS keeps the CSS
 *    stand-in. ~6KB, no dependencies.
 *  - Subhero 3D (Three.js, lazy ESM import, desktop only):
 *      about -> node-constellation sphere behind .r26-subhero
 *      packages/booking/referral -> sparse ambient constellation in subhero
 *  - Home H1: line-by-line GSAP SplitText reveal (reuses the gsap that
 *    r26motion loads; CSS word reveal as fallback).
 *  - White BPP monogram injected beside the nav/footer wordmarks
 *  - Interactive layer (all pages): FAQ accordion (answers open by default),
 *    mobile menu, magnetic buttons ([data-magnetic]), 3D card tilt + gold
 *    sheen, custom cursor, scroll parallax, nav scroll state, CTA glow,
 *    link underline draw-ins.
 *  - Safety net: repairs href="#" nav/CTA links on the home redesign page.
 *
 * Guards: prefers-reduced-motion disables all motion (accordion + menu stay,
 * instant). Coarse pointers skip cursor/tilt/magnetic. <768px skips WebGL.
 */
(function () {
  'use strict';
  if (window.__r26fx) return;
  window.__r26fx = 1;

  var d = document;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(pointer: fine)').matches;
  var PATH = location.pathname;
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

  var NAVY = 0x044771, NAVY_D = 0x033359, GOLD = 0xF1BE5C, STEEL = 0x5987A5;

  /* ---------------------------------------------------------------- CSS */
  var css = [
    /* FAQ accordion */
    '.r26x-q{cursor:pointer;position:relative;padding-right:2.4rem;-webkit-user-select:none;user-select:none;outline-offset:4px}',
    '.r26x-q:focus-visible{outline:2px solid #F1BE5C}',
    '.r26x-chev{position:absolute;right:.1rem;top:50%;width:1.2rem;height:1.2rem;margin-top:-.6rem;transition:transform .45s cubic-bezier(.16,1,.3,1)}',
    '.r26x-chev::before,.r26x-chev::after{content:"";position:absolute;left:50%;top:50%;background:#F1BE5C;border-radius:2px}',
    '.r26x-chev::before{width:14px;height:2px;transform:translate(-50%,-50%)}',
    '.r26x-chev::after{width:2px;height:14px;transform:translate(-50%,-50%)}',
    '.r26x-open .r26x-chev{transform:rotate(45deg)}',
    '.r26x-awrap{overflow:hidden;height:0;opacity:0;transition:height .5s cubic-bezier(.16,1,.3,1),opacity .4s ease}',
    '.r26x-open .r26x-awrap{opacity:1}',
    /* nav scroll state + underline draw */
    '.r26-nav{transition:box-shadow .35s ease,background-color .35s ease}',
    '.r26-nav.r26x-scrolled{background-color:rgba(3,51,89,.94)!important;box-shadow:0 12px 32px rgba(2,30,52,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}',
    '.r26-nav-link{position:relative}',
    '.r26-nav-link::after{content:"";position:absolute;left:0;bottom:-5px;height:2px;width:100%;background:#F1BE5C;transform:scaleX(0);transform-origin:100% 50%;transition:transform .35s cubic-bezier(.16,1,.3,1)}',
    '.r26-nav-link:hover::after,.r26-nav-link.w--current::after{transform:scaleX(1);transform-origin:0 50%}',
    '.r26-footer-link{position:relative}',
    '.r26-footer-link::after{content:"";position:absolute;left:0;bottom:-3px;height:1px;width:100%;background:#F1BE5C;transform:scaleX(0);transform-origin:100% 50%;transition:transform .3s cubic-bezier(.16,1,.3,1)}',
    '.r26-footer-link:hover::after{transform:scaleX(1);transform-origin:0 50%}',
    /* mobile menu */
    '.r26x-burger{display:none;width:44px;height:44px;border:0;background:transparent;cursor:pointer;position:relative;z-index:1001;padding:0;margin-left:auto}',
    '.r26x-burger span{position:absolute;left:10px;right:10px;height:2px;border-radius:2px;background:#fff;transition:transform .4s cubic-bezier(.16,1,.3,1),opacity .3s,top .4s cubic-bezier(.16,1,.3,1)}',
    '.r26x-burger span:nth-child(1){top:16px}.r26x-burger span:nth-child(2){top:22px}.r26x-burger span:nth-child(3){top:28px}',
    '.r26x-burger.r26x-on span:nth-child(1){top:22px;transform:rotate(45deg);background:#F1BE5C}',
    '.r26x-burger.r26x-on span:nth-child(2){opacity:0}',
    '.r26x-burger.r26x-on span:nth-child(3){top:22px;transform:rotate(-45deg);background:#F1BE5C}',
    /* mobile: burger replaces the pill CTA (menu carries Book a Call); clip page-wide x-overflow */
    '@media (max-width:767px){.r26x-burger{display:block}.r26-nav-cta{display:none}html{overflow-x:clip}}',
    '.r26x-menu{position:fixed;inset:0;z-index:1000;background:linear-gradient(160deg,#033359 0%,#044771 100%);display:flex;flex-direction:column;justify-content:center;padding:6rem 2.25rem 3rem;opacity:0;visibility:hidden;transition:opacity .4s ease,visibility 0s linear .4s}',
    '.r26x-menu.r26x-on{opacity:1;visibility:visible;transition:opacity .4s ease}',
    '.r26x-menu a{font-family:Montserrat,sans-serif;color:#fff;text-decoration:none;font-size:1.75rem;font-weight:700;padding:.65rem 0;letter-spacing:-.01em;transform:translateY(18px);opacity:0;transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .45s ease}',
    '.r26x-menu.r26x-on a{transform:none;opacity:1}',
    '.r26x-menu .r26x-menu-cta{display:inline-block;margin-top:1.5rem;background:#F1BE5C;color:#033359;border-radius:999px;padding:.9rem 1.9rem;font-size:1.05rem;text-align:center}',
    '.r26x-menu .r26x-menu-tag{color:#5987A5;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;margin-bottom:1.25rem;font-family:Montserrat,sans-serif;font-weight:600}',
    'body.r26x-lock{overflow:hidden}',
    /* card tilt + sheen */
    '.r26x-tilt{will-change:transform}',
    '.r26x-sheen{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s ease;background:radial-gradient(240px circle at var(--r26x-x,50%) var(--r26x-y,50%),rgba(241,190,92,.16),transparent 65%)}',
    '.r26x-tilt:hover .r26x-sheen{opacity:1}',
    /* custom cursor */
    '.r26x-dot,.r26x-ring{position:fixed;top:0;left:0;border-radius:50%;pointer-events:none;z-index:2147483000;opacity:0}',
    '.r26x-dot{width:6px;height:6px;background:#F1BE5C}',
    '.r26x-ring{width:34px;height:34px;border:1.5px solid rgba(241,190,92,.65);transition:width .25s ease,height .25s ease,border-color .25s ease,background-color .25s ease}',
    '.r26x-ring.r26x-hov{width:52px;height:52px;border-color:#F1BE5C;background:rgba(241,190,92,.08)}',
    'html.r26x-cur,html.r26x-cur *{cursor:none!important}',
    /* brand mark (white BPP monogram) in nav, footer, mobile menu */
    '.r26x-brandmark{height:30px;width:auto;display:block}',
    '.r26x-brandmark-f{height:36px;width:auto;display:block}',
    '.r26x-brandmark-m{height:24px;width:auto;display:inline-block;vertical-align:middle;margin-right:10px}',
    '.r26-nav-brand{display:flex;align-items:center;grid-column-gap:10px;gap:10px}',
    '.r26-footer-brand{display:flex;align-items:center;grid-column-gap:12px;gap:12px}',
    /* split-text reveal */
    '.r26x-w{display:inline-block;overflow:hidden;vertical-align:bottom}',
    '.r26x-wi{display:inline-block;transform:translateY(114%);transition:transform .95s cubic-bezier(.16,1,.3,1)}',
    '.r26x-go .r26x-wi{transform:none}',
    /* testimonial slider */
    '.r26x-slider-vp{overflow:hidden}',
    '.r26x-slider-track{display:flex;flex-direction:row;grid-row-gap:0;gap:0;transition:transform .65s cubic-bezier(.16,1,.3,1)}',
    '[data-r26-slider] .r26-slide{flex:0 0 100%;min-width:100%;box-sizing:border-box}',
    '.r26x-slider-nav{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:32px}',
    '.r26x-slider-btn{width:46px;height:46px;border-radius:50%;border:1.5px solid #5987A5;background:transparent;color:#044771;font-size:1.1rem;cursor:pointer;transition:border-color .25s ease,background-color .25s ease,color .25s ease}',
    '.r26x-slider-btn:hover{border-color:#F1BE5C;background:#F1BE5C;color:#033359}',
    '.r26x-slider-btn:focus-visible{outline:2px solid #F1BE5C;outline-offset:3px}',
    '.r26x-slider-dots{display:flex;gap:9px}',
    '.r26x-slider-dot{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:#C9D6E0;cursor:pointer;transition:background-color .25s ease,transform .25s ease}',
    '.r26x-slider-dot.r26x-on{background:#F1BE5C;transform:scale(1.25)}',
    /* youtube facade */
    '.r26x-video{position:relative;aspect-ratio:16/9;border-radius:16px;overflow:hidden;background-size:cover;background-position:center;cursor:pointer;box-shadow:0 18px 48px rgba(2,30,52,.28)}',
    '.r26x-video::after{content:"";position:absolute;inset:0;background:rgba(3,51,89,.28);transition:background .3s ease}',
    '.r26x-video:hover::after{background:rgba(3,51,89,.12)}',
    '.r26x-video-play{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;background:#F1BE5C;z-index:2;display:flex;align-items:center;justify-content:center;transition:transform .3s cubic-bezier(.34,1.56,.64,1);box-shadow:0 10px 30px rgba(2,30,52,.35)}',
    '.r26x-video:hover .r26x-video-play{transform:scale(1.08)}',
    '.r26x-video-play span{display:block;width:0;height:0;border-left:22px solid #033359;border-top:13px solid transparent;border-bottom:13px solid transparent;margin-left:6px}',
    '.r26x-video-frame{position:absolute;inset:0;width:100%;height:100%;border:0}',
    '.r26x-video-on{cursor:default}.r26x-video-on::after{display:none}',
    /* team linkedin button hover */
    '.r26-team-li{transition:border-color .25s ease,background-color .25s ease,color .25s ease}',
    '.r26-team-li:hover{border-color:#F1BE5C!important;background-color:#F1BE5C;color:#033359!important}',
    /* CTA ambient glow */
    '.r26-cta{position:relative;overflow:hidden}',
    '.r26x-glow{position:absolute;width:55%;padding-bottom:55%;border-radius:50%;top:-25%;left:-12%;pointer-events:none;background:radial-gradient(circle,rgba(241,190,92,.13),transparent 65%);animation:r26xDrift 16s ease-in-out infinite alternate}',
    '@keyframes r26xDrift{from{transform:translate(0,0) scale(1)}to{transform:translate(70%,35%) scale(1.3)}}',
    /* 3D mounts */
    '.r26x-c3d{position:absolute;inset:0;z-index:1}',
    '.r26x-3d-live .r26-block,.r26x-3d-live .r26-node{display:none}',
    '.r26-subhero{position:relative;overflow:hidden}',
    '.r26-subhero-inner{position:relative;z-index:1}',
    '.r26x-sub3d{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity 1.4s ease}',
    '.r26x-sub3d.r26x-in{opacity:1}',
    /* reduced motion: kill our transitions/animations */
    '@media (prefers-reduced-motion:reduce){.r26x-awrap,.r26x-chev,.r26x-wi,.r26x-menu,.r26x-menu a,.r26-nav-link::after,.r26-footer-link::after{transition:none!important}.r26x-glow{animation:none!important}.r26x-wi{transform:none!important}}'
  ].join('');

  var style = d.createElement('style');
  style.id = 'r26x-css';
  style.textContent = css;
  d.head.appendChild(style);

  /* ----------------------------------------------- link repair (home) */
  function repairLinks() {
    var map = [
      [/^home$/, '/home-redesign'],
      [/packages/, '/packages-redesign'],
      [/^about$/, '/about-redesign'],
      [/referral/, '/referral-redesign']
    ];
    d.querySelectorAll('a[href="#"]').forEach(function (a) {
      var t = (a.textContent || '').trim().toLowerCase();
      for (var i = 0; i < map.length; i++) {
        if (map[i][0].test(t)) { a.setAttribute('href', map[i][1]); return; }
      }
      if (/book|call|start with|contact/.test(t)) a.setAttribute('href', '/booking-redesign');
    });
  }

  /* -------------------------------------------------- imgraw -> img fix
     whtml_builder publishes raw <img> tags as non-rendering <imgraw>
     elements with the src moved to data-raw-src. Convert them back. */
  function fixRawImages() {
    d.querySelectorAll('imgraw[data-raw-src]').forEach(function (raw) {
      var img = d.createElement('img');
      img.src = raw.getAttribute('data-raw-src');
      var cls = (raw.getAttribute('class') || '').split(/\s+/);
      cls = cls.filter(function (c, i) { return c && cls.indexOf(c) === i; });
      if (cls.length) img.className = cls.join(' ');
      if (raw.getAttribute('alt') !== null) img.alt = raw.getAttribute('alt');
      if (raw.getAttribute('loading')) img.loading = raw.getAttribute('loading');
      raw.parentNode.replaceChild(img, raw);
    });
  }

  /* --------------------------------------------------- testimonial slider
     Progressive enhancement over a vertical stack of .r26-slide cards inside
     [data-r26-slider]: turns it into a one-per-view slider with arrows,
     dots, autoplay (pause on hover/hidden), swipe. Reduced motion: no
     autoplay, instant jumps. */
  function slider() {
    d.querySelectorAll('[data-r26-slider]').forEach(function (root) {
      var slides = root.querySelectorAll('.r26-slide');
      if (slides.length < 2) return;
      var track = slides[0].parentNode;
      var vp = d.createElement('div');
      vp.className = 'r26x-slider-vp';
      track.parentNode.insertBefore(vp, track);
      vp.appendChild(track);
      track.classList.add('r26x-slider-track');
      if (REDUCED) track.style.transition = 'none';

      var nav = d.createElement('div');
      nav.className = 'r26x-slider-nav';
      var prev = d.createElement('button');
      prev.className = 'r26x-slider-btn';
      prev.setAttribute('aria-label', 'Previous testimonial');
      prev.innerHTML = '&#8592;';
      var dots = d.createElement('div');
      dots.className = 'r26x-slider-dots';
      var next = d.createElement('button');
      next.className = 'r26x-slider-btn';
      next.setAttribute('aria-label', 'Next testimonial');
      next.innerHTML = '&#8594;';
      nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
      vp.parentNode.insertBefore(nav, vp.nextSibling);

      var dotEls = [];
      slides.forEach(function (_, i) {
        var b = d.createElement('button');
        b.className = 'r26x-slider-dot';
        b.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
        b.addEventListener('click', function () { go(i, true); });
        dots.appendChild(b);
        dotEls.push(b);
      });

      var idx = 0, timer = null;
      function go(i, manual) {
        idx = (i + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + idx * 100 + '%)';
        dotEls.forEach(function (b, j) { b.classList.toggle('r26x-on', j === idx); });
        if (manual) restart();
      }
      prev.addEventListener('click', function () { go(idx - 1, true); });
      next.addEventListener('click', function () { go(idx + 1, true); });
      function restart() {
        if (timer) clearInterval(timer);
        if (REDUCED) return;
        timer = setInterval(function () {
          if (!d.hidden) go(idx + 1);
        }, 6500);
      }
      root.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
      root.addEventListener('mouseleave', restart);
      /* swipe */
      var sx = null;
      vp.addEventListener('pointerdown', function (e) { sx = e.clientX; }, { passive: true });
      vp.addEventListener('pointerup', function (e) {
        if (sx === null) return;
        var dx = e.clientX - sx; sx = null;
        if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1), true);
      }, { passive: true });
      go(0);
      restart();
    });
  }

  /* ------------------------------------------------ YouTube facade
     [data-r26-video="<id>"] becomes a poster + gold play button; the real
     iframe only loads on click (Core Web Vitals friendly). */
  function videoFacade() {
    d.querySelectorAll('[data-r26-video]').forEach(function (el) {
      var id = el.getAttribute('data-r26-video');
      if (!id) return;
      el.classList.add('r26x-video');
      el.style.backgroundImage = 'url(https://img.youtube.com/vi/' + id + '/maxresdefault.jpg)';
      var btn = d.createElement('div');
      btn.className = 'r26x-video-play';
      btn.innerHTML = '<span></span>';
      el.appendChild(btn);
      function play() {
        var f = d.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
        f.allow = 'autoplay; encrypted-media; picture-in-picture';
        f.allowFullscreen = true;
        f.title = el.getAttribute('aria-label') || 'Video';
        f.className = 'r26x-video-frame';
        el.innerHTML = '';
        el.appendChild(f);
        el.classList.add('r26x-video-on');
      }
      el.addEventListener('click', play, { once: true });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
      });
    });
  }

  /* ------------------------------------------------- brand logo inject */
  var BRAND_MARK = 'https://cdn.prod.website-files.com/699f9483b49696115c2aff2c/6a2ad43e91db0ec6e12dc177_bpp-mark-white-2.png';
  function brandLogo() {
    [['.r26-nav-brand', 'r26x-brandmark'], ['.r26-footer-brand', 'r26x-brandmark-f']].forEach(function (pair) {
      d.querySelectorAll(pair[0]).forEach(function (el) {
        var img = d.createElement('img');
        img.src = BRAND_MARK;
        img.alt = '';
        img.className = pair[1];
        el.insertBefore(img, el.firstChild);
      });
    });
  }

  /* ------------------------------------------------------ FAQ accordion */
  function accordion() {
    var lists = d.querySelectorAll('.r26-faq-list');
    lists.forEach(function (list) {
      var items = Array.prototype.filter.call(list.children, function (el) {
        return /(^|\s)r26-faq-item/.test(el.className);
      });
      items.forEach(function (item, idx) {
        var q = item.querySelector('.r26-faq-q2');
        var a = item.querySelector('p');
        if (!q || !a) return;
        var wrap = d.createElement('div');
        wrap.className = 'r26x-awrap';
        wrap.id = 'r26x-a-' + Math.random().toString(36).slice(2, 8);
        a.parentNode.insertBefore(wrap, a);
        wrap.appendChild(a);
        var chev = d.createElement('span');
        chev.className = 'r26x-chev';
        chev.setAttribute('aria-hidden', 'true');
        q.classList.add('r26x-q');
        q.appendChild(chev);
        q.setAttribute('role', 'button');
        q.setAttribute('tabindex', '0');
        q.setAttribute('aria-controls', wrap.id);

        function setOpen(open, instant) {
          item.classList.toggle('r26x-open', open);
          q.setAttribute('aria-expanded', open ? 'true' : 'false');
          if (REDUCED || instant) {
            wrap.style.transition = 'none';
            wrap.style.height = open ? 'auto' : '0px';
            wrap.style.opacity = open ? '1' : '0';
            requestAnimationFrame(function () { wrap.style.transition = ''; });
            return;
          }
          if (open) {
            wrap.style.height = a.scrollHeight + 'px';
            wrap.addEventListener('transitionend', function te(e) {
              if (e.propertyName !== 'height') return;
              if (item.classList.contains('r26x-open')) wrap.style.height = 'auto';
              wrap.removeEventListener('transitionend', te);
            });
          } else {
            wrap.style.height = a.scrollHeight + 'px';
            void wrap.offsetHeight; /* reflow so the 0 transition runs from px */
            wrap.style.height = '0px';
          }
        }
        function toggle() { setOpen(!item.classList.contains('r26x-open')); }
        q.addEventListener('click', toggle);
        q.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
        setOpen(true, true); /* all answers visible by default; still collapsible */
      });
    });
  }

  /* ------------------------------------------------------- mobile menu */
  function mobileMenu() {
    var inner = d.querySelector('.r26-nav-inner');
    if (!inner) return;
    var burger = d.createElement('button');
    burger.className = 'r26x-burger';
    burger.setAttribute('aria-label', 'Open menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';
    inner.appendChild(burger);

    var menu = d.createElement('nav');
    menu.className = 'r26x-menu';
    menu.setAttribute('aria-label', 'Mobile');
    var tag = d.createElement('div');
    tag.className = 'r26x-menu-tag';
    var tagMark = d.createElement('img');
    tagMark.src = BRAND_MARK;
    tagMark.alt = '';
    tagMark.className = 'r26x-brandmark-m';
    tag.appendChild(tagMark);
    tag.appendChild(d.createTextNode('Business Plans Plus'));
    menu.appendChild(tag);
    var links = d.querySelectorAll('.r26-nav-links a');
    links.forEach(function (a, i) {
      var c = d.createElement('a');
      c.href = a.getAttribute('href');
      c.textContent = a.textContent;
      c.style.transitionDelay = (0.05 + i * 0.06) + 's';
      menu.appendChild(c);
    });
    var cta = d.querySelector('.r26-nav-cta');
    if (cta) {
      var c2 = d.createElement('a');
      c2.href = cta.getAttribute('href');
      c2.textContent = cta.textContent;
      c2.className = 'r26x-menu-cta';
      c2.style.transitionDelay = (0.05 + links.length * 0.06) + 's';
      menu.appendChild(c2);
    }
    d.body.appendChild(menu);

    function set(open) {
      burger.classList.toggle('r26x-on', open);
      menu.classList.toggle('r26x-on', open);
      d.body.classList.toggle('r26x-lock', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    burger.addEventListener('click', function () {
      set(!menu.classList.contains('r26x-on'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') set(false);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') set(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 767) set(false);
    });
  }

  /* --------------------------------------------------- nav scroll state */
  function navState() {
    var nav = d.querySelector('.r26-nav');
    if (!nav) return;
    var on = false;
    function check() {
      var s = window.scrollY > 12;
      if (s !== on) { on = s; nav.classList.toggle('r26x-scrolled', s); }
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ----------------------------------------------------- magnetic pull */
  function magnetic() {
    if (REDUCED || !FINE) return;
    d.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var r = null;
      el.addEventListener('mouseenter', function () {
        r = el.getBoundingClientRect();
        el.style.transition = 'transform .18s ease-out';
      });
      el.addEventListener('mousemove', function (e) {
        if (!r) r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var m = 8 / Math.max(r.width / 2, 1);
        el.style.transform = 'translate(' + Math.max(-8, Math.min(8, dx * m * 2)) + 'px,' +
          Math.max(-6, Math.min(6, dy * 0.18)) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
        el.style.transform = '';
        r = null;
      });
    });
  }

  /* ------------------------------------------------- card tilt + sheen */
  function tilt() {
    if (REDUCED || !FINE) return;
    var cards = d.querySelectorAll('.r26-pillar,.r26-tile,.r26-price-card,.r26-testi-card,.r26-steps-grid > div');
    cards.forEach(function (card) {
      card.classList.add('r26x-tilt');
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      var sheen = d.createElement('div');
      sheen.className = 'r26x-sheen';
      card.appendChild(sheen);
      var rect = null, raf = 0, lx = 0, ly = 0;
      function apply() {
        raf = 0;
        var px = lx / rect.width, py = ly / rect.height;
        card.style.transform = 'translateY(-4px) perspective(900px) rotateX(' +
          ((0.5 - py) * 5).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 6).toFixed(2) + 'deg)';
        card.style.setProperty('--r26x-x', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--r26x-y', (py * 100).toFixed(1) + '%');
      }
      card.addEventListener('mouseenter', function () {
        rect = card.getBoundingClientRect();
        card.style.transition = 'transform .25s ease-out';
        setTimeout(function () { card.style.transition = 'transform .08s linear'; }, 260);
      });
      card.addEventListener('mousemove', function (e) {
        if (!rect) rect = card.getBoundingClientRect();
        lx = e.clientX - rect.left; ly = e.clientY - rect.top;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
        card.style.transform = '';
        rect = null;
      });
    });
  }

  /* ------------------------------------------------------ custom cursor */
  function cursor() {
    if (REDUCED || !FINE || !window.matchMedia('(hover: hover)').matches) return;
    var dot = d.createElement('div'); dot.className = 'r26x-dot'; dot.setAttribute('aria-hidden', 'true');
    var ring = d.createElement('div'); ring.className = 'r26x-ring'; ring.setAttribute('aria-hidden', 'true');
    d.body.appendChild(dot); d.body.appendChild(ring);
    var x = -100, y = -100, rx = -100, ry = -100, seen = false;
    d.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!seen) {
        seen = true; rx = x; ry = y;
        dot.style.opacity = '1'; ring.style.opacity = '1';
        d.documentElement.classList.add('r26x-cur');
        loop();
      }
    }, { passive: true });
    d.addEventListener('mouseleave', function () {
      d.documentElement.classList.remove('r26x-cur');
      dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    d.addEventListener('mouseenter', function () {
      if (seen) { d.documentElement.classList.add('r26x-cur'); dot.style.opacity = '1'; ring.style.opacity = '1'; }
    });
    var HOT = 'a,button,[data-magnetic],.r26x-q,.r26x-burger,input,textarea,select';
    d.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(HOT)) ring.classList.add('r26x-hov');
    });
    d.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(HOT)) ring.classList.remove('r26x-hov');
    });
    function loop() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      dot.style.transform = 'translate(' + (x - 3) + 'px,' + (y - 3) + 'px)';
      ring.style.transform = 'translate(' + (rx - ring.offsetWidth / 2) + 'px,' + (ry - ring.offsetHeight / 2) + 'px)';
      requestAnimationFrame(loop);
    }
  }

  /* ------------------------------------------------ split-text reveal */
  /* Home H1: line-by-line via GSAP SplitText (gsap is already CDN-loaded by
     r26motion — poll for it, never double-load gsap itself). Falls back to
     the CSS word reveal if gsap/SplitText don't arrive. Subhero pages keep
     the CSS word reveal. */
  function splitReveal() {
    if (REDUCED) return;
    var hero = d.querySelector('.r26-hero-h1');
    if (hero) {
      if (hero.dataset.r26xSplit) return;
      hero.dataset.r26xSplit = '1';
      var waited = 0;
      (function poll() {
        if (window.gsap) {
          var s = d.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/SplitText.min.js';
          s.onload = function () {
            try {
              window.gsap.registerPlugin(window.SplitText);
              var split = new window.SplitText(hero, { type: 'lines', linesClass: 'r26x-line' });
              split.lines.forEach(function (ln) {
                var wrap = d.createElement('div');
                wrap.style.overflow = 'hidden';
                ln.parentNode.insertBefore(wrap, ln);
                wrap.appendChild(ln);
              });
              window.gsap.from(split.lines, { yPercent: 112, duration: 0.9, ease: 'expo.out', stagger: 0.07 });
            } catch (e) { delete hero.dataset.r26xSplit; cssWordReveal(hero); }
          };
          s.onerror = function () { delete hero.dataset.r26xSplit; cssWordReveal(hero); };
          d.head.appendChild(s);
        } else if ((waited += 80) < 2400) setTimeout(poll, 80);
        else { delete hero.dataset.r26xSplit; cssWordReveal(hero); }
      })();
      return;
    }
    cssWordReveal(d.querySelector('.r26-subhero-h1'));
  }

  function cssWordReveal(el) {
    if (!el || el.dataset.r26xSplit) return;
    el.dataset.r26xSplit = '1';
    var frag = d.createDocumentFragment();
    var i = 0;
    function wrapTok(node) {
      var w = d.createElement('span'); w.className = 'r26x-w';
      var wi = d.createElement('span'); wi.className = 'r26x-wi';
      wi.style.transitionDelay = (i++ * 0.055) + 's';
      wi.appendChild(node);
      w.appendChild(wi);
      return w;
    }
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) frag.appendChild(d.createTextNode(' '));
          else frag.appendChild(wrapTok(d.createTextNode(tok)));
        });
      } else if (n.tagName === 'BR') {
        frag.appendChild(n);
      } else {
        frag.appendChild(wrapTok(n));
      }
    });
    el.textContent = '';
    el.appendChild(frag);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('r26x-go'); });
    });
  }

  /* ---------------------------------------------------------- parallax */
  function parallax() {
    if (REDUCED) return;
    var hv = d.querySelector('.r26-hero-visual');
    var sh = d.querySelector('.r26-subhero-inner');
    if (!hv && !sh) return;
    var raf = 0;
    function apply() {
      raf = 0;
      var s = window.scrollY;
      if (hv && s < window.innerHeight) hv.style.transform = 'translateY(' + (s * -0.08).toFixed(1) + 'px)';
      if (sh && s < window.innerHeight) sh.style.transform = 'translateY(' + (s * 0.12).toFixed(1) + 'px)';
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ----------------------------------------------------------- CTA glow */
  function ctaGlow() {
    d.querySelectorAll('.r26-cta').forEach(function (s) {
      var g = d.createElement('div');
      g.className = 'r26x-glow';
      g.setAttribute('aria-hidden', 'true');
      s.insertBefore(g, s.firstChild);
    });
  }

  /* ========================================================== 3D layer */
  function makeRenderLoop(renderer, host, draw) {
    var active = true, visible = true;
    var io = new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
    }, { rootMargin: '120px' });
    io.observe(host);
    d.addEventListener('visibilitychange', function () { active = !d.hidden; });
    var t0 = performance.now();
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!active || !visible) return;
      draw((now - t0) / 1000);
    })(t0);
  }

  function fitRenderer(THREE, host) {
    var r = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(host.clientWidth, host.clientHeight);
    return r;
  }

  function watchResize(host, renderer, camera) {
    if (!window.ResizeObserver) return;
    new ResizeObserver(function () {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }).observe(host);
  }

  function sceneLights(THREE, scene) {
    scene.add(new THREE.AmbientLight(0xbcd2e2, 0.75));
    var key = new THREE.DirectionalLight(0xffffff, 1.35); key.position.set(5, 8, 6); scene.add(key);
    var fill = new THREE.DirectionalLight(STEEL, 0.5); fill.position.set(-4, 2, -6); scene.add(fill);
    var rim = new THREE.PointLight(GOLD, 1.3, 40); rim.position.set(-6, -3, 6); scene.add(rim);
  }

  /* ============================== Home hero: vanilla-canvas node network.
     A faux-3D lattice of 8 rounded nodes (navy bodies, steel rims) joined by
     thin gold lines assembles itself, then idles in a slow orbit with a faint
     pulse on the gold nodes: "we build the system that runs your business."
     No WebGL, no dependencies. Mobile + reduced-motion render one static
     assembled frame. The CSS stand-in remains the no-JS fallback. */
  function heroNetwork(mount) {
    var STATIC_FRAME = REDUCED || window.innerWidth < 768;
    if (getComputedStyle(mount).position === 'static') mount.style.position = 'relative';
    var canvas = d.createElement('canvas');
    canvas.className = 'r26x-c3d';
    canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(canvas);
    mount.classList.add('r26x-3d-live');
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    function size() {
      W = mount.clientWidth; H = mount.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    size();

    /* lattice: unit-space coords, r = node radius px, gold = active node */
    var defs = [
      { x: 0,     y: 0,     z: 0,    r: 21 },
      { x: 0.62,  y: 0.30,  z: -0.35, r: 13 },
      { x: -0.58, y: 0.38,  z: 0.30,  r: 11 },
      { x: -0.55, y: -0.40, z: -0.25, r: 14 },
      { x: 0.55,  y: -0.38, z: 0.33,  r: 12 },
      { x: 0.05,  y: 0.62,  z: 0.15,  r: 8, gold: true },
      { x: -0.04, y: -0.64, z: -0.12, r: 8, gold: true },
      { x: 0.30,  y: -0.05, z: 0.62,  r: 7, gold: true }
    ];
    var edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 5], [3, 6], [4, 7], [2, 5], [1, 4]];
    var nodes = defs.map(function (n, i) {
      var th = Math.random() * Math.PI * 2;
      return {
        x: n.x, y: n.y, z: n.z, r: n.r, gold: !!n.gold,
        sx: n.x + Math.cos(th) * 1.3, sy: n.y + Math.sin(th) * 1.1, sz: n.z + (Math.random() - 0.5) * 1.6,
        delay: i * 0.08, ph: i * 1.93
      };
    });

    var TILT = -0.18, F = 3.2; /* x-tilt + perspective strength (unit space) */
    function ease(x) { return 1 - Math.pow(1 - x, 4); }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2;
      var scale = Math.min(W, H) * 0.42;
      var rot = STATIC_FRAME ? 0.5 : t * 0.12 + smx * 0.3;
      var tilt = TILT + (STATIC_FRAME ? 0 : smy * 0.12);
      var cosR = Math.cos(rot), sinR = Math.sin(rot);
      var cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      var proj = nodes.map(function (n) {
        var p = STATIC_FRAME ? 1 : Math.min(Math.max((t - 0.1 - n.delay) / 1.2, 0), 1);
        var e = ease(p);
        var x = n.sx + (n.x - n.sx) * e;
        var y = n.sy + (n.y - n.sy) * e;
        var z = n.sz + (n.z - n.sz) * e;
        if (!STATIC_FRAME && p >= 1) y += Math.sin(t * 0.9 + n.ph) * 0.018;
        /* rotate Y then X-tilt */
        var x1 = x * cosR + z * sinR, z1 = -x * sinR + z * cosR;
        var y1 = y * cosT - z1 * sinT, z2 = y * sinT + z1 * cosT;
        var k = F / (F + z2);
        return { sx: cx + x1 * scale * k, sy: cy + y1 * scale * k, k: k, a: e, n: n };
      });
      /* edges: thin gold, alpha gated on both endpoints having arrived */
      ctx.lineWidth = 1;
      for (var i = 0; i < edges.length; i++) {
        var A = proj[edges[i][0]], B = proj[edges[i][1]];
        var a = Math.min(A.a, B.a) * 0.38 * Math.min(A.k, B.k);
        if (a <= 0.01) continue;
        ctx.strokeStyle = 'rgba(241,190,92,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
      }
      /* nodes: back-to-front */
      proj.slice().sort(function (a, b) { return a.k - b.k; }).forEach(function (q) {
        var n = q.n, r = n.r * q.k, alpha = 0.25 + q.a * 0.75;
        if (n.gold) {
          var pulse = STATIC_FRAME ? 0 : Math.sin(t * 2.1 + n.ph) * 0.5 + 0.5;
          var rr = r * (1 + pulse * 0.18);
          ctx.fillStyle = 'rgba(241,190,92,' + (0.10 + pulse * 0.10) * q.a + ')';
          ctx.beginPath(); ctx.arc(q.sx, q.sy, rr * 2.4, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(241,190,92,' + (0.85 * alpha).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(q.sx, q.sy, rr, 0, 6.2832); ctx.fill();
        } else {
          var grad = ctx.createRadialGradient(q.sx - r * 0.35, q.sy - r * 0.35, r * 0.15, q.sx, q.sy, r);
          grad.addColorStop(0, 'rgba(89,135,165,' + alpha.toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(4,71,113,' + alpha.toFixed(3) + ')');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, 6.2832); ctx.fill();
          ctx.strokeStyle = 'rgba(89,135,165,' + (0.55 * alpha).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(q.sx, q.sy, r, 0, 6.2832); ctx.stroke();
        }
      });
    }

    var smx = 0, smy = 0, mx = 0, my = 0;
    if (STATIC_FRAME) { draw(0); }
    else {
      mount.closest('section, body').addEventListener('mousemove', function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      var active = true, visible = true;
      var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: '120px' });
      io.observe(mount);
      d.addEventListener('visibilitychange', function () { active = !d.hidden; });
      var t0 = performance.now();
      (function frame(now) {
        requestAnimationFrame(frame);
        if (!active || !visible) return;
        smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;
        draw((now - t0) / 1000);
      })(t0);
    }
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (!mount.clientWidth) return;
      size();
      if (STATIC_FRAME) draw(0);
    }).observe(mount);
  }

  /* Subhero constellation: networked node-sphere (denser on About) */
  function constellation(THREE, section, opts) {
    var host = d.createElement('div');
    host.className = 'r26x-sub3d';
    section.insertBefore(host, section.firstChild);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, section.clientWidth / Math.max(section.clientHeight, 1), 0.1, 50);
    camera.position.set(0, 0, 6);
    var renderer = fitRenderer(THREE, host);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    var group = new THREE.Group();
    group.position.x = opts.x;
    scene.add(group);

    var R = opts.r, N = opts.n;
    var pts = [];
    for (var i = 0; i < N; i++) {
      var phi = Math.acos(1 - 2 * (i + 0.5) / N);
      var theta = Math.PI * (1 + Math.sqrt(5)) * i;
      pts.push(new THREE.Vector3(
        R * Math.cos(theta) * Math.sin(phi),
        R * Math.sin(theta) * Math.sin(phi),
        R * Math.cos(phi)
      ));
    }
    function pointCloud(list, color, size, opacity) {
      var arr = new Float32Array(list.length * 3);
      list.forEach(function (v, j) { arr.set([v.x, v.y, v.z], j * 3); });
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({
        color: color, size: size, transparent: true, opacity: opacity, sizeAttenuation: true
      }));
    }
    var goldPts = [], steelPts = [];
    pts.forEach(function (v, j) { (j % 4 === 0 ? goldPts : steelPts).push(v); });
    group.add(pointCloud(goldPts, GOLD, 0.11, 0.95));
    group.add(pointCloud(steelPts, 0x9fc0d6, 0.07, 0.75));

    var segs = [];
    var maxD = R * opts.link;
    for (var a = 0; a < N; a++) {
      for (var b2 = a + 1; b2 < N; b2++) {
        if (pts[a].distanceTo(pts[b2]) < maxD) segs.push(pts[a], pts[b2]);
      }
    }
    var larr = new Float32Array(segs.length * 3);
    segs.forEach(function (v, j) { larr.set([v.x, v.y, v.z], j * 3); });
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(larr, 3));
    group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      color: STEEL, transparent: true, opacity: opts.lineOpacity
    })));

    var mx = 0, smx = 0, my = 0, smy = 0;
    section.addEventListener('mousemove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    makeRenderLoop(renderer, section, function (t) {
      smx += (mx - smx) * 0.03; smy += (my - smy) * 0.03;
      group.rotation.y = t * 0.05 + smx * 0.22;
      group.rotation.x = 0.18 + smy * 0.12;
      renderer.render(scene, camera);
    });
    watchResize(host, renderer, camera);
    requestAnimationFrame(function () { host.classList.add('r26x-in'); });
  }

  /* Home hero canvas: cheap enough to run everywhere; mobile/reduced-motion
     get one static assembled frame inside heroNetwork itself. */
  function initHero() {
    var heroMount = d.querySelector('[data-hero-3d]');
    if (!heroMount) return;
    try { heroNetwork(heroMount); }
    catch (e) { /* leave the CSS stand-in in place */ }
  }

  /* Subhero constellations (about/packages/booking/referral) keep Three.js;
     the home page never loads it. */
  function init3D() {
    if (REDUCED || window.innerWidth < 768) return;
    var subhero = d.querySelector('.r26-subhero');
    if (!subhero) return;
    function start() {
      import(THREE_URL).then(function (THREE) {
        try {
          var about = PATH.indexOf('about-redesign') !== -1;
          constellation(THREE, subhero, about
            ? { n: 130, r: 2.3, x: 2.1, link: 0.42, lineOpacity: 0.3 }
            : { n: 80, r: 2.6, x: 2.4, link: 0.4, lineOpacity: 0.18 });
        } catch (e) { /* leave the flat subhero in place */ }
      }).catch(function () { /* CDN unavailable: flat subhero remains */ });
    }
    if (d.readyState === 'complete') setTimeout(start, 50);
    else window.addEventListener('load', function () { setTimeout(start, 50); });
  }

  /* --------------------------------------------------------------- boot */
  function boot() {
    fixRawImages();
    repairLinks();
    brandLogo();
    videoFacade();
    slider();
    accordion();
    mobileMenu();
    navState();
    magnetic();
    tilt();
    cursor();
    splitReveal();
    parallax();
    ctaGlow();
    initHero();
    init3D();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
