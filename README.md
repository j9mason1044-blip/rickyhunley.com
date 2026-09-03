# rickyhunley.com

The Ricky Hunley website: eight static pages plus twelve blog articles, no
build step, no framework.

Open `index.html` in a browser and it works. Push to the `main` branch and
Netlify publishes it. That is the whole deployment story for now.

---

## What is here

```
index.html  about.html  speaking.html  huddle.html
blog.html   community.html  contact.html
404.html

news.html is not built at present — see Hidden pages.

blog/            generated: one page per article in the design

css/site.<hash>.css   generated: the design's global rules + hover states
js/site.<hash>.js     generated from tools/site.js
assets/          web-sized photography
uploads/         the hero video, re-encoded for the web
netlify.toml     publish directory, cache and security headers
sitemap.xml      generated; robots.txt points at it

tools/           the generator, the design source, and site.js — not served
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
| `showBlog`, `showFoundation` | resolved from their prop defaults |
| `{{ eventbriteUrl }}` | the real URL, or the whole link dropped if unset |
| `onClick="{{ open.roster }}"` | `href="/blog/roster.html"` |
| the `isPost` template + `posts` | one page per article under `blog/` |
| `src="assets/x.jpg"` | `src="/assets/x.jpg"`, so nested pages resolve |

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

The photo columns on the About and Speaking pages used to crossfade on a
timer in `js/site.js`. The design now does it with a CSS `@keyframes` in its
`<helmet>`, so nothing in `site.js` drives them any more. That animation does
not honour `prefers-reduced-motion`, and it runs forever, so `build-static.js`
appends a rule to `css/site.css` that stops it on its first frame for readers
who ask for less motion.

### Hidden pages

`HIDDEN_PAGES` in `build-static.js` lists pages that exist in the design but are
not published. A hidden page is not generated, is deleted from disk if a
previous build made it, is dropped from the sitemap, and has every navigation
link to it stripped from the header, mobile drawer and footer.

`SHOW_BLOG` mirrors the design's own `showBlog` prop, so the two agree without
either needing to know about the other. `SHOW_NEWS` has no counterpart in the
design; it exists only to take the News page down.

Hiding a page also drops any section on *another* page that exists only to
advertise it — the home page's "In the press" row is the News page's one.
`PROMO_SECTIONS` records how many of those each page has, and the build fails if
it cannot find them, because that half of the job is the half that fails
quietly: strip the "All news →" link on its own and what remains is a heading
over three links to the same dead articles.

**The blog** was hidden while it held only sample copy. It now holds twelve real
articles and is published.

**The News page is hidden as of 2026-09-03.** Seven of its nine press links are
wrong: five 404 outright (the National Football Foundation honoree page, AZ
Desert Swarm, both Greg Hansen pieces — which carry the *same* tucson.com
article id under different slugs, the tell that the URLs were invented rather
than copied — and the Wildcat Report Substack), `arizonawildcats.com` serves an
unrendered CMS template that reads `@fullname (@induction)`, and the first card
points at the Hall of Fame article the seventh card claims. Only the YouTube
feature and Greg Hansen's Mount Rushmore column resolve correctly. The same
three bad links sat on the home page's press row.

The URLs are hard-coded `<a href>` rows in the design (`tools/RickyHunley.com.dc.html`,
the `data-r="newsrow"` block), so fixing them means editing the design, not
Sanity — see the note on `newsItem` below. To bring the page back: correct the
URLs, set `SHOW_NEWS = true`, and drop the temporary `/news`, `/news.html`,
`/press` and `/eventsblog` redirects from `netlify.toml` in the same commit.

### The blog

The design carries the articles as one `posts = [...]` array and renders
whichever one `state.post` names through a single `isPost` template.
`build-static.js` reads that array straight out of the source and renders the
template once per article into `blog/<slug>.html` — so the copy has exactly one
home, and an edit in the design lands on the next build with nothing restated
here. Paragraph kinds follow the design's own convention: a `## ` prefix is a
subheading, `> ` a pull quote, anything else body text.

Slugs are kebab-cased from the design's camelCase (`stayCourse` ->
`/blog/stay-course.html`). An article dropped from the design has its page
deleted on the next build rather than left on disk.

`/blog` needs its own redirect in `netlify.toml`. Netlify serves `/about` for
`about.html` unasked, but `/blog` is now also a directory: Netlify looks for
`blog/index.html`, finds none, and would 404.

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

The three brand SVGs (`rh-logo-horizontal`, `rh-logo-vertical`, `rh-autograph`)
are listed under `COPIES` rather than `IMAGES`: they are vector, already small,
and copied byte-for-byte from `Ricky Hunley Logo/SVG/` rather than pushed
through ffmpeg. The autograph is used twice — masked in white across the blog
header, and as a signature at the foot of every article.

