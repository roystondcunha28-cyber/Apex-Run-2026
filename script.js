/* ==================================================================
   APEX RUN 2026 — interaction layer
   Each block is self-contained. Nothing here is required for the
   page to be readable: if a block fails, the content still works.
================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  document.body.classList.add("is-loading");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover       = window.matchMedia("(hover: hover)").matches;
  const isMobile       = () => window.matchMedia("(max-width: 900px)").matches;


  /* =========================================================
     PRELOADER + CURTAIN REVEAL
  ========================================================= */
  (function initPreloader() {
    const preloader    = document.getElementById("preloader");
    const fill         = document.getElementById("loaderFill");
    const pct          = document.getElementById("loaderPercent");
    const curtainLeft  = document.querySelector(".curtain-left");
    const curtainRight = document.querySelector(".curtain-right");

    const finish = () => {
      document.body.classList.remove("is-loading");
      document.body.classList.add("hero-ready");
    };

    if (!preloader) { finish(); return; }

    // Reduced motion: skip the whole sequence.
    if (prefersReduced) {
      preloader.remove();
      curtainLeft?.remove();
      curtainRight?.remove();
      finish();
      return;
    }

    let progress = 0;
    const minDuration = 1400;
    const start = Date.now();

    function tick() {
      const elapsed = Date.now() - start;
      const target  = Math.min(100, Math.floor((elapsed / minDuration) * 100));

      // ease toward target so the bar never reads as a linear timer
      progress = Math.min(100, progress + (target - progress) * 0.25 + 0.6);

      if (fill) fill.style.width = progress + "%";
      if (pct)  pct.textContent  = Math.floor(progress) + "%";

      const pageReady = document.readyState === "complete";

      if (progress >= 100 && (pageReady || elapsed > 4500)) finishLoading();
      else requestAnimationFrame(tick);
    }

    function finishLoading() {
      preloader.classList.add("is-hidden");
      curtainLeft?.classList.add("is-open");
      curtainRight?.classList.add("is-open");
      finish();

      setTimeout(() => {
        preloader.remove();
        curtainLeft?.remove();
        curtainRight?.remove();
      }, 1100);
    }

    requestAnimationFrame(tick);
  })();


  /* =========================================================
     SCROLL PROGRESS + STICKY NAV STATE
  ========================================================= */
  (function initScrollChrome() {
    const bar    = document.getElementById("scrollProgress");
    const navbar = document.getElementById("navbar");
    let ticking = false;

    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (bar) bar.style.transform = `scaleX(${ratio})`;
      navbar?.classList.toggle("is-stuck", window.scrollY > 40);
      ticking = false;
    }

    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    update();
  })();


  /* =========================================================
     NAV MENU — mobile sheet, scroll-spy
  ========================================================= */
  (function initNavMenu() {
    const toggle   = document.getElementById("navToggle");
    const menu     = document.getElementById("navMenu");
    const backdrop = document.getElementById("navBackdrop");
    if (!toggle || !menu) return;

    function openMenu() {
      menu.classList.add("is-open");
      backdrop?.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.classList.add("nav-open");
    }

    function closeMenu() {
      menu.classList.remove("is-open");
      backdrop?.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("nav-open");
      document.dispatchEvent(new CustomEvent("apex:closeDropdown"));
    }

    toggle.addEventListener("click", () => {
      menu.classList.contains("is-open") ? closeMenu() : openMenu();
    });

    backdrop?.addEventListener("click", closeMenu);

    // Any real link closes the sheet. The Organisers button is a
    // <button>, not a .nav-link, so it can never close it by accident.
    menu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) closeMenu();
    });

    // Scroll-spy
    const navLinks = Array.from(menu.querySelectorAll('.nav-link[href^="#"]'));
    const sections = navLinks
      .map(l => document.querySelector(l.getAttribute("href")))
      .filter(Boolean);

    if (sections.length && "IntersectionObserver" in window) {
      const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const link = navLinks.find(l => l.getAttribute("href") === `#${entry.target.id}`);
          if (!link) return;
          navLinks.forEach(l => l.classList.remove("active-link"));
          link.classList.add("active-link");
        });
      }, { threshold: 0.35, rootMargin: "-25% 0px -50% 0px" });

      sections.forEach(s => spy.observe(s));
    }
  })();


  /* =========================================================
     ORGANISERS DROPDOWN
     Desktop: floating panel (hover + click).
     Mobile:  accordion animated from 0 to its real height, so it
              never gets clipped by a guessed max-height.
  ========================================================= */
  (function initOrgDropdown() {
    const dropdown = document.getElementById("orgDropdown");
    const toggle   = document.getElementById("orgToggle");
    const dropMenu = document.getElementById("orgMenu");
    if (!dropdown || !toggle || !dropMenu) return;

    function openDrop() {
      dropdown.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      if (isMobile()) dropMenu.style.height = dropMenu.scrollHeight + "px";
    }

    function closeDrop() {
      dropdown.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      dropMenu.style.height = "";
    }

    toggle.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.contains("is-open") ? closeDrop() : openDrop();
    });

    // Desktop convenience only
    if (hasHover) {
      dropdown.addEventListener("mouseenter", () => { if (!isMobile()) openDrop(); });
      dropdown.addEventListener("mouseleave", () => { if (!isMobile()) closeDrop(); });
    }

    document.addEventListener("click", e => {
      if (!dropdown.contains(e.target)) closeDrop();
    });

    document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrop(); });
    document.addEventListener("apex:closeDropdown", closeDrop);

    dropMenu.querySelectorAll("a").forEach(l => l.addEventListener("click", closeDrop));

    // Re-measure after rotation / resize
    window.addEventListener("resize", () => {
      if (!dropdown.classList.contains("is-open")) { dropMenu.style.height = ""; return; }
      dropMenu.style.height = isMobile() ? dropMenu.scrollHeight + "px" : "";
    });
  })();


  /* =========================================================
     AMENITIES TOGGLE (+ ripple)
  ========================================================= */
  document.querySelectorAll(".rules-toggle").forEach(button => {
    button.addEventListener("click", e => {
      const target = document.getElementById(button.getAttribute("aria-controls"));

      const rect   = button.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left  = (e.clientX - rect.left - size / 2) + "px";
      ripple.style.top   = (e.clientY - rect.top  - size / 2) + "px";
      button.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());

      if (!target) return;
      const isOpen = target.classList.contains("active");

      document.querySelectorAll(".event-rules").forEach(el => el.classList.remove("active"));
      document.querySelectorAll(".rules-toggle").forEach(btn => {
        btn.textContent = "Amenities";
        btn.setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        target.classList.add("active");
        button.textContent = "Close";
        button.setAttribute("aria-expanded", "true");
      }
    });
  });


  /* =========================================================
     SCROLL REVEAL
  ========================================================= */
  (function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal, .album-item");
    if (!targets.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      targets.forEach(el => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(el => observer.observe(el));
  })();


  /* =========================================================
     HERO DEPTH — background parallax + logo tilt on its own plane
  ========================================================= */
  (function initHeroDepth() {
    const heroBg = document.getElementById("heroBg");
    const logo   = document.querySelector(".logo-neon");
    const header = document.querySelector(".site-header");
    if (!header || !hasHover || prefersReduced) return;

    let raf = null;

    header.addEventListener("mousemove", e => {
      const rect = header.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (heroBg) heroBg.style.transform = `translate3d(${x * -16}px, ${y * -11}px, 0) scale(1.04)`;
        if (logo)   logo.style.transform   = `rotateY(${x * 11}deg) rotateX(${y * -8}deg)`;
      });
    });

    header.addEventListener("mouseleave", () => {
      if (heroBg) heroBg.style.transform = "translate3d(0,0,0) scale(1)";
      if (logo)   logo.style.transform   = "rotateY(0deg) rotateX(0deg)";
    });
  })();


  /* =========================================================
     CURSOR SPOTLIGHT
  ========================================================= */
  (function initCursorGlow() {
    const glow = document.getElementById("cursorGlow");
    if (!glow || !hasHover || prefersReduced) return;

    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;

    document.addEventListener("mousemove", e => {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add("is-active");
    });

    document.addEventListener("mouseleave", () => glow.classList.remove("is-active"));

    (function loop() {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      glow.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();
  })();


  /* =========================================================
     3D TILT CARDS + pointer glare
  ========================================================= */
  (function initTiltCards() {
    if (!hasHover || prefersReduced) return;

    document.querySelectorAll(".tilt-card").forEach(card => {
      card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top)  / rect.height;

        card.style.transform =
          `perspective(900px) rotateX(${(py - 0.5) * -9}deg) rotateY(${(px - 0.5) * 11}deg) translateY(-6px) scale(1.02)`;
        card.style.setProperty("--gx", (px * 100) + "%");
        card.style.setProperty("--gy", (py * 100) + "%");
      });

      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  })();


  /* =========================================================
     MAGNETIC BUTTONS
  ========================================================= */
  (function initMagnetic() {
    if (!hasHover || prefersReduced) return;

    document.querySelectorAll("[data-magnetic]").forEach(el => {
      el.addEventListener("mousemove", e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.3 - 4}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  })();


  /* =========================================================
     FLOATING BUBBLES + HERO EMBERS
  ========================================================= */
  (function initParticles() {
    if (prefersReduced) return;

    document.querySelectorAll(".bubbles").forEach(container => {
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

    const embers = document.getElementById("heroEmbers");
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
  })();


  /* =========================================================
     GALLERY — auto-scroll with progress dots
  ========================================================= */
  (function initAlbum() {
    const album = document.getElementById("albumScroll");
    const dots  = document.getElementById("albumDots");
    if (!album) return;

    const items = album.querySelectorAll(".album-item");
    let paused = false;

    // Build one dot per item
    if (dots && items.length) {
      items.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = "album-dot" + (i === 0 ? " is-active" : "");
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to image ${i + 1}`);
        dot.addEventListener("click", () => {
          paused = true;
          items[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          clearTimeout(album._resume);
          album._resume = setTimeout(() => { paused = false; }, 5000);
        });
        dots.appendChild(dot);
      });
      dots.removeAttribute("aria-hidden");
    }

    function syncDots() {
      if (!dots) return;
      const center = album.scrollLeft + album.clientWidth / 2;
      let closest = 0, best = Infinity;
      items.forEach((item, i) => {
        const d = Math.abs(item.offsetLeft + item.offsetWidth / 2 - center);
        if (d < best) { best = d; closest = i; }
      });
      dots.querySelectorAll(".album-dot").forEach((d, i) => d.classList.toggle("is-active", i === closest));
    }

    album.addEventListener("scroll", () => {
      clearTimeout(album._sync);
      album._sync = setTimeout(syncDots, 90);
    }, { passive: true });

    if (!prefersReduced) {
      setInterval(() => {
        if (paused || document.hidden) return;
        const max = album.scrollWidth - album.clientWidth;
        let next = album.scrollLeft + album.clientWidth * 0.8;
        if (next >= max - 10) next = 0;
        album.scrollTo({ left: next, behavior: "smooth" });
      }, 3400);
    }

    album.addEventListener("pointerdown", () => { paused = true; });
    album.addEventListener("pointerup", () => {
      clearTimeout(album._resume);
      album._resume = setTimeout(() => { paused = false; }, 5000);
    });
  })();


  /* =========================================================
     HIGHLIGHTS MARQUEE
  ========================================================= */
  (function initHighlights() {
    const marquee = document.getElementById("highlightsMarquee");
    const track   = document.getElementById("highlightsTrack");
    if (!marquee || !track) return;

    if (!prefersReduced) {
      track.innerHTML += track.innerHTML;             // seamless -50% loop

      const all = Array.from(track.children);
      all.slice(all.length / 2).forEach(el => el.setAttribute("aria-hidden", "true"));

      // Speed scales with item count, so adding items doesn't speed it up
      track.style.setProperty("--marquee-duration", (all.length / 2) * 7 + "s");
    }

    marquee.addEventListener("pointerdown", () => marquee.classList.add("is-paused"));
    marquee.addEventListener("pointerup", () => {
      clearTimeout(marquee._resume);
      marquee._resume = setTimeout(() => marquee.classList.remove("is-paused"), 3500);
    });

    const videos = track.querySelectorAll("video");
    if (videos.length && "IntersectionObserver" in window) {
      const vObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.isIntersecting ? entry.target.play().catch(() => {}) : entry.target.pause();
        });
      }, { threshold: 0.35 });
      videos.forEach(v => vObs.observe(v));
    }
  })();


  /* =========================================================
     LIGHTBOX (delegated, so cloned marquee items work too)
  ========================================================= */
  (function initLightbox() {
    const lightbox = document.getElementById("lightbox");
    const img      = lightbox?.querySelector(".lightbox-img");
    const closeBtn = lightbox?.querySelector(".close-btn");
    if (!lightbox || !img) return;

    function close() {
      lightbox.classList.remove("active");
      document.body.style.overflow = "";
    }

    document.addEventListener("click", e => {
      const source = e.target.closest?.(".album-item img, .highlight-item img");
      if (!source) return;
      img.src = source.src;
      img.alt = source.alt || "";
      lightbox.classList.add("active");
      document.body.style.overflow = "hidden";
    });

    closeBtn?.addEventListener("click", close);
    closeBtn?.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") close(); });
    lightbox.addEventListener("click", e => { if (e.target !== img) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  })();


  /* =========================================================
     T-SHIRT SIZE SUGGESTION
  ========================================================= */
  (function initSizeSuggestion() {
    const ageInput = document.getElementById("age");
    const note     = document.getElementById("sizeSuggestion");
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
      document.querySelectorAll('input[name="size"]').forEach(r => { r.checked = r.value === size; });
    });
  })();


  /* =========================================================
     PAYMENT QR + UTR
  ========================================================= */
  const qrImage  = document.getElementById("qrImage");
  const qrLabel  = document.getElementById("qrLabel");
  const utrGroup = document.getElementById("utrGroup");

  const qrMap = {
    "3K":  { src: "qr-3k.jpeg",  text: "Scan and pay ₹250 for the 3K run" },
    "5K":  { src: "qr-5k.jpeg",  text: "Scan and pay ₹350 for the 5K run" },
    "10K": { src: "qr-10k.jpeg", text: "Scan and pay ₹450 for the 10K run" }
  };

  document.querySelectorAll('input[name="run"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const entry = qrMap[radio.value];
      if (!entry || !qrImage) return;

      const wasVisible = qrImage.style.display === "block";

      if (wasVisible) {
        qrImage.style.opacity = "0";
        qrImage.style.transform = "scale(0.92)";
      }

      setTimeout(() => {
        qrImage.src = entry.src;
        qrImage.style.display = "block";
        if (qrLabel) qrLabel.textContent = entry.text;

        qrImage.getBoundingClientRect();               // force reflow
        qrImage.style.opacity = "1";
        qrImage.style.transform = "scale(1)";

        if (utrGroup) utrGroup.style.display = "block";
      }, wasVisible ? 180 : 0);
    });
  });


  /* =========================================================
     FORM SUBMIT
  ========================================================= */
  (function initForm() {
    const form = document.getElementById("registrationForm");
    if (!form) return;

    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8U4XBl2d20-0veslXtFbBDieYum5X_I_inZsVps79D9cdKbtQkzER-Zx5TVwKbXA85A/exec";

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
        document.getElementById("utrInput")?.focus();
        return;
      }

      const reset = label => {
        btn.textContent = label;
        btn.disabled = false;
      };

      btn.textContent = "Processing…";
      btn.disabled = true;

      try {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            name:         data.get("name"),
            location:     data.get("location"),
            phone:        phone,
            email:        data.get("email"),
            age:          data.get("age"),
            run:          data.get("run"),
            size:         data.get("size"),
            organisation: data.get("organisation"),
            utr:          utr
          })
        });

        const result = await response.json();

        if (result.status === "success") {
          btn.textContent = "Registered";
          btn.style.background = "linear-gradient(45deg,#00c853,#00e676)";
          form.reset();

          if (qrImage) { qrImage.style.display = "none"; qrImage.style.opacity = "0"; }
          if (qrLabel) qrLabel.textContent = "Select a run to view the payment QR";
          if (utrGroup) utrGroup.style.display = "none";
          const note = document.getElementById("sizeSuggestion"); if (note) note.textContent = "";

          setTimeout(() => {
            btn.style.background = "";
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
  })();


  /* =========================================================
     MOBILE ACTION BAR — appears once the hero is behind you
  ========================================================= */
  (function initMobileBar() {
    const bar    = document.getElementById("mobileBar");
    const header = document.querySelector(".site-header");
    const footer = document.querySelector("footer");
    if (!bar || !header) return;

    let ticking = false;

    function update() {
      const pastHero  = window.scrollY > header.offsetHeight * 0.65;
      const nearEnd   = footer
        ? footer.getBoundingClientRect().top < window.innerHeight - 40
        : false;
      bar.classList.toggle("is-visible", pastHero && !nearEnd);
      ticking = false;
    }

    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    update();
  })();

});


/* ==================================================================
   THREE.JS HERO VFX — dust and ember particles in the dawn sky
   Desktop only; the CSS embers already carry mobile.
================================================================== */
(function initHeroVFX() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas || window.innerWidth <= 768 || !window.THREE) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

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

  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    points.rotation.y += 0.0006;
    points.rotation.x += 0.0002;
    points.position.y  = Math.sin(Date.now() * 0.00015) * 0.15;
    renderer.render(scene, camera);
  }
  animate();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!canvas.clientWidth) return;
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }, 150);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else animate();
  });
})();
