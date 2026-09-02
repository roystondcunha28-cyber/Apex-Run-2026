document.addEventListener("DOMContentLoaded", () => {

  console.log("APEX RUN 2026 Loaded ✅");
  document.body.classList.add("is-loading");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;

  /* =========================
     🌀 3D PRELOADER + CURTAIN REVEAL
  ========================= */
  (function initPreloader() {
    const preloader = document.getElementById("preloader");
    const fill = document.getElementById("loaderFill");
    const pct = document.getElementById("loaderPercent");
    const curtainLeft = document.querySelector(".curtain-left");
    const curtainRight = document.querySelector(".curtain-right");

    if (!preloader) {
      document.body.classList.remove("is-loading");
      document.body.classList.add("hero-ready");
      return;
    }

    let progress = 0;
    const minDuration = 1200; // ms, feels intentional rather than instant
    const start = Date.now();

    function tick() {
      const elapsed = Date.now() - start;
      const target = Math.min(100, Math.floor((elapsed / minDuration) * 100));
      // Ease progress toward target so it never feels linear/robotic
      progress += (target - progress) * 0.25 + 0.6;
      progress = Math.min(progress, 100);

      if (fill) fill.style.width = progress + "%";
      if (pct) pct.textContent = Math.floor(progress) + "%";

      const pageReady = document.readyState === "complete";

      if (progress >= 100 && (pageReady || elapsed > 4000)) {
        finishLoading();
      } else {
        requestAnimationFrame(tick);
      }
    }

    function finishLoading() {
      preloader.classList.add("is-hidden");
      if (curtainLeft) curtainLeft.classList.add("is-open");
      if (curtainRight) curtainRight.classList.add("is-open");

      document.body.classList.remove("is-loading");
      document.body.classList.add("hero-ready");

      setTimeout(() => {
        preloader.remove();
        curtainLeft?.remove();
        curtainRight?.remove();
      }, 1000);
    }

    requestAnimationFrame(tick);
  })();


  /* =========================
     🍔 NAV MENU (mobile toggle + scroll-spy)
  ========================= */
  (function initNavMenu() {
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");
    const backdrop = document.getElementById("navBackdrop");
    if (!toggle || !menu) return;

    function openMenu() {
      menu.classList.add("is-open");
      backdrop?.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
    }

    function closeMenu() {
      menu.classList.remove("is-open");
      backdrop?.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    }

    toggle.addEventListener("click", () => {
      const isOpen = menu.classList.contains("is-open");
      isOpen ? closeMenu() : openMenu();
    });

    backdrop?.addEventListener("click", closeMenu);

    // IMPORTANT: the Organizers button also carries .nav-link.
    // It must NOT close the panel, or the dropdown can never open on mobile.
    menu.querySelectorAll(".nav-link:not(.nav-dropdown-toggle)").forEach(link => {
      link.addEventListener("click", closeMenu);
    });

    // Choosing an organizer page does close the panel.
    menu.querySelectorAll(".nav-dropdown-link").forEach(link => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeMenu();
    });

    // Scroll-spy: highlight the nav link for the section in view
    const navLinks = Array.from(menu.querySelectorAll('.nav-link[href^="#"]'));
    const sections = navLinks
      .map(link => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (sections.length && "IntersectionObserver" in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const link = navLinks.find(l => l.getAttribute("href") === `#${entry.target.id}`);
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(l => l.classList.remove("active-link"));
            link.classList.add("active-link");
          }
        });
      }, { threshold: 0.4, rootMargin: "-30% 0px -50% 0px" });

      sections.forEach(section => spy.observe(section));
    }
  })();


  /* =========================
     🔽 ORGANIZERS DROPDOWN
     (click to toggle everywhere, hover on desktop)
  ========================= */
  (function initOrgDropdown() {
    const dropdown = document.getElementById("orgDropdown") || document.querySelector(".nav-dropdown");
    const toggle = document.getElementById("orgToggle");
    const dropMenu = document.getElementById("orgMenu");
    if (!dropdown || !toggle) return;

    const openDrop = () => {
      dropdown.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    };

    const closeDrop = () => {
      dropdown.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.contains("is-open") ? closeDrop() : openDrop();
    });

    // Desktop convenience: open on hover, close on leave
    if (hasHover && window.innerWidth > 780) {
      dropdown.addEventListener("mouseenter", openDrop);
      dropdown.addEventListener("mouseleave", closeDrop);
    }

    // Click anywhere outside closes it
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) closeDrop();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrop();
    });

    dropMenu?.querySelectorAll(".nav-dropdown-link").forEach(link => {
      link.addEventListener("click", closeDrop);
    });
  })();


  /* =========================
      ✅ AMENITIES TOGGLE (+ ripple)
   ========================= */
  document.querySelectorAll('.rules-toggle').forEach(button => {
    button.addEventListener('click', (e) => {
      const targetId = button.getAttribute('aria-controls');
      const target = document.getElementById(targetId);

      // Ripple feedback
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());

      if (!target) return;

      const isOpen = target.classList.contains("active");

      // Close all first
      document.querySelectorAll('.event-rules').forEach(el => el.classList.remove("active"));
      document.querySelectorAll('.rules-toggle').forEach(btn => {
        btn.textContent = "Amenities";
        btn.setAttribute('aria-expanded', 'false');
      });

      // Toggle current
      if (!isOpen) {
        target.classList.add("active");
        button.textContent = "Close ✕";
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });


  /* =========================
     🎬 SCROLL REVEAL SYSTEM
  ========================= */
  (function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal, .album-item");
    if (!targets.length) return;

    if (prefersReduced) {
      targets.forEach(el => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(el => observer.observe(el));
  })();


  /* =========================
     🖱️ HERO PARALLAX (desktop only)
  ========================= */
  (function initHeroParallax() {
    const heroBg = document.getElementById("heroBg");
    const header = document.querySelector(".site-header");
    if (!heroBg || !header || !hasHover || prefersReduced) return;

    let rafId = null;

    header.addEventListener("mousemove", (e) => {
      const rect = header.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        heroBg.style.transform = `translate3d(${x * -14}px, ${y * -10}px, 0) scale(1.03)`;
      });
    });

    header.addEventListener("mouseleave", () => {
      heroBg.style.transform = "translate3d(0,0,0) scale(1)";
    });
  })();


  /* =========================
     ✨ CURSOR SPOTLIGHT
  ========================= */
  (function initCursorGlow() {
    const glow = document.getElementById("cursorGlow");
    if (!glow || !hasHover || prefersReduced) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX;
    let curY = targetY;

    document.addEventListener("mousemove", (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      glow.classList.add("is-active");
    });

    document.addEventListener("mouseleave", () => glow.classList.remove("is-active"));

    function loop() {
      curX += (targetX - curX) * 0.14;
      curY += (targetY - curY) * 0.14;
      glow.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      requestAnimationFrame(loop);
    }
    loop();
  })();


  /* =========================
     🎴 3D TILT ON CARDS
  ========================= */
  (function initTiltCards() {
    if (!hasHover || prefersReduced) return;
    const cards = document.querySelectorAll(".tilt-card");

    cards.forEach(card => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const rx = (py * -8).toFixed(2);
        const ry = (px * 10).toFixed(2);
        card.style.setProperty("--rx", rx + "deg");
        card.style.setProperty("--ry", ry + "deg");
      });

      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  })();


  /* =========================
     🫧 FLOATING BUBBLES (About / Events sections)
  ========================= */
  (function initBubbles() {
    if (prefersReduced) return;
    const containers = document.querySelectorAll(".bubbles");
    if (!containers.length) return;

    containers.forEach(container => {
      const count = window.innerWidth < 600 ? 8 : 14;
      for (let i = 0; i < count; i++) {
        const bubble = document.createElement("span");
        bubble.className = "bubble";
        const size = 10 + Math.random() * 46;
        const left = Math.random() * 100;
        const duration = 12 + Math.random() * 14;
        const delay = Math.random() * -duration;
        const drift = (Math.random() * 80 - 40).toFixed(0) + "px";

        bubble.style.width = size + "px";
        bubble.style.height = size + "px";
        bubble.style.left = left + "%";
        bubble.style.setProperty("--drift", drift);
        bubble.style.animationDuration = duration + "s";
        bubble.style.animationDelay = delay + "s";

        container.appendChild(bubble);
      }
    });
  })();


  /* =========================
     ✨ HERO LIGHT EMBERS
  ========================= */
  (function initEmbers() {
    if (prefersReduced) return;
    const container = document.getElementById("heroEmbers");
    if (!container) return;

    const count = window.innerWidth < 600 ? 14 : 26;
    for (let i = 0; i < count; i++) {
      const ember = document.createElement("span");
      const isGold = Math.random() > 0.65;
      ember.className = "ember" + (isGold ? " gold" : "");
      const size = 2 + Math.random() * 4;
      const left = Math.random() * 100;
      const duration = 9 + Math.random() * 10;
      const delay = Math.random() * -duration;
      const drift = (Math.random() * 60 - 30).toFixed(0) + "px";

      ember.style.width = size + "px";
      ember.style.height = size + "px";
      ember.style.left = left + "%";
      ember.style.setProperty("--drift", drift);
      ember.style.animationDuration = duration + "s";
      ember.style.animationDelay = delay + "s";

      container.appendChild(ember);
    }
  })();


  /* =========================
     🖼️ ALBUM AUTO-SCROLL (Event Gallery)
  ========================= */
  const album = document.querySelector(".album-scroll");
  let isPaused = false;

  if (album) {
    function doAutoScroll() {
      if (isPaused) return;
      const maxScroll = album.scrollWidth - album.clientWidth;
      let next = album.scrollLeft + album.clientWidth * 0.75;
      if (next >= maxScroll - 10) next = 0;
      album.scrollTo({ left: next, behavior: "smooth" });
    }

    setInterval(doAutoScroll, 3200);

    // Pause on touch/mouse interaction
    album.addEventListener("pointerdown", () => { isPaused = true; });
    album.addEventListener("pointerup", () => {
      clearTimeout(album._resumeTimer);
      album._resumeTimer = setTimeout(() => { isPaused = false; }, 4000);
    });
  }


  /* =========================
     🎞️ EVENT HIGHLIGHTS MARQUEE
     Continuous loop of photos + short clips.
  ========================= */
  (function initHighlights() {
    const marquee = document.getElementById("highlightsMarquee");
    const track = document.getElementById("highlightsTrack");
    if (!marquee || !track) return;

    if (!prefersReduced) {
      // Duplicate the set once so translateX(-50%) loops seamlessly
      track.innerHTML += track.innerHTML;

      // Duplicated items are decorative — hide them from screen readers
      const all = Array.from(track.children);
      all.slice(all.length / 2).forEach(el => el.setAttribute("aria-hidden", "true"));

      // Scroll speed scales with item count, so adding items doesn't speed it up
      const itemCount = all.length / 2;
      track.style.setProperty("--marquee-duration", (itemCount * 7) + "s");
    }

    // Pause while the visitor is touching or dragging
    marquee.addEventListener("pointerdown", () => marquee.classList.add("is-paused"));
    marquee.addEventListener("pointerup", () => {
      clearTimeout(marquee._resume);
      marquee._resume = setTimeout(() => marquee.classList.remove("is-paused"), 3500);
    });

    // Play clips only while they are on screen
    const videos = track.querySelectorAll("video");
    if (videos.length && "IntersectionObserver" in window) {
      const vObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const v = entry.target;
          if (entry.isIntersecting) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.35 });

      videos.forEach(v => vObserver.observe(v));
    }
  })();


  /* =========================
     📸 LIGHTBOX (delegated — covers cloned highlight items too)
  ========================= */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector(".lightbox-img");
  const closeBtn = lightbox?.querySelector(".close-btn");

  document.addEventListener("click", (e) => {
    const img = e.target.closest?.(".album-item img, .highlight-item img");
    if (!img || !lightbox || !lightboxImg) return;
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || "";
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  function closeLightbox() {
    lightbox?.classList.remove("active");
    document.body.style.overflow = "";
  }

  closeBtn?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", e => { if (e.target !== lightboxImg) closeLightbox(); });

  document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });


  /* =========================
     📏 SIZE SUGGESTION
  ========================= */
  const ageInput = document.getElementById("age");
  const sizeSuggestion = document.getElementById("sizeSuggestion");

  const sizeByAge = age => {
    if (age <= 7) return "6-8Y";
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

  if (ageInput && sizeSuggestion) {
    ageInput.addEventListener("input", () => {
      const age = parseInt(ageInput.value);
      if (!age || age < 1) { sizeSuggestion.innerHTML = ""; return; }
      const size = sizeByAge(age);
      sizeSuggestion.innerHTML = `Recommended Size: <strong>${size}</strong>`;
      document.querySelectorAll('input[name="size"]').forEach(radio => {
        radio.checked = radio.value === size;
      });
    });
  }


  /* =========================
     💳 DYNAMIC QR + UTR
  ========================= */
  const qrImage = document.getElementById("qrImage");
  const qrLabel = document.getElementById("qrLabel");
  const utrGroup = document.getElementById("utrGroup");

  const qrMap = {
    "3K":  { src: "qr-3k.jpeg",  text: "Scan &amp; pay ₹250 for 3K Run" },
    "5K":  { src: "qr-5k.jpeg",  text: "Scan &amp; pay ₹350 for 5K Run" },
    "10K": { src: "qr-10k.jpeg", text: "Scan &amp; pay ₹450 for 10K Run" }
  };

  document.querySelectorAll('input[name="run"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const selected = radio.value;
      if (!qrMap[selected] || !qrImage) return;

      const wasVisible = qrImage.style.display === "block";

      // Fade out → swap → fade in
      if (wasVisible) {
        qrImage.style.opacity = "0";
        qrImage.style.transform = "scale(0.92)";
      }

      setTimeout(() => {
        qrImage.src = qrMap[selected].src;
        qrImage.style.display = "block";
        if (qrLabel) qrLabel.innerHTML = qrMap[selected].text;

        // Force reflow before animation
        qrImage.getBoundingClientRect();

        qrImage.style.transition = "opacity 0.35s ease, transform 0.35s ease";
        qrImage.style.opacity = "1";
        qrImage.style.transform = "scale(1)";

        if (utrGroup) utrGroup.style.display = "block";
      }, wasVisible ? 180 : 0);
    });
  });


  /* =========================
     🚀 FORM SUBMIT
  ========================= */
  const form = document.getElementById("registrationForm");
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8U4XBl2d20-0veslXtFbBDieYum5X_I_inZsVps79D9cdKbtQkzER-Zx5TVwKbXA85A/exec";

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const btn = form.querySelector(".register-btn");
      const formData = new FormData(form);

      // Validations
      if (!formData.get("run")) { alert("⚠️ Please select a run category"); return; }
      if (!formData.get("size")) { alert("⚠️ Please select a T-shirt size"); return; }
      if (!/^[0-9]{10}$/.test(formData.get("phone"))) { alert("⚠️ Enter a valid 10-digit phone number"); return; }

      const utr = formData.get("utr");
      if (!utr || !/^[A-Za-z0-9]{10,20}$/.test(utr)) {
        alert("⚠️ Please enter a valid UTR / Transaction ID");
        return;
      }

      btn.textContent = "Processing…";
      btn.disabled = true;

      try {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            name:         formData.get("name"),
            location:     formData.get("location"),
            phone:        formData.get("phone"),
            email:        formData.get("email"),
            age:          formData.get("age"),
            run:          formData.get("run"),
            size:         formData.get("size"),
            organisation: formData.get("organisation"),
            utr:          formData.get("utr")
          })
        });

        const data = await response.json();

        if (data.status === "success") {
          btn.textContent = "✅ Registered!";
          btn.style.background = "linear-gradient(45deg,#00c853,#00e676)";
          form.reset();
          // Reset QR area
          if (qrImage) { qrImage.style.display = "none"; qrImage.style.opacity = "0"; }
          if (qrLabel) qrLabel.innerHTML = "Select a run to view payment QR";
          if (utrGroup) utrGroup.style.display = "none";
          setTimeout(() => {
            btn.textContent = "Complete Registration";
            btn.style.background = "";
            btn.disabled = false;
          }, 4000);
        } else if (data.status === "duplicate_phone") {
          alert("⚠️ This phone number is already registered.");
          btn.textContent = "Complete Registration";
          btn.disabled = false;
        } else if (data.status === "duplicate_utr") {
          alert("⚠️ This UTR / Transaction ID has already been used.");
          btn.textContent = "Complete Registration";
          btn.disabled = false;
        } else {
          alert("❌ Registration failed. Please try again.");
          btn.textContent = "Complete Registration";
          btn.disabled = false;
        }

      } catch (err) {
        console.error("Submit error:", err);
        alert("❌ Network error. Please check your connection and try again.");
        btn.textContent = "Complete Registration";
        btn.disabled = false;
      }
    });
  }

});


/* =========================
   🔥 THREE.JS HERO VFX
   (dust / ember particles drifting through the dawn sky)
========================= */
(function initHeroVFX() {
  const canvas = document.getElementById("heroCanvas");

  // Skip on mobile for perf
  if (!canvas || window.innerWidth <= 768 || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // Particles — two layers: cool cyan mist + warm gold embers
  const count = 900;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cyanColor = new THREE.Color(0x00ffff);
  const goldColor = new THREE.Color(0xffb703);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * 15;
    positions[i3 + 1] = (Math.random() - 0.5) * 8;
    positions[i3 + 2] = (Math.random() - 0.5) * 10;

    const c = Math.random() > 0.7 ? goldColor : cyanColor;
    colors[i3] = c.r; colors[i3 + 1] = c.g; colors[i3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.75, vertexColors: true });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    points.rotation.y += 0.0006;
    points.rotation.x += 0.0002;
    points.position.y = Math.sin(Date.now() * 0.00015) * 0.15;
    renderer.render(scene, camera);
  }
  animate();

  // Resize
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

  // Pause when tab hidden (save resources)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { animate(); }
  });
})();
