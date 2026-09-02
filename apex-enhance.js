/* ==============================================================
   APEX RUN 2026 — ENHANCEMENT LAYER
   Load AFTER script.js. Everything here is additive and guarded,
   so if an element is missing the block simply skips.
============================================================== */

(function () {
  "use strict";

  /* ---- Config you may want to change ---- */
  const CONFIG = {
    // Race start. Drives the hero status pill.
    eventStart: "2026-05-10T05:00:00+05:30",
    // Sections that get a drawn frame.
    framedSections: [
      ".album-section",
      "#highlights",
      "#events",
      ".roadmap-section",
      "#venue",
      "#contact"
    ]
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    skipLink();
    sectionFrames();
    scrollProgress();
    toastSystem();
    backToTop();
    stickyCta();
    eventStatus();
    cardSpotlights();
    mediaSkeletons();
    lightboxGallery();
    formUpgrades();
    fixGalleryLinks();
  }

  /* ==========================================================
     Skip link — first tab stop, jumps past the nav
  ========================================================== */
  function skipLink() {
    const target = $("#about");
    if (!target) return;
    const a = document.createElement("a");
    a.className = "skip-link";
    a.href = "#about";
    a.textContent = "Skip to content";
    document.body.prepend(a);
  }

  /* ==========================================================
     Section frames — bracketed border that draws on arrival
  ========================================================== */
  function sectionFrames() {
    const sections = CONFIG.framedSections
      .map((sel) => $(sel))
      .filter(Boolean);

    if (!sections.length) return;

    const frames = sections.map((section) => {
      section.classList.add("has-sec-frame");
      if (getComputedStyle(section).position === "static") {
        section.style.position = "relative";
      }

      const frame = document.createElement("div");
      frame.className = "sec-frame";
      frame.setAttribute("aria-hidden", "true");
      frame.innerHTML =
        '<span class="sec-frame-edge top"></span>' +
        '<span class="sec-frame-edge bottom"></span>' +
        '<span class="sec-frame-edge left"></span>' +
        '<span class="sec-frame-edge right"></span>' +
        '<span class="sec-frame-corner tl"></span>' +
        '<span class="sec-frame-corner tr"></span>' +
        '<span class="sec-frame-corner bl"></span>' +
        '<span class="sec-frame-corner br"></span>' +
        '<span class="sec-frame-spark"></span>';

      section.prepend(frame);
      return frame;
    });

    if (reduced || !("IntersectionObserver" in window)) {
      frames.forEach((f) => f.classList.add("is-drawn"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-drawn");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    frames.forEach((f) => io.observe(f));
  }

  /* ==========================================================
     Scroll progress bar
  ========================================================== */
  function scrollProgress() {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, pct)) + ")";
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  }

  /* ==========================================================
     Toasts — and a shim so every existing alert() becomes one.
     script.js calls alert() in six places; this upgrades all of
     them without touching that file.
  ========================================================== */
  let stack;

  function toastSystem() {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);

    const nativeAlert = window.alert.bind(window);

    window.alert = function (message) {
      try {
        toast(String(message));
      } catch (err) {
        nativeAlert(message);
      }
    };
  }

  function toneOf(text) {
    if (/✅|success|registered/i.test(text)) return "good";
    if (/❌|failed|error/i.test(text)) return "bad";
    if (/⚠️|please|invalid|already/i.test(text)) return "warn";
    return "info";
  }

  function toast(message, tone) {
    if (!stack) return;

    const resolved = tone || toneOf(message);
    const clean = message.replace(/^[⚠️❌✅\s]+/u, "").trim() || message;
    const icons = { good: "✓", bad: "!", warn: "!", info: "i" };

    const el = document.createElement("div");
    el.className = "toast";
    el.dataset.tone = resolved;

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.textContent = icons[resolved] || "i";

    const body = document.createElement("span");
    body.textContent = clean;

    const close = document.createElement("button");
    close.className = "toast-close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";

    el.append(icon, body, close);
    stack.appendChild(el);

    const remove = () => {
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 350);
    };

    close.addEventListener("click", remove);
    setTimeout(remove, resolved === "bad" ? 7000 : 5000);

    // Never let more than three pile up
    while (stack.children.length > 3) stack.firstElementChild.remove();
  }

  /* ==========================================================
     Back to top, with a ring that tracks scroll depth
  ========================================================== */
  function backToTop() {
    const R = 23;
    const C = 2 * Math.PI * R;

    const btn = document.createElement("button");
    btn.className = "to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML =
      '<svg viewBox="0 0 50 50" aria-hidden="true">' +
      '<circle class="track" cx="25" cy="25" r="' + R + '"></circle>' +
      '<circle class="bar" cx="25" cy="25" r="' + R + '" ' +
      'stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"></circle>' +
      "</svg><span>↑</span>";

    document.body.appendChild(btn);

    const ring = $(".bar", btn);
    let ticking = false;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      ring.style.strokeDashoffset = String(C - C * pct);
      btn.classList.toggle("is-shown", window.scrollY > window.innerHeight * 0.8);
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });

    update();
  }

  /* ==========================================================
     Sticky register bar on phones.
     Appears once the hero is gone, hides over the form itself.
  ========================================================== */
  function stickyCta() {
    const registration = $("#registration");
    const header = $(".site-header");
    if (!registration || !header) return;

    // Respect the closed-registration switch
    if (registration.dataset.closed === "1") return;

    const bar = document.createElement("div");
    bar.className = "sticky-cta";
    bar.innerHTML =
      '<span class="sticky-cta-info">' +
      "<strong>3K · 5K · 10K</strong>" +
      "<span>10 May 2026 · from ₹250</span>" +
      "</span>" +
      '<a href="#registration" class="sticky-cta-btn">Register</a>';

    document.body.appendChild(bar);

    if (!("IntersectionObserver" in window)) return;

    let pastHero = false;
    let onForm = false;
    const sync = () => bar.classList.toggle("is-shown", pastHero && !onForm);

    new IntersectionObserver(
      ([e]) => {
        pastHero = !e.isIntersecting;
        sync();
      },
      { threshold: 0.15 }
    ).observe(header);

    new IntersectionObserver(
      ([e]) => {
        onForm = e.isIntersecting;
        sync();
      },
      { threshold: 0.08 }
    ).observe(registration);
  }

  /* ==========================================================
     Hero status pill: counts down, then reports the result.
  ========================================================== */
  function eventStatus() {
    const anchor = $(".hero-info-bubble");
    if (!anchor || !anchor.parentNode) return;

    const start = new Date(CONFIG.eventStart);
    if (isNaN(start)) return;

    const pill = document.createElement("div");
    pill.className = "event-status";
    pill.innerHTML =
      '<span class="event-status-dot" aria-hidden="true"></span>' +
      '<span class="event-status-text"></span>';

    anchor.insertAdjacentElement("afterend", pill);
    const text = $(".event-status-text", pill);

    const render = () => {
      const diff = start.getTime() - Date.now();

      if (diff <= 0) {
        const sinceHours = -diff / 36e5;
        if (sinceHours < 12) {
          pill.dataset.state = "live";
          text.textContent = "Race day — the run is under way";
        } else {
          pill.dataset.state = "past";
          text.textContent = "Apex Run 2026 has finished. Thank you for running with us.";
        }
        return true;
      }

      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5) / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      const s = Math.floor((diff % 6e4) / 1000);

      pill.dataset.state = "upcoming";
      text.innerHTML =
        'Flag off in <span class="countdown-units">' +
        "<b>" + d + "d</b><b>" + h + "h</b><b>" + m + "m</b><b>" + s + "s</b>" +
        "</span>";
      return false;
    };

    if (render()) return;
    const timer = setInterval(() => {
      if (render()) clearInterval(timer);
    }, 1000);
  }

  /* ==========================================================
     Pointer-tracked spotlight on event and contact cards
  ========================================================== */
  function cardSpotlights() {
    if (!hasHover || reduced) return;

    $$(".event-card, .contact-box p").forEach((card) => {
      const spot = document.createElement("span");
      spot.className = "card-spot";
      spot.setAttribute("aria-hidden", "true");
      card.prepend(spot);

      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  }

  /* ==========================================================
     Loading shimmer for gallery and highlight media
  ========================================================== */
  function mediaSkeletons() {
    $$(".album-item, .highlight-item").forEach((item) => {
      const media = $("img, video", item);
      if (!media) return;

      const done = () => item.classList.add("media-ready");

      if (media.tagName === "IMG" && media.complete && media.naturalWidth > 0) {
        done();
        return;
      }

      const sk = document.createElement("span");
      sk.className = "media-skeleton";
      sk.setAttribute("aria-hidden", "true");
      item.appendChild(sk);

      media.addEventListener("load", done, { once: true });
      media.addEventListener("loadeddata", done, { once: true });
      media.addEventListener("error", done, { once: true });
      setTimeout(done, 6000); // never leave a shimmer running forever
    });
  }

  /* ==========================================================
     Lightbox: previous / next, keyboard, swipe, counter.
     Builds its list from the gallery and highlights, ignoring
     the duplicated marquee clones.
  ========================================================== */
  function lightboxGallery() {
    const lightbox = $("#lightbox");
    const img = $(".lightbox-img", lightbox || document);
    if (!lightbox || !img) return;

    const seen = new Set();
    const shots = [];

    $$(".album-item img, .highlight-item img").forEach((el) => {
      const src = el.getAttribute("src");
      if (!src || seen.has(src)) return;
      seen.add(src);
      shots.push({ src: src, alt: el.getAttribute("alt") || "" });
    });

    if (shots.length < 2) return;

    let index = 0;

    const prev = document.createElement("button");
    prev.className = "lb-nav lb-prev";
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous image");
    prev.textContent = "‹";

    const next = document.createElement("button");
    next.className = "lb-nav lb-next";
    next.type = "button";
    next.setAttribute("aria-label", "Next image");
    next.textContent = "›";

    const count = document.createElement("div");
    count.className = "lb-count";

    lightbox.append(prev, next, count);

    function show(i) {
      index = (i + shots.length) % shots.length;
      img.classList.add("is-swapping");
      setTimeout(() => {
        img.src = shots[index].src;
        img.alt = shots[index].alt;
        img.classList.remove("is-swapping");
      }, 160);
      count.textContent = index + 1 + " / " + shots.length;
    }

    // Runs after script.js's own handler, so it just syncs the index
    document.addEventListener("click", (e) => {
      const hit = e.target.closest && e.target.closest(".album-item img, .highlight-item img");
      if (!hit) return;
      const found = shots.findIndex((s) => s.src === hit.getAttribute("src"));
      index = found > -1 ? found : 0;
      count.textContent = index + 1 + " / " + shots.length;
    });

    prev.addEventListener("click", (e) => { e.stopPropagation(); show(index - 1); });
    next.addEventListener("click", (e) => { e.stopPropagation(); show(index + 1); });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("active")) return;
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "ArrowLeft") show(index - 1);
    });

    // Swipe
    let x0 = null;
    lightbox.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 55) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  /* ==========================================================
     Registration form
     - progress rail
     - inline validation instead of blocking alerts
     - fixes the hidden required UTR field that silently blocks submit
     - stops the age field overwriting a size the runner chose
  ========================================================== */
  function formUpgrades() {
    const form = $("#registrationForm");
    if (!form) return;

    const utrInput = $("#utrInput");
    const utrGroup = $("#utrGroup");

    /* --- Fix: a required field inside display:none cannot be focused,
       so the browser blocks submit with no visible message. Toggle
       `required` alongside visibility instead. --- */
    if (utrInput && utrGroup) {
      utrInput.required = getComputedStyle(utrGroup).display !== "none";
      new MutationObserver(() => {
        utrInput.required = getComputedStyle(utrGroup).display !== "none";
      }).observe(utrGroup, { attributes: true, attributeFilter: ["style", "class"] });
    }

    /* --- Progress rail --- */
    const rail = document.createElement("div");
    rail.className = "form-progress";
    rail.innerHTML =
      '<div class="form-progress-bar"><div class="form-progress-fill"></div></div>' +
      '<div class="form-progress-text">Start with your details</div>';
    form.prepend(rail);

    const fill = $(".form-progress-fill", rail);
    const label = $(".form-progress-text", rail);

    const steps = [
      { name: "name" }, { name: "location" }, { name: "phone" },
      { name: "email" }, { name: "age" }, { name: "organisation" },
      { name: "run" }, { name: "size" }, { name: "utr" }
    ];

    function updateProgress() {
      const data = new FormData(form);
      const done = steps.filter((s) => {
        const v = data.get(s.name);
        return v && String(v).trim() !== "";
      }).length;

      const pct = Math.round((done / steps.length) * 100);
      fill.style.width = pct + "%";

      if (done === 0) label.textContent = "Start with your details";
      else if (!data.get("run")) label.textContent = "Next: pick your distance";
      else if (!data.get("size")) label.textContent = "Next: choose a t-shirt size";
      else if (!data.get("utr")) label.textContent = "Last step: pay, then enter your UTR";
      else label.textContent = "All set — register below";
    }

    /* --- Field-level validation --- */
    const rules = {
      phone: {
        test: (v) => /^[0-9]{10}$/.test(v.trim()),
        bad: "Phone numbers are 10 digits, no spaces or country code."
      },
      email: {
        test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
        bad: "That email address looks incomplete."
      },
      age: {
        test: (v) => Number(v) >= 5 && Number(v) <= 100,
        bad: "Enter an age between 5 and 100."
      },
      utr: {
        test: (v) => /^[A-Za-z0-9]{10,20}$/.test(v.trim()),
        bad: "The UTR is 10–20 letters and numbers from your payment app."
      },
      name: {
        test: (v) => v.trim().length >= 2,
        bad: "Enter the runner's full name."
      }
    };

    function msgFor(input) {
      let msg = input.nextElementSibling;
      if (!msg || !msg.classList.contains("field-msg")) {
        msg = document.createElement("small");
        msg.className = "field-msg";
        input.insertAdjacentElement("afterend", msg);
      }
      return msg;
    }

    function validate(input, quiet) {
      const rule = rules[input.name];
      if (!rule) return true;

      const value = input.value || "";
      const msg = msgFor(input);

      if (value.trim() === "") {
        input.classList.remove("field-invalid", "field-valid");
        msg.classList.remove("is-shown");
        return false;
      }

      const ok = rule.test(value);
      input.classList.toggle("field-invalid", !ok);
      input.classList.toggle("field-valid", ok);

      if (ok || quiet) {
        msg.classList.remove("is-shown");
      } else {
        msg.dataset.tone = "bad";
        msg.textContent = rule.bad;
        msg.classList.add("is-shown");
      }
      return ok;
    }

    $$("input", form).forEach((input) => {
      input.addEventListener("input", () => {
        validate(input, true);
        updateProgress();
      });
      input.addEventListener("blur", () => validate(input, false));
      input.addEventListener("change", updateProgress);
    });

    /* --- Highlight the group being filled in --- */
    $$(".form-group", form).forEach((group) => {
      group.addEventListener("focusin", () => {
        $$(".form-group", form).forEach((g) => g.classList.remove("is-active"));
        group.classList.add("is-active");
      });
    });

    /* --- Fix: age no longer overrides a size the runner picked --- */
    const sizeRadios = $$('input[name="size"]', form);
    let sizeTouched = false;
    sizeRadios.forEach((r) =>
      r.addEventListener("click", () => { sizeTouched = true; })
    );

    const ageInput = $("#age");
    if (ageInput) {
      ageInput.addEventListener("input", () => {
        if (!sizeTouched) return;
        // script.js already re-checked a radio; put the runner's choice back
        const chosen = sizeRadios.find((r) => r.dataset.chosen === "1");
        if (chosen) chosen.checked = true;
      });
      sizeRadios.forEach((r) =>
        r.addEventListener("click", () => {
          sizeRadios.forEach((x) => delete x.dataset.chosen);
          r.dataset.chosen = "1";
        })
      );
    }

    /* --- Guard the submit: catch problems before the network call,
       and point at the first field that needs attention. --- */
    form.addEventListener(
      "submit",
      (e) => {
        const data = new FormData(form);
        let firstBad = null;

        $$("input[name]", form).forEach((input) => {
          if (rules[input.name] && input.value.trim() !== "" && !validate(input, false)) {
            firstBad = firstBad || input;
          }
        });

        if (!data.get("run")) {
          e.stopImmediatePropagation();
          e.preventDefault();
          toast("Pick a distance first — 3K, 5K or 10K.", "warn");
          $(".run-voltage-group", form)?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        if (firstBad) {
          e.stopImmediatePropagation();
          e.preventDefault();
          firstBad.classList.add("shake");
          setTimeout(() => firstBad.classList.remove("shake"), 450);
          firstBad.focus();
          firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      true // capture: runs before script.js's handler
    );

    form.addEventListener("reset", () => {
      sizeTouched = false;
      $$("input", form).forEach((i) => i.classList.remove("field-invalid", "field-valid"));
      $$(".field-msg", form).forEach((m) => m.classList.remove("is-shown"));
      setTimeout(updateProgress, 0);
    });

    // Keep the rail in sync when script.js flips the QR/UTR blocks
    $$('input[name="run"]', form).forEach((r) =>
      r.addEventListener("change", () => setTimeout(updateProgress, 200))
    );

    updateProgress();
  }

  /* ==========================================================
     Fix: three gallery cards are <a href="#">, so tapping one
     opened the lightbox AND jumped the page to the top.
  ========================================================== */
  function fixGalleryLinks() {
    $$('a.album-item[href="#"]').forEach((a) => {
      a.addEventListener("click", (e) => e.preventDefault());
      a.setAttribute("role", "button");
    });
  }

  // Expose the toast helper in case you want it elsewhere
  window.apexToast = toast;
})();
