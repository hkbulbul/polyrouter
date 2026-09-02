---
name: "PolyRouter Design Language"
version: "1.0"
status: "normative"
updated: "2026-08-28"
creative_north_star: "Local Control Plane"
visual_voice: "Calm technical"
depth_philosophy: "Layered restrained"
platform: "web"
tokens:
  color:
    light:
      brand:
        "50": "#f0fdf4"
        "100": "#dcfce7"
        "200": "#bbf7d0"
        "300": "#86efac"
        "400": "#4ade80"
        "500": "#16a34a"
        "600": "#15803d"
        "700": "#166534"
        "800": "#14532d"
        "900": "#052e16"
      bg: "#FDFAF6"
      bg_alt: "#F7F3EE"
      surface: "#ffffff"
      surface_2: "#f4f4f5"
      surface_3: "#e7e7e9"
      sidebar: "rgba(244, 241, 236, 0.85)"
      border: "#e5e7eb"
      border_subtle: "#f1f1f3"
      text_main: "#0a0a0a"
      text_muted: "#6B7280"
      text_subtle: "#9CA3AF"
      danger: "#cf222e"
      success: "#10B981"
      warning: "#F59E0B"
      info: "#3B82F6"
      primary: "#16a34a"
      primary_hover: "#15803d"
    dark:
      brand:
        "50": "#052e16"
        "100": "#14532d"
        "200": "#166534"
        "300": "#15803d"
        "400": "#16a34a"
        "500": "#22c55e"
        "600": "#4ade80"
        "700": "#86efac"
        "800": "#bbf7d0"
        "900": "#dcfce7"
      bg: "#1a1a1a"
      bg_alt: "#1F1F1E"
      surface: "#262626"
      surface_2: "#303030"
      surface_3: "#3a3a3a"
      sidebar: "rgba(30, 30, 30, 0.85)"
      border: "#333333"
      border_subtle: "#2a2a2a"
      text_main: "#ededed"
      text_muted: "#9ca3af"
      text_subtle: "#6b7280"
      danger: "#ef4444"
      success: "#22c55e"
      warning: "#fbbf24"
      info: "#60a5fa"
      primary: "#16a34a"
      primary_hover: "#15803d"
  typography:
    sans: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    loaded_weights: [400, 500, 600, 700]
  radius:
    control: "10px"
    elevated: "14px"
    pill: "9999px"
  shadow:
    soft: "0 1px 2px 0 rgba(0,0,0,0.04)"
    warm: "0 2px 12px -2px rgba(22,163,74,0.18)"
    elevated: "0 12px 28px -4px rgba(60,50,45,0.06)"
    focus: "0 0 0 3px rgba(22,163,74,0.18)"
  layout:
    base_unit: "4px"
    content_max: "1280px"
    reading_max: "720px"
    nav_height: "64px"
    sidebar_width: "288px"
    page_gutter_mobile: "24px"
    page_gutter_desktop: "40px"
    section_gap_mobile: "64px"
    section_gap_desktop: "96px"
  motion:
    fast: "150ms"
    standard: "200ms"
    deliberate: "250ms"
    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
---

# Overview

## Purpose

This document is the design source of truth for PolyRouter marketing pages, documentation-facing website surfaces, onboarding, and compatible product UI. It extracts the recurring language already present in the product and turns it into rules for future work.

When this document and an isolated existing screen disagree, follow this document unless the underlying product behavior requires otherwise. The canonical implementation tokens remain in `src/app/globals.css`; update this document and that file together when a token intentionally changes.

## Creative direction

**Creative north star: Local Control Plane.** PolyRouter should look and behave like the calm, precise console between a developer's tools and their AI providers—not like a generic AI startup page.

**Visual voice: Calm technical.** Prefer exact language, clear system state, real configuration details, quiet surfaces, and disciplined green emphasis. Avoid hype, novelty decoration, and artificial urgency.

**Depth: Layered restrained.** Establish hierarchy with surface tone and fine borders first. Use shadow only when a surface is genuinely elevated. Use green glow only for focus, routing, health, or a singular primary action.

The experience should feel:

- Local, controlled, and trustworthy.
- Technical without being intimidating.
- Dense enough for operators, but never visually noisy.
- Warm and human rather than cold enterprise gray.
- Precise about what is happening, where data lives, and what the user should do next.

## Product truths the design must reinforce

1. **Local-first trust:** credentials, settings, and the primary SQLite database stay on the machine running PolyRouter.
2. **One endpoint:** tools connect to `http://localhost:20128/v1`.
3. **Configure once:** providers are connected once and reused through the same endpoint.
4. **Operator control:** provider/account state, quota, fallback, translation, and failures stay legible.
5. **Self-hoster onboarding:** install → open dashboard → connect provider → copy key → configure tool → send first routed request.
6. **Core routing has no cloud dependency:** optional cloud sync and tunnels must always be described as optional.

## Audience and tone

The primary audience is technically capable self-hosters operating a local gateway. Assume they understand endpoints, API keys, providers, models, and local services. Do not make them decode marketing language.

Use copy that is:

