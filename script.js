/* ============================================
   PORTFOLIO — script.js
   Handles: collage layout + float animation,
   page transitions, scroll fade-in.
   ============================================ */

/* ─── Global State ──────────────────────────── */
const S = { tick: 0 };

/* ────────────────────────────────────────────── */
/*  COLLAGE LAYOUT & FLOAT ANIMATION              */
/* ────────────────────────────────────────────── */

/*
 * [angleDeg, radiusFactor, baseRotDeg, sizeFactor]
 * All positions verified to clear the portrait's
 * horizontal footprint in the lower half of screen.
 */
const LAYOUT = [
  [ -160, 0.40,  0,  1.0 ],   // far left, mid-height
  [ -118, 0.40,   0,  1.0  ],   // upper-left
  [  -75, 0.30,  0,  1.0 ],   // top-left
  [  -32, 0.40,   0,  1.0 ],   // top
  [   40, 0.40,  0,  1.0  ],   // top-right
  [   0, 0.3,   0,  1.0 ],   // far right (clears portrait)
  [  162, 0.40,  0,  1.0  ],   // far left (clears portrait)
  [ -172, 0.2,   0,  1.0 ],   // far left, lower
];

let floatRunning = false;

function initCollage() {
  const thumbs = document.querySelectorAll('.project-thumb');
  if (!thumbs.length) return;

  thumbs.forEach(thumb => {
    if (!thumb.dataset.phase) {
      thumb.dataset.phase = (Math.random() * Math.PI * 2).toFixed(4);
      thumb.dataset.spd   = (0.55 + Math.random() * 0.7).toFixed(3);
    }
  });

  if (window.innerWidth <= 768) return; // CSS grid handles mobile

  positionThumbs(thumbs);

  if (!floatRunning) {
    floatRunning = true;
    animateFloat(thumbs);
  }
}

function positionThumbs(thumbs) {
  const refSize = Math.min(window.innerWidth, window.innerHeight);

  thumbs.forEach((thumb, i) => {
    // Use baked-in positions from HTML data attrs; fall back to LAYOUT
    let bx  = parseFloat(thumb.dataset.bx);
    let by  = parseFloat(thumb.dataset.by);
    let rot = parseFloat(thumb.dataset.brot) || 0;

    if (isNaN(bx) || isNaN(by)) {
      const [angle, rFactor, baseRot] = LAYOUT[i] || [i * 45, 0.36, 0];
      const rad    = (angle * Math.PI) / 180;
      const radius = refSize * rFactor;
      bx  = Math.cos(rad) * radius;
      by  = Math.sin(rad) * radius;
      rot = baseRot;
      thumb.dataset.bx   = bx;
      thumb.dataset.by   = by;
      thumb.dataset.brot = rot;
    }

    thumb.style.left      = '50%';
    thumb.style.top       = '50%';
    thumb.style.transform = `translate(calc(-50% + ${bx}px), calc(-50% + ${by}px)) rotate(${rot}deg)`;

    thumb.style.opacity    = '0';
    thumb.style.transition = `opacity 0.9s cubic-bezier(0.23,1,0.32,1) ${160 + i * 70}ms`;
    requestAnimationFrame(() => { thumb.style.opacity = '1'; });
  });
}

function animateFloat(thumbs) {
  const AMP = 30;

  (function loop() {
    S.tick++;
    if (window.innerWidth > 768) {
      const t = S.tick * 0.00042;
      thumbs.forEach(thumb => {
        if (thumb.matches(':hover') || thumb.dataset.dragging || thumb.dataset.sliding) return;
        const bx    = parseFloat(thumb.dataset.bx)    || 0;
        const by    = parseFloat(thumb.dataset.by)    || 0;
        const brot  = parseFloat(thumb.dataset.brot)  || 0;
        const phase = parseFloat(thumb.dataset.phase) || 0;
        const spd   = parseFloat(thumb.dataset.spd)   || 1;
        const fx    = Math.sin(t * spd + phase)        * AMP * 0.6;
        const fy    = Math.cos(t * spd * 0.75 + phase) * AMP;
        thumb.style.transform =
          `translate(calc(-50% + ${bx + fx}px), calc(-50% + ${by + fy}px)) ` +
          `rotate(${brot + fx * 0.04}deg)`;
      });
    }
    requestAnimationFrame(loop);
  })();
}

