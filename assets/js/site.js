/* ==========================================================================
   Polycrete — motion layer
   One rAF loop. Smooth wheel scrolling on desktop (Lenis), native on touch.
   Every scroll-linked value is eased so nothing ever snaps.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });

  /* run fn once the page-to-page transition (if any) has finished */
  function settled(fn) {
    requestAnimationFrame(function () {
      if (window.__vtDone) window.__vtDone.then(fn); else fn();
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function headerH() { var h = document.querySelector('.hdr'); return h ? h.getBoundingClientRect().height : 0; }

  /* ---------------------------------------------------------------------
     Smooth scrolling
     --------------------------------------------------------------------- */
  var lenis = null;
  if (!reduced && finePointer && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ lerp: 0.2, wheelMultiplier: 1, smoothWheel: true, anchors: false });
  }
  function scrollY() { return lenis ? lenis.scroll : window.pageYOffset; }

  var busy = false;
  function scrollToY(y, done, quick) {
    var max = doc.scrollHeight - vh;
    y = clamp(y, 0, max);
    var dist = Math.abs(y - scrollY());
    var dur = quick ? clamp(dist * 0.003, 0.18, 0.4)       // a settle, not a second glide
                    : clamp(dist * 0.00042, 0.6, 1.25);     // seconds, scaled to distance
    if (reduced || dist < 2) { window.scrollTo(0, y); if (done) done(); return; }
    busy = true;
    if (lenis) {
      lenis.scrollTo(y, { duration: dur, easing: easeInOutCubic, lock: true, force: true,
        onComplete: function () { busy = false; if (done) done(); } });
      return;
    }
    var from = window.pageYOffset, delta = y - from, t0 = null;
    requestAnimationFrame(function f(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / (dur * 1000));
      window.scrollTo(0, from + delta * easeInOutCubic(p));
      if (p < 1) requestAnimationFrame(f); else { busy = false; if (done) done(); }
    });
  }
  function yOf(el) { return scrollY() + el.getBoundingClientRect().top - headerH() - 12; }
  /* scroll to an element, then settle: if images further down loaded mid-flight
     and moved the target, glide the last few pixels instead of landing short */
  function scrollToEl(el, tries) {
    tries = tries || 0;
    scrollToY(yOf(el), function () {
      var off = el.getBoundingClientRect().top - headerH() - 12;
      var max = doc.scrollHeight - vh;
      if (Math.abs(off) > 3 && tries < 2 && !(off > 0 && scrollY() >= max - 1)) {
        scrollToY(scrollY() + off, null, true);
      }
    }, tries > 0);
  }

  /* same-page anchors use the same easing */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    if (a.hasAttribute('data-quote')) return;
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      if (busy) return;
      scrollToEl(el);
      history.replaceState(null, '', '#' + id);
    });
  });

  /* A nav link to the page you're already on never reloads: at the top it
     does nothing, scrolled down it glides back to the top. */
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function fileOf(href) {
    if (!href) return '';
    var h = href.split('#')[0].split('?')[0];
    if (h === '' || h === './' || h === '.') return here;
    return (h.split('/').pop() || 'index.html').toLowerCase();
  }
  document.querySelectorAll('.nav a, .mnav a:not(.btn), .brand').forEach(function (a) {
    if (fileOf(a.getAttribute('href')) !== here) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      closeMenu();
      if (busy) return;
      if (scrollY() > 4) {
        scrollToY(0);
        history.replaceState(null, '', location.pathname);
      }
    });
  });

  /* "Get a quote": go to the form, or do nothing if you're already on it. */
  var quote = document.getElementById('quote');
  function atQuote() {
    if (!quote) return false;
    var r = quote.getBoundingClientRect();
    return r.top - headerH() < vh * 0.4 && r.bottom > headerH() + 48;
  }
  function goQuote() {
    if (!quote || busy || atQuote()) return;
    scrollToEl(quote);
    history.replaceState(null, '', '#quote');
  }
  document.querySelectorAll('[data-quote]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!quote) return;
      e.preventDefault();
      closeMenu();
      goQuote();
    });
  });
  /* "Get a quote on this" — picks the job type, then goes to the form */
  document.querySelectorAll('[data-job]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!quote) return;
      e.preventDefault();
      var sel = quote.querySelector('select[name="Job type"]');
      if (sel) sel.value = a.getAttribute('data-job');
      goQuote();
    });
  });
  if (location.hash === '#quote' && quote) {
    window.scrollTo(0, 0);
    setTimeout(function () { scrollToEl(quote); }, 280);
  }

  /* ---------------------------------------------------------------------
     Mobile menu
     --------------------------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var mnav = document.querySelector('.mnav');
  function closeMenu() {
    if (!mnav) return;
    mnav.classList.remove('open');
    if (burger) { burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  }
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = !mnav.classList.contains('open');
      mnav.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------------------------------------------------------------------
     Header — slides away on the way down, returns on the way up
     --------------------------------------------------------------------- */
  (function () {
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;
    var lastY = window.pageYOffset, hidden = false, ticking = false;
    function setHidden(h) {
      if (h === hidden) return;
      hidden = h;
      hdr.classList.toggle('hdr-hide', h);
    }
    function update() {
      ticking = false;
      var y = window.pageYOffset;
      var dy = y - lastY;
      if (mnav && mnav.classList.contains('open')) { setHidden(false); lastY = y; return; }
      if (y < 80) setHidden(false);
      else if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
      if (Math.abs(dy) > 6 || y < 80) lastY = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    /* keyboard users tabbing into the header always get it back */
    hdr.addEventListener('focusin', function () { setHidden(false); });
  })();

  /* ---------------------------------------------------------------------
     Reveals — once only, never replayed
     --------------------------------------------------------------------- */
  var pending = [].slice.call(document.querySelectorAll('.rv'));
  if (reduced) { pending.forEach(function (el) { el.classList.add('in'); }); pending = []; }

  /* heading groups: split the heading into words so it can rise line by line,
     and give every element in the group its place in the sequence */
  function splitHeading(h) {
    if (h._words) return h._words;
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    var words = [];
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var o = document.createElement('span'), i = document.createElement('span');
            o.className = 'ln'; o.setAttribute('aria-hidden', 'true');
            i.textContent = part; o.appendChild(i); frag.appendChild(o); words.push(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    })(h);
    h._words = words;
    return words;
  }
  function sequence(g) {
    var t = 0;
    [].slice.call(g.children).forEach(function (k) {
      if (/^H[12]$/.test(k.tagName)) {
        k.classList.add('hd-h');
        var top = null, line = -1;
        splitHeading(k).forEach(function (w) {
          var y = w.offsetTop;
          if (top === null || Math.abs(y - top) > 4) { line++; top = y; }
          w.style.setProperty('--d', (t + line * 95) + 'ms');
        });
        t += (line + 1) * 95 + 140;
      } else {
        k.style.setProperty('--d', t + 'ms');
        t += 90;
      }
    });
  }
  var groups = reduced ? [] : pending.filter(function (el) {
    return !el.closest('.hero') && el.querySelector(':scope > h1, :scope > h2');
  });
  groups.forEach(function (g) { g.classList.add('hd'); sequence(g); });
  /* once the real fonts are in, lines may have re-wrapped: re-time them */
  if (groups.length && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { groups.forEach(sequence); });
  }
  function revealCheck() {
    if (!pending.length) return;
    var edge = vh * 0.92, keep = [];
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].getBoundingClientRect().top < edge) pending[i].classList.add('in');
      else keep.push(pending[i]);
    }
    pending = keep;
  }
  if (pending.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var target = entry.target;
        revealObserver.unobserve(target);
        if (window.__vtDone) window.__vtDone.then(function () { target.classList.add('in'); });
        else target.classList.add('in');
      });
    }, { rootMargin: '0px 0px 8% 0px' });
    pending.forEach(function (el) { revealObserver.observe(el); });
    pending = [];
  }

  /* ---------------------------------------------------------------------
     Rails
     --------------------------------------------------------------------- */
  document.querySelectorAll('[data-rail]').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail');
    function step() { var f = rail.querySelector('figure'); return f ? f.getBoundingClientRect().width + 16 : 340; }
    /* dots for the one-photo-at-a-time slideshow on phones */
    var figs = rail.querySelectorAll('figure');
    var dots = document.createElement('div');
    dots.className = 'rail-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (var d = 0; d < figs.length; d++) dots.appendChild(document.createElement('i'));
    wrap.appendChild(dots);
    var dotEls = dots.children, lastDot = -1;
    function syncDots() {
      var idx = Math.round(rail.scrollLeft / step());
      idx = Math.max(0, Math.min(figs.length - 1, idx));
      if (idx === lastDot) return;
      lastDot = idx;
      for (var k = 0; k < dotEls.length; k++) dotEls[k].classList.toggle('on', k === idx);
    }
    rail.addEventListener('scroll', syncDots, { passive: true });
    window.addEventListener('resize', syncDots, { passive: true });
    syncDots();
    wrap.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () {
        rail.scrollBy({ left: step() * (+b.getAttribute('data-dir')), behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  });

  /* ---------------------------------------------------------------------
     Before / after — 1:1 under the finger, eased everywhere else
     --------------------------------------------------------------------- */
  document.querySelectorAll('.ba').forEach(function (ba) {
    var after = ba.querySelector('.ba-after');
    var line = ba.querySelector('.ba-line');
    var grip = ba.querySelector('.ba-grip');
    var cur = 50, target = 50, dragging = false, touched = false, raf = 0;

    function paint(pct) {
      after.style.clipPath = 'inset(0 0 0 ' + pct.toFixed(2) + '%)';
      var x = ba.clientWidth * pct / 100;
      line.style.transform = 'translate3d(' + x + 'px,0,0)';
      grip.style.transform = 'translate3d(' + x + 'px,0,0)';
      ba.setAttribute('aria-valuenow', Math.round(pct));
    }
    function loop() {
      cur = dragging ? target : lerp(cur, target, 0.16);
      paint(cur);
      if (Math.abs(cur - target) > 0.05 || dragging) raf = requestAnimationFrame(loop);
      else { cur = target; paint(cur); raf = 0; }
    }
    function go(p, immediate) {
      target = clamp(p, 2, 98);
      if (immediate) cur = target;
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function fromEvt(e) {
      var r = ba.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      return x / r.width * 100;
    }
    ba.addEventListener('pointerdown', function (e) {
      touched = true; dragging = true; ba.classList.add('drag');
      ba.setPointerCapture && ba.setPointerCapture(e.pointerId);
      go(fromEvt(e), false);
    });
    ba.addEventListener('pointermove', function (e) { if (dragging) go(fromEvt(e), true); });
    function end() { dragging = false; ba.classList.remove('drag'); }
    ba.addEventListener('pointerup', end);
    ba.addEventListener('pointercancel', end);
    ba.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { touched = true; go(target - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { touched = true; go(target + 5); e.preventDefault(); }
    });
    window.addEventListener('resize', function () { paint(cur); }, { passive: true });
    paint(50);

    /* first time it comes into view, nudge the handle so it reads as draggable */
    if (!reduced && 'IntersectionObserver' in window) {
      var nio = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        nio.disconnect();
        var seq = [36, 64, 50], i = 0;
        (function next() {
          if (touched || i >= seq.length) return;
          go(seq[i++]);
          setTimeout(next, 520);
        })();
      }, { threshold: 0.6 });
      nio.observe(ba);
    }
  });

  /* ---------------------------------------------------------------------
     Lightbox
     --------------------------------------------------------------------- */
  var lb = document.querySelector('.lb');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lastFocus = null;
    function openLb(img) {
      lastFocus = document.activeElement;
      lbImg.src = img.getAttribute('data-full') || img.src;
      lbImg.alt = img.alt;
      lb.classList.add('on');
      lb.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
      lb.querySelector('.ibtn').focus({ preventScroll: true });
    }
    function closeLb() {
      if (!lb.classList.contains('on')) return;
      lb.classList.remove('on');
      lb.setAttribute('aria-hidden', 'true');
      if (lenis) lenis.start();
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    document.querySelectorAll('.ggrid figure').forEach(function (fig) {
      var img = fig.querySelector('img');
      fig.addEventListener('click', function () { openLb(img); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(img); }
      });
    });
    lb.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
  }

  /* ---------------------------------------------------------------------
     Count-up — only real numbers
     --------------------------------------------------------------------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-count'));
    var dp = (el.getAttribute('data-count').split('.')[1] || '').length;
    if (reduced || !('IntersectionObserver' in window)) { el.textContent = to.toFixed(dp); return; }
    el.textContent = (0).toFixed(dp);
    var cio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      cio.disconnect();
      var t0 = null;
      requestAnimationFrame(function f(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 1400);
        var e = 1 - Math.pow(1 - p, 4);
        el.textContent = (to * e).toFixed(dp);
        if (p < 1) requestAnimationFrame(f);
      });
    }, { threshold: 0.6 });
    cio.observe(el);
  });

  /* ---------------------------------------------------------------------
     Services — the photo holds while the finishes scroll past
     --------------------------------------------------------------------- */
  var steps = document.querySelectorAll('.step');
  var shows = document.querySelectorAll('.show-media figure');
  if (steps.length && shows.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = [].indexOf.call(steps, e.target);
        steps.forEach(function (s, j) { s.classList.toggle('on', j === i); });
        shows.forEach(function (f, j) { f.classList.toggle('on', j === i); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { sio.observe(s); });
  }


  /* ---------------------------------------------------------------------
     Hero logo — chiselled out of nothing, in white
     --------------------------------------------------------------------- */
  (function () {
    var box = document.getElementById('chiselLogo');
    if (!box) return;
    var NS = 'http://www.w3.org/2000/svg';
    var blobs = box.querySelector('#clBlobs');
    var fx = box.querySelector('#clFx');
    var mobileLogo = window.matchMedia('(max-width: 860px)').matches;
    var STRIKES = mobileLogo ? 60 : 72, GAP = mobileLogo ? 20 : 34, START = 1240;
    var seed = 20261018;
    function rnd() { return (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }

    var paths = [].slice.call(box.querySelectorAll('#clLogo path'));
    var lens = paths.map(function (p) { return p.getTotalLength(); });
    var total = lens.reduce(function (a, b) { return a + b; }, 0);
    var pts = [];
    paths.forEach(function (p, i) {
      var n = Math.max(4, Math.round(STRIKES * lens[i] / total));
      for (var k = 0; k < n; k++) {
        var pt = p.getPointAtLength(((k + 0.5) / n) * lens[i]);
        pts.push({ x: pt.x, y: pt.y });
      }
    });
    pts.forEach(function (p) { p.k = p.x * 0.6 + p.y + rnd() * 150; });
    pts.sort(function (a, b) { return a.k - b.k; });

    var chips = pts.map(function (p) {
      var r = 58 + rnd() * 30, v = 9 + Math.floor(rnd() * 4), d = [];
      for (var i = 0; i < v; i++) {
        var a = (i / v) * Math.PI * 2 + rnd() * 0.3, rr = r * (0.62 + rnd() * 0.55);
        d.push([p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr]);
      }
      var el = document.createElementNS(NS, 'polygon');
      el.setAttribute('points', d.map(function (c) { return c.map(function (n) { return n.toFixed(1); }).join(','); }).join(' '));
      el.style.transformOrigin = p.x.toFixed(1) + 'px ' + p.y.toFixed(1) + 'px';
      el.style.opacity = 0;
      blobs.appendChild(el);
      return { el: el, p: p };
    });
    function burst(p) {
      for (var i = 0; i < (mobileLogo ? 1 : 3); i++) {
        var sh = document.createElementNS(NS, 'polygon');
        var sides = 4 + Math.floor(rnd() * 4), size = 5 + rnd() * 9, vertices = [];
        for (var v = 0; v < sides; v++) {
          var angle = (v / sides) * Math.PI * 2 + rnd() * .45;
          var radius = size * (.55 + rnd() * .55);
          vertices.push((Math.cos(angle) * radius).toFixed(1) + ',' + (Math.sin(angle) * radius).toFixed(1));
        }
        sh.setAttribute('points', vertices.join(' '));
        sh.setAttribute('fill', '#fff');
        sh.setAttribute('stroke', '#e6ecea'); sh.setAttribute('stroke-width', '.8');
        sh.setAttribute('stroke-linejoin', 'bevel'); sh.setAttribute('opacity', '.92');
        fx.appendChild(sh);
        var dx = (rnd() - .5) * 110, lift = (rnd() - .5) * 24;
        var spin = (rnd() - .5) * 500, fall = 145 + rnd() * 65;
        sh.animate([
          { transform: 'translate(' + p.x + 'px,' + p.y + 'px) rotate(0deg) scale(.6)', opacity: 0 },
          { transform: 'translate(' + (p.x + dx * .12) + 'px,' + (p.y - 8) + 'px) rotate(' + (spin * .12) + 'deg) scale(1)', opacity: .96, offset: .12 },
          { transform: 'translate(' + (p.x + dx) + 'px,' + (p.y + lift + fall) + 'px) rotate(' + spin + 'deg)', opacity: 0 }
        ], { duration: 450 + rnd() * 200, easing: 'cubic-bezier(.55,0,1,1)' }).onfinish = (function (spark) {
          return function () { spark.remove(); };
        })(sh);
      }
    }

    /* after the last chip lands, fade the mask fully open so no part of the
       logo is ever left uncovered, whatever the screen size */
    var done = document.createElementNS(NS, 'rect');
    done.setAttribute('width', '477'); done.setAttribute('height', '486'); done.setAttribute('fill', '#fff');
    done.style.opacity = 0;
    var timers = [];
    function resetLogo() {
      timers.forEach(clearTimeout); timers = [];
      fx.textContent = '';
      if (done.parentNode) done.parentNode.removeChild(done);
      done.style.opacity = 0;
      chips.forEach(function (c) { c.el.style.opacity = 0; c.el.style.transform = 'scale(.35)'; });
    }
    function play() {
      resetLogo();
      if (reduced) { chips.forEach(function (c) { c.el.style.opacity = 1; c.el.style.transform = 'none'; }); blobs.parentNode.appendChild(done); done.style.opacity = 1; return; }
      chips.forEach(function (c, i) {
        timers.push(setTimeout(function () {
          c.el.style.opacity = 1;
          c.el.animate([{ transform: 'scale(.35)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
            { duration: 280, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'forwards' });
          burst(c.p);
        }, START + i * GAP));
      });
      timers.push(setTimeout(function () {
        blobs.parentNode.appendChild(done);
        done.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out', fill: 'forwards' });
      }, START + chips.length * GAP + 260));
    }
    resetLogo();
    box.style.cursor = 'pointer';
    box.addEventListener('click', play);
    settled(play);
  })();

  /* ---------------------------------------------------------------------
     The one loop: hero depth + the passes
     --------------------------------------------------------------------- */
  var heroMedia = document.querySelector('.hero-media');
  var heroIn = document.querySelector('.hero-in');
  var heroEl = document.querySelector('.hero, .phero.has-img');

  var mobilePass = window.matchMedia('(max-width: 860px)');

  /* The passes. Desktop: one pinned stage; the active step follows scroll position, and a
     downward scroll gesture glides exactly one step then waits for the next gesture. Scrolling
     up is left alone. Mobile: steps sit in normal flow and the one mid-screen is active. */
  var passTick = null;
  (function () {
    var steps = document.querySelectorAll('.pass-step');
    var grid = document.querySelector('.pass-grid');
    var sticky = document.querySelector('.pass-sticky');
    var panel = document.querySelector('.pass-panel');
    if (!steps.length || !grid || !sticky || !panel) return;
    var images = document.querySelectorAll('.pass-panel .pass-image');
    var segs = document.querySelectorAll('.pass-meter-segment i');
    var n = steps.length;
    var current = -1;
    for (var q = 0; q < images.length; q++) images[q].style.setProperty('--i', q);

    function setStage(i) {
      if (i === current) return;
      current = i;
      for (var a = 0; a < steps.length; a++) {
        steps[a].classList.toggle('on', a === i);
        steps[a].classList.toggle('done', a <= i);
      }
      for (var j = 0; j < images.length; j++) {
        images[j].classList.toggle('on', j === i);
        images[j].setAttribute('aria-hidden', j === i ? 'false' : 'true');
      }
      for (var k = 0; k < segs.length; k++) segs[k].classList.toggle('on', k <= i);
    }
    setStage(0);

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!mobilePass.matches) return;
        entries.forEach(function (e) { if (e.isIntersecting) setStage(Number(e.target.dataset.index)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (st) { io.observe(st); });
    }

    function geom() {
      var top = parseFloat(getComputedStyle(sticky).top) || 0;
      var y = window.pageYOffset;
      var p0 = y + grid.getBoundingClientRect().top - top;          // scroll position where step 1 locks
      var step = n > 1 ? (grid.offsetHeight - sticky.offsetHeight) / (n - 1) : 1;
      return { y: y, p0: p0, step: step, end: p0 + step * (n - 1) };
    }

    passTick = function () {
      if (mobilePass.matches) return;
      var g = geom();
      var p = clamp((g.y - g.p0) / g.step, 0, n - 1);
      panel.style.setProperty('--p', p.toFixed(3));
      setStage(Math.round(p));
    };

    /* ---- the lock ---- */
    function lockOn() { return !reduced && finePointer && !mobilePass.matches; }
    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
    var gliding = false, consumed = false, lastWheel = 0;

    function glideTo(y) {
      var dur = 0.95;
      gliding = true; busy = true;
      var finished = false;
      function finish() { if (finished) return; finished = true; gliding = false; busy = false; }
      setTimeout(finish, dur * 1000 + 350);
      if (lenis) {
        lenis.scrollTo(y, { duration: dur, easing: easeOutQuart, lock: true, force: true, onComplete: finish });
        return;
      }
      var from = window.pageYOffset, delta = y - from, t0 = null;
      requestAnimationFrame(function f(ts) {
        if (t0 === null) t0 = ts;
        var pr = Math.min(1, (ts - t0) / (dur * 1000));
        window.scrollTo(0, from + delta * easeOutQuart(pr));
        if (pr < 1) requestAnimationFrame(f); else finish();
      });
    }

    /* one step down: the next lock position below where we are (only while in the section) */
    function stepDown() {
      var g = geom();
      if (g.y < g.p0 - vh * 0.5 || g.y >= g.end - 2) return false;
      var target = g.end;
      for (var i = 0; i < n; i++) {
        var pos = g.p0 + g.step * i;
        if (pos > g.y + 4) { target = pos; break; }
      }
      glideTo(target);
      return true;
    }

    window.addEventListener('wheel', function (e) {
      if (!lockOn() || e.ctrlKey) return;
      var now = performance.now();
      if (now - lastWheel >= 160) consumed = false;          // a pause = a new gesture
      lastWheel = now;
      if (gliding) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.deltaY <= 0) { consumed = false; return; }       // up is free scroll
      if (e.deltaY < 3) return;
      if (consumed) {                                         // same gesture still going: hold
        var g = geom();
        if (g.y >= g.p0 - vh * 0.5 && g.y < g.end - 2) { e.preventDefault(); e.stopPropagation(); }
        return;
      }
      if (stepDown()) { consumed = true; e.preventDefault(); e.stopPropagation(); }
    }, { passive: false, capture: true });

    window.addEventListener('keydown', function (e) {
      if (!lockOn() || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      if (e.key !== 'ArrowDown' && e.key !== 'PageDown' && e.key !== ' ') return;
      if (gliding) { e.preventDefault(); return; }
      if (stepDown()) e.preventDefault();
    });
  })();

  var tickId = 0;
  function queueTick() {
    if (!tickId) tickId = requestAnimationFrame(function (time) {
      tickId = 0;
      tick(time);
    });
  }
  function tick(time) {
    if (!('IntersectionObserver' in window)) revealCheck();
    if (lenis) lenis.raf(time);
    if (passTick) passTick();
    var y = scrollY();
    var keepTicking = !!lenis;

    if (heroEl && !reduced && !mobilePass.matches) {
      var hh = heroEl.offsetHeight;
      if (y < hh * 1.1) {
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
        heroIn.style.transform = 'translate3d(0,' + (y * 0.1).toFixed(1) + 'px,0)';
        heroIn.style.opacity = clamp(1 - y / (hh * 0.75), 0, 1).toFixed(3);
      }
    }

    if (keepTicking) queueTick();
  }
  if (lenis) lenis.on('scroll', queueTick);
  else window.addEventListener('scroll', queueTick, { passive: true });
  queueTick();
})();