- Direct: “Connect a provider” rather than “Unlock the future.”
- Specific: show `/v1`, port `20128`, and actual next steps.
- Verifiable: describe shipped behavior, not aspirations.
- Calm: explain risk and recovery without alarmism.
- Action-led: headings should help a user decide or act.

Prefer **PolyRouter** as one word with the documented capitalization. In wordmarks, “Poly” may use brand green while “Router” uses the main text color.

## Information architecture

### Recommended landing-page sequence

1. **Navigation:** Product/How it works, Providers or Compatibility, Local-first/Security, Docs, and one primary install action.
2. **Hero:** one-endpoint promise, local-first trust line, exact endpoint or install command, primary CTA, secondary documentation CTA.
3. **Product proof:** a real dashboard image or restrained tool → PolyRouter → provider diagram.
4. **How it works:** connect providers, point tools at `/v1`, monitor/fail over locally.
5. **Core capabilities:** translation, 40+ providers, combo/account fallback, credential handling, usage/quota, optional remote access.
6. **Local-first trust:** explicitly state what remains on the user's machine and what optional features may communicate externally.
7. **Get started:** exact install command and the shortest verified route to the first successful request.
8. **Documentation/FAQ:** prerequisites, supported tools, endpoint/key/model configuration, and recovery paths.
9. **Final CTA and footer:** repeat the install or docs action; link only to real destinations.

Do not ask visitors to install before they understand the mechanism and local-first value. Keep one primary conversion goal per viewport.

### Website scope

Create only pages supported by real content:

- Home/landing.
- Documentation.
- Provider and format compatibility.
- Local-first security and data handling.
- Changelog/releases when a real changelog source exists.
- Dashboard/login application routes.

Do not add placeholder Pricing, Customers, Press, Careers, or Community pages.

## Evidence hierarchy

When writing UI or marketing copy, use this order of authority:

1. Current working product behavior.
2. `PRODUCT.md` and architecture documentation.
3. Current README and GitBook documentation.
4. Existing interface copy.
5. Existing landing-page claims only after verification.

Never infer product capability from a decorative mockup.

## Source references

- Brand and semantic tokens: `src/app/globals.css`.
- Font and metadata: `src/app/layout.js`.
- Binding logo: `public/polyrouter-logo.png`.
- App icon treatment: `public/favicon.svg` and `public/icons/icon-512.svg`.
- Shared primitives: `src/shared/components/`.
- Product constraints and claim evidence: `PRODUCT.md`.
- Current landing implementation: `src/app/landing/`.
- Operator shell: `src/shared/components/layouts/DashboardLayout.js`.

# Colors

## Palette strategy

Green is the single brand accent. Warm neutrals carry the page. Semantic status colors communicate operational meaning. Color must clarify structure or state; it is not decoration.

Use semantic utilities and variables instead of hard-coded Tailwind colors:

| Purpose | Tailwind vocabulary | CSS variable |
|---|---|---|
| Page canvas | `bg-bg` | `--color-bg` |
| Alternate section | `bg-bg-alt` | `--color-bg-alt` |
| Primary surface | `bg-surface` | `--color-surface` |
| Recessed/interactive surface | `bg-surface-2` | `--color-surface-2` |
| Strong disabled/pressed surface | `bg-surface-3` | `--color-surface-3` |
| Main text | `text-text-main` | `--color-text-main` |
| Secondary text | `text-text-muted` | `--color-text-muted` |
| Decorative/de-emphasized text | `text-text-subtle` | `--color-text-subtle` |
| Standard border | `border-border` | `--color-border` |
| Quiet divider | `border-border-subtle` | `--color-border-subtle` |
| Brand/action accent | `text-primary`, `bg-primary` | `--color-primary` |
| Status | `success`, `warning`, `danger`, `info` | corresponding semantic variable |

Do not use undefined aliases such as `bg-background`, `bg-bg-subtle`, `text-text-primary`, or `bg-surface-secondary`. They are not canonical Tailwind selectors. Use `bg-bg`, `bg-bg-alt`, `text-text-main`, and `bg-surface-2` respectively.

## Light theme

| Role | Value | Use |
|---|---:|---|
| Canvas | `#FDFAF6` | Default page background; warm, not pure gray. |
| Alternate canvas | `#F7F3EE` | Section alternation, recessed regions. |
| Surface | `#ffffff` | Cards, menus, dialogs, primary panels. |
| Surface 2 | `#f4f4f5` | Inputs, secondary controls, row hover, code blocks. |
| Surface 3 | `#e7e7e9` | Disabled/pressed states and stronger separation. |
| Border | `#e5e7eb` | Controls and component boundaries. |
| Border subtle | `#f1f1f3` | Internal dividers where the surface already separates. |
| Text main | `#0a0a0a` | Headings, body, critical values. |
| Text muted | `#6B7280` | Secondary copy, labels, metadata. |
| Text subtle | `#9CA3AF` | Decorative or nonessential metadata only. |
| Primary | `#16a34a` | Links, icons, selected state, focus, brand emphasis. |
| Primary hover | `#15803d` | Hover and accessible filled-action background. |

## Dark theme

