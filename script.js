/* ==================================================================
   APEX RUN 2026 — interaction layer

   Structure:
     0. helpers + one shared scroll loop
     1. preloader + curtain
     2. scroll chrome (progress bar, nav state, hide-on-scroll)
     3. nav sheet + organisers accordion
     4. rails (gallery + highlights): drag, wheel, arrows, keys, autoplay
     5. hero motion
     6. reveal system
     7. pointer effects (tilt, magnet, spotlight)
     8. lightbox
     9. registration form
    10. page exit fade + back to top

   Every block is self-contained. If one throws, the page still reads.
================================================================== */

(() => {
  "use strict";

  /* =========================================================
     0. HELPERS + SHARED SCROLL LOOP
     One rAF loop for every scroll-driven effect. Separate
     listeners per effect is what makes a page feel gluey.
  ========================================================= */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const reduced  = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine     = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => matchMedia("(max-width: 900px)").matches;

  const scrollTasks = new Set();
  let scrollQueued = false;

  const onScroll = fn => { scrollTasks.add(fn); fn(scrollY); };

  function flushScroll() {
    scrollQueued = false;
    const y = scrollY;
    scrollTasks.forEach(fn => { try { fn(y); } catch (_) {} });
  }

  function requestScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(flushScroll);
  }

  addEventListener("scroll", requestScroll, { passive: true });
  addEventListener("resize", requestScroll, { passive: true });

  /* Debounced resize bus, for anything that needs to re-measure. */
  const resizeTasks = new Set();
  let resizeTimer = 0;
  const onResize = fn => resizeTasks.add(fn);
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resizeTasks.forEach(fn => { try { fn(); } catch (_) {} }), 140);
  }, { passive: true });

  // Run once, whether this file arrives before or after the DOM is parsed.
  // Without the readyState branch, a late-loading script would leave the
  // page stuck behind the preloader.
  let booted = false;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    if (booted) return;
    booted = true;

    initPreloader();
    initScrollChrome();
    initNavMenu();
    initOrgDropdown();
    initRails();
    initHeroMotion();
    initReveal();
    initPointerFX();
    initParticles();
    initAmenities();
    initLightbox();
    initSizeSuggestion();
    initPayment();
    initForm();
    initPageChrome();
  }

  /* =========================================================
     1. PRELOADER + CURTAIN
  ========================================================= */
  function initPreloader() {
    const preloader = $("#preloader");
    const fill      = $("#loaderFill");
    const pct       = $("#loaderPercent");
    const curtains  = $$(".curtain");

    const open = () => {
      document.body.classList.remove("is-loading");
      document.body.classList.add("hero-ready");
    };

    if (!preloader) { open(); return; }

    if (reduced) {
      preloader.remove();
      curtains.forEach(c => c.remove());
      open();
      document.body.classList.add("hero-settled");
      return;
    }

    let progress = 0;
    const minDuration = 1400;
    const started = Date.now();

    function tick() {
      const elapsed = Date.now() - started;
      const target  = Math.min(100, (elapsed / minDuration) * 100);

      // ease toward target so the bar never reads as a linear timer
      progress = Math.min(100, progress + (target - progress) * 0.25 + 0.6);

      if (fill) fill.style.width = progress + "%";
      if (pct)  pct.textContent  = Math.floor(progress) + "%";

      const ready = document.readyState === "complete";
      if (progress >= 99.5 && (ready || elapsed > 4500)) finish();
      else requestAnimationFrame(tick);
    }

    function finish() {
      preloader.classList.add("is-hidden");
      curtains.forEach(c => c.classList.add("is-open"));
      open();
      setTimeout(() => {
        preloader.remove();
        curtains.forEach(c => c.remove());
      }, 1100);
    }

    requestAnimationFrame(tick);
  }

  /* =========================================================
     2. SCROLL CHROME
     Progress bar, stuck nav, and hide-on-scroll-down. The nav
     comes straight back on any upward movement so the menu is
     never more than a flick away.
  ========================================================= */
  function initScrollChrome() {
    const bar    = $("#scrollProgress");
    const navbar = $("#navbar");
    let lastY = scrollY;

    onScroll(y => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const ratio = max > 0 ? clamp(y / max, 0, 1) : 0;

      if (bar) bar.style.transform = `scaleX(${ratio})`;
      if (!navbar) return;

      navbar.classList.toggle("is-stuck", y > 40);

      const goingDown = y > lastY + 4;
      const goingUp   = y < lastY - 4;
      const locked    = document.body.classList.contains("nav-open");

      if (goingDown && y > 420 && !locked) navbar.classList.add("is-tucked");
      else if (goingUp || y < 220 || locked) navbar.classList.remove("is-tucked");

      if (goingDown || goingUp) lastY = y;
    });
  }

  /* =========================================================
     3. NAV SHEET + SCROLL SPY
  ========================================================= */
  function initNavMenu() {
    const toggle   = $("#navToggle");
    const menu     = $("#navMenu");
    const backdrop = $("#navBackdrop");
    if (!toggle || !menu) return;

    const open = () => {
      menu.classList.add("is-open");
      backdrop?.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.classList.add("nav-open");
      $("#navbar")?.classList.remove("is-tucked");
    };

    const close = () => {
      menu.classList.remove("is-open");
      backdrop?.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("nav-open");
      document.dispatchEvent(new CustomEvent("apex:closeDropdown"));
    };

    toggle.addEventListener("click", () => {
      menu.classList.contains("is-open") ? close() : open();
    });

    backdrop?.addEventListener("click", close);

    // Any real link closes the sheet. Organisers is a <button>, so it can't.
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", close));

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) close();
    });

    const links = $$('.nav-link[href^="#"]', menu);
    const sections = links.map(l => $(l.getAttribute("href"))).filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const link = links.find(l => l.getAttribute("href") === `#${entry.target.id}`);
        if (!link) return;
        links.forEach(l => l.classList.remove("active-link"));
        link.classList.add("active-link");
      });
    }, { threshold: 0.3, rootMargin: "-24% 0px -50% 0px" });

    sections.forEach(s => spy.observe(s));
  }

  /* =========================================================
     3b. ORGANISERS DROPDOWN
     Desktop: floating panel. Mobile: accordion animated to its
     real measured height, so it can never be clipped.
  ========================================================= */
  function initOrgDropdown() {
    const wrap   = $("#orgDropdown");
    const toggle = $("#orgToggle");
    const panel  = $("#orgMenu");
    if (!wrap || !toggle || !panel) return;

    let hoverTimer = 0;

    const open = () => {
      clearTimeout(hoverTimer);
      wrap.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      if (isMobile()) panel.style.height = panel.scrollHeight + "px";
    };

    const close = () => {
      wrap.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      panel.style.height = "";
    };

    toggle.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      wrap.classList.contains("is-open") ? close() : open();
    });

    if (fine) {
      wrap.addEventListener("mouseenter", () => { if (!isMobile()) open(); });
      wrap.addEventListener("mouseleave", () => {
        if (isMobile()) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(close, 160);   // grace period crossing the gap
      });
    }

    document.addEventListener("click", e => { if (!wrap.contains(e.target)) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    document.addEventListener("apex:closeDropdown", close);
    panel.querySelectorAll("a").forEach(a => a.addEventListener("click", close));

    onResize(() => {
      if (!wrap.classList.contains("is-open")) { panel.style.height = ""; return; }
      panel.style.height = isMobile() ? panel.scrollHeight + "px" : "";
    });
  }

  /* =========================================================
     4. RAILS — the shared horizontal carousel controller
     Used by both the gallery and the highlights strip.

     Input methods, all working together:
       · click-drag with momentum   (desktop)
       · native swipe               (touch)
       · arrow buttons              (desktop)
       · arrow / Home / End keys    (keyboard)
       · shift + wheel, trackpad    (desktop)
     Autoplay yields to all of them and resumes after a pause.
  ========================================================= */
  function initRails() {
    const gallery = $("#albumScroll");
    if (gallery) {
      createRail(gallery, {
        mode: "step",
        interval: 4200,
        dots: $("#albumDots"),
        depth: true
      });
    }

    const marquee = $("#highlightsMarquee");
    const track   = $("#highlightsTrack");
    if (marquee && track) {
      createRail(marquee, {
        mode: "drift",
        speed: 32,
        track,
        depth: true
      });
    }
  }

  function createRail(scroller, config) {
    const cfg = Object.assign({
      mode: "step",       // "step" jumps a page at a time, "drift" glides
      speed: 32,          // px/sec, drift only
      interval: 4200,     // ms between jumps, step only
      resume: 3200,       // ms of quiet before autoplay returns
      depth: false,       // scale + dim items by distance from centre
      dots: null,
      track: null
    }, config);

    const rail    = scroller.closest("[data-rail]");
    const prevBtn = rail?.querySelector(".rail-prev");
    const nextBtn = rail?.querySelector(".rail-next");

    /* ---- drift mode duplicates its contents for a seamless wrap ---- */
    let wrapAt = 0;
    if (cfg.mode === "drift" && cfg.track && !reduced) {
      cfg.track.innerHTML += cfg.track.innerHTML;
      const kids = Array.from(cfg.track.children);
      kids.slice(kids.length / 2).forEach(el => el.setAttribute("aria-hidden", "true"));
    }

    const items = Array.from(cfg.track ? cfg.track.children : scroller.children)
      .filter(el => el.nodeType === 1);
    if (!items.length) return;

    let centres = [];
    let idle = true, dragging = false, hovering = false, focusHeld = false;
    let idleTimer = 0;

    const held = () => !idle || dragging || hovering || focusHeld || document.hidden;

    function measure() {
      centres = items.map(el => el.offsetLeft + el.offsetWidth / 2);
      if (cfg.mode === "drift") wrapAt = items[Math.floor(items.length / 2)]?.offsetLeft || 0;
    }

    function interrupt(ms = cfg.resume) {
      idle = false;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { idle = true; }, ms);
    }

    /* ---- depth: the item nearest the centre is the one in focus ---- */
    function paintDepth() {
      if (!cfg.depth || reduced) return;
      const mid   = scroller.scrollLeft + scroller.clientWidth / 2;
      const range = Math.max(scroller.clientWidth * 0.55, 1);
      for (let i = 0; i < items.length; i++) {
        const near = 1 - clamp(Math.abs(centres[i] - mid) / range, 0, 1);
        const el = items[i];
        if (el._near !== undefined && Math.abs(el._near - near) < 0.012) continue;
        el._near = near;
        el.style.setProperty("--near", near.toFixed(3));
      }
    }

    /* ---- dots ---- */
    let dotEls = [];
    if (cfg.dots) {
      items.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "album-dot" + (i === 0 ? " is-active" : "");
        dot.setAttribute("aria-label", `Show image ${i + 1}`);
        dot.addEventListener("click", () => {
          interrupt(5000);
          goTo(i);
        });
        cfg.dots.appendChild(dot);
      });
      cfg.dots.removeAttribute("aria-hidden");
      dotEls = Array.from(cfg.dots.children);
    }

    function nearestIndex() {
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      let best = 0, dist = Infinity;
      for (let i = 0; i < centres.length; i++) {
        const d = Math.abs(centres[i] - mid);
        if (d < dist) { dist = d; best = i; }
      }
      return best;
    }

    function paintDots() {
      if (!dotEls.length) return;
      const active = nearestIndex();
      dotEls.forEach((d, i) => d.classList.toggle("is-active", i === active));
    }

    function goTo(i, smooth = true) {
      const el = items[clamp(i, 0, items.length - 1)];
      if (!el) return;
      scroller.scrollTo({
        left: el.offsetLeft + el.offsetWidth / 2 - scroller.clientWidth / 2,
        behavior: smooth && !reduced ? "smooth" : "auto"
      });
    }

    function nudge(dir) {
      interrupt();
      if (cfg.mode === "step") {
        goTo(nearestIndex() + dir);
      } else {
        scroller.scrollBy({
          left: dir * scroller.clientWidth * 0.7,
          behavior: reduced ? "auto" : "smooth"
        });
      }
    }

    prevBtn?.addEventListener("click", () => nudge(-1));
    nextBtn?.addEventListener("click", () => nudge(1));

    function paintButtons() {
      if (!prevBtn || !nextBtn || cfg.mode === "drift") return;
      const max = scroller.scrollWidth - scroller.clientWidth;
      prevBtn.disabled = scroller.scrollLeft < 8;
      nextBtn.disabled = scroller.scrollLeft > max - 8;
    }

    /* ---- keyboard ---- */
    scroller.addEventListener("keydown", e => {
      const map = { ArrowRight: 1, ArrowLeft: -1 };
      if (map[e.key]) { e.preventDefault(); nudge(map[e.key]); return; }
      if (e.key === "Home") { e.preventDefault(); interrupt(); goTo(0); }
      if (e.key === "End")  { e.preventDefault(); interrupt(); goTo(items.length - 1); }
    });

    /* ---- wheel: only the horizontal axis, plus shift+wheel.
            Vertical wheel is left alone so the page never traps you. ---- */
    scroller.addEventListener("wheel", e => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal) { interrupt(); return; }        // native handles it
      if (!e.shiftKey) return;
      e.preventDefault();
      interrupt();
      scroller.scrollLeft += e.deltaY;
    }, { passive: false });

    /* ---- click-drag with momentum (mouse only; touch stays native) ---- */
    let down = false, moved = false, startX = 0, startLeft = 0;
    let lastX = 0, lastT = 0, velocity = 0, glideRaf = 0;

    scroller.addEventListener("pointerdown", e => {
      if (e.pointerType === "touch") { dragging = true; interrupt(); return; }
      if (e.button !== 0) return;
      cancelAnimationFrame(glideRaf);
      down = true; moved = false; dragging = true;
      startX = lastX = e.clientX;
      startLeft = scroller.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      interrupt();
    });

    scroller.addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - startX;

      if (!moved) {
        if (Math.abs(dx) < 4) return;
        moved = true;
        scroller.classList.add("is-dragging");
        try { scroller.setPointerCapture(e.pointerId); } catch (_) {}
      }

      const now = performance.now();
      const dt  = Math.max(now - lastT, 1);
      velocity  = ((e.clientX - lastX) / dt) * 16;   // px per frame
      lastX = e.clientX;
      lastT = now;

      scroller.scrollLeft = startLeft - dx;
      e.preventDefault();
    });

    function release() {
      dragging = false;
      if (!down) return;
      down = false;
      interrupt();
      // is-dragging stays on until the glide settles: it also disables
      // scroll-behavior:smooth, which would otherwise fight every frame.
      if (moved) glide();
      else scroller.classList.remove("is-dragging");
    }

    ["pointerup", "pointercancel", "pointerleave"].forEach(evt =>
      scroller.addEventListener(evt, release)
    );

    function glide() {
      let v = clamp(velocity, -70, 70);
      const step = () => {
        v *= 0.93;
        if (Math.abs(v) < 0.5) {
          scroller.classList.remove("is-dragging");
          if (cfg.mode === "step") goTo(nearestIndex());
          return;
        }
        scroller.scrollLeft -= v;
        glideRaf = requestAnimationFrame(step);
      };
      glideRaf = requestAnimationFrame(step);
    }

    // a drag that finishes on an image must not open the lightbox
    scroller.addEventListener("click", e => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }, true);

    /* ---- pause while the pointer or focus is inside ---- */
    if (fine) {
      scroller.addEventListener("mouseenter", () => { hovering = true; });
      scroller.addEventListener("mouseleave", () => { hovering = false; });
    }
    scroller.addEventListener("focusin",  () => { focusHeld = true; });
    scroller.addEventListener("focusout", () => { focusHeld = false; });
    ["touchstart", "keydown"].forEach(evt =>
      scroller.addEventListener(evt, () => interrupt(), { passive: true })
    );

    /* ---- scroll bookkeeping ---- */
    let painting = false;
    scroller.addEventListener("scroll", () => {
      if (painting) return;
      painting = true;
      requestAnimationFrame(() => {
        painting = false;
        paintDepth();
        paintDots();
        paintButtons();
      });
    }, { passive: true });

    /* ---- autoplay ---- */
    let pos = 0, last = performance.now(), autoRaf = 0;

    function driftFrame(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (held()) {
        pos = scroller.scrollLeft;
      } else {
        pos += cfg.speed * dt;
        if (wrapAt > 0 && pos >= wrapAt) pos -= wrapAt;
        scroller.scrollLeft = pos;
      }
      autoRaf = requestAnimationFrame(driftFrame);
    }

    function startAuto() {
      if (reduced) return;
      if (cfg.mode === "drift") {
        cancelAnimationFrame(autoRaf);
        last = performance.now();
        autoRaf = requestAnimationFrame(driftFrame);
      } else {
        setInterval(() => {
          if (held()) return;
          const max = scroller.scrollWidth - scroller.clientWidth;
          if (scroller.scrollLeft >= max - 12) goTo(0);
          else goTo(nearestIndex() + 1);
        }, cfg.interval);
      }
    }

    // Wrap backwards when the user drags past the start. Gated on the
    // interaction flags so autoplay's own scrollLeft = 0 at first paint
    // can't teleport the strip to the middle.
    if (cfg.mode === "drift") {
      scroller.addEventListener("scroll", () => {
        if (idle && !dragging) return;
        if (wrapAt > 0 && scroller.scrollLeft <= 0) {
          scroller.scrollLeft = wrapAt - 1;
          pos = scroller.scrollLeft;
        }
      }, { passive: true });
    }

    /* ---- videos in the strip only play while visible ---- */
    const videos = scroller.querySelectorAll("video");
    if (videos.length && "IntersectionObserver" in window) {
      const vo = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.isIntersecting
            ? entry.target.play().catch(() => {})
            : entry.target.pause();
        });
      }, { threshold: 0.35 });
      videos.forEach(v => vo.observe(v));
    }

    /* ---- boot ---- */
    const refresh = () => { measure(); paintDepth(); paintDots(); paintButtons(); };
    refresh();
    onResize(refresh);
    addEventListener("load", refresh);
    scroller.querySelectorAll("img").forEach(img => {
      if (!img.complete) img.addEventListener("load", refresh, { once: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (cfg.mode !== "drift") return;
      if (document.hidden) cancelAnimationFrame(autoRaf);
      else startAuto();
    });

    startAuto();
  }

  /* =========================================================
     5. HERO MOTION
     Pointer parallax and scroll exit share CSS variables, so
     the two never fight over the same transform.
  ========================================================= */
  function initHeroMotion() {
    const header  = $(".site-header");
    const heroBg  = $("#heroBg");
    const content = $("#heroContent");
    const logo    = $(".logo-neon");
    if (!header) return;

    // Hand control of .hero-content over to scroll once the intro finishes.
    content?.addEventListener("animationend", e => {
      if (e.animationName === "heroIn") document.body.classList.add("hero-settled");
    });

    if (reduced) return;

    onScroll(y => {
      const p = clamp(y / (innerHeight * 0.85), 0, 1);
      header.style.setProperty("--exit", p.toFixed(3));
      if (heroBg) {
        heroBg.style.setProperty("--sy", (y * 0.22).toFixed(1) + "px");
        heroBg.style.setProperty("--sz", (1 + p * 0.08).toFixed(3));
      }
    });

    if (!fine) return;

    let raf = 0;
    header.addEventListener("mousemove", e => {
      const rect = header.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        heroBg?.style.setProperty("--mx", (x * -18).toFixed(1) + "px");
        heroBg?.style.setProperty("--my", (y * -12).toFixed(1) + "px");
        if (logo) logo.style.transform = `rotateY(${(x * 11).toFixed(2)}deg) rotateX(${(y * -8).toFixed(2)}deg)`;
      });
    });

    header.addEventListener("mouseleave", () => {
      heroBg?.style.setProperty("--mx", "0px");
      heroBg?.style.setProperty("--my", "0px");
      if (logo) logo.style.transform = "";
    });
  }

  /* =========================================================
     6. REVEAL
     Children of [data-stagger] inherit an index, so a group
     arrives as one wave instead of all at once.
  ========================================================= */
  function initReveal() {
    $$("[data-stagger]").forEach(group => {
      Array.from(group.children).forEach((child, i) => {
        child.style.setProperty("--stagger", i);
      });
    });

    const targets = $$(".reveal, .album-item, .highlight-item");
    if (!targets.length) return;

    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach(el => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    targets.forEach(el => observer.observe(el));
  }

  /* =========================================================
     7. POINTER EFFECTS
  ========================================================= */
  function initPointerFX() {
    if (!fine || reduced) return;

    /* spotlight */
    const glow = $("#cursorGlow");
    if (glow) {
      let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;

      document.addEventListener("mousemove", e => {
        tx = e.clientX; ty = e.clientY;
        glow.classList.add("is-active");
      }, { passive: true });

      document.addEventListener("mouseleave", () => glow.classList.remove("is-active"));

      (function loop() {
        cx += (tx - cx) * 0.12;
        cy += (ty - cy) * 0.12;
        glow.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        requestAnimationFrame(loop);
      })();
    }

    /* tilt cards */
    $$(".tilt-card").forEach(card => {
      let raf = 0;
      card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top)  / rect.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(900px) rotateX(${((py - 0.5) * -8).toFixed(2)}deg) ` +
            `rotateY(${((px - 0.5) * 10).toFixed(2)}deg) translateY(-6px) scale(1.02)`;
          card.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
          card.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        });
      });
      card.addEventListener("mouseleave", () => {
        cancelAnimationFrame(raf);
        card.style.transform = "";
      });
    });

    /* magnetic buttons */
    $$("[data-magnetic]").forEach(el => {
      el.addEventListener("mousemove", e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${(x * 0.16).toFixed(1)}px, ${(y * 0.26 - 4).toFixed(1)}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });

  }

  /* Ambient particles. These are not pointer-driven, so they run on
     touch devices too — hence a separate function from the effects above. */
  function initParticles() {
    if (reduced) return;

    $$(".bubbles").forEach(container => {
      const count = innerWidth < 600 ? 7 : 14;
      for (let i = 0; i < count; i++) {
        const b = document.createElement("span");
        const duration = 12 + Math.random() * 14;
        b.className = "bubble";
        b.style.width = b.style.height = (10 + Math.random() * 46) + "px";
        b.style.left = (Math.random() * 100) + "%";
        b.style.setProperty("--drift", (Math.random() * 80 - 40).toFixed(0) + "px");
        b.style.animationDuration = duration + "s";
        b.style.animationDelay = (Math.random() * -duration) + "s";
        container.appendChild(b);
      }
    });

    const embers = $("#heroEmbers");
    if (!embers) return;

    const count = innerWidth < 600 ? 14 : 28;
    for (let i = 0; i < count; i++) {
      const e = document.createElement("span");
      const duration = 9 + Math.random() * 10;
      e.className = "ember" + (Math.random() > 0.65 ? " gold" : "");
      e.style.width = e.style.height = (2 + Math.random() * 4) + "px";
      e.style.left = (Math.random() * 100) + "%";
      e.style.setProperty("--drift", (Math.random() * 60 - 30).toFixed(0) + "px");
      e.style.animationDuration = duration + "s";
      e.style.animationDelay = (Math.random() * -duration) + "s";
      embers.appendChild(e);
    }
  }

  /* =========================================================
     8. AMENITIES + LIGHTBOX
  ========================================================= */
  function initAmenities() {
    $$(".rules-toggle").forEach(button => {
      button.addEventListener("click", e => {
        // getElementById, not querySelector: ids like "3k-rules" start with
        // a digit, which is legal in HTML but an invalid CSS selector.
        const panel = document.getElementById(button.getAttribute("aria-controls"));

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
        ripple.style.top  = (e.clientY - rect.top  - size / 2) + "px";
        button.appendChild(ripple);
        ripple.addEventListener("animationend", () => ripple.remove());

        if (!panel) return;
        const wasOpen = panel.classList.contains("active");

        $$(".event-rules").forEach(el => el.classList.remove("active"));
        $$(".rules-toggle").forEach(btn => {
          btn.textContent = "Amenities";
          btn.setAttribute("aria-expanded", "false");
        });

        if (!wasOpen) {
          panel.classList.add("active");
          button.textContent = "Hide amenities";
          button.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  function initLightbox() {
    const box   = $("#lightbox");
    const img   = box?.querySelector(".lightbox-img");
    const close = box?.querySelector(".close-btn");
    if (!box || !img) return;

    let opener = null;

    const hide = () => {
      box.classList.remove("active");
      document.body.style.overflow = "";
      opener?.focus?.();
    };

    // delegated, so cloned marquee items work too
    document.addEventListener("click", e => {
      const source = e.target.closest?.(".album-item img, .highlight-item img");
      if (!source) return;
      opener = source;
      img.src = source.currentSrc || source.src;
      img.alt = source.alt || "";
      box.classList.add("active");
      document.body.style.overflow = "hidden";
      close?.focus?.();
    });

    close?.addEventListener("click", hide);
    close?.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hide(); }
    });
    box.addEventListener("click", e => { if (e.target !== img) hide(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && box.classList.contains("active")) hide();
    });
  }

  /* =========================================================
     9. REGISTRATION
  ========================================================= */
  function initSizeSuggestion() {
    const ageInput = $("#age");
    const note     = $("#sizeSuggestion");
    if (!ageInput || !note) return;

    const sizeByAge = age => {
      if (age <= 7)  return "6-8Y";
      if (age <= 10) return "8-10Y";
      if (age <= 12) return "10-12Y";
      if (age <= 15) return "XS";
      if (age <= 18) return "S";
      if (age <= 25) return "M";
      if (age <= 35) return "L";
      if (age <= 45) return "XL";
      if (age <= 55) return "XXL";
      return "XXXL";
    };

    ageInput.addEventListener("input", () => {
      const age = parseInt(ageInput.value, 10);
      if (!age || age < 1) { note.textContent = ""; return; }

      const size = sizeByAge(age);
      note.innerHTML = `Suggested size: <strong>${size}</strong> — change it if you prefer another fit.`;
      note.classList.remove("is-fresh");
      void note.offsetWidth;
      note.classList.add("is-fresh");
      $$('input[name="size"]').forEach(r => { r.checked = r.value === size; });
    });
  }

  function initPayment() {
    const qrImage  = $("#qrImage");
    const qrLabel  = $("#qrLabel");
    const utrGroup = $("#utrGroup");

    const qrMap = {
      "3K":  { src: "qr-3k.jpeg",  text: "Scan and pay ₹250 for the 3K run" },
      "5K":  { src: "qr-5k.jpeg",  text: "Scan and pay ₹350 for the 5K run" },
      "10K": { src: "qr-10k.jpeg", text: "Scan and pay ₹450 for the 10K run" }
    };

    $$('input[name="run"]').forEach(radio => {
      radio.addEventListener("change", () => {
        const entry = qrMap[radio.value];
        if (!entry || !qrImage) return;

        const visible = qrImage.classList.contains("is-shown");
        if (visible) qrImage.classList.remove("is-shown");

        setTimeout(() => {
          qrImage.src = entry.src;
          qrImage.hidden = false;
          if (qrLabel) qrLabel.textContent = entry.text;
          void qrImage.offsetWidth;
          qrImage.classList.add("is-shown");
          if (utrGroup) { utrGroup.hidden = false; utrGroup.classList.add("is-shown"); }
        }, visible ? 180 : 0);
      });
    });
  }

  function initForm() {
    const form = $("#registrationForm");
    if (!form) return;

    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8U4XBl2d20-0veslXtFbBDieYum5X_I_inZsVps79D9cdKbtQkzER-Zx5TVwKbXA85A/exec";

    const qrImage  = $("#qrImage");
    const qrLabel  = $("#qrLabel");
    const utrGroup = $("#utrGroup");

    form.addEventListener("submit", async e => {
      e.preventDefault();

      const btn  = form.querySelector(".register-btn");
      const data = new FormData(form);
      const phone = (data.get("phone") || "").replace(/\D/g, "");
      const utr   = (data.get("utr")   || "").trim();

      if (!data.get("run"))  { alert("Select a run category to continue."); return; }
      if (!data.get("size")) { alert("Select a T-shirt size to continue."); return; }
      if (!/^[0-9]{10}$/.test(phone)) { alert("Enter a 10-digit phone number."); return; }
      if (!/^[A-Za-z0-9]{10,20}$/.test(utr)) {
        alert("Enter the UTR / transaction ID from your payment (10–20 letters or digits).");
        $("#utrInput")?.focus();
        return;
      }

      const reset = label => { btn.textContent = label; btn.disabled = false; };

      btn.textContent = "Sending…";
      btn.disabled = true;

      try {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            name:         data.get("name"),
            location:     data.get("location"),
            phone,
            email:        data.get("email"),
            age:          data.get("age"),
            run:          data.get("run"),
            size:         data.get("size"),
            organisation: data.get("organisation"),
            utr
          })
        });

        const result = await response.json();

        if (result.status === "success") {
          btn.textContent = "Registered";
          btn.classList.add("is-done");
          form.reset();

          qrImage?.classList.remove("is-shown");
          if (qrImage) qrImage.hidden = true;
          if (qrLabel) qrLabel.textContent = "Select a run to see the payment QR";
          if (utrGroup) { utrGroup.hidden = true; utrGroup.classList.remove("is-shown"); }
          const note = $("#sizeSuggestion"); if (note) note.textContent = "";

          setTimeout(() => {
            btn.classList.remove("is-done");
            reset("Complete registration");
          }, 4000);

        } else if (result.status === "duplicate_phone") {
          alert("That phone number is already registered.");
          reset("Complete registration");

        } else if (result.status === "duplicate_utr") {
          alert("That UTR / transaction ID has already been used.");
          reset("Complete registration");

        } else {
          alert("Registration didn't go through. Please try again.");
          reset("Complete registration");
        }

      } catch (err) {
        console.error("Submit error:", err);
        alert("Couldn't reach the server. Check your connection and try again.");
        reset("Complete registration");
      }
    });
  }

  /* =========================================================
     10. PAGE CHROME — exit fade + back to top
  ========================================================= */
  function initPageChrome() {
    const top = $("#backTop");
    if (top) {
      onScroll(y => top.classList.toggle("is-shown", y > innerHeight * 1.2));
      top.addEventListener("click", () => {
        scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      });
    }

    if (reduced) return;

    // Fade out before navigating to an organiser page, so the jump
    // between pages reads as one continuous piece.
    $$('a[href$=".html"]').forEach(link => {
      link.addEventListener("click", e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (link.target === "_blank" || link.origin !== location.origin) return;
        e.preventDefault();
        document.body.classList.add("is-leaving");
        setTimeout(() => { location.href = link.href; }, 380);
      });
    });

    addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));
  }
})();


/* ==================================================================
   THREE.JS HERO VFX — dust and embers in the dawn sky.
   Desktop only; the CSS embers already carry mobile.
================================================================== */
(function initHeroVFX() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas || innerWidth <= 768 || !window.THREE) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: false, powerPreference: "low-power"
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const count     = 900;
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);
  const cyan = new THREE.Color(0x00f0ff);
  const gold = new THREE.Color(0xffb703);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * 15;
    positions[i3 + 1] = (Math.random() - 0.5) * 8;
    positions[i3 + 2] = (Math.random() - 0.5) * 10;
    const c = Math.random() > 0.7 ? gold : cyan;
    colors[i3] = c.r; colors[i3 + 1] = c.g; colors[i3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.035, transparent: true, opacity: 0.75, vertexColors: true
  }));
  scene.add(points);

  // The dust drifts toward the camera as you scroll away from the hero.
  let depth = 0, targetDepth = 0;
  addEventListener("scroll", () => {
    targetDepth = Math.min(scrollY / innerHeight, 1) * 1.6;
  }, { passive: true });

  let raf = 0, running = false;

  function animate() {
    raf = requestAnimationFrame(animate);
    depth += (targetDepth - depth) * 0.05;
    points.rotation.y += 0.0006;
    points.rotation.x += 0.0002;
    points.position.y  = Math.sin(Date.now() * 0.00015) * 0.15;
    points.position.z  = depth;
    renderer.render(scene, camera);
  }

  const start = () => { if (!running) { running = true; animate(); } };
  const stop  = () => { running = false; cancelAnimationFrame(raf); };

  // Stop rendering entirely once the hero is off screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(canvas);
  } else {
    start();
  }

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!canvas.clientWidth) return;
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }, 150);
  });

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });
})();
