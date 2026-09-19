<div align="center">

  <img src="./public/polyrouter-logo.png" alt="PolyRouter — local AI gateway and OpenAI-compatible API router" width="160"/>

  # PolyRouter

  **One local endpoint for 60+ AI providers, AI coding tools, and model-fallback workflows.**

  [![npm version](https://img.shields.io/npm/v/polyrouter?color=cb3837&logo=npm)](https://www.npmjs.com/package/polyrouter)
  [![npm downloads](https://img.shields.io/npm/dm/polyrouter?color=cb3837&logo=npm&label=downloads%2Fmonth)](https://www.npmjs.com/package/polyrouter)
  [![npm total downloads](https://img.shields.io/npm/dt/polyrouter?color=cb3837&logo=npm&label=total)](https://www.npmjs.com/package/polyrouter)
  [![GitHub stars](https://img.shields.io/github/stars/hkbulbul/polyrouter?style=flat&logo=github)](https://github.com/hkbulbul/polyrouter/stargazers)
  [![Discord](https://img.shields.io/badge/Discord-join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/c5Sgutjkw)
  [![Node](https://img.shields.io/node/v/polyrouter?logo=node.js&label=node)](https://www.npmjs.com/package/polyrouter)
  [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

  Route, translate, and optimize AI requests locally — with OAuth & API-key connections,
  multi-account failover, token optimization, SQLite persistence, and real-time usage tracking.

</div>

---

## What is PolyRouter?

PolyRouter is a **local AI gateway** and **OpenAI-compatible API router**. It exposes a single `/v1` endpoint on your machine, then routes AI traffic to your configured providers while translating request and response formats when needed. Connect AI coding tools and applications to multiple providers without reconfiguring endpoints for every provider or account.

Everything runs on your machine: OAuth and API-key connections, model combos with fallback, multi-account routing, token refresh, quota monitoring, and local SQLite-backed state.


## Quick Start

```bash
npm install -g polyrouter
polyrouter
```

Or without a global install:

```bash
npx polyrouter
```

After startup:

| What | Where |
|---|---|
| Dashboard | `http://localhost:20128/dashboard` |
| OpenAI-compatible API | `http://localhost:20128/v1` |

1. Open **Dashboard → Providers** and connect a provider (OAuth or API key).
2. Create or copy an API key from the dashboard.
3. Point your AI tool at the gateway:

```text
Endpoint: http://localhost:20128/v1
API Key:  your PolyRouter API key
Model:    a provider model or a custom fallback combo
```

## Why use a local AI router?

- **One endpoint, many providers** — one OpenAI-compatible `/v1` across all your AI tools.
- **Never get stuck** — model combos fall back automatically when a provider is down or out of quota.
- **Blend account types** — route across subscription, API-key, and free-tier accounts.
- **Credentials stay local** — provider tokens, settings, and the database live on your machine.
- **Spend tokens, not patience** — RTK compresses tool-result payloads before they hit the LLM.
- **See everything** — live token usage, costs, quotas, and reset times in the dashboard.

## How It Works

```text
AI coding tool or application
             │
             │  OpenAI-compatible request
             ▼
        PolyRouter local gateway
             ├─ Request/response format translation
             ├─ Account selection and token refresh
             ├─ RTK token optimization
             ├─ Quota and usage tracking
             └─ Provider/model combo fallback
             │
             ▼
      Configured AI provider
```

## Key Features

| Feature | Description |
|---|---|
| **OpenAI-compatible API** | A single local `/v1` endpoint for supported AI tools and applications. |
| **AI provider routing** | Route across 60+ OAuth and API-key providers. |
| **Format translation** | Translate between OpenAI, Claude, Gemini, Cursor, Kiro, and Vertex formats. |
| **Automatic fallback** | Model combos with ordered provider and account fallback. |
| **Multi-account routing** | Multiple provider accounts with round-robin or priority behavior. |
| **OAuth management** | Connect supported providers; tokens refresh automatically. |
| **RTK token saver** | Reduce tool-result token usage before requests reach an LLM. |
| **Usage & quota tracking** | Token usage, cost, provider quotas, and reset times. |
| **Local SQLite persistence** | Settings and provider configuration in a local SQLite database. |
| **Docker & remote deploys** | Run in a container or behind a reverse proxy when you want it. |

## Compatible AI Coding Tools

PolyRouter works with anything that speaks an OpenAI-compatible API or a configurable endpoint:

**Claude Code · Codex · Cursor · Cline · OpenClaw · OpenCode · Continue · Roo Code · Kilo Code · GitHub Copilot** and more.

## AI Providers

60+ providers via OAuth, API keys, and compatible endpoints.

| | | | | |
|:---:|:---:|:---:|:---:|:---:|
| <img src="./public/providers/openai.png" alt="OpenAI" width="36"/> <br/> **OpenAI** | <img src="./public/providers/claude.png" alt="Anthropic" width="36"/> <br/> **Anthropic** | <img src="./public/providers/gemini.png" alt="Gemini" width="36"/> <br/> **Gemini** | <img src="./public/providers/groq.png" alt="Groq" width="36"/> <br/> **Groq** | <img src="./public/providers/deepseek.png" alt="DeepSeek" width="36"/> <br/> **DeepSeek** |
| <img src="./public/providers/xai.png" alt="xAI" width="36"/> <br/> **xAI** | <img src="./public/providers/mistral.png" alt="Mistral" width="36"/> <br/> **Mistral** | <img src="./public/providers/perplexity.png" alt="Perplexity" width="36"/> <br/> **Perplexity** | <img src="./public/providers/together.png" alt="Together AI" width="36"/> <br/> **Together AI** | <img src="./public/providers/fireworks.png" alt="Fireworks" width="36"/> <br/> **Fireworks** |
| <img src="./public/providers/cerebras.png" alt="Cerebras" width="36"/> <br/> **Cerebras** | <img src="./public/providers/cohere.png" alt="Cohere" width="36"/> <br/> **Cohere** | <img src="./public/providers/nvidia.png" alt="NVIDIA" width="36"/> <br/> **NVIDIA** | <img src="./public/providers/glm.png" alt="GLM" width="36"/> <br/> **GLM** | <img src="./public/providers/kimi.png" alt="Kimi" width="36"/> <br/> **Kimi** |
| <img src="./public/providers/minimax.png" alt="MiniMax" width="36"/> <br/> **MiniMax** | <img src="./public/providers/openrouter.png" alt="OpenRouter" width="36"/> <br/> **OpenRouter** | <img src="./public/providers/nebius.png" alt="Nebius" width="36"/> <br/> **Nebius** | <img src="./public/providers/chutes.png" alt="Chutes" width="36"/> <br/> **Chutes** | <img src="./public/providers/hyperbolic.png" alt="Hyperbolic" width="36"/> <br/> **Hyperbolic** |

**Plus OAuth providers:** Claude Code, Codex, GitHub Copilot, Cursor, Antigravity, Kimchi, Qwen, Kiro, iFlow, LongCat, and more.

- **Free & subscription workflows:** mix supported accounts in model combos with ordered fallback.

## API Examples

### Chat completions

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer YOUR_POLYROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-provider-model-or-combo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### List available models

```bash
curl http://localhost:20128/v1/models \
  -H "Authorization: Bearer YOUR_POLYROUTER_API_KEY"
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | Auto-generated | JWT signing secret for dashboard authentication. |
| `INITIAL_PASSWORD` | unset | Deprecated; on a new installation users create a dashboard password locally before signing in. |
| `DATA_DIR` | Platform-specific | Writable application-data directory; SQLite lives at `$DATA_DIR/db/data.sqlite`. |
| `PORT` | `20128` | Local gateway and dashboard port. |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:20128` | Public base URL used by browser-facing configuration. |
| `REQUIRE_API_KEY` | `false` | Require a Bearer API key for remote `/v1/*` access. |
| `ENABLE_REQUEST_LOGS` | `false` | Enable sensitive request/response logs only for troubleshooting. |
| `PUBLIC_INSTALLATION_TELEMETRY_URL` | unset | Non-secret anonymous lifecycle endpoint embedded only in the official npm release. |
| `POLYROUTER_PUBLIC_TELEMETRY` | `true` | Set to `false` before startup to opt out of public anonymous lifecycle telemetry. |
| `INSTALLATION_TELEMETRY_URL` | unset | Optional private/self-hosted Supabase Edge Function URL for write-only lifecycle telemetry. |
| `INSTALLATION_TELEMETRY_INGEST_TOKEN` | unset | Opaque private-mode token shared only with that Edge Function. |
| `INSTALLATION_TELEMETRY_IP_SALT` | unset | Private-mode salt used to HMAC-hash successful-login IPs before delivery. |

See [`.env.example`](./.env.example) for the full environment contract.

### Installation telemetry

Official npm releases can send minimal anonymous lifecycle telemetry through a public HTTPS endpoint. It sends a random local installation UUID, lifecycle event (`installed`, `startup`, `setup_complete`, or successful `dashboard_login`), timestamp, and app version. It never sends prompts, gateway requests, token counts, models, providers, credentials, passwords, cookies, raw IPs, machine IDs, hostnames, or usernames.

Disable it in **Dashboard → Profile → Anonymous Telemetry**, or set `POLYROUTER_PUBLIC_TELEMETRY=false` before startup. The legacy `INSTALLATION_TELEMETRY_*` variables remain a separate private/self-hosted telemetry mode; when all three are configured, private mode takes precedence. See the in-app [Privacy Policy](/privacy) for retention and abuse-protection details.

To self-host the telemetry backend:

1. Apply `supabase/migrations/001_installation_telemetry.sql`, `002_allow_setup_complete.sql`, and `003_public_installation_telemetry.sql`.
2. Deploy `installation-telemetry` (private authenticated) and `public-installation-telemetry` (anonymous official-release), both with `--no-verify-jwt`.
3. Configure `INSTALLATION_TELEMETRY_INGEST_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` only in the private function environment. Never ship a service-role key or ingest token in the npm package.
4. Put the public function behind an edge/WAF rate limit and schedule the SQL retention statements documented in migration 003.

The telemetry tables have RLS enabled and no browser-read policies. Inspect them only through Supabase SQL/Table Editor with privileged access.

## Self-Hosted Setup

### Development

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
  hkbulbul/polyrouter:latest
```

For container persistence and operational detail, see [DOCKER.md](./DOCKER.md). Published images: [`hkbulbul/polyrouter`](https://hub.docker.com/r/hkbulbul/polyrouter) (multi-platform `linux/amd64` + `linux/arm64`).

## Updating

Stop PolyRouter first, including its tray/background process, then run:

```bash
npm install -g polyrouter@latest --prefer-online
polyrouter
```

`--prefer-online` asks npm to revalidate registry metadata instead of relying on a stale cache when possible. It does not bypass permissions, file locks, or registry/network failures. On Windows, an `EBUSY` or `EPERM` error means PolyRouter, Node, a terminal, or security software still has files open in npm's global package directory — close the locking process and retry rather than deleting the installation manually.

## FAQ

### Does PolyRouter send provider credentials to a central service?

No. Provider credentials, settings, and the primary SQLite database remain local unless you intentionally configure a remote feature or remote deployment.

### Which API format does PolyRouter expose?

An OpenAI-compatible `/v1` API. Provider-specific formats are translated as required by the selected provider and model.

### Where is the SQLite database stored?

`$DATA_DIR/db/data.sqlite`. Without `DATA_DIR`, PolyRouter uses `~/.polyrouter/` on macOS/Linux and `%APPDATA%\polyrouter\` on Windows.

## Security Notes

- Create a strong dashboard password during first-run setup.
- Keep PolyRouter bound to localhost unless remote access is intentionally configured.
- Do not share OAuth tokens, API keys, SQLite databases, logs, or the local application-data directory.
- Use HTTPS and a secure reverse proxy for intentional remote deployments.
- Enable request logging only when required for troubleshooting, because request data can be sensitive.

## Community & Support

- 💬 [Discord](https://discord.gg/c5Sgutjkw) — questions, help, and announcements
- 🐛 [Issues](https://github.com/hkbulbul/polyrouter/issues) — bug reports and feature requests
- 📦 [npm](https://www.npmjs.com/package/polyrouter) · [Docker Hub](https://hub.docker.com/r/hkbulbul/polyrouter)

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Docker deployment and persistence](./DOCKER.md)
- [Environment configuration](./.env.example)
- [CLI package README](./cli/README.md)

## License

PolyRouter is released under the [MIT License](./LICENSE).

PolyRouter is a fork of [9Router](https://github.com/decolua/9router) by decolua and contributors, also MIT-licensed — their upstream copyright notice is retained in our LICENSE file as required.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of this software under the MIT terms.
