# rickyhunley.com

The Ricky Hunley website: seven static pages, no build step, no framework.

Open `index.html` in a browser and it works. Push to the `main` branch and
Netlify publishes it. That is the whole deployment story for now.

---

## What is here

```
index.html  about.html  speaking.html  huddle.html
news.html   community.html  contact.html
404.html

css/site.css     the design's global rules, plus the hover states
js/site.js       hero video fade-in, mobile menu, About page carousel
assets/          web-sized photography
uploads/         the hero video, re-encoded for the web
netlify.toml     publish directory, cache and security headers
sitemap.xml      generated; robots.txt points at it

tools/           the generator and its source — not served
```

Every page carries its own copy of the header and footer. That is deliberate:
it keeps the site dependency-free at the cost of a regeneration step when the
chrome changes, and the generator handles that step.

## Where the design lives

The source of truth is the Claude Design project
`77733798-2f10-4527-bde3-32f74d783698`, file `RickyHunley.com.dc.html` — a
single Design Component holding all eight pages, switched by a `state.page`
variable. A copy sits at `tools/RickyHunley.com.dc.html`.

**Edit the design there, not the HTML here.** Then pull the updated file down
and regenerate:

```bash
node tools/build-static.js   # design file -> the pages + css + sitemap
node tools/check.js          # structural check on what came out
```

`build-static.js` resolves what a Design Component does that a browser does not:

| In the design | In the output |
|---|---|
| `<sc-if value="{{ isAbout }}">` | kept in `about.html`, dropped elsewhere |
| `onClick="{{ nav.about }}"` | `href="/about.html"` |
| `style-hover="color:…"` | a `.hv-N` class in `css/site.css` |
| `{{ accent }}`, `{{ reelUrl }}` | their default prop values |
| `menuOpen` / `toggleMenu` | `data-menu-toggle`, driven by `js/site.js` |
| `{{ a0 }}`…`{{ c2 }}` carousel | opening opacities + `data-slide`, ditto |

Every inline style value is carried across untouched — the generator never
adjusts spacing, size or colour. Read it before changing it; the transforms are
order-dependent.

**One trap worth knowing about.** The design's responsive rules select on inline
styles by substring, e.g. `[style*="margin: 0px auto"]`. That spelling is what a
browser produces when it re-serialises a style attribute, which is what the
Design Component runtime ends up with — but static HTML keeps the author's
literal `margin:0 auto`. Left alone, those selectors match nothing and the
entire mobile layout silently does nothing. `build-static.js` rewrites them to
the authored spelling when it emits `css/site.css`. If mobile ever looks
untouched after a design update, check that first.

### Hidden pages

`HIDDEN_PAGES` in `build-static.js` lists pages that exist in the design but are
not published. A hidden page is not generated, is deleted from disk if a
previous build made it, is dropped from the sitemap, and has every navigation
link to it stripped from the header, mobile drawer and footer.

The **blog** is currently hidden. Its three posts are the design's samples — the
page says so on its face — and the content now lives in Sanity. `/blog`,
`/blog.html` and the old Squarespace blog URLs all 301 to the home page.

## Images

`assets/` is generated too:

```bash
node tools/build-assets.js   # requires ffmpeg on PATH
```

It reads the full-resolution originals and the hero video master out of Dropbox
(`J9 Brandworks Projects/Ricky Hunley/Ricky Hunley Working/`) and writes
web-sized, compressed versions. Two things worth knowing:

- **The design project's copies are the full camera files** — `hero-asu.jpg` is
  4300×3370 — and the DesignSync API truncates anything over 256 KiB, so they
  can be neither downloaded intact nor used as-is. Going back to the originals
  is the only route.
- **The filename mapping is not guessable.** The design assets were matched to
  their originals by EXIF (photographer + capture time) and exact pixel
  dimensions. The table in `build-assets.js` is that mapping; keep it current.

Photographs the design stored as PNG are written as JPEG instead (a few hundred
KB rather than several MB, and none of them has transparency). `build-static.js`
rewrites those references via `ASSET_RENAMES`.