| Role | Value | Use |
|---|---:|---|
| Canvas | `#1a1a1a` | Default dark page background. |
| Alternate canvas | `#1F1F1E` | Section alternation and shell regions. |
| Surface | `#262626` | Cards, menus, dialogs, primary panels. |
| Surface 2 | `#303030` | Inputs, secondary controls, row hover. |
| Surface 3 | `#3a3a3a` | Disabled/pressed states and stronger separation. |
| Border | `#333333` | Controls and component boundaries. |
| Border subtle | `#2a2a2a` | Internal dividers. |
| Text main | `#ededed` | Headings, body, critical values. |
| Text muted | `#9ca3af` | Secondary copy and metadata. |
| Text subtle | `#6b7280` | Decorative/nonessential content only. |
| Brand highlight | `#22c55e` | Selected state, links, status emphasis. |
| Primary action | `#16a34a` | Current primary alias; verify foreground contrast. |

The landing page and website must honor the current theme or system preference. A permanently dark landing route is not the standard. Never duplicate a route-specific palette when semantic tokens already exist.

## Brand scale

The full brand scales in the frontmatter mirror `src/app/globals.css`. The numbered scale is **theme-responsive and reverses direction in dark mode**, so names such as `brand-100` do not identify one invariant hex value. Use semantic roles for normal component styling; use a numbered brand utility only when its per-theme result has been reviewed.

General intent:

- `50–200`: tinted backgrounds, selected rows, quiet badges.
- `300–400`: dark-theme accents and visible lines.
- `500`: canonical theme accent.
- `600–700`: hover, pressed, or stronger emphasis after contrast verification.
- `800–900`: deep/light counterparts within the active theme scale.

The app icon uses a diagonal `#16a34a` → `#14532d` gradient with white “P” and “R” initials. Do not turn that gradient into a general-purpose page background.

## Primary action contrast

`#16a34a` with small white text does not meet WCAG AA for normal text. For new filled controls:

- Light theme: use `brand-600` (`#15803d`) with white text; hover to `brand-700` (`#166534`).
- Dark theme: use a sufficiently bright green such as dark-mode `brand-500` (`#22c55e`) with a fixed deep-green foreground such as `#052e16`, or another pairing verified at 4.5:1 or better.
- Keep `#16a34a` as the identity color for logos, non-text accents, large display emphasis, borders, and focus treatment.

Do not lower contrast to preserve an exact decorative shade.

## Semantic colors

Use status colors only for their meaning:

- **Success:** connected, healthy, completed, available.
- **Warning:** degraded, nearing quota, partial configuration, attention needed.
- **Danger:** failed, destructive, invalid, disconnected when it blocks operation.
- **Info:** neutral guidance, in-progress checks, informational state.
- **Brand green:** selection, routing, primary action, and PolyRouter identity—not a generic success replacement.

Every semantic state needs an icon, label, or text in addition to color. Do not represent provider health with color alone.

## Contrast guardrails

- Normal text: minimum `4.5:1`.
- Large text: minimum `3:1`.
- Controls, focus indicators, charts, and meaningful boundaries: minimum `3:1` against adjacent colors.
- `text-subtle` is not for body copy, instructions, errors, terminal commands, or legal text.
- Thin borders may be subtle only when spacing/surface already communicates the boundary.
- Test both themes and disabled states; opacity can turn a passing token into a failure.

Known landing colors such as gray-500/600 on warm dark backgrounds fail for small text. Do not carry them forward. Do not place dark text on `#15803d` without checking contrast. The current green-on-green text selection treatment also needs a verified foreground/background pairing; selected text must remain readable.

## Documentation surfaces

GitBook currently uses an independent light-only Inter/orange system. That is visual drift, not a second PolyRouter brand. New or refreshed documentation should use this document's IBM Plex Sans, green, semantic warm-neutral, and light/dark rules unless an explicit product decision records a separate documentation identity. Do not use the current orange `#E68A6E` for small text; its measured contrast on the warm light canvas is insufficient.

## Background motifs

The faint green grid is the signature technical motif:

- Use `.landing-grid` as an absolutely positioned, `aria-hidden="true"`, pointer-events-none layer.
- Default grid: 40px cells, 1px brand-colored lines, 8% light opacity and 4% dark opacity.
- Allow at most one grid plus one quiet radial wash in a viewport.
- Keep content backgrounds calm; do not combine the grid with purple, orange, blue, and green ambient blobs.

# Typography

## Families

**Primary:** IBM Plex Sans. Load only weights 400, 500, 600, and 700, which are already configured through `next/font/google`.

**Monospace:** the system monospace stack for endpoints, commands, model IDs, API keys, token counts, logs, and code.

Do not request weights 300, 800, or 900 unless they are intentionally added to the font loader. Synthetic weights are not part of the visual language.

## Type scale

