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

  /* "Get a quote" toggles: down to the form, or back to the top once there */
  var quote = document.getElementById('quote');
  function goQuote(forceDown) {
    if (!quote || busy) return;
    var top = quote.getBoundingClientRect().top - headerH();
    if (!forceDown && scrollY() > 100 && top < vh * 0.6) {
      scrollToY(0);
      history.replaceState(null, '', location.pathname);
    } else {
      scrollToEl(quote);
      history.replaceState(null, '', '#quote');
    }
  }
  document.querySelectorAll('[data-quote]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!quote) return;
      e.preventDefault();
      closeMenu();
      goQuote(false);
    });
  });
  /* "Get a quote on this" — picks the job type, then goes down */
  document.querySelectorAll('[data-job]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!quote) return;
      e.preventDefault();
      var sel = quote.querySelector('select[name="Job type"]');
      if (sel) sel.value = a.getAttribute('data-job');
      goQuote(true);
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
     Reveals — once only, never replayed
     --------------------------------------------------------------------- */
  /* checked every frame against position, so anything you jump or fling past
     is revealed too, never left invisible behind you */
  var pending = [].slice.call(document.querySelectorAll('.rv'));
  if (reduced) { pending.forEach(function (el) { el.classList.add('in'); }); pending = []; }
  function revealCheck() {
    if (!pending.length) return;
    var edge = vh * 0.92, keep = [];
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].getBoundingClientRect().top < edge) pending[i].classList.add('in');
      else keep.push(pending[i]);
    }
    pending = keep;
  }

  /* ---------------------------------------------------------------------
     Rails
     --------------------------------------------------------------------- */
  document.querySelectorAll('[data-rail]').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail');
    function step() { var f = rail.querySelector('figure'); return f ? f.getBoundingClientRect().width + 16 : 340; }
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
     The one loop: hero depth + the passes
     --------------------------------------------------------------------- */
  var heroMedia = document.querySelector('.hero-media');
  var heroIn = document.querySelector('.hero-in');
  var heroEl = document.querySelector('.hero');

  var track = document.querySelector('.pass-track');
  var panel = track && track.querySelector('.pass-panel');
  var p2 = track && track.querySelector('.plate-2');
  var p3 = track && track.querySelector('.plate-3');
  var band = track && track.querySelector('.pass-band');
  var sheen = track && track.querySelector('.pass-sheen');
  var meter = track && track.querySelector('.pass-meter i');
  var pSteps = track ? track.querySelectorAll('.pass-step') : [];
  var polish = 0, lastPolish = -1, stage = 0;

  function tick(time) {
    revealCheck();
    if (lenis) lenis.raf(time);
    var y = scrollY();

    if (heroEl && !reduced) {
      var hh = heroEl.offsetHeight;
      if (y < hh * 1.1) {
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
        heroIn.style.transform = 'translate3d(0,' + (y * 0.1).toFixed(1) + 'px,0)';
        heroIn.style.opacity = clamp(1 - y / (hh * 0.75), 0, 1).toFixed(3);
      }
    }

    if (track) {
      var r = track.getBoundingClientRect();
      var travel = r.height - vh;
      var raw = travel > 0 ? clamp(-r.top / travel, 0, 1) : 0;
      polish = reduced ? raw : lerp(polish, raw, 0.22);
      if (Math.abs(polish - lastPolish) > 0.0005) {
        lastPolish = polish;
        var e = polish;
        p2.style.opacity = smooth(0.12, 0.42, e).toFixed(3);
        p3.style.opacity = smooth(0.56, 0.86, e).toFixed(3);
        var ph = panel.clientHeight;
        band.style.transform = 'translate3d(0,' + (e * ph).toFixed(1) + 'px,0)';
        band.style.opacity = clamp(Math.sin(Math.PI * e) * 1.3, 0, 1).toFixed(3);
        sheen.style.transform = 'translate3d(' + ((e - 0.5) * 36).toFixed(2) + '%,0,0)';
        sheen.style.opacity = (smooth(0.55, 1, e) * 0.55).toFixed(3);
        meter.style.transform = 'scaleX(' + e.toFixed(4) + ')';
        /* the words on the left change at the same moment the photo does */
        var st = e < 0.27 ? 0 : e < 0.71 ? 1 : 2;
        if (st !== stage) {
          stage = st;
          for (var k = 0; k < pSteps.length; k++) pSteps[k].classList.toggle('on', k === st);
        }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
