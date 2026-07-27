<div align="center">

# PolyRouter

**One endpoint for all your AI providers.**

A local AI routing gateway with automatic fallback, format translation, multi-account routing, token optimization, and real-time usage tracking.

[![npm](https://img.shields.io/npm/v/polyrouter.svg)](https://www.npmjs.com/package/polyrouter)
[![Downloads](https://img.shields.io/npm/dm/polyrouter.svg)](https://www.npmjs.com/package/polyrouter)

</div>

---

## Quick Start

Install PolyRouter globally:

```bash
npm install -g polyrouter
polyrouter
```

Or run it without installing:

```bash
npx polyrouter
```

The dashboard opens at:

```text
http://localhost:20128/dashboard
```

The OpenAI-compatible API endpoint is:

```text
http://localhost:20128/v1
```

---

## CLI Options

```bash
polyrouter                    # Start with default settings
polyrouter --port 8080        # Use a custom port
polyrouter --no-browser       # Do not open the dashboard automatically
polyrouter --skip-update      # Skip the update check
polyrouter --help             # Show all options
```

---

## How It Works

```text
AI Tool
   │
   │  OpenAI-compatible request
   ▼
PolyRouter
   ├─ Format translation
   ├─ Account selection
   ├─ Token optimization
   ├─ Quota and usage tracking
   └─ Automatic provider/model fallback
   │
   ▼
AI Provider
```

Configure your AI tool with:

```text
Endpoint: http://localhost:20128/v1
API Key:  Copy from the PolyRouter dashboard
Model:    Select a provider model or custom combo
```

---

## Features

- **40+ AI providers** through OAuth or API keys
- **OpenAI-compatible endpoint** for supported AI tools
- **Request and response format translation**
- **Automatic model-combo fallback**
- **Multi-account routing and failover**
- **OAuth token refresh**
- **RTK token optimization**
- **Quota and usage analytics**
- **Custom model aliases and combinations**
- **Local SQLite persistence**

---

## Compatible Tools

PolyRouter works with tools that support OpenAI-compatible or configurable AI endpoints, including:

**Claude Code · Codex · Cursor · Cline · OpenClaw · OpenCode · Continue · Roo Code · Kilo Code · GitHub Copilot** and more.

---

## Data Location

PolyRouter currently stores runtime data under the existing application data directory:

- **macOS/Linux:** `~/.9router/`
- **Windows:** `%USERPROFILE%/.9router/`

Your provider credentials, settings, and SQLite database remain on your machine unless you explicitly enable a remote feature.

---

## Updating

```bash
npm install -g polyrouter@latest
```

Restart PolyRouter after installation:

```bash
polyrouter
```

---

## Security

- Change the default dashboard password immediately.
- Keep PolyRouter bound to localhost unless remote access is intentionally configured.
- Do not share OAuth tokens, API keys, or the local application data directory.
- Use HTTPS and a secure reverse proxy for remote deployments.

---

## License

PolyRouter is proprietary, closed-source software. All rights reserved.

Unauthorized copying, redistribution, modification, sublicensing, or commercial use is prohibited except where expressly authorized by the owner.