| Role | Mobile | Desktop | Weight | Line height | Use |
|---|---:|---:|---:|---:|---|
| Display | 48px | 72px | 700 | 1.05–1.1 | Landing hero only. |
| Page H1 | 36px | 48px | 700 | 1.1 | Primary page promise. |
| Section H2 | 30px | 40px | 600–700 | 1.15 | Major sections. |
| Card H3 | 20px | 24px | 600 | 1.25 | Feature and workflow cards. |
| Body large | 18px | 20px | 400 | 1.5 | Hero support and section intros. |
| Body | 16px | 16px | 400 | 1.5 | Default website prose. |
| UI body | 14px | 14px | 400–500 | 1.4 | Dashboard controls and dense data. |
| Caption | 12px | 12px | 500 | 1.35 | Metadata; never critical instructions. |
| Metric | 24px | 32px | 600 | 1.1 | Usage/quota values with tabular figures. |
| Code | 14px | 14px | 400–500 | 1.5 | Commands, endpoints, keys. |

Use responsive `clamp()` or Tailwind breakpoints rather than an unbounded display size. At 320px width, headings must wrap without horizontal scrolling.

## Hierarchy rules

- One visible `h1` per page.
- Use `h2` for page sections and `h3` for cards within them.
- The brand in navigation is not a heading.
- Prefer sentence case. Avoid all-caps except very short technical labels or table headings.
- Keep headings compact and body copy easy to scan.
- Limit hero copy to one promise, one proof line, and one supporting sentence.
- Use green emphasis for a phrase or keyword, not every heading.
- Use `font-semibold` before `font-bold`; reserve 700 for primary hierarchy.
- Use `tabular-nums` for usage, quota, latency, cost, time, and rate data.
- Do not use low-contrast tiny text to make dense content fit. Rework the layout instead.

## Content width

- Marketing prose: 60–72 characters per line, approximately `max-w-2xl`/720px.
- Hero supporting text: approximately 640–720px.
- Dashboard descriptions: one or two concise lines.
- Technical code/terminal content may be wider but must scroll rather than shrink below readable size.

## Writing patterns

Prefer:

- “One local endpoint for every provider.”
- “Point your tools at `http://localhost:20128/v1`.”
- “Credentials and routing data stay on this machine.”
- “Connect a provider.” / “Copy API key.” / “Retry connection.”

Avoid:

- “Revolutionize your AI workflow.”
- “The ultimate AI superpower.”
- “Blazing-fast, cheapest routing” without measured evidence.
- “Join thousands of developers” without verified data.

# Layout

## Base system

Use a 4px base unit. Preferred increments are 4, 8, 12, 16, 24, 32, 48, 64, and 96px. Avoid isolated 5px/13px/27px values unless required for optical alignment.

## Containers

- Marketing maximum: `max-w-7xl` / 1280px.
- Reading maximum: 720px.
- Dashboard content maximum: `max-w-7xl`.
- Marketing horizontal gutter: 24px; increase only when the viewport has room.
- Dashboard content padding: 24px on compact layouts, 40px at `lg`.
- Center major containers with automatic inline margins.
- Keep text aligned to a consistent left edge across sections.

## Vertical rhythm

- Marketing section padding: 64px mobile, 96px desktop.
- Hero: enough top clearance for the 64px navigation; avoid forcing `90vh` on short landscape screens.
- Heading → intro: 12–20px.
- Intro → primary content: 32–48px.
- Card internal spacing: 16–24px; 32px only for spacious editorial cards.
- Dashboard clusters: 16–24px.
- Divider-led dense rows: 12–16px.

## Grid behavior

Use content-driven, mobile-first grids:

- Feature cards: 1 column → 2 at `sm` → up to 4 at `lg` only when cards remain readable.
- Process steps: 1 column → 3 at `md`.
- Install/trust split: 1 column → 2 at `lg`.
- Footer: 2 columns → 4/5 only when links fit.
- Operator stats: 1 → 2 → 4 based on content, not symmetry alone.

Do not use an eight-color card grid to create differentiation. Structure, icon, title, and content should do that work.

## Responsive rules

Use Tailwind's existing breakpoints as layout triggers:

- `sm` 640px.
- `md` 768px.
- `lg` 1024px.
- `xl` 1280px.
- `2xl` 1536px.

Requirements:

- Start with a complete mobile experience; desktop is an enhancement.
- Navigation changes to desktop at `md` only if all items fit.
- All primary actions become full-width or comfortably tappable on narrow screens.
- Minimum interactive target: 44×44px, including icon buttons.
- Keep important actions visible without hover.
- Dense tables use `overflow-x-auto` with a readable `min-width`; never compress columns until values become ambiguous.
- Drawers use `width: min(configured width, 100vw)` and account for safe areas.
- Diagrams need an explicit mobile representation. Never nest the mobile fallback inside a `hidden md:flex` parent.
- Do not run timers or animations for content hidden by CSS.
- Preserve 16px input text on mobile to prevent iOS zoom.
- Test 320px, 375px, 768px, 1024px, and a wide desktop.

## Application shell

The operator shell follows the existing dashboard model:

- Full-height `bg-bg` canvas.
- 288px desktop sidebar from `lg`; compact/mobile off-canvas navigation below it.
- Route title, optional description, breadcrumbs, search, theme, language, and account controls in the header.
- Main content constrained to 1280px.
- Faint grid may sit behind content but must not reduce readability.
- Route state and primary actions remain near the page title.