**`assets/denver.jpg` is stale.** The design now points at a `denver.png` that
carries C2PA metadata saying Claude produced or modified it — so it was made
during a design session, is over the 192 KiB ceiling, and has no Dropbox
original to rebuild from. The file in `assets/` is the *older* denver photo,
which the new alt text ("at the Hula Bowl") no longer describes. Drop the real
`denver.png` into `assets/` and re-run both build scripts.

## The hero video

The home page hero is a still image with a muted video looping over it, faded
in by `js/site.js` only once it is actually playing — so a blocked autoplay or a
slow connection just shows the still. There is no `poster` attribute on the
video, deliberately: the still is a separate `<img>` underneath, and a poster
would fetch the same image twice.

`uploads/RH-Hero-3.mp4` is generated by `build-assets.js` from the master in
Dropbox (`Ricky Hunley Working/RH-Hero-3.mp4`). The master is 17.5 MB; the
version served is ~4.3 MB, audio stripped, with the moov atom moved to the front
so playback starts before the whole file has arrived. It streams in behind the
still rather than blocking anything.

Two things about the footage itself, neither of them a defect to fix silently:

- **It is pillarboxed.** The content is 4:3 archival broadcast footage sitting
  inside a 16:9 frame with a blurred backdrop filling the sides. Under
  `object-fit: cover` those blurred edges are visible on wide viewports.
- **It runs 61 seconds**, most of which nobody will see. Trimming it to ~15
  would cut the transfer to about a megabyte. That is a design decision, not a
  build one, so it has been left alone.

If the master is ever recut, replace it in Dropbox and re-run
`node tools/build-assets.js`.

## Deploying

Netlify, publishing the repository root, branch `main`. No build command.
`netlify.toml` carries everything: cache headers (a year on `assets/` and
`uploads/`, a week on `css/` and `js/`), a small security header block, 404s for
`tools/` and the README so they are not served from the live domain, and the
redirects below.

### The domain, and the site it replaces

`rickyhunley.com` runs on Netlify as of 2026-09-01, replacing a Squarespace
site. **DNS stays at GoDaddy** (`ns29/ns30.domaincontrol.com`) — only the apex
A record and the `www` CNAME were repointed. The handoff plan assumed a fresh
domain bought through Netlify; that was never the situation.

**Do not move the nameservers to Netlify.** The domain carries live email — MX
points at Microsoft 365 (`rickyhunley-com.mail.protection.outlook.com`) with a
GoDaddy SPF record. Moving nameservers moves *all* DNS, and unless every MX and
TXT record is recreated first, his email stops. Change only the website's
A/CNAME records at GoDaddy and leave the rest alone.

The Squarespace site uses completely different paths, so `netlify.toml` 301s
them to their equivalents here (`/story` → `/about.html`, `/press` →
`/news.html`, `/hunley-huddle` → `/huddle.html`, and so on, taken from its
sitemap). Two of its pages have no equivalent and are deliberately **not**
redirected:

- `/privacypolicy` and `/terms`. Sending them somewhere wrong is worse than a
  404, and they matter more once the contact form and analytics land. They need
  real pages.

`/gallery` goes to the home page for want of anywhere better.

Its `/eventsblog` and `/personal-blog` posts are all Squarespace demo content
("blog-post-title-one-…"), so nothing real appears to be lost — but confirm
that before cancelling the subscription, and cancel only after the new site is
verified live on the domain.

## What this is not, yet

`HANDOFF-PLAN.md` in the design project describes the intended end state:
Astro for the templates, Sanity as the CMS Ricky actually logs into, Netlify
Forms for booking inquiries, and JSON-LD `Person` markup for the knowledge
panel. None of that is here. This is the design, faithfully, as files that
deploy — the foundation that migration starts from, and a site that is live in
the meantime.

Known gaps to close before calling it finished:

- The booking CTAs are `mailto:` links, not a form. No submission log, and no
  `source_page` field, so there is no record of which page produced an inquiry.
- The meta descriptions in `tools/build-static.js` are placeholders
  written to be reasonable, not final. They are the ad copy in a search result
  and deserve a pass by hand.
- No JSON-LD. The `Person` block is the highest-value markup on a site like
  this and is worth adding even before the CMS.
- `assets/hunley-huddle-logo.png` is 395px wide and is displayed at container
  width on `/huddle`. There is an `.ai` vector original in Dropbox
  (`Hunley Huddle Logos/`) worth exporting larger.
