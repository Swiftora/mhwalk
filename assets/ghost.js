/*!
 * ghost.js : mhwalk.com camera view ("hold this photo up to the street")
 *
 * What it does
 *   Adds a button under any photo marked data-ghost. The button opens the
 *   phone's rear camera full screen with that historic photo laid over the
 *   live view. The walker fades the photo in and out, zooms the camera to
 *   match the old lens, takes a blended picture, and shares or saves it.
 *
 * How to switch it on (two edits in the page generator, nothing else)
 *   1. Load this file on stop pages, before </body>:
 *        <script src="../assets/ghost.js" defer></script>
 *   2. Mark each eligible photo:
 *        <figure class="photo" data-ghost> ... </figure>
 *      Optional: data-ghost-src="../assets/other-crop.jpg" to overlay a
 *      different file than the one shown on the page (same site only).
 *
 * Eligibility rule (owner decision per photo, made on the route walk)
 *   Mark a photo ONLY if the spot the photographer stood on is a sidewalk or
 *   other safe public ground today. Many early photos were taken from the
 *   roadway. Those stay unmarked. No photo is enabled by default.
 *
 * Constraints kept
 *   Static file, no backend, no third party, no cookies, no storage.
 *   The camera image never leaves the phone unless the walker shares it.
 *   All CSS is injected from here, prefixed gh-, and uses the site's tokens.
 *   All wording lives in CONFIG.text below so it can be edited and validated
 *   without touching logic.
 */
