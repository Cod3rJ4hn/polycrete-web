# Polycrete — Goulburn

Static marketing site for Polycrete, a polished concrete and decorative
concrete finishing business in Goulburn, NSW.

## Stack

Plain HTML, CSS and vanilla JS. No framework, no build step — what's in
the repo is what gets served. Nothing loads from a third-party CDN:

- Scrolling is the browser's own. Only the in-page jumps (quote button,
  rating badge) are eased.
- Fonts: Archivo (display) and Geist (text), self-hosted woff2 (OFL) in `assets/fonts/`.
- Motion rules: only `transform` and `opacity` are animated, one easing family,
  every control has hover, press and focus states, reduced motion respected.

```
index.html      Home
services.html   Polished / epoxy / honed / floor prep
work.html       Before-and-after slider + gallery
areas.html      Service areas + map
contact.html    Quote form + contact details
assets/css/site.css
assets/js/site.js
assets/img/      WebP work photos + transparent logo (light/dark)
```

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://127.0.0.1:8000

## Deploying

Cloudflare Pages, connected to this repo:

- Framework preset: **None**
- Build command: *(leave blank)*
- Build output directory: `/`

Every push to `main` redeploys automatically.

## Things to change before this goes live

- **Quote form** posts to FormSubmit (`formsubmit.co`). The first submission
  triggers a one-off confirmation email that must be clicked before anything
  else comes through. Endpoint is in each page's `<form action>`.
- **Service areas**: the site says "Goulburn and the Southern Tablelands" and
  names no other towns. Add Corey's real range once he confirms it.
- The **exposed aggregate driveway** and **outdoor bench** photos sit in the
  gallery as examples of range. They are not listed as named services,
  because it isn't confirmed whether Polycrete poured them or finished them.

## Business details used

- Phone: 0468 965 583
- Address: 50 Mulwaree St, Goulburn NSW 2580
- Hours: Monday–Friday, 7am–5pm
- Rating: 5.0 from 4 Google reviews (reviews quoted verbatim)