## Landing composition

A marketing section should usually contain:

1. Eyebrow or status only when it adds verified context.
2. Short heading.
3. One concise explanatory paragraph.
4. One proof surface: real UI, exact command, diagram, or capability list.
5. One action when the section naturally advances the journey.

Do not alternate arbitrary centered/left layouts for novelty. Center the hero and final CTA if desired; keep technical explanation and configuration content left-aligned.

## Dense data

- Place labels before values and units after values.
- Use tabular numbers.
- Keep provider/model identifiers untruncated when needed for decisions; provide a tooltip or copy affordance when truncation is unavoidable.
- Sticky headers are acceptable for long tables.
- Expandable rows must expose keyboard and `aria-expanded` state.
- Sorting controls must be buttons and set `aria-sort` on the relevant header.
- Empty, loading, degraded, and error states occupy the same structural region as loaded data to avoid layout jumps.

# Elevation & Depth

## Principle

Use this order to communicate hierarchy:

1. Spacing.
2. Surface color.
3. Border.
4. Shadow.
5. Glow only for meaningful focus or active routing.

If a border and surface already define a component, do not add a shadow.

## Elevation levels

### Level 0 — Canvas

- `bg-bg` or `bg-bg-alt`.
- No shadow.
- Grid/radial texture may appear at very low opacity.

### Level 1 — In-flow surface

- `bg-surface`.
- `border-border-subtle` or no border when tonal separation is sufficient.
- `shadow-soft` only when needed against a same-tone canvas.
- Use for cards, stat blocks, terminal/code panels, and settings groups.

### Level 2 — Interactive/elevated surface

- `bg-surface`.
- `border-border`.
- `shadow-elev`.
- Use for dropdowns, popovers, sticky navigation, raised product previews, and selected floating panels.

### Level 3 — Modal surface

- `bg-surface`, strong boundary, `shadow-elev` or dark-theme equivalent.
- Backdrop separates context without turning opaque.
- Used only for tasks that interrupt or require explicit completion/dismissal.

## Green depth

`shadow-warm` and green rings may indicate:

- Keyboard focus.
- The one primary action.
- A selected/routing node.
- Healthy active connectivity when the meaning is also labeled.

Do not place green glow around every card. Do not combine green glow with orange CTA glow, purple blobs, blue halos, and yellow routes.

## Glass and vibrancy

The existing sidebar/navigation vibrancy is acceptable when:

- Text contrast remains compliant.
- A fallback opaque surface exists.
- Blur is limited to shell chrome, not all content cards.
- Motion and scrolling remain performant.

Do not use glassmorphism as a generic card style.

# Shapes

## Corner language

PolyRouter uses restrained, near-rectangular geometry—not bubbly consumer-app shapes.

- Standard controls and cards: 10px (`--radius-brand`).
- Elevated cards, dialogs, and major preview shells: 14px (`--radius-brand-lg`).
- Dense table rows and internal sections may use square edges where they join a larger shell.
- Small code tokens may use 4–6px.
- Pills (`9999px`) are reserved for badges, tags, segmented status, and compact filters.
- Circles are reserved for status dots, avatars, numbered steps, traffic lights, and topology nodes.

The current landing page's completely square cards are an implementation-specific extreme, not a requirement. Future pages should use the canonical 10/14px tokens while preserving a crisp silhouette.

Avoid:

- 24–32px “bubble” cards.
- Pill-shaped primary buttons by default.
- Arbitrary radius values per section.
- Decorative circles without system meaning.

## Lines and connectors

Routing diagrams may use fine orthogonal or gently curved connectors:

- Neutral/inactive paths use borders or muted text tones.
- Active paths use brand green.
- Dashed motion is optional and must stop under reduced motion.
- Direction cannot be communicated by color alone; add arrowheads, labels, or sequence.
- Decorative SVGs are `aria-hidden="true"`; explanatory diagrams need a text equivalent.

## Logo and marks

- `public/polyrouter-logo.png` is binding.
- The current file is a 612×408 PNG and is byte-identical to `public/downloads/polyrouter-connector/icon.png`. Treat that identity as something to verify with the brand owner before replacing or deriving new marks; it is not permission to invent a substitute.
- Preserve its intrinsic 3:2 aspect ratio; use `object-contain`, never crop or stretch it into a square.
- Set explicit rendered width and height to prevent layout shift.
- Keep clear space at least equal to the height of the “P” stem or approximately 25% of mark height.
- Use the existing PR gradient icon for favicon/app-icon contexts. A future maskable PWA icon needs a separately verified safe zone rather than reusing the ordinary icon blindly.
- Do not introduce alternative dashboard/footer emblems; converge on the binding asset or an approved wordmark.
- Do not recolor provider marks to match PolyRouter green.
- Do not fabricate provider logos with generic colored squares when a verified asset or text label is available.

## Iconography

Use Material Symbols Outlined for interface actions and concepts:

- 18px inside compact controls.
- 20px for navigation and standard actions.
- 24px for standalone feature/supporting icons.
- Use `fill-1` only for selected or strongly active state.
- Pair unfamiliar icons with text.
- Every icon-only control requires an accessible name.
- Do not use emoji as interface iconography.

