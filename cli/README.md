<div align="center">

  <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/polyrouter-logo.png" alt="PolyRouter — local AI gateway and OpenAI-compatible API router" width="140"/>

  # PolyRouter

  **One local endpoint for 40+ AI providers, AI coding tools, and model-fallback workflows.**

  [![npm version](https://img.shields.io/npm/v/polyrouter?color=cb3837&logo=npm)](https://www.npmjs.com/package/polyrouter)
  [![npm downloads](https://img.shields.io/npm/dm/polyrouter?color=cb3837&logo=npm&label=downloads%2Fmonth)](https://www.npmjs.com/package/polyrouter)
  [![npm total downloads](https://img.shields.io/npm/dt/polyrouter?color=cb3837&logo=npm&label=total)](https://www.npmjs.com/package/polyrouter)
  [![GitHub stars](https://img.shields.io/github/stars/hkbulbul/polyrouter?style=flat&logo=github)](https://github.com/hkbulbul/polyrouter/stargazers)
  [![Discord](https://img.shields.io/badge/Discord-join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/c5Sgutjkw)
  [![Node](https://img.shields.io/node/v/polyrouter?logo=node.js&label=node)](https://www.npmjs.com/package/polyrouter)
  [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

</div>

---

PolyRouter is a **local AI gateway** for AI coding tools and applications. The CLI starts the PolyRouter dashboard and a single OpenAI-compatible `/v1` API endpoint, then routes requests across your configured AI providers — with format translation, OAuth/API-key connections, multi-account routing, model fallback, token optimization, quota tracking, and local SQLite persistence.

> **Fork notice:** PolyRouter is a fork of [9Router](https://github.com/decolua/9router) — the MIT-licensed local AI router by [decolua](https://github.com/decolua). PolyRouter builds on that foundation with its own routing, provider, and dashboard work.

## Install

```bash
npm install -g polyrouter
polyrouter
```

Or run it without a global installation:

```bash
npx polyrouter
```

After startup:

| What | Where |
|---|---|
| Dashboard | `http://localhost:20128/dashboard` |
| OpenAI-compatible API | `http://localhost:20128/v1` |

## Connect an AI Coding Tool

1. Open the PolyRouter dashboard.
2. Go to **Providers** and connect an OAuth or API-key provider.
3. Create or copy an API key from the dashboard.
4. Configure your AI tool with:

```text
Endpoint: http://localhost:20128/v1
API key:  your PolyRouter API key
Model:    a provider model or a custom model combo
```

Works with compatible tools such as **Claude Code, Codex, Cursor, Cline, OpenClaw, OpenCode, Continue, Roo Code, Kilo Code, and GitHub Copilot**.

## Supported Providers

40+ providers via OAuth, API keys, and compatible endpoints.

| | | | | |
|:---:|:---:|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/openai.png" alt="OpenAI" width="36"/> <br/> **OpenAI** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/claude.png" alt="Anthropic" width="36"/> <br/> **Anthropic** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/gemini.png" alt="Gemini" width="36"/> <br/> **Gemini** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/groq.png" alt="Groq" width="36"/> <br/> **Groq** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/deepseek.png" alt="DeepSeek" width="36"/> <br/> **DeepSeek** |
| <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/xai.png" alt="xAI" width="36"/> <br/> **xAI** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/mistral.png" alt="Mistral" width="36"/> <br/> **Mistral** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/perplexity.png" alt="Perplexity" width="36"/> <br/> **Perplexity** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/together.png" alt="Together AI" width="36"/> <br/> **Together AI** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/fireworks.png" alt="Fireworks" width="36"/> <br/> **Fireworks** |
| <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/cerebras.png" alt="Cerebras" width="36"/> <br/> **Cerebras** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/cohere.png" alt="Cohere" width="36"/> <br/> **Cohere** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/nvidia.png" alt="NVIDIA" width="36"/> <br/> **NVIDIA** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/glm.png" alt="GLM" width="36"/> <br/> **GLM** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/kimi.png" alt="Kimi" width="36"/> <br/> **Kimi** |
| <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/minimax.png" alt="MiniMax" width="36"/> <br/> **MiniMax** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/openrouter.png" alt="OpenRouter" width="36"/> <br/> **OpenRouter** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/nebius.png" alt="Nebius" width="36"/> <br/> **Nebius** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/chutes.png" alt="Chutes" width="36"/> <br/> **Chutes** | <img src="https://raw.githubusercontent.com/hkbulbul/polyrouter/master/public/providers/hyperbolic.png" alt="Hyperbolic" width="36"/> <br/> **Hyperbolic** |

**Plus OAuth providers:** Claude Code, Codex, GitHub Copilot, Cursor, Antigravity, Kimchi, Qwen, Kiro, iFlow, LongCat, and more.

## Features

- **One endpoint, many providers** — 40+ AI providers through OAuth, API keys, and compatible endpoints
- **Automatic fallback** — model combos fall back in order when a provider is down or out of quota
- **Multi-account routing** — multiple provider accounts with round-robin or priority behavior
- **Format translation** — automatic request/response translation between provider formats
- **OAuth token refresh** and provider quota monitoring
- **RTK token optimization** — compresses tool-result payloads before they reach an LLM
- **Usage tracking** — tokens, cost, provider quotas, and reset times in the dashboard
- **Local SQLite persistence** — settings and provider configuration stay on your machine

## CLI Options

```bash
polyrouter                    # Start with default settings
polyrouter --port 8080        # Use a custom port
polyrouter --no-browser       # Do not open the dashboard automatically
polyrouter --skip-update      # Skip the update check
polyrouter --help             # Show all options
```

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

### List models

```bash
curl http://localhost:20128/v1/models \
  -H "Authorization: Bearer YOUR_POLYROUTER_API_KEY"
```

## Updating

Stop PolyRouter first, including its tray/background process, then run:

```bash
npm install -g polyrouter@latest --prefer-online
polyrouter
```

`--prefer-online` asks npm to revalidate registry metadata instead of relying on a stale cache when possible. It does not bypass permissions, file locks, or registry/network failures. On Windows, an `EBUSY` or `EPERM` error means PolyRouter, Node, a terminal, or security software still has files open in npm's global package directory — close the locking process and retry rather than deleting the installation manually.

## Local Data and SQLite

PolyRouter keeps its settings, provider configuration, and SQLite database on the machine that runs the gateway unless you intentionally enable a remote feature.

Default application-data locations:

- **macOS/Linux:** `~/.polyrouter/`
- **Windows:** `%APPDATA%\polyrouter\`

The main SQLite database is located at:

```text
$DATA_DIR/db/data.sqlite
```

Set the `DATA_DIR` environment variable to use another writable location.

## Telemetry

Official npm releases can send minimal **anonymous lifecycle telemetry** (a random installation UUID, event name, timestamp, version). It never sends prompts, requests, models, providers, credentials, raw IPs, or machine identifiers. Disable it in **Dashboard → Profile → Anonymous Telemetry**, or set `POLYROUTER_PUBLIC_TELEMETRY=false` before startup. See the [Privacy Policy](https://github.com/hkbulbul/polyrouter#installation-telemetry) for details.

## Documentation and Support

- 📖 [Project README](https://github.com/hkbulbul/polyrouter#readme) — full docs, providers, self-hosting
- 🐳 [Docker deployment](https://github.com/hkbulbul/polyrouter/blob/master/DOCKER.md)
- 💬 [Discord](https://discord.gg/c5Sgutjkw) — questions, help, and announcements
- 🐛 [Issues](https://github.com/hkbulbul/polyrouter/issues)

## Security

- Create a strong dashboard password during first-run setup.
- Keep the gateway on localhost unless you intentionally configure remote access.
- Never share API keys, OAuth tokens, local SQLite databases, logs, or the application-data directory.
- Use HTTPS and a secure reverse proxy for remote deployments.

## License

MIT — see [LICENSE](https://raw.githubusercontent.com/hkbulbul/polyrouter/master/LICENSE).

PolyRouter is a fork of [9Router](https://github.com/decolua/9router) by decolua and contributors, also MIT-licensed — their upstream copyright notice is retained in our LICENSE file as required.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of this software under the MIT terms.
