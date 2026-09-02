# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Distributed self-hosters: each user installs PolyRouter themselves (`npm install -g polyrouter` / `npx polyrouter`) and runs their own local gateway on their own machine. They are technically capable developers setting up and operating an AI routing layer for their AI coding tools and applications. The dashboard is a single-operator admin surface per instance (login + JWT session, default password must be overridden), not a shared multi-user SaaS console.

## Product Purpose

PolyRouter is a local AI gateway and OpenAI-compatible API router. It exposes one `/v1` endpoint on the user's machine, routes traffic across 40+ upstream providers with request/response format translation (OpenAI, Claude, Gemini, Cursor, Kiro, Vertex — plus binary/protobuf formats handled in-executor), model-combo fallback, multi-account fallback, OAuth/API-key credential management, token refresh, quota/usage tracking, RTK token optimization, and optional cloud sync. Success: a user connects providers once and then points every AI tool at `http://localhost:20128/v1` — never reconfiguring per provider or account again.

## Positioning

Local-first and local-only: credentials, settings, and the primary SQLite database stay on the machine running PolyRouter — no cloud dependency for core routing. The combination of one OpenAI-compatible endpoint + automatic combo/account failover + format translation across both mainstream and niche provider formats (kiro EventStream, cursor protobuf, commandcode NDJSON) in a single local process is the mechanism neighbors cannot truthfully copy.

## Operating Context

- Dashboard at `/dashboard`, API at `/v1`, default port **20128**.
- Typical workflow: install CLI → CLI starts server + tray → open dashboard → connect providers (OAuth or API key) → copy an API key → configure AI coding tool (endpoint/key/model) → monitor usage/quota.
- Companion CLI (published to npm as `polyrouter`) installs/starts the server and manages the tray; versioned independently of the dashboard.
- Two published artifacts from one repo: dashboard+gateway (`polyrouter-app`) and the CLI launcher (`cli/`).
- Optional tunnel (cloudflared default, ngrok optional) exposes the local endpoint beyond localhost.
- Bilingual: English and Simplified Chinese (i18n/, README.zh-CN.md, gitbook/).
- Optional cloud sync exists but is not the primary mode; `cloud/` worker code is not in this repo.

## Capabilities and Constraints

- Proprietary, closed-source software for authorized users and contributors.
- Plain JavaScript (ESM), no TypeScript. Next.js (App Router) + Tailwind CSS v4 + zustand + recharts + Monaco; SQLite persistence with adapter fallback chain (bun:sqlite → better-sqlite3 → node:sqlite → sql.js).
- `custom-server.js` derives client IP from the TCP socket and strips untrusted `X-Forwarded-For`; security-sensitive env: `JWT_SECRET`, `INITIAL_PASSWORD` (default `123456` — must override), `API_KEY_SECRET`, `MACHINE_ID_SALT`.
- Dashboard surfaces: providers, combos, usage, quota, endpoint, cli-tools, proxy-pools, token-saver, translator, basic-chat, media-providers, realtime, mitm, pxpipe, skills, console-log, profile, settings.
- The previous `/landing` route was removed; a replacement marketing site is pending.
- Tests are a separate vitest package under `tests/`; suite is not expected all-green on plain checkout (see CLAUDE.md baseline).

## Brand Commitments

- Name **PolyRouter** and logo `public/polyrouter-logo.png` are binding.
- The green brand palette (brand scale centered on `#16a34a`, warm neutral light surfaces, dark-mode counterpart defined in `src/app/globals.css`) is a binding identity commitment. Future design work refines within it.

## Evidence on Hand

- Logo: `public/polyrouter-logo.png`.
- Working product: full source of dashboard + gateway + CLI in this repo.
- Docs: `README.md`, `README.zh-CN.md`, `docs/ARCHITECTURE.md`, `open-sse/AGENTS.md`, `gitbook/`, `DOCKER.md`.
- i18n copy: `i18n/` (en + zh-CN).
- No testimonials, customer counts, or third-party press — future work must not fabricate them.

## Product Principles

1. **Local-first trust**: anything that touches credentials, IP, or data flow must visibly honor "it stays on your machine."
2. **One endpoint, zero reconfiguration**: design decisions should reinforce the promise that users configure once and point everything at `/v1`.
3. **Operator clarity over marketing gloss**: the dashboard's job is state legibility — accounts, quotas, fallback behavior, and failures must be scannable in seconds.
4. **Self-hoster onboarding is the funnel**: first-run (install → provider connected → first routed request) is the moment the product proves itself; design effort prioritizes it.
5. **Design focus areas (user-confirmed)**: dashboard/app UI and landing page first.

## Accessibility & Inclusion

None established yet — open decision.