# Components

## Component rule

Reuse primitives from `src/shared/components` before creating route-local controls. New website components should consume semantic tokens and preserve the same states as product UI. A visually unique section is not a reason to reimplement a button, input, modal, toast, or dropdown.

## Buttons and links

### Variants

- **Primary:** one dominant action per region. Accessible green fill, high-contrast foreground.
- **Secondary:** `surface-2` fill, main text, standard border.
- **Outline:** transparent background, standard border; use beside a primary action.
- **Ghost:** low-emphasis toolbar/navigation action.
- **Danger:** destructive action only.
- **Success:** completion/confirmation action only; do not substitute for the primary brand variant.

### Sizes

- Compact visual controls may be 28–36px high only when the interactive hit area is expanded to at least 44×44px.
- Default website and touch action: 44px minimum.
- Prominent hero action: 48px minimum.
- Icon controls: visible icon 18–20px inside a 44×44px target.

### States

Every button needs:

- Resting.
- Hover where hover exists.
- `focus-visible` using the brand focus ring with sufficient boundary contrast.
- Active/pressed; the existing `scale(0.97)` is acceptable when reduced motion is honored.
- Disabled, with semantics and no handler.
- Loading, preserving width and exposing progress text to assistive technology.

Use a real link for navigation and a real button for actions. Never ship an inert CTA. External links communicate that they open a new destination when the context is not obvious.

## Navigation

- 64px shell height.
- Brand on the left, high-priority links in the middle/right, one primary CTA.
- Sticky/fixed navigation may use restrained blur and a visible bottom border.
- Logo links to the current site's home/top, not unexpectedly into the dashboard.
- Mobile menu button needs `aria-label`, `aria-expanded`, and `aria-controls`.
- Mobile menu closes on link selection and Escape, restores focus, and exposes 44px targets.
- Current-page links use `aria-current="page"`.
- Do not hide essential navigation behind hover.

## Cards

Use cards for a coherent object, workflow step, capability, or state—not as a default wrapper around every paragraph.

- Primary surface + subtle border.
- 16–24px internal padding; 32px for a major preview.
- Icon/title/subtitle/action align on a clear grid.
- Hover elevation only when the whole card is interactive.
- An interactive card must be a link/button or have complete keyboard semantics.
- Actions cannot appear only on hover; keep them visible on touch and focus-within.
- Keep feature accents primarily green/neutral. Semantic colors are allowed only when the card communicates that state.

## Inputs and selects

Visual standard:

- `surface-2` fill.
- Main text, muted placeholder.
- Transparent or quiet resting border.
- Brand border + focus ring on focus.
- Semantic danger border/ring on error.
- 44px minimum height and 16px text on mobile.

Semantic requirements:

- Generate or accept an `id`.
- Associate `<label htmlFor>` with that id.
- Add `aria-invalid="true"` on error.
- Connect hint/error with `aria-describedby`.
- Required state must be programmatic, not only a red asterisk.
- Error text says what failed and how to recover.
- Preserve entered data after validation errors.
- Never use placeholder text as the only label.

## Toggles and segmented controls

- Toggle uses `role="switch"` and `aria-checked` when not a native checkbox.
- A visible label explains what changes.
- Active green must be accompanied by checked state.
- Segmented controls expose the selected option with native radio semantics or an appropriate tab/radiogroup pattern.
- Entire option target is at least 44px high on touch layouts.

## Badges and status

Pill badges are the major rounded exception.

- Default: neutral metadata.
- Primary: PolyRouter-specific selection or routing.
- Success/warning/error/info: operational state only, using semantic status tokens rather than raw Tailwind red/green/yellow/blue values.
- Include text; a dot alone is insufficient.
- Keep labels short and stable: “Connected,” “Degraded,” “Disabled,” “Checking,” “Quota low.”
- Do not animate a status badge unless it represents work in progress.

## Modal and drawer

Use the shared accessible modal/drawer behavior rather than bespoke fixed overlays:

- `role="dialog"`, `aria-modal="true"`, and labelled title.
- Focus moves into the dialog, remains trapped, and returns to the trigger.
- Escape closes unless doing so would risk data loss; in that case explain the constraint.
- Scroll locking includes scrollbar compensation.
- Close control has an accessible name and 44px target.
- Drawers cap width to the viewport.
- Destructive actions require clear consequences and deliberate confirmation.

Do not use native `alert()`/`confirm()` for routine product flows.

## Dropdown and tooltip

The shared dropdown keyboard model is canonical:

- Trigger exposes `aria-haspopup` and `aria-expanded`.
- Menu/menuitem semantics.
- ArrowUp/ArrowDown navigation.
- Enter/Space activation.
- Escape closes and restores trigger focus.
- Tab exits cleanly.
- Position flips to stay within the viewport.

Tooltips:

- Supplement visible labels; do not contain essential instructions or interactive content.
- Open on keyboard focus as well as hover.
- Remain readable on touch through an alternative such as visible helper text.
- Use `role="tooltip"` and connect with `aria-describedby` where appropriate.

