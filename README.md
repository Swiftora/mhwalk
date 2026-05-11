# Mullica Hill Historic Walking Tour: Static Site

This folder is a complete, GitHub Pages-ready static site for the Mullica Hill Historic Walking Tour pilot. It is the destination for the QR codes printed on the six yard signs in `../Print Ready Signs/`.

The site lives at `mhwalk.com` once deployed. The QR codes encode the paths `/tour`, `/01`, `/02`, `/03`, `/04`, `/05`. This folder is structured to serve each of those paths.

## File map

```
mhwalk/
├── index.html         → mhwalk.com/        (the /tour landing page; QR-anchor target)
├── 01/index.html      → mhwalk.com/01      (Stop 1 — The Gaunt House)
├── 02/index.html      → mhwalk.com/02      (Stop 2 — The Warehouse)
├── 03/index.html      → mhwalk.com/03      (Stop 3 — Old Town Hall)
├── 04/index.html      → mhwalk.com/04      (Stop 4 — Friends Meeting House)
├── 05/index.html      → mhwalk.com/05      (Stop 5 — Old Eagle Hotel)
├── styles.css         → shared stylesheet (cream / navy / oxblood / EB Garamond)
├── CNAME              → tells GitHub Pages to serve at mhwalk.com
├── images/            → photographs (drop real files into the named slots; see below)
└── README.md          → this file
```

## What Claude Code needs to do

1. Create a new public GitHub repository named `mhwalk` (or whatever Eric prefers; the repo name does not appear in the public URL).
2. Push the entire contents of this `mhwalk/` directory to the `main` branch root of that repo.
3. In the repo Settings → Pages, set the source to "Deploy from a branch" → `main` branch, root (`/`).
4. The `CNAME` file at the repo root will automatically configure GitHub Pages to serve at `mhwalk.com`. No further action needed inside Pages settings.
5. At the domain registrar (Cloudflare or Namecheap, wherever `mhwalk.com` was registered), add the following DNS records so the custom domain reaches GitHub:

   ```
   Type    Name    Value                         Notes
   A       @       185.199.108.153               GitHub Pages
   A       @       185.199.109.153               GitHub Pages
   A       @       185.199.110.153               GitHub Pages
   A       @       185.199.111.153               GitHub Pages
   CNAME   www     <repo-owner>.github.io        replace <repo-owner>
   ```

6. After DNS propagates (5 minutes to a few hours), confirm `https://mhwalk.com/` loads the index page and `https://mhwalk.com/01` loads Stop 1. Then scan-test one of the printed PDF previews with a phone.

## Two placeholder IDs to replace before launch

The site already has Google Analytics 4 and Google Forms wired in with placeholder IDs. Both need real values before going live.

### Google Analytics 4

In every HTML file (index plus 01 through 05), find the two occurrences of `G-XXXXXXXXXX` and replace both with the real GA4 Measurement ID from your Analytics property.

```bash
# from inside the mhwalk/ directory, after the real ID is known:
find . -name '*.html' -exec sed -i '' 's/G-XXXXXXXXXX/G-YOUR_REAL_ID/g' {} +
# (on Linux drop the empty '' after -i)
```

### Google Form

The two-question feedback form embeds via iframe. Create the form in Google Forms, click Send → Embed (the `< >` icon), copy the `src` URL, and replace every `REPLACE_FORM_ID_HERE` token inside the iframe `src` attribute. There is one occurrence per stop page (01 through 05).

```bash
find . -name '*.html' -exec sed -i '' 's|REPLACE_FORM_ID_HERE|YOUR_REAL_FORM_ID|g' {} +
```

The index (tour landing) page does not have a feedback iframe; only the five stop pages do.

## Image placeholders

The `images/` folder is structured per stop. Each stop expects three images, referenced from the HTML:

| File path                  | Used as                                       |
|----------------------------|-----------------------------------------------|
| `images/cover.jpg`         | Open Graph card image for the index page     |
| `images/01/hero.jpg`       | Stop 1 hero image (top of page)              |
| `images/01/photo-1.jpg`    | Stop 1 supporting image (left of strip)      |
| `images/01/photo-2.jpg`    | Stop 1 supporting image (right of strip)     |
| `images/02/hero.jpg`       | Stop 2 hero image                             |
| `images/02/photo-1.jpg`    | Stop 2 supporting image                       |
| `images/02/photo-2.jpg`    | Stop 2 supporting image                       |
| `images/03/hero.jpg`       | Stop 3 hero image                             |
| `images/03/photo-1.jpg`    | Stop 3 supporting image                       |
| `images/03/photo-2.jpg`    | Stop 3 supporting image                       |
| `images/04/hero.jpg`       | Stop 4 hero image                             |
| `images/04/photo-1.jpg`    | Stop 4 supporting image                       |
| `images/04/photo-2.jpg`    | Stop 4 supporting image                       |
| `images/05/hero.jpg`       | Stop 5 hero image                             |
| `images/05/photo-1.jpg`    | Stop 5 supporting image                       |
| `images/05/photo-2.jpg`    | Stop 5 supporting image                       |

Each currently contains an SVG placeholder so the previews render cleanly. Replace each with a real JPG (same filename) and the page will pick it up. Aim for:

- Hero images: roughly 1600 by 1000 pixels, JPEG quality 85
- Supporting images: roughly 1000 by 700 pixels, JPEG quality 85
- Cover image: 1200 by 630 pixels for Open Graph social previews

The HTML `alt` text and `<figcaption>` already describe what each slot expects. If you swap images around, update the captions in the HTML.

## Local preview

Open any HTML file directly in a browser (`file://`) to preview the design. For a server-style preview that exercises the `/01` style URLs:

```bash
cd mhwalk
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## What this site is not

It is not Bitly. The QR codes encode the exact URLs above with no intermediary redirect. If you ever move off this host, the printed signs are tied to `mhwalk.com`. That is acceptable for a six-week pilot.

It is not Carrd. There is no monthly fee. GitHub Pages serves it for free.

It is not a content management system. To edit copy, edit the HTML files directly and push the change.

## Visual identity reference

The signs at `../Print Ready Signs/` use the same palette and the same EB Garamond typeface. The intent is that a visitor scans a sign and sees the same identity on their phone within a second. The site CSS lives in one file at `styles.css`; all color values are CSS custom properties at the top.

## Provenance

Story copy in this site reflects the synthesis in `../Walking Tour Research Synthesis v2.md` and the drafts in `../Walking Tour Story Drafts v2.md`. Three claims still need primary-source verification before launch (Marion sewing in the attic during the Depression, the WWII military contract, the exact burial register entry for Senator Gaunt). HTHS records will close those.
