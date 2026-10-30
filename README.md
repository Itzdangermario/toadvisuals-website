# toadvisuals.lol – website of Toad's Visuals

Static website built with [Astro](https://astro.build). No backend, no database, no cookies, no tracking.
Hosting: Cloudflare Pages.

## What is where

| What | Where |
| --- | --- |
| **Mod versions (downloads)** | `public/downloads/<version>/` – just put the .jar files there |
| **Screenshots (gallery)** | `public/gallery/` – order and captions in `src/data/gallery.json` |
| **Next update (countdown)** | `src/data/site.ts` → `nextUpdate` |
| Links (Discord, GitHub, Modrinth) | `src/data/site.ts` |
| Live numbers (Supabase, public key only) | `src/data/site.ts` → `stats` |
| Imprint and privacy contact (empty on purpose, see below) | `src/data/site.ts` → `legal` |
| Minecraft versions, Java, Fabric Loader | `src/data/releases.json` |
| Changelog (copy of the mod's changelog) | `src/data/changelog.json` |
| Feature texts | `src/data/features.ts` |
| Browser previews ("Try it") | `src/components/Playground.astro`, `src/scripts/playground.ts` |
| Colours, fonts, spacing | `src/styles/global.css` |
| Pages | `src/pages/` (`404.astro` is the error page) |

## Upload a new mod version

1. Make a folder with the version number: `public/downloads/1.8.6/`
2. Put the jar files in it. The Minecraft version must be in the file name, e.g.
   `ToadsVisuals-1.8.6-mc1.21.11.jar` and `ToadsVisuals-1.8.6-mc26.2.jar` (or `toads-visuals-1.8.6+26.2.jar`).
3. Copy the mod's `changelog.json` to `src/data/changelog.json` (for the date and the notes).
4. `npm run build && npm run check-links`, then push – done. The newest folder automatically becomes "Latest",
   `/latest/1.21.11` and `/latest/26.2` point to it, file size and SHA-256 are calculated by the build.

**Cloudflare Pages only serves files up to 25 MB.** The build stops with a clear message if a jar is bigger.
Files hosted somewhere else (Dropbox, GitHub Releases …) are listed in `src/data/releases.json` instead.
Version 1.8.5 is set up like this right now. For a new version, replace the two entries:

```json
"external": [
  { "version": "1.8.6", "mc": "1.21.11", "name": "toads-visuals-1.8.6-1.21.11.jar",
    "url": "https://www.dropbox.com/scl/fi/…/toads-visuals-1.8.6-1.21.11.jar?rlkey=…&dl=1" }
]
```

With Dropbox, change `dl=0` at the end of the share link to `dl=1` – then the click downloads the file directly instead
of opening the Dropbox page. `"bytes"` (file size) and `"sha256"` are optional; without them the size is simply not shown.
Only the newest version is offered: when you add a new one, remove the old entries.
As long as `"external"` has entries, jars in `public/downloads/` are ignored completely, and the build
(`scripts/clean-dist.mjs`) removes every mod file from `dist/` that the site does not offer – old versions can't be
downloaded from the live site, even if they are still lying in the folder.

**Preinstalled texture packs:** only publish builds with packs you made yourself or that the authors allowed you to
share. Texture packs are protected by copyright; a pack without an explicit permission or licence may not be
re-uploaded, and Cloudflare (like any host) removes files after a copyright complaint.

## Gallery

Put screenshots (PNG, JPG or WebP, ideally 1920×1080) into `public/gallery/`. All of them appear on `/gallery/`.
Five appear on the home page: the ones with `"home": true`, filled up in gallery order. Order and captions:

```json
[
  { "file": "menu-pvp.png", "caption": "The PVP tab", "home": true },
  { "file": "effect-firework.png", "caption": "Kill effect: Firework" }
]
```

## Live numbers and download counter

The home and download pages show *Playing right now*, *Players so far* (both from the mod's logo sync list) and
*Downloads*. Only real numbers are shown; a number that cannot be loaded is hidden.

The download counter needs a small table in Supabase: run `supabase/website-stats.sql` once in the SQL editor.
Until then the *Downloads* number is simply not shown. The website only uses the public (publishable) key, which can
read the lists and add 1 to a download counter – nothing else.

## Next update countdown

Set the date in `src/data/site.ts`:

```ts
nextUpdate: { at: '2026-11-07T18:00:00+01:00', title: 'Next update', text: '…' }
```

`+01:00` is German winter time (CET, end of October to end of March), `+02:00` German summer time (CEST).
After the date has passed, the box says the update is out.

## Work on it locally

Needs Node.js 20 or newer (22 recommended).

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # builds into dist/
npm run check-links  # checks every internal link, anchor and download in dist/
npm run preview      # serves dist/ like the real site
```

## Deploy to Cloudflare Pages

### Before the first deploy

- `legal` in `src/data/site.ts` is **empty on purpose**: no private name, address, email or phone number is published.
  Contact on the website is the Discord server. Only fill in what you really want to publish. German law (§ 5 DDG) can
  require a name and a postal address in the imprint of a public website – if that applies to you, use an imprint /
  c/o address service instead of your home address. The build prints a reminder while no address is set.
- Optional: set `links.github` / `links.modrinth` in `src/data/site.ts` (empty links are hidden).

### Option A: with Git (recommended, deploys on every push)

1. Push this folder to a GitHub or GitLab repository (`node_modules` and `dist` are ignored).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → choose the repository.
3. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
4. **Save and Deploy**. The site is then live at `https://<project>.pages.dev`.

### Option B: upload directly (no Git)

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name toadvisuals
```

(The first time, `wrangler` opens the browser to log in to Cloudflare.)

### Connect the domain toadvisuals.lol

1. In the Pages project → **Custom domains** → **Set up a custom domain** → `toadvisuals.lol`.
   - If the domain's DNS is already on Cloudflare, the record is created automatically.
   - If not, Cloudflare shows which DNS record to add (or move the domain's nameservers to Cloudflare first:
     Cloudflare → **Add a domain**, then change the nameservers at your registrar).
2. Add `www.toadvisuals.lol` as a second custom domain, then send it to the main domain:
   Cloudflare → your domain → **Rules** → **Redirect Rules** → template *Redirect from WWW to root*.
3. SSL is issued automatically (can take a few minutes). Under **SSL/TLS** → **Edge Certificates** switch on
   **Always Use HTTPS**.

## Privacy

The privacy policy (`src/pages/privacy.astro`) describes the site exactly as it is: no cookies, no analytics, fonts
self-hosted, Cloudflare as host. **If you switch on Cloudflare Web Analytics, add embeds (YouTube, Discord widget) or
anything else that loads data from other companies, update the privacy policy first.** The section about the mod
describes the logo sync of version 1.8.4+ and the live numbers / download counter of this website; update it when the mod's data handling changes.
This is not legal advice – have the texts checked if you are unsure.

## Licences

- Fonts: Manrope and Fredoka (SIL Open Font License 1.1), self-hosted through Fontsource.
- Mascot and logo: from the Toad's Visuals mod.
