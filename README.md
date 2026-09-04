<div align="center">
  <img src="Apex-run.PNG" alt="Apex Run 2026" width="340">
  <p><strong>National level marathon · Milagres College, Mangaluru · 10 May 2026</strong></p>
  <p>
    <a href="https://apexrun2026.in">apexrun2026.in</a> ·
    <a href="../../actions/workflows/deploy.yml"><img src="https://github.com/roystondcunha28-cyber/apexrun/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/code-MIT-blue" alt="MIT"></a>
  </p>
</div>

---

Event site for Apex Run 2026: race info, galleries, route map, and a registration form
that writes to a Google Sheet. Around 2,500 runners across 3K, 5K and 10K.

No framework, no build step, nothing to install. Three files do everything —
`index.html`, `style.css`, `script.js`. Clone it, serve the folder, edit, refresh.

```bash
python3 -m http.server 8000
```

<!-- Add docs/preview.png here once you have a full-page screenshot. -->

## What's interesting in here

**The carousel controller.** Both the gallery and the highlights strip run off one
function in `script.js`. It handles click-drag with momentum, native swipe, arrow
buttons, keyboard, and shift+wheel, all at once and all yielding to each other. Autoplay
backs off whenever you touch it and while your cursor is inside, so a photo never slides
away mid-look. Plain vertical wheel is deliberately left alone; hijacking it to scroll a
carousel is the kind of thing that makes a page feel broken.

**Depth of field on the rails.** Whichever card sits nearest the centre renders at full
size and brightness while the ones toward the edges shrink and dim. It's a `--near`
custom property written per item, applied through the standalone `scale` property so it
can't collide with the hover or reveal transforms.

**The hero.** Layered dawn gradient, drifting mist, CSS embers, and a 900-particle
three.js dust field that pushes toward the camera as you scroll away. Pointer parallax
and scroll parallax write to separate CSS variables so neither overwrites the other. The
renderer stops entirely once the hero leaves the viewport.

Every scroll effect runs through one `requestAnimationFrame` loop rather than separate
listeners. `prefers-reduced-motion` removes the motion instead of just shortening it.

## Images

The site used to ship 44 MB of images. The navbar logo alone was 11.7 MB at 4800×3200,
rendered into a 30-pixel-tall slot. At 5 a.m. on race morning, on mobile data, that's a
page nobody waits for.

`tools/optimize-images.py` resizes everything to roughly twice its display size and
recompresses it. Current total: **2.4 MB, down 94%.** Run it again whenever you add
photos:

```bash
pip install pillow
python3 tools/optimize-images.py     # writes to optimized/, check before copying over
```

It won't write a file that ends up larger than the original, and it re-encodes opaque
PNGs as JPEG, which is what took the route map from 2.2 MB to 366 KB.

## Registration

The form posts to a Google Apps Script that appends to a Sheet and rejects duplicate
phone numbers and duplicate UTRs. Working implementation in
[`apps-script/registration.gs`](apps-script/registration.gs).

Paste it into your Sheet's Apps Script editor, run `setupSheet()` once, then
**Deploy → Web app** with *Execute as: Me* and *Who has access: Anyone*. Both settings
matter; anything narrower and public submissions fail silently. Put the `/exec` URL into
`SCRIPT_URL` in `script.js`.

Submit one real test entry before the site goes live and confirm the row lands.

## If you're maintaining this next year

Three things that will bite you.

**Filename case.** Your laptop treats `Photo.JPG` and `photo.jpg` as the same file.
GitHub Pages doesn't. An image that loads locally can 404 in production over one capital
letter. The Checks workflow catches this on every push.

**Add highlights once.** The controller duplicates the track at runtime to make the loop
seamless. Paste your items twice by hand and you get four copies.

**Prices live in three places.** The `.event-price` in the card, the `qrMap` label in
`script.js`, and the amount baked into the QR image itself. All three have to agree.

To close registrations, add one attribute:

```html
<section id="registration" class="registration-section" data-closed="1">
```

Both `style.css` and `script.js` open with a numbered contents list, and their sections
run in the same order as the page. Start there rather than searching.

## Credits

Built by Royston Jhowin Dcunha, [@idlisnframes](https://www.instagram.com/idlisandframes)

Organised by Milagres College Mangaluru, ICYM Mangalore, and Mangalore Runners Club.

## License

Code is MIT. Take the carousel controller, the reveal system, any of it.

The images are not. Event photos, the Apex Run wordmark, and the three organisations'
logos belong to their owners and are here only so the site renders. The photographs show
identifiable runners. Replace every image if you're adapting this.
