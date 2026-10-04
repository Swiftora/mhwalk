/* MHWalk analytics, opt-out model (owner ruling 2026-09-28, replacing the earlier
   consent-first draft at the owner's direction). Analytics loads by default with all
   advertising signals denied; the footer "Analytics choices" link on every page opens
   the choice panel, and "No thanks" stops collection, deletes the GA cookies this site
   set, reloads to the unloaded state, and is remembered on that browser until changed
   (a declined choice never expires on its own). While declined, nothing loads, no
   request leaves the page, and any lingering GA cookies are re-swept on every visit.
   Preference: localStorage "mh_analytics" = {"c":"granted"|"denied","t":ms}; absence
   means the default (on); unreadable storage falls back to the default.
   Events (single manual page_view strategy; enhanced history/outbound collection is
   OFF at the stream): page_view, route_choice_view, route_select, next_stop_click,
   outbound_action. Parameters are bounded values from this site's own markup: slugs,
   route names, merchant ids from the directory's v- anchors. No URLs, queries, user
   text, coordinates, or identifiers are ever sent. debug_mode only with ?mhdebug=1. */
(function () {
  'use strict';
  var GID = document.body.getAttribute('data-ga');
  if (!GID) return;
  var KEY = 'mh_analytics';
  var KIND = document.body.getAttribute('data-mhkind') || 'page';
  var SLUG = document.body.getAttribute('data-mhslug') || '';
  var MAIN = 'https://www.harrisonhistorical.com';

  function readPref() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && (v.c === 'granted' || v.c === 'denied')) return v.c; /* an opt-out never expires on its own */
    } catch (e) { }
    return null; /* no stored choice or unreadable storage: the default applies */
  }
  function writePref(c) {
    try { localStorage.setItem(KEY, JSON.stringify({ c: c, t: Date.now() })); } catch (e) { }
  }

  function canonicalPath() {
    var p = location.pathname.replace(/index\.html$/, '');
    if (p === '') p = '/';
    return p;
  }
  function allowedQuery() {
    /* approved non-sensitive campaign fields only; everything else is dropped */
    var keep = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term'];
    try {
      var q = new URLSearchParams(location.search), out = new URLSearchParams();
      keep.forEach(function (k) { var v = q.get(k); if (v && v.length <= 100) out.set(k, v); });
      var s = out.toString();
      return s ? '?' + s : '';
    } catch (e) { return ''; }
  }
  function cleanReferrer() {
    /* attribution needs the source host and path, never a third party's query string */
    try {
      if (!document.referrer) return undefined;
      var u = new URL(document.referrer);
      return u.origin + u.pathname;
    } catch (e) { return undefined; }
  }
  function slugFromHref(href) {
    var m = /(?:^|\/)([a-z0-9-]{2,40})\/index\.html/.exec(href || '');
    return m ? m[1] : (href === '../finish/index.html' ? 'finish' : null);
  }

  var loaded = false;
  function load() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      analytics_storage: 'granted' /* analytics only; every advertising signal above stays denied */
    });
    gtag('js', new Date());
    var cfg = {
      send_page_view: false, /* the single, manual page_view strategy */
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      /* Measurement fix 2026-10-03: the tag-level page_location must be the SAME
         canonical URL the manual page_view reports. Google's automatic engagement
         events (user_engagement, the time-on-page signal) otherwise carry the raw
         address, and internal links end in index.html, so a story page's reading
         time landed on a phantom "/stop/index.html" row with zero views while the
         real "/stop/" row showed zero seconds. One location for every hit puts
         views, visitors, and time on the same row. */
      page_location: location.origin + canonicalPath() + allowedQuery()
    };
    if (/[?&]mhdebug=1/.test(location.search)) cfg.debug_mode = true;
    gtag('config', GID, cfg);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GID;
    document.head.appendChild(s);
    sendPageView();
    wire();
  }

  var pvSent = false;
  function sendPageView() {
    if (pvSent) return; /* a consent grant mid-page yields exactly one view */
    pvSent = true;
    var p = {
      page_location: location.origin + canonicalPath() + allowedQuery(),
      page_title: document.title,
      canonical_path: canonicalPath(),
      page_kind: KIND
    };
    if (SLUG) p.stop_slug = SLUG;
    var r = cleanReferrer();
    if (r) p.page_referrer = r;
    gtag('event', 'page_view', p);
  }

  /* ---------- defined interaction events; navigation never waits on these ---------- */
  var wired = false, routeSel = false, choiceSeen = false;
  function wire() {
    if (wired) return;
    wired = true;

    /* route_choice_view: the heading itself, at least half visible for one
       continuous second in a visible tab, once per page visit. This measures
       exposure to the choice, not proof both descriptions were read. */
    var h = document.querySelector('[data-mh="route-choice-heading"]');
    if (h && 'IntersectionObserver' in window) {
      var timer = null;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (choiceSeen) return;
          if (e.intersectionRatio >= 0.5 && document.visibilityState === 'visible') {
            if (!timer) timer = setTimeout(function () {
              if (document.visibilityState === 'visible' && !choiceSeen) {
                choiceSeen = true; io.disconnect();
                gtag('event', 'route_choice_view', { stop_slug: SLUG || 'warehouse', canonical_path: canonicalPath() });
              }
            }, 1000);
          } else if (timer) { clearTimeout(timer); timer = null; }
        });
      }, { threshold: [0, 0.5, 1] });
      io.observe(h);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible' && timer) { clearTimeout(timer); timer = null; }
      });
    }

    /* one delegated, passive click listener; classification uses this site's own
       baked hrefs and directory anchors, never visitor data */
    document.addEventListener('click', function (ev) {
      try {
        var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
        if (!a) return;
        var mh = a.getAttribute('data-mh');
        if (mh === 'route-longer' || mh === 'route-shorter') {
          if (!routeSel) {
            routeSel = true;
            gtag('event', 'route_select', {
              route: mh === 'route-longer' ? 'longer' : 'shorter',
              from_stop: 'warehouse',
              to_stop: mh === 'route-longer' ? 'the-bridge' : 'old-mill'
            });
          }
          return;
        }
        if (mh === 'route-choice-jump') return; /* a scroll, not a route selection */
        if (a.classList.contains('next') && a.closest('.nextbar')) {
          var to = slugFromHref(a.getAttribute('href'));
          if (to && SLUG) gtag('event', 'next_stop_click', { from_stop: SLUG, to_stop: to });
          return;
        }
        var href = a.getAttribute('href') || '';
        var biz = a.closest('.biz');
        var popup = a.closest('.maplibregl-popup-content');
        function bizId(el) {
          var id = el && el.id ? el.id : '';
          return /^v-[a-z0-9-]{2,60}$/.test(id) ? id.slice(2) : null;
        }
        function popupId(el) {
          var g = el ? el.querySelector('a[href*="#v-"]') : null;
          var m = g && /#v-([a-z0-9-]{2,60})/.exec(g.getAttribute('href'));
          return m ? m[1] : null;
        }
        var params = null;
        if (href.indexOf('https://www.google.com/maps/dir') === 0) {
          var mid = biz ? bizId(biz) : (popup ? popupId(popup) : null);
          if (mid) params = { action_kind: 'merchant_directions', merchant_id: mid };
        } else if (biz && /^https?:\/\//.test(href) && href.indexOf('mhwalk.com') === -1 && href.indexOf(MAIN) !== 0) {
          var mid2 = bizId(biz);
          if (mid2) params = { action_kind: 'merchant_website', merchant_id: mid2 };
        } else if (href.indexOf(MAIN + '/museum') === 0) {
          params = { action_kind: 'museum_info' };
        } else if (href.indexOf(MAIN + '/support') === 0) {
          params = { action_kind: 'support' };
        }
        if (params) {
          if (SLUG) params.stop_slug = SLUG;
          params.canonical_path = canonicalPath();
          gtag('event', 'outbound_action', params);
        }
      } catch (e) { /* analytics must never break navigation */ }
    }, { capture: true, passive: true });
  }

  /* ---------- withdrawal ---------- */
  function deleteGaCookies() {
    try {
      var doms = [location.hostname, '.' + location.hostname.replace(/^www\./, '')];
      document.cookie.split(';').forEach(function (c) {
        var n = c.split('=')[0].trim();
        if (n === '_ga' || n.indexOf('_ga_') === 0) {
          doms.forEach(function (d) {
            document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + d;
            document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          });
        }
      });
    } catch (e) { }
  }

  /* ---------- the notice ---------- */
  function banner(withState) {
    if (document.getElementById('mhc')) {
      document.getElementById('mhc').scrollIntoView();
      return;
    }
    var d = document.createElement('div');
    d.className = 'mhc'; d.id = 'mhc';
    d.setAttribute('role', 'region');
    d.setAttribute('aria-label', 'Analytics choice');
    var state = (readPref() === 'denied')
      ? '<p><b>Analytics is currently off on this browser.</b></p>'
      : '<p><b>Analytics is currently on.</b></p>';
    d.innerHTML = state +
      '<p>The Society counts visits and taps to keep this free tour worth maintaining. Turn it off here any time. ' +
      '<a href="' + (KIND === 'privacy' ? '#analytics' : (KIND === 'home' ? 'privacy/index.html' : '../privacy/index.html')) + '">Privacy</a></p>' +
      '<button type="button" class="mhcb yes">Allow analytics</button>' +
      '<button type="button" class="mhcb no">No thanks</button>';
    var main = document.querySelector('main.wrap') || document.body;
    main.insertBefore(d, main.firstChild);
    d.querySelector('.yes').addEventListener('click', function () {
      window['ga-disable-' + GID] = false; /* a same-page decline-then-re-allow measures again */
      writePref('granted'); d.remove(); load();
    });
    d.querySelector('.no').addEventListener('click', function () {
      var wasOn = loaded;
      window['ga-disable-' + GID] = true; /* stops any queued or unload-time hit at once */
      writePref('denied'); deleteGaCookies(); d.remove();
      if (wasOn) location.reload(); /* back to the unloaded state */
    });
  }

  /* footer "Analytics choices" reopens the notice in place */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
    if (a && /#analytics$/.test(a.getAttribute('href') || '') && a.closest('footer')) {
      ev.preventDefault();
      banner(true);
      var el = document.getElementById('mhc');
      if (el) el.scrollIntoView();
    }
  });

  var pref = readPref();
  if (pref === 'denied') deleteGaCookies(); /* declined: nothing loads, no request leaves
     the page, and any GA cookies a pre-decline heartbeat re-set are swept on every
     visit; the footer link remains the way back in */
  else load(); /* the default and the stored re-allow both load, ads signals denied */
})();