## Toasts, banners, and feedback

Choose one channel based on scope:

- **Inline error:** field- or component-specific problem.
- **Banner:** persistent page-level degraded/security/configuration state.
- **Toast:** brief confirmation for an action that does not require a decision.
- **Modal:** blocking choice or high-risk confirmation.

Requirements:

- Toast stack uses `aria-live="polite"`; urgent failures may use assertive announcements sparingly.
- Copy confirmation is keyboard operable and announced.
- Do not claim clipboard success until `navigator.clipboard.writeText()` resolves.
- Provide retry when recovery can happen immediately.
- Do not leave failures in the console only.
- Avoid showing the same event in a banner and toast simultaneously.

## Tables and data lists

- Use semantic `<table>` markup for tabular data.
- Sorting controls are buttons; set `aria-sort`.
- Clickable rows must be keyboard focusable and operable, or contain an explicit link/button.
- Expanded rows set `aria-expanded` and identify their controlled content.
- Use horizontal scrolling for dense operator data; do not hide required columns on mobile without an alternate detail view.
- Keep important row actions visible on focus and touch.
- Use status text/icons, not color-only cells.

## Terminal and code surfaces

Terminal/code blocks are proof, not decoration:

- Show exact, executable commands.
- Canonical install example: `npx polyrouter` or the current documented installation command.
- Canonical endpoint: `http://localhost:20128/v1`.
- Use monospace, selectable text, and a real copy button.
- Copy button includes a persistent accessible name and announced success/failure.
- Long lines scroll horizontally.
- Never include an emoji prompt, fake logs, fake metrics, or a command that is not documented.

## Provider and product imagery

- Prefer real product screenshots and actual provider assets.
- Screenshots must show plausible, internally consistent data and must not expose credentials.
- Label mockups as illustrative when they are not a real captured state.
- Set image width/height and useful alt text; decorative imagery gets empty alt.
- Validate provider asset contents and formats before publishing; filenames alone are not proof of the underlying image type or brand. The current directory includes PNG-named ICO/JPEG files and exact cross-brand duplicates, so do not bulk-convert, deduplicate, or relabel assets without checking provider identity.
- `ProviderIcon` fallbacks must retain an accessible provider name; visual initials alone are insufficient.
- Do not create a fake provider grid merely to imply breadth. If “40+” is used, ensure current product evidence still supports it.

## Diagrams

A routing diagram should explain one mechanism:

`AI tool → PolyRouter local /v1 endpoint → selected provider/account`

- Put PolyRouter at the visual center.
- Use brand green for the active route.
- Keep inactive routes neutral.
- Provide labels and a text equivalent.
- On mobile, switch to a vertical sequence or concise text list.
- Do not rotate providers every few seconds merely for spectacle.
- If live cycling communicates real state, provide pause and reduced-motion alternatives.

## Charts

- Use semantic tokens rather than arbitrary chart hex values.
- Brand green is the primary series; status colors retain semantic meaning.
- Secondary series use distinguishable neutral/blue tones with tested contrast.
- Include axis labels, units, tooltip labels, and a table/list alternative for critical data.
- Do not rely on red/green distinction alone.
- Avoid decorative gradients and 3D effects.

## Loading, empty, error, and degraded states

Every data-bearing component defines:

- **Loading:** stable-size skeleton or labelled spinner.
- **Empty:** what is absent, why it matters, and one next action.
- **Error:** concise cause when safe, retry/recovery, and preserved user input.
- **Degraded:** what still works and what does not.
- **Success:** confirmation near the changed object.

Spinners and skeletons stop or simplify under reduced motion. Never use a perpetual pulse as the only indication that work is active.

## Motion and interaction

Motion communicates cause and state:

- 150ms for hover, focus, and compact control state.
- 180–200ms for menus, fades, and small overlays.
- 200–250ms for modals, drawers, and route-adjacent panels.
- Use the existing expressive easing `cubic-bezier(0.22, 1, 0.36, 1)` for entrances; use simple ease-in for exits.
- Prefer opacity and transform.
- Avoid animating layout properties.
- One ambient motion system per page at most.
- Do not animate content continuously unless it represents live activity.

Required reduced-motion behavior:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Also stop JavaScript timers and automatic cycling when reduced motion is requested or the component is not visible.

## Accessibility baseline

All new landing and website work must meet WCAG 2.2 AA.

- Semantic landmarks and heading order.
- Skip link to main content.
- Keyboard access to every action.
- Visible `focus-visible` treatment on every interactive element.
- 44×44px touch targets.
- Programmatic names and descriptions.
- Form label/error association.
- Status not conveyed by color alone.
- Contrast thresholds defined in Colors.
- Zoom to 200% without loss of content/action.
- Reflow at 320 CSS pixels without two-dimensional page scrolling, except intentional data/code regions.
- Reduced-motion support.
- Current document language reflected in `<html lang>`; browser/manifest theme color follows theme and installed-app orientation does not unnecessarily exclude landscape dashboard use.
- Apply the persisted/system theme before first paint to avoid a light-theme flash in dark mode; cycling from `system` must always produce a visible, predictable next state.
- Decorative backgrounds/SVGs hidden from assistive technology.
- Live updates announced only when useful; avoid noisy status streams.
- English and Simplified Chinese layouts must both be tested; do not translate text by DOM mutation in new work when server/component-level localization is available.

