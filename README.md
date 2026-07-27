<div align="center">
  <img src="./public/polyrouter-logo.png" alt="PolyRouter" width="160"/>

  # PolyRouter — Local AI Routing Gateway

  **One endpoint. 40+ AI providers. Zero switching.**

  Route, translate, and optimize AI traffic across all major providers with automatic fallback, token compression, and real-time quota tracking.
</div>

---

## What is PolyRouter?

PolyRouter is a **local AI routing gateway** that exposes a single OpenAI-compatible endpoint (`/v1`) and intelligently routes traffic across 40+ upstream providers. It handles format translation, model-combo fallback, multi-account round-robin, OAuth/API-key credential management, token refresh, quota/usage tracking, and optional cloud sync — all running on your machine.

**PolyRouter is closed-source software.** This repository contains the source code for licensed users and contributors.

---

## Quick Start

**Install globally:**

```bash
npm install -g polyrouter
polyrouter
```

Dashboard opens at `http://localhost:20128`

**Connect a provider:**

Dashboard → Providers → Connect any OAuth or API-key provider → Done.

**Use in your CLI tool:**

```
Endpoint: http://localhost:20128/v1
API Key: [copy from dashboard]
Model: kr/claude-sonnet-4.5
```

---

## How It Works

```
┌─────────────┐
│  Your CLI   │  (Claude Code, Codex, Cursor, Cline, OpenClaw...)
│   Tool      │
└──────┬──────┘
       │ http://localhost:20128/v1
       ↓
┌─────────────────────────────────────────────┐
│           PolyRouter (Smart Router)           │
│  • RTK Token Saver (cut tool_result tokens)  │
│  • Format translation (OpenAI ↔ Claude)      │
│  • Combo fallback (subscription → cheap → free)│
│  • Multi-account round-robin                  │
│  • Auto token refresh                         │
│  • Quota & usage tracking                     │
└──────┬──────────────────────────────────────┘
       │
       ├─→ [Tier 1: SUBSCRIPTION] Claude Code, Codex, GitHub Copilot
       │   ↓ quota exhausted
       ├─→ [Tier 2: CHEAP] GLM, MiniMax, Kimi
       │   ↓ budget limit
       └─→ [Tier 3: FREE] Kiro, OpenCode Free, Vertex

Result: Never stop coding, minimal cost + token savings via RTK
```

---

## Key Features

| Feature | Description |
|---|---|
| 🔄 **Format Translation** | OpenAI ↔ Claude ↔ Gemini ↔ Cursor ↔ Kiro ↔ Vertex — auto-detected per request |
| 🎯 **Smart 3-Tier Fallback** | Subscription → Cheap → Free, zero downtime |
| 🚀 **RTK Token Saver** | Compress tool outputs before sending to LLM — save 20-40% input tokens |
| 📊 **Quota Tracking** | Live token count + reset countdown per provider |
| 👥 **Multi-Account** | Multiple accounts per provider, round-robin or priority-based |
| 🔄 **Auto Token Refresh** | OAuth tokens refresh automatically |
| 🎨 **Custom Combos** | Create unlimited model combinations with fallback chains |
| 💾 **Cloud Sync** | Sync config across devices (optional) |
| 📊 **Usage Analytics** | Track tokens, cost, trends over time |
| 🌐 **Deploy Anywhere** | Localhost, VPS, Docker |

---

## Supported CLI Tools

PolyRouter works with all major AI coding tools that support custom OpenAI endpoints:

**Claude Code · Codex · OpenClaw · Cursor · Cline · Antigravity · Continue · RooCode · OpenCode · Copilot · Droid · Kilo Code** and more.

---

## Supported Providers (40+)

### OAuth Providers
Claude Code · Codex · GitHub Copilot · Cursor · Antigravity · Kimchi

### Free Providers
Kiro AI · OpenCode Free · Vertex AI

### API Key Providers
OpenAI · Anthropic · Gemini · DeepSeek · Groq · xAI · Mistral · Perplexity · Together AI · Fireworks · Cerebras · Cohere · NVIDIA · GLM · Kimi · MiniMax · OpenRouter · SiliconFlow · Nebius · Chutes · Hyperbolic · and 20+ more

---

## Setup

### Local

```bash
cp .env.example .env
npm install
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev
```

### Production

```bash
npm run build
PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start
```

### Docker

```bash
docker run -d \
  --name polyrouter \
  -p 20128:20128 \
  -v "$HOME/.polyrouter:/app/data" \
  -e DATA_DIR=/app/data \
  polyrouter:latest
```

Default URLs:
- Dashboard: `http://localhost:20128/dashboard`
- API endpoint: `http://localhost:20128/v1`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | Auto-generated | JWT signing secret for dashboard auth |
| `INITIAL_PASSWORD` | `123456` | First login password |
| `DATA_DIR` | `~/.polyrouter` | App data location (SQLite at `$DATA_DIR/db/data.sqlite`) |
| `PORT` | Framework default | Service port |
| `HOSTNAME` | Framework default | Bind host |
| `API_KEY_SECRET` | `endpoint-proxy-api-key-secret` | HMAC secret for generated API keys |
| `REQUIRE_API_KEY` | `false` | Enforce Bearer API key on `/v1/*` |
| `ENABLE_REQUEST_LOGS` | `false` | Enable request/response logs |

---

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Next.js 16
- **UI:** React 19 + Tailwind CSS 4
- **Database:** SQLite (better-sqlite3 / node:sqlite / sql.js fallback)
- **Streaming:** Server-Sent Events (SSE)
- **Auth:** OAuth 2.0 (PKCE) + JWT + API Keys

---

## API Reference

### Chat Completions

```bash
POST http://localhost:20128/v1/chat/completions
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "model": "kr/claude-sonnet-4.5",
  "messages": [{"role": "user", "content": "Write a function to..."}],
  "stream": true
}
```

### List Models

```bash
GET http://localhost:20128/v1/models
Authorization: Bearer your-api-key
```

---

## License

PolyRouter is **proprietary, closed-source software**. All rights reserved. Unauthorized distribution, modification, or commercial use is prohibited.