/* Re-position on resize (debounced) */
(function () {
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (window.innerWidth > 768)
        positionThumbs(document.querySelectorAll('.project-thumb'));
    }, 200);
  });
})();

/* ────────────────────────────────────────────── */
/*  DRAGGABLE THUMBNAILS + ICE PHYSICS            */
/* ────────────────────────────────────────────── */
function initDraggable() {
  if (window.innerWidth <= 768) return;

  const FRICTION   = 0.97;
  const BOUNCE     = 0.72;
  const MAX_V      = 45;
  const THUMB_HALF = 78;
  const HEADER_H   = 58;

  document.querySelectorAll('.project-thumb').forEach(thumb => {
    let dragging = false;
    let startMX, startMY, startBX, startBY;
    let vx = 0, vy = 0;
    let slideRaf = null;
    const trail = [];

    function walls() {
      return {
        l: -(window.innerWidth  / 2 - THUMB_HALF),
        r:   window.innerWidth  / 2 - THUMB_HALF,
        t: -(window.innerHeight / 2 - THUMB_HALF - HEADER_H),
        b:   window.innerHeight / 2 - THUMB_HALF,
      };
    }

    function stopSlide() {
      if (slideRaf) { cancelAnimationFrame(slideRaf); slideRaf = null; }
      delete thumb.dataset.sliding;
    }

    function startSlide() {
      stopSlide();
      thumb.dataset.sliding = '1';

      (function step() {
        vx *= FRICTION;
        vy *= FRICTION;

        if (Math.abs(vx) < 0.15 && Math.abs(vy) < 0.15) { stopSlide(); return; }

        let bx = parseFloat(thumb.dataset.bx) || 0;
        let by = parseFloat(thumb.dataset.by) || 0;
        bx += vx;
        by += vy;

        const w = walls();
        if (bx < w.l) { bx = w.l; vx =  Math.abs(vx) * BOUNCE; }
        if (bx > w.r) { bx = w.r; vx = -Math.abs(vx) * BOUNCE; }
        if (by < w.t) { by = w.t; vy =  Math.abs(vy) * BOUNCE; }
        if (by > w.b) { by = w.b; vy = -Math.abs(vy) * BOUNCE; }

        thumb.dataset.bx = bx;
        thumb.dataset.by = by;
        thumb.style.transform =
          `translate(calc(-50% + ${bx}px), calc(-50% + ${by}px)) rotate(${vx * 0.06}deg)`;

        slideRaf = requestAnimationFrame(step);
      })();
    }

    thumb.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      stopSlide();
      dragging = true;
      startMX = e.clientX;
      startMY = e.clientY;
      startBX = parseFloat(thumb.dataset.bx) || 0;
      startBY = parseFloat(thumb.dataset.by) || 0;
      trail.length = 0;
      trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      thumb.dataset.dragging = '1';
      thumb.style.transition = 'none';
      thumb.style.zIndex = '20';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      const dx = e.clientX - startMX;
      const dy = e.clientY - startMY;
      thumb.dataset.bx = startBX + dx;
      thumb.dataset.by = startBY + dy;
      thumb.style.transform =
        `translate(calc(-50% + ${thumb.dataset.bx}px), calc(-50% + ${thumb.dataset.by}px)) rotate(0deg)`;
      trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (trail.length > 10) trail.shift();
    });

    window.addEventListener('mouseup', e => {
      if (!dragging) return;
      dragging = false;
      thumb.style.zIndex = '';
      document.body.style.userSelect = '';

      const moved = Math.abs(e.clientX - startMX) > 4 || Math.abs(e.clientY - startMY) > 4;
      if (moved) {
        thumb.addEventListener('click',
          ev => { ev.stopImmediatePropagation(); ev.preventDefault(); },
          { capture: true, once: true });

        const now = performance.now();
        const recent = trail.filter(p => now - p.t < 80);
        if (recent.length >= 2) {
          const f = recent[0], l = recent[recent.length - 1];
          const frames = Math.max((l.t - f.t) / (1000 / 60), 1);
          vx = (l.x - f.x) / frames;
          vy = (l.y - f.y) / frames;
          const speed = Math.hypot(vx, vy);
          if (speed > MAX_V) { vx = vx / speed * MAX_V; vy = vy / speed * MAX_V; }
          if (speed > 0.5) { startSlide(); return; }
        }
      }

      delete thumb.dataset.dragging;
    });
  });
}