## Product-truth checklist

### Supported claims

Subject to verification against the current release, the site may state:

- PolyRouter is a local AI gateway and OpenAI-compatible router.
- It exposes one local `/v1` endpoint.
- Credentials, settings, and the primary SQLite database stay on the machine running it.
- It supports 40+ upstream providers.
- It translates among documented provider formats.
- It supports model-combo and multi-account fallback.
- It manages OAuth/API-key credentials and token refresh.
- It tracks usage and quota.
- Optional cloud sync and optional tunnels exist but are not required for core routing.
- English and Simplified Chinese are supported.

### Claims requiring proof before publication

- “Lowest cost,” “lowest latency,” “fastest,” or automatic optimization.
- Prompt analysis or intelligent intent routing.
- “Real-time” traffic analysis.
- “Instant” cloud sync.
- Reliability, uptime, benchmark, or savings percentages.
- Security claims beyond the documented architecture and tested behavior.

### Forbidden fabrication

- Testimonials.
- Customer or developer counts.
- Press logos or awards.
- Fake provider affiliations.
- Fake live traffic, quota, or usage data presented as real.
- “Free” or pricing language not supported by current licensing/product terms.
- Hard-coded “v1.0 is now live” or stale release claims.
- Undefined product terminology such as “vault” unless the product adopts and documents it.

# Do’s and Don’ts

## Do

- Use “Local Control Plane” as the decision filter.
- Lead with the one-endpoint and local-first promises.
- Show the exact `/v1` endpoint and real install/configuration steps.
- Use IBM Plex Sans weights 400–700 and system monospace for technical values.
- Build from semantic light/dark tokens.
- Keep green as the single brand accent.
- Use warm-neutral canvas and quiet white/charcoal surfaces.
- Use 10px/14px restrained corners and pills only for status/tags.
- Establish hierarchy with spacing, tone, and borders before shadow.
- Reserve glow for focus, active routing, health, or a singular CTA.
- Reuse shared Button, Input, Select, Modal, Dropdown, Toast, Card, Badge, Toggle, and SegmentedControl behavior.
- Keep the mobile experience complete, with real diagram/table alternatives.
- Make every control keyboard operable and every state explicit.
- Show loading, empty, degraded, success, and recovery states.
- Use real screenshots, provider assets, commands, destinations, and release data.
- Test contrast, focus, 200% zoom, 320px reflow, both themes, reduced motion, English, and Simplified Chinese.

## Don’t

- Do not invent a new palette or replace brand green.
- Do not hard-code a dark-only landing palette.
- Do not use undefined theme aliases or scatter literal Tailwind colors through components.
- Do not use rainbow feature accents, purple/blue/orange ambient blobs, yellow route lines, or emoji UI.
- Do not apply shimmer, pulse, glow, and moving routes all at once.
- Do not use perpetual animation without reduced-motion and visibility handling.
- Do not use hover-only actions, tooltip-only instructions, or color-only status.
- Do not ship controls below 44×44px without an expanded hit target.
- Do not use a `<div>` as a button or make a table row clickable without keyboard semantics.
- Do not create bespoke overlays when the accessible Modal/Drawer pattern exists.
- Do not stretch the 3:2 PolyRouter logo into a square.
- Do not use fake provider tiles, fake social proof, or unverifiable optimization claims.
- Do not omit `/v1` from endpoint instructions.
- Do not use “Start Free” unless licensing and onboarding behavior make that statement exact.
- Do not send the logo/home link unexpectedly to `/dashboard` from the marketing site.
- Do not publish stale years, broken license/changelog links, inert CTAs, or placeholder pages.

## Release gate

Before a landing or website change ships, verify:

- [ ] The primary CTA navigates or acts correctly.
- [ ] All links resolve to intentional destinations.
- [ ] Copy matches current product evidence and version data.
- [ ] Light, dark, and system themes use semantic tokens; no unsupported aliases (`bg-background`, `bg-bg-subtle`, `text-text-primary`, `bg-surface-secondary`) remain in changed code.
- [ ] Keyboard order, focus return, and focus-visible states work.
- [ ] Labels, errors, menus, dialogs, tables, and live feedback expose correct semantics.
- [ ] Text/control contrast meets WCAG 2.2 AA.
- [ ] Interactive targets are at least 44×44px.
- [ ] Content works at 320px and 200% zoom.
- [ ] Dense tables/code scroll intentionally rather than breaking the page.
- [ ] Motion respects `prefers-reduced-motion`; hidden content performs no background animation.
- [ ] Images have dimensions, correct aspect ratios, and appropriate alt text.
- [ ] No credentials, fabricated metrics, testimonials, counts, or provider affiliations appear.
- [ ] The endpoint is written as `http://localhost:20128/v1` where a full URL is needed.
- [ ] English and Simplified Chinese layouts and `<html lang>` behavior are verified.