`assets/favicon-rh-bleed.png` is the tab icon: a 512×512 variant of the brand
favicon with the mark bled to the edges so it reads at 16px. It was drawn in a
design session and exists nowhere else, so it is listed under
`FROM_DESIGN_PROJECT` — small enough that DesignSync serves it intact, with no
Dropbox original to rebuild it from.

Worth knowing generally: the generator writes its own `<head>` rather than
copying the design's `<helmet>`, so **anything new added to the helmet is
silently dropped unless `build-static.js` is taught to pick it up.** Icon links
are handled; a future `<meta>` or stylesheet would not be.

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
`netlify.toml` carries everything: cache headers, a small security header
block, 404s for `tools/`, `studio/` and the README so they are not served from
the live domain, and the redirects below.

**`css/` and `js/` filenames carry a content hash**, so new content is always a
new URL and a cached copy can never go stale. That is what makes their one-year
`immutable` cache correct. It is also the fix for a real failure: the stylesheet
once shipped under a fixed URL with a week-long `max-age`, and phones that had
fetched it kept rendering the site without its mobile layout for days after the
fix was live — no request made, nothing the server could say. `assets/` is still
unhashed and gets a day.

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
them to their equivalents here (`/story` → `/about.html`, `/hunley-huddle` →
`/huddle.html`, and so on, taken from its sitemap). `/press` and `/eventsblog`
pointed at `/news.html` and go to the home page for as long as that page is
hidden. Two of its pages have no equivalent and are deliberately **not**
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

`HANDOFF-PLAN.md` in the design project describes the intended end state: Astro
for the templates, Sanity as the CMS Ricky actually logs into, Netlify Forms for
booking inquiries, and JSON-LD `Person` markup for the knowledge panel.

Sanity is now live, and there is no Astro — `build-static.js` stays the
renderer. The Studio is in `studio/` and is deployed at
<https://rickyhunley.sanity.studio> — the URL Ricky logs into.
Publishing there fires a webhook at a Netlify build hook, and the build command
runs the same two commands you would run locally. See "The blog comes from
Sanity" in `netlify.toml`.

Every build writes `/build-info.json`: when it ran, when the content was
fetched, how many posts, and Netlify's commit and deploy ID. The pages are
deterministic, so a successful deploy and a failed one that left the previous
deploy standing serve identical bytes — this is how you tell them apart, and how
you answer "did Ricky's publish actually reach the site?" without a Netlify
login. Absent Netlify fields mean the files were built on someone's machine.

**What Sanity owns:** the blog, all eight pages' copy (125 fields) and every
photograph on them (32), plus Site Settings. **What it does not:** `newsItem`,
`episode` and `talk` are modelled and populated but `build-static.js` still
renders those lists from the design, so editing them changes nothing yet. They
are the remaining work, and the Sanity webhook deliberately excludes them — a
build they triggered could not change anything, and a deploy notification that
usually means nothing is one nobody reads.

**How page copy is bound.** The design is one file of inline styles with no
classes or ids, so fields are bound to it *by position* —
`tools/page-text.js` maps `homePage.hero.heading` to `s0.h1[0]`, meaning the
first `<h1>` of the first `<section>`. `tools/dc-paths.js` does the
addressing. That is fragile in one specific way: editing the design can move an
element and leave a binding pointing at the wrong one, with the build still
succeeding. Three checks guard it and `tools/check.js` runs them, which is why
`check.js` is in the Netlify build command — a failed deploy keeps the previous
site up, and that beats a page that has quietly lost its copy.

- `verify-paths.js` — `set(get(x)) === x` for all 498 addressable nodes.
- `verify-text-map.js` — every binding resolves, to copy rather than markup,
  and nothing is bound twice.
- `verify-text-roundtrip.js` — seed the documents from the design, render them
  back, require byte-identical pages. This is the one that proved the migration
  changed not a single word.

**If you edit the design**, re-run `node tools/check.js` before pushing. If a
binding has slipped, it will say which.

Known gaps to close before calling it finished:

- News items, episodes and talks are in Sanity but still rendered from the
  design. Each is the same shape of work the blog and the pages went through.
  For `newsItem` this is now blocking rather than cosmetic: the News page is
  hidden because its URLs are wrong, and they cannot be corrected in the Studio
  until the build reads them. The nine documents also have `source`, `order`
  and `date` all unset, so wiring them up means backfilling those first or the
  page loses its "Tucson.com" labels and its ordering.
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