/* ────────────────────────────────────────────── */
/*  PAGE TRANSITIONS                              */
/* ────────────────────────────────────────────── */
function initTransitions() {
  const overlay = document.getElementById('page-transition');
  if (!overlay) return;

  overlay.style.opacity    = '1';
  overlay.style.transition = 'opacity 0.55s cubic-bezier(0.23,1,0.32,1)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-href], a[href]');
    if (!link) return;
    const href = link.dataset.href || link.getAttribute('href');
    if (!href) return;
    const isLocal  = href.endsWith('.html') || (href.startsWith('/') && !href.startsWith('//'));
    const isAnchor = href.startsWith('#');
    if (!isLocal || isAnchor) return;
    e.preventDefault();
    overlay.classList.add('active');
    setTimeout(() => { window.location.href = href; }, 440);
  });
}

/* ────────────────────────────────────────────── */
/*  SCROLL FADE-IN                                */
/* ────────────────────────────────────────────── */
function initScrollFade() {
  const targets = document.querySelectorAll('.fade-in');
  if (!targets.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
  targets.forEach(el => obs.observe(el));
}

/* ────────────────────────────────────────────── */
/*  VIDEO PLAYER (project pages)                  */
/* ────────────────────────────────────────────── */
function initVideoPlayer() {
  const overlay = document.querySelector('.video-overlay');
  const video   = document.querySelector('.project-video');
  if (!overlay || !video) return;
  overlay.addEventListener('click', () => {
    overlay.classList.add('hidden');
    video.play();
    video.setAttribute('controls', '');
  });
  video.addEventListener('pause', () => { overlay.classList.remove('hidden'); });
  video.addEventListener('ended', () => { overlay.classList.remove('hidden'); });
}

/* ────────────────────────────────────────────── */
/*  LIGHTBOX                                      */
/* ────────────────────────────────────────────── */
function initLightbox() {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightbox-img');
  const lbCap   = document.getElementById('lightbox-caption');
  const lbClose = document.getElementById('lightbox-close');
  if (!lb) return;

  function open(src, alt, caption) {
    lbImg.src = src;
    lbImg.alt = alt;
    lbCap.textContent = caption;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.project-figure').forEach(fig => {
    const img = fig.querySelector('img');
    const cap = fig.querySelector('figcaption');
    if (!img) return;
    img.addEventListener('click', () => open(img.src, img.alt, cap ? cap.textContent : ''));
  });

  lbClose.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ────────────────────────────────────────────── */
/*  BOOT                                          */
/* ────────────────────────────────────────────── */
window.addEventListener('pageshow', e => {
  if (e.persisted) {
    const overlay = document.getElementById('page-transition');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initCollage();
  initDraggable();
  initTransitions();
  initScrollFade();
  initVideoPlayer();
  initLightbox();

  const arrow  = document.querySelector('.scroll-arrow');
  const footer = document.querySelector('.footer');
  if (arrow && footer) {
    new IntersectionObserver(([entry]) => {
      arrow.classList.toggle('hidden', entry.isIntersecting);
    }, { threshold: 0.05 }).observe(footer);
  }

  // Parallax: thumbs scroll at half speed
  const thumbsWrapper = document.querySelector('.thumbs-wrapper');
  if (thumbsWrapper) {
    window.addEventListener('scroll', () => {
      thumbsWrapper.style.transform = `translateY(${window.scrollY * 0.5}px)`;
    }, { passive: true });
  }
});
