# CLAUDE.md — Frontend Website Rules

## Environment

* You're working inside my GitHub repo. Everything you change is tracked by git and can be pushed back to GitHub.
* The `main` branch is the live site. Never commit or push to it directly.
* For every approved edit: create a new branch, commit with a clear message, push, and open a pull request. I review and merge.
* Skills live in `.claude/skills/`. Use them when the task matches.
* Keep the repo clean: don't commit `temporary screenshots/`, `node_modules/`, or secrets. Add them to `.gitignore` if they aren't already.

## Workflow (every edit request, no exceptions)

1. **Read first.** Read the relevant code and `brand_assets/`. Never assume what's there.
2. **Plan, then stop.** Before touching any code, give me a plan:
   - What I asked for, in your words
   - Files and sections you'll change, and what changes in each
   - Performance impact (better, same, or worse, and why)
   - What could break
   - Anything unclear (ask one question, don't guess)
   Then wait for my approval. No code changes until I say go.
3. **Build only what was approved.** Spot something else worth fixing? Mention it afterwards, don't do it.
4. **Verify** (see Verification below) before saying it's done.
5. **Git:** work on a new branch, commit with clear messages, open a PR. Never push straight to main.

If my request is a bad idea, conflicts with existing code, or hurts performance, say so plainly and recommend one better option before proceeding.

## Performance (always the priority)

* Target: Lighthouse 90+ on mobile for Performance, Accessibility, Best Practices and SEO.
* Core Web Vitals: LCP under 2.5s, CLS under 0.1, INP under 200ms.
* Images: modern formats (WebP/AVIF), correctly sized, explicit `width` and `height`, `loading="lazy"` below the fold, `fetchpriority="high"` on the hero image only.
* Fonts: max 2 families, `font-display: swap`, preload the critical one, subset where possible.
* JavaScript: minimal. No library for something CSS or a few lines of JS can do. Defer or async all scripts.
* CSS: no unused styles, no render-blocking where avoidable.
* No layout shift: reserve space for images, embeds and late-loading content.
* Tailwind via CDN is for prototyping only. Before a site goes live, compile and purge the CSS.
* Before adding any dependency, state its size and why it's needed.

## Verification (after every change)

* Re-read the changed code. Check for broken links, imports and typos.
* Serve on localhost, screenshot at mobile (375px), tablet (768px) and desktop (1440px), and look at them.
* Check the browser console: zero errors or warnings.
* Test every interactive element touched: hover, focus-visible, active, and keyboard navigation.
* Confirm existing features still work.
* Report what you checked and anything you couldn't verify. Don't say "done" without this.

## Professional Standards

* Semantic HTML (`header`, `nav`, `main`, `section`, `footer`), one `h1` per page, logical heading order.
* Accessibility: alt text on all images, 4.5:1 minimum contrast, visible focus states, labels on all form fields, tap targets at least 44px.
* SEO basics on every page: unique `title` and meta description, Open Graph tags, favicon, canonical URL, clean URLs.
* Forms: validate, show clear error states, and show a success state.
* Clean, consistent code: no dead code, no leftover comments, consistent naming, CSS custom properties for colours, spacing and type scale.
* Never hard-code secrets or API keys.
* Mobile-first. Test the smallest screen first.

## Reference Images

* If a reference image is provided: match layout, spacing, typography and colour exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
* If no reference image: design from scratch with high craft (see guardrails below).
* Screenshot your output, compare against the reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or I say so.

## Local Server

* Always serve on localhost. Never screenshot a `file:///` URL.
* Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`).
* `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
* If the server is already running, do not start a second instance.

## Screenshot Workflow

* Puppeteer is installed at `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. Chrome cache is at `C:/Users/nateh/.cache/puppeteer/`.
* Always screenshot from localhost: `node screenshot.mjs http://localhost:3000`
* Screenshots save automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
* Optional label: `node screenshot.mjs http://localhost:3000 label` saves as `screenshot-N-label.png`.
* `screenshot.mjs` lives in the project root. Use it as-is.
* After screenshotting, read the PNG from `temporary screenshots/` with the Read tool.
* When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px".
* Check: spacing/padding, font size/weight/line-height, colours (exact hex), alignment, border-radius, shadows, image sizing.

## Output Defaults

* Single `index.html` file, all styles inline, unless I say otherwise.
* Tailwind CSS via CDN while prototyping: `<script src="https://cdn.tailwindcss.com"></script>`
* Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
* Mobile-first responsive.

## Brand Assets

* Always check `brand_assets/` before designing. It may contain logos, colour guides, style guides or images.
* If assets exist, use them. No placeholders where real assets are available.
* If a logo is present, use it. If a colour palette is defined, use those exact values. Do not invent brand colours.

## Anti-Generic Guardrails

* **Colours:** Never use the default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand colour and derive from it.
* **Shadows:** Never use flat `shadow-md`. Use layered, colour-tinted shadows with low opacity.
* **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
* **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
* **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing. Respect `prefers-reduced-motion`.
* **Interactive states:** Every clickable element needs hover, focus-visible and active states. No exceptions.
* **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a colour treatment layer with `mix-blend-multiply`.
* **Spacing:** Intentional, consistent spacing tokens, not random Tailwind steps.
* **Depth:** Surfaces need a layering system (base → elevated → floating), not all on the same plane.

## Hard Rules

* Do not write code before I approve the plan.
* Do not add sections, features or content not in the reference or the approved plan.
* Do not "improve" a reference design. Match it.
* Do not stop after one screenshot pass.
* Do not use `transition-all`.
* Do not use default Tailwind blue/indigo as the primary colour.
* Do not push to main.
* Do not say "done" without running the verification checks.
