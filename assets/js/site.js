/* Polycrete — site behaviour */
(function () {
  'use strict';

  /* ---- mobile nav ---- */
  var burger = document.querySelector('.burger');
  var mnav = document.querySelector('.mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = mnav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mnav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mnav.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- reveal on scroll ---- */
  var rv = document.querySelectorAll('.rv');
  if (rv.length) {
    if (!('IntersectionObserver' in window)) {
      rv.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      rv.forEach(function (el, i) {
        el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
        io.observe(el);
      });
    }
  }

  /* ---- horizontal rails ---- */
  document.querySelectorAll('.rail-wrap').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail');
    var prev = wrap.querySelector('[data-rail="prev"]');
    var next = wrap.querySelector('[data-rail="next"]');
    if (!rail) return;
    function step() {
      var fig = rail.querySelector('figure');
      return fig ? fig.getBoundingClientRect().width + 16 : 340;
    }
    if (prev) prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: 'smooth' }); });
  });

  /* ---- before / after sliders ---- */
  document.querySelectorAll('.ba').forEach(function (ba) {
    var after = ba.querySelector('.ba-after');
    var line = ba.querySelector('.ba-line');
    var grip = ba.querySelector('.ba-grip');
    var dragging = false;

    function set(pct) {
      pct = Math.max(2, Math.min(98, pct));
      after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      line.style.left = pct + '%';
      grip.style.left = pct + '%';
      ba.setAttribute('aria-valuenow', Math.round(pct));
    }
    function fromEvent(e) {
      var r = ba.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      set((x / r.width) * 100);
    }
    ba.addEventListener('mousedown', function (e) { dragging = true; fromEvent(e); e.preventDefault(); });
    window.addEventListener('mousemove', function (e) { if (dragging) fromEvent(e); });
    window.addEventListener('mouseup', function () { dragging = false; });
    ba.addEventListener('touchstart', function (e) { dragging = true; fromEvent(e); }, { passive: true });
    ba.addEventListener('touchmove', function (e) { if (dragging) { fromEvent(e); e.preventDefault(); } }, { passive: false });
    ba.addEventListener('touchend', function () { dragging = false; });
    ba.addEventListener('keydown', function (e) {
      var cur = parseFloat(ba.getAttribute('aria-valuenow') || '50');
      if (e.key === 'ArrowLeft') { set(cur - 4); e.preventDefault(); }
      if (e.key === 'ArrowRight') { set(cur + 4); e.preventDefault(); }
    });
    set(50);
  });

  /* ---- lightbox ---- */
  var lb = document.querySelector('.lb');
  if (lb) {
    var lbImg = lb.querySelector('img');
    document.querySelectorAll('.ggrid figure').forEach(function (fig) {
      fig.addEventListener('click', function () {
        var img = fig.querySelector('img');
        if (!img) return;
        lbImg.src = img.getAttribute('data-full') || img.src;
        lbImg.alt = img.alt;
        lb.classList.add('on');
        document.body.style.overflow = 'hidden';
      });
    });
    function close() { lb.classList.remove('on'); document.body.style.overflow = ''; }
    lb.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---- prefill job type from a service link ---- */
  var params = new URLSearchParams(window.location.search);
  var job = params.get('job');
  if (job) {
    var sel = document.querySelector('select[name="Job type"]');
    if (sel) {
      Array.prototype.forEach.call(sel.options, function (o) {
        if (o.value.toLowerCase() === job.toLowerCase()) sel.value = o.value;
      });
    }
  }
})();