(function () {
  'use strict';

  var CONFIG = {
    touchOnly: true,          // show the button on phones and tablets only
    startFade: 55,            // opening opacity of the old photo, 0 to 100
    maxZoom: 3,               // camera zoom range, 1x to this
    outputWidth: 1600,        // pixel width of the saved picture
    jpegQuality: 0.9,
    siteLabel: 'mhwalk.com',  // printed on the saved picture
    fileName: 'mullica-hill-then-and-now.jpg',
    text: {
      open: 'Hold this photo up to the street',
      dialogLabel: 'Camera view: the old photo over the street today',
      safety: 'Stay on the sidewalk. Watch for traffic.',
      close: 'Close',
      how: 'Stand where the photographer stood and line up the rooflines.',
      turn: 'Turn your phone sideways for a bigger view.',
      fadeLabel: 'Old photo',
      fadeMin: 'Today',
      fadeMax: 'Then',
      zoomLabel: 'Camera zoom',
      snap: 'Take the picture',
      starting: 'Starting the camera',
      reviewAlt: 'Your picture: the old photo blended over the street today',
      share: 'Share it',
      save: 'Save it',
      again: 'Take another',
      holdHint: 'Or press and hold the picture to save it to your photos.',
      shareText: 'then and now, on the Mullica Hill walking tour',
      errBlocked: 'The camera is blocked for this site. Allow the camera for mhwalk.com in your browser settings, then open this again.',
      errNone: 'No camera was found on this device.',
      errBusy: 'The camera could not start. Close other apps that are using the camera, then open this again.',
      errInApp: 'This app’s built-in browser is blocking the camera. Open this page in Safari or Chrome, then try again.',
      errPicture: 'The picture could not be made. Try again.'
    }
  };

  var T = CONFIG.text;
  var md = navigator.mediaDevices;
  if (!md || !md.getUserMedia || !window.isSecureContext) return;
  if (CONFIG.touchOnly) {
    var coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    if (!coarse && !('ontouchstart' in window)) return;
  }

  var figures = document.querySelectorAll('figure.photo[data-ghost]');
  if (!figures.length) return;

  var IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\//i.test(navigator.userAgent || '');

  /* ---------- styles ---------- */
  var css = [
    '.gh-open{display:block;width:100%;margin:12px 0 0;min-height:48px;padding:12px 14px;cursor:pointer;',
    'background:var(--mat,#FFFDF7);color:var(--ink,#2A2118);border:3px solid var(--ink,#2A2118);',
    'box-shadow:4px 4px 0 var(--ink,#2A2118);font:800 14px/1.25 Archivo,Arial,sans-serif;',
    'letter-spacing:.05em;text-transform:uppercase;border-radius:0;-webkit-appearance:none;appearance:none}',
    '.gh-open:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink,#2A2118)}',
    '.gh-open:focus-visible,.gh-d button:focus-visible,.gh-d a:focus-visible,.gh-d input:focus-visible{outline:3px solid var(--gold,#E9A93B);outline-offset:2px}',
    '@media print{.gh-open{display:none}}',

    '.gh-d{position:fixed;inset:0;z-index:2147483000;background:#1A140E;color:var(--parchment,#F7F0E1);',
    'display:grid;grid-template-areas:"top" "stage" "ctl";grid-template-rows:auto minmax(0,1fr) auto;',
    'height:100%;height:100dvh;font-family:Archivo,Arial,sans-serif;box-sizing:border-box;',
    'padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0)}',
    '.gh-d[hidden]{display:none}',
    '.gh-d *{box-sizing:border-box}',
    '.gh-top{grid-area:top;display:flex;align-items:center;gap:12px;padding:8px 10px 8px 14px}',
    '.gh-safe{margin:0;flex:1;font-size:16px;font-weight:700;line-height:1.3}',
    '.gh-btn{min-height:48px;padding:10px 16px;cursor:pointer;border-radius:0;-webkit-appearance:none;appearance:none;',
    'font:800 15px/1.2 Archivo,Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;',
    'display:inline-flex;align-items:center;justify-content:center;text-align:center;',
    'background:var(--mat,#FFFDF7);color:var(--ink,#2A2118);border:3px solid var(--ink,#2A2118);box-shadow:4px 4px 0 #000}',
    '.gh-btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 #000}',
    '.gh-btn[disabled]{opacity:.5;cursor:default}',
    '.gh-gold{background:var(--gold,#E9A93B)}',
    '.gh-wrap{grid-area:stage;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}',
    '.gh-stage{position:relative;overflow:hidden;background:#000;flex:none}',
    '.gh-stage video,.gh-stage img{position:absolute;left:0;top:0;width:100%;height:100%;display:block}',
    '.gh-stage video{object-fit:cover;transform-origin:50% 50%}',
    '.gh-stage img{object-fit:fill;pointer-events:none;-webkit-user-select:none;user-select:none}',
    '.gh-msg{position:absolute;left:12px;right:12px;top:50%;transform:translateY(-50%);margin:0;padding:14px 16px;',
    'background:var(--mat,#FFFDF7);color:var(--ink,#2A2118);border:3px solid var(--ink,#2A2118);font-size:16px;line-height:1.45;font-weight:600}',
    '.gh-msg:empty{display:none}',
    '.gh-ctl{grid-area:ctl;background:var(--parchment,#F7F0E1);color:var(--ink,#2A2118);border-top:3px solid var(--ink,#2A2118);padding:10px 14px 14px}',
    '.gh-how{margin:0 0 6px;font-size:16px;line-height:1.35;color:var(--cocoa,#43321F)}',
    '.gh-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;column-gap:10px;min-height:48px}',
    '.gh-row b{font-size:14px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}',
    '.gh-lab{display:block;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--red-deep,#9E1F24);margin:6px 0 0}',
    '.gh-range{-webkit-appearance:none;appearance:none;width:100%;height:48px;margin:0;background:transparent;cursor:pointer}',
    '.gh-range::-webkit-slider-runnable-track{height:10px;background:var(--mat,#FFFDF7);border:2px solid var(--ink,#2A2118)}',
    '.gh-range::-moz-range-track{height:6px;background:var(--mat,#FFFDF7);border:2px solid var(--ink,#2A2118)}',
    '.gh-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:34px;height:34px;margin-top:-14px;',
    'background:var(--gold,#E9A93B);border:3px solid var(--ink,#2A2118);border-radius:0;box-shadow:2px 2px 0 var(--ink,#2A2118)}',
    '.gh-range::-moz-range-thumb{width:28px;height:28px;background:var(--gold,#E9A93B);border:3px solid var(--ink,#2A2118);border-radius:0}',
    '.gh-snap{width:100%;margin-top:8px;min-height:54px;font-size:16px}',

    '.gh-rev{position:absolute;inset:0;z-index:2;background:#1A140E;display:flex;flex-direction:column;',
    'padding:calc(10px + env(safe-area-inset-top,0)) 12px calc(14px + env(safe-area-inset-bottom,0))}',
    '.gh-rev[hidden]{display:none}',
    '.gh-revimg{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}',
    '.gh-revimg img{max-width:100%;max-height:100%;display:block;border:3px solid var(--parchment,#F7F0E1)}',
    '.gh-acts{display:flex;flex-wrap:wrap;gap:10px;padding-top:12px}',
    '.gh-acts .gh-btn{flex:1 1 140px}',
    '.gh-hint{margin:10px 0 0;font-size:16px;line-height:1.4;color:var(--parchment,#F7F0E1)}',

    '@media (orientation:landscape) and (max-height:540px){',
    '.gh-d{grid-template-areas:"stage top" "stage ctl";grid-template-columns:minmax(0,1fr) 220px;grid-template-rows:auto minmax(0,1fr)}',
    '.gh-top{background:var(--parchment,#F7F0E1);color:var(--ink,#2A2118);padding:8px 10px}',
    '.gh-safe{font-size:14px}',
    '.gh-ctl{border-top:0;overflow:auto;padding-top:0}',
    '.gh-how{font-size:14px;margin-bottom:2px}',
    '.gh-lab{display:none}',
    '.gh-snap{margin-top:4px}',
    '.gh-rev{flex-direction:row;gap:12px}',
    '.gh-rev .gh-side{width:220px;display:flex;flex-direction:column;justify-content:center}',
    '.gh-acts{flex-direction:column;padding-top:0}.gh-acts .gh-btn{flex:none}',
    '}'
  ].join('');
  var st = document.createElement('style');
  st.setAttribute('data-ghost-css', '');
  st.appendChild(document.createTextNode(css));
  document.head.appendChild(st);

  /* ---------- state ---------- */
  var d = null, el = {};            // dialog and its parts, built on first open
  var stream = null, wake = null;
  var isOpen = false, opener = null, prevOverflow = '';
  var shot = { url: null, file: null };
  var stopTitle = (function () {
    var h = document.querySelector('main h1') || document.querySelector('h1');
    return (h ? h.textContent : document.title || '').replace(/\s+/g, ' ').trim();
  })();

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  /* ---------- the button under each marked photo ---------- */
  Array.prototype.forEach.call(figures, function (fig) {
    var img = fig.querySelector('img');
    if (!img || fig.classList.contains('missing')) return;
    var b = make('button', 'gh-open', T.open);
    b.type = 'button';
    b.addEventListener('click', function () {
      if (!img.naturalWidth) return;
      openView(fig.getAttribute('data-ghost-src') || img.currentSrc || img.src, b);
    });
    fig.appendChild(b);
  });

  /* ---------- dialog ---------- */
  function build() {
    d = make('div', 'gh-d');
    d.hidden = true;
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-label', T.dialogLabel);

    var top = make('div', 'gh-top');
    top.appendChild(make('p', 'gh-safe', T.safety));
    el.close = make('button', 'gh-btn', T.close);
    el.close.type = 'button';
    top.appendChild(el.close);

    el.wrap = make('div', 'gh-wrap');
    el.stage = make('div', 'gh-stage');
    el.video = document.createElement('video');
    el.video.setAttribute('playsinline', '');
    el.video.setAttribute('webkit-playsinline', '');
    el.video.setAttribute('aria-hidden', 'true');
    el.video.muted = true;
    el.video.autoplay = true;
    el.old = document.createElement('img');
    el.old.alt = '';
    el.old.decoding = 'async';
    el.stage.appendChild(el.video);
    el.stage.appendChild(el.old);
    el.msg = make('p', 'gh-msg');
    el.msg.setAttribute('role', 'status');
    el.wrap.appendChild(el.stage);
    el.wrap.appendChild(el.msg);

    var ctl = make('div', 'gh-ctl');
    el.how = make('p', 'gh-how', T.how);
    ctl.appendChild(el.how);

    ctl.appendChild(make('span', 'gh-lab', T.fadeLabel));
    var r1 = make('div', 'gh-row');
    r1.appendChild(make('b', '', T.fadeMin));
    el.fade = range(0, 100, CONFIG.startFade, T.fadeLabel);
    r1.appendChild(el.fade);
    r1.appendChild(make('b', '', T.fadeMax));
    ctl.appendChild(r1);

    ctl.appendChild(make('span', 'gh-lab', T.zoomLabel));
    var r2 = make('div', 'gh-row');
    r2.appendChild(make('b', '', '1x'));
    el.zoom = range(100, Math.round(CONFIG.maxZoom * 100), 100, T.zoomLabel);
    r2.appendChild(el.zoom);
    r2.appendChild(make('b', '', CONFIG.maxZoom + 'x'));
    ctl.appendChild(r2);

    el.snap = make('button', 'gh-btn gh-gold gh-snap', T.snap);
    el.snap.type = 'button';
    el.snap.disabled = true;
    ctl.appendChild(el.snap);

    el.rev = make('div', 'gh-rev');
    el.rev.hidden = true;
    var ri = make('div', 'gh-revimg');
    el.result = document.createElement('img');
    el.result.alt = T.reviewAlt;
    ri.appendChild(el.result);
    var side = make('div', 'gh-side');
    var acts = make('div', 'gh-acts');
    el.share = make('button', 'gh-btn gh-gold', T.share);
    el.share.type = 'button';
    el.save = make('a', 'gh-btn', T.save);
    el.save.setAttribute('download', CONFIG.fileName);
    el.again = make('button', 'gh-btn', T.again);
    el.again.type = 'button';
    el.done = make('button', 'gh-btn', T.close);
    el.done.type = 'button';
    acts.appendChild(el.share);
    acts.appendChild(el.save);
    acts.appendChild(el.again);
    acts.appendChild(el.done);
    side.appendChild(acts);
    side.appendChild(make('p', 'gh-hint', T.holdHint));
    el.rev.appendChild(ri);
    el.rev.appendChild(side);

    d.appendChild(top);
    d.appendChild(el.wrap);
    d.appendChild(ctl);
    d.appendChild(el.rev);
    document.body.appendChild(d);

    el.close.addEventListener('click', closeUI);
    el.done.addEventListener('click', closeUI);
    el.fade.addEventListener('input', applyFade);
    el.zoom.addEventListener('input', applyZoom);
    el.snap.addEventListener('click', takePicture);
    el.again.addEventListener('click', function () { showReview(false); el.snap.focus(); });
    el.share.addEventListener('click', shareShot);
    el.old.addEventListener('load', fit);
    el.video.addEventListener('loadedmetadata', function () { el.snap.disabled = false; });
    d.addEventListener('keydown', trapTab);
  }

  function range(min, max, val, label) {
    var r = make('input', 'gh-range');
    r.type = 'range';
    r.min = min; r.max = max; r.step = 1; r.value = val;
    r.setAttribute('aria-label', label);
    return r;
  }

  function applyFade() { el.old.style.opacity = String(el.fade.value / 100); }
  function applyZoom() { el.video.style.transform = 'scale(' + (el.zoom.value / 100) + ')'; }

  /* Size the stage to the old photo's shape, as large as the space allows. */
  function fit() {
    if (!isOpen) return;
    var w = el.old.naturalWidth || 4, h = el.old.naturalHeight || 3;
    var r = el.wrap.getBoundingClientRect();
    var s = Math.min(r.width / w, r.height / h);
    el.stage.style.width = Math.max(1, Math.floor(w * s)) + 'px';
    el.stage.style.height = Math.max(1, Math.floor(h * s)) + 'px';
    var portrait = window.innerHeight > window.innerWidth;
    el.how.textContent = (w > h * 1.15 && portrait) ? T.how + ' ' + T.turn : T.how;
  }

  function say(text) { el.msg.textContent = text || ''; }

  /* ---------- open and close ---------- */
  function openView(src, fromButton) {
    if (isOpen) return;
    if (!d) build();
    opener = fromButton || null;
    isOpen = true;
    showReview(false);
    el.snap.disabled = true;
    el.fade.value = CONFIG.startFade;
    el.zoom.value = 100;
    applyFade(); applyZoom();
    el.old.src = src;
    d.hidden = false;
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fit();
    try { el.close.focus(); } catch (e) {}
    try { history.pushState({ ghost: 1 }, ''); } catch (e) {}
    startCamera();
  }

  function teardown() {
    if (!isOpen) return;
    isOpen = false;
    stopCamera();
    clearShot();
    d.hidden = true;
    say('');
    document.body.style.overflow = prevOverflow;
    if (opener) { try { opener.focus(); } catch (e) {} opener = null; }
  }

  function closeUI() {
    if (!isOpen) return;
    if (history.state && history.state.ghost) { history.back(); } else { teardown(); }
  }

  window.addEventListener('popstate', function () { if (isOpen) teardown(); });
  document.addEventListener('keydown', function (e) { if (isOpen && e.key === 'Escape') closeUI(); });
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 250); });
  window.addEventListener('pagehide', stopCamera);
  document.addEventListener('visibilitychange', function () {
    if (!isOpen) return;
    if (document.hidden) { stopCamera(); }
    else if (!stream) { startCamera(); }
  });

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    var scope = el.rev.hidden ? d : el.rev;
    var f = Array.prototype.filter.call(
      scope.querySelectorAll('button,a[href],input'),
      function (n) { return !n.disabled && n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- camera ---------- */
  function startCamera() {
    say(T.starting);
    el.snap.disabled = true;
    md.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    }).then(function (s) {
      if (!isOpen || document.hidden) { stopTracks(s); return; }
      stream = s;
      el.video.srcObject = s;
      var p = el.video.play();
      if (p && p.catch) p.catch(function () {});
      say('');
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
      }
    }).catch(function (err) {
      var n = err && err.name;
      el.old.style.opacity = '1';
      if (n === 'NotAllowedError' || n === 'SecurityError') say(IN_APP ? T.errInApp : T.errBlocked);
      else if (n === 'NotFoundError' || n === 'OverconstrainedError') say(T.errNone);
      else say(IN_APP ? T.errInApp : T.errBusy);
    });
  }

  function stopTracks(s) {
    try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
  }

  function stopCamera() {
    if (stream) { stopTracks(stream); stream = null; }
    if (el.video) { try { el.video.pause(); } catch (e) {} el.video.srcObject = null; }
    if (wake) { try { wake.release(); } catch (e) {} wake = null; }
  }

  /* ---------- the picture ---------- */
  function takePicture() {
    var v = el.video, vw = v.videoWidth, vh = v.videoHeight;
    if (!vw || !vh) return;
    var ow = el.old.naturalWidth, oh = el.old.naturalHeight;
    var W = CONFIG.outputWidth, H = Math.round(W * oh / ow);
    var band = Math.max(56, Math.round(W * 0.05));
    var c = document.createElement('canvas');
    c.width = W; c.height = H + band;
    var g = c.getContext('2d');

    /* Same crop the walker sees: cover the stage, then zoom about the center. */
    var a = W / H, va = vw / vh, sw, sh;
    if (va > a) { sh = vh; sw = vh * a; } else { sw = vw; sh = vw / a; }
    var z = el.zoom.value / 100;
    sw /= z; sh /= z;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
    g.globalAlpha = el.fade.value / 100;
    g.drawImage(el.old, 0, 0, W, H);
    g.globalAlpha = 1;

    /* Credit band: stop name left, site right. */
    g.fillStyle = '#2A2118';
    g.fillRect(0, H, W, band);
    g.fillStyle = '#F7F0E1';
    g.textBaseline = 'middle';
    var fs = Math.round(band * 0.42), pad = Math.round(band * 0.45);
    g.font = '800 ' + fs + 'px Archivo, Arial, sans-serif';
    g.textAlign = 'right';
    g.fillText(CONFIG.siteLabel, W - pad, H + band / 2);
    var room = W - pad * 3 - g.measureText(CONFIG.siteLabel).width;
    g.textAlign = 'left';
    g.fillText(clip(g, stopTitle, room), pad, H + band / 2);

    try {
      c.toBlob(function (blob) {
        if (!blob) { say(T.errPicture); return; }
        clearShot();
        shot.url = URL.createObjectURL(blob);
        try { shot.file = new File([blob], CONFIG.fileName, { type: 'image/jpeg' }); } catch (e) { shot.file = null; }
        el.result.src = shot.url;
        el.save.href = shot.url;
        var canShare = !!(shot.file && navigator.canShare && navigator.share && navigator.canShare({ files: [shot.file] }));
        el.share.hidden = !canShare;
        showReview(true);
        try { (canShare ? el.share : el.save).focus(); } catch (e) {}
      }, 'image/jpeg', CONFIG.jpegQuality);
    } catch (e) {
      say(T.errPicture);   // a cross-site overlay file taints the canvas; keep overlays on this site
    }
  }

  function clip(g, text, room) {
    if (g.measureText(text).width <= room) return text;
    var t = text;
    while (t.length > 1 && g.measureText(t + '…').width > room) t = t.slice(0, -1);
    return t.replace(/\s+$/, '') + '…';
  }

  function showReview(on) { el.rev.hidden = !on; }

  function clearShot() {
    if (shot.url) { try { URL.revokeObjectURL(shot.url); } catch (e) {} }
    shot.url = null; shot.file = null;
    if (el.result) el.result.removeAttribute('src');
    if (el.save) el.save.removeAttribute('href');
  }

  /* Called straight from the tap, with the file already made, so phones allow it. */
  function shareShot() {
    if (!shot.file) return;
    navigator.share({
      files: [shot.file],
      title: stopTitle,
      text: stopTitle + ': ' + T.shareText + '. ' + location.origin + location.pathname
    }).catch(function () {});
  }
})();
