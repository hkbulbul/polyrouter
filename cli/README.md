# PolyRouter CLI — Local AI Gateway and OpenAI-Compatible API Router

PolyRouter is a local AI gateway for AI coding tools and applications. The CLI starts the PolyRouter dashboard and a single OpenAI-compatible `/v1` API endpoint, then routes requests across configured AI providers with format translation, OAuth/API-key connections, multi-account routing, model fallback, token optimization, quota tracking, and local SQLite persistence.

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

- **Dashboard:** `http://localhost:20128/dashboard`
- **OpenAI-compatible API:** `http://localhost:20128/v1`

## Connect an AI Coding Tool

1. Open the PolyRouter dashboard.
2. Go to **Providers** and connect an OAuth or API-key provider.
3. Create or copy an API key from the dashboard.
4. Configure your AI tool with:

```text
Endpoint: http://localhost:20128/v1
API key:  Your PolyRouter dashboard API key
Model:    A provider model or custom model combo
```

PolyRouter works with compatible tools such as **Claude Code, Codex, Cursor, Cline, OpenClaw, OpenCode, Continue, Roo Code, Kilo Code, and GitHub Copilot**.

## Features

- Local OpenAI-compatible AI gateway and API router
- 40+ AI providers through OAuth, API keys, and compatible endpoints
- Automatic request and response format translation
- Model-combo fallback and multi-account routing
- OAuth token refresh and provider quota monitoring
- RTK token optimization for tool-result payloads
- Local SQLite settings and provider configuration
- Usage, token, cost, and reset-time tracking in the dashboard

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
```

`--prefer-online` asks npm to revalidate registry metadata instead of relying on a stale cache when possible. It does not bypass permissions, file locks, or registry/network failures. On Windows, an `EBUSY` or `EPERM` error means PolyRouter, Node, a terminal, or security software still has files open in npm's global package directory—close the locking process and retry rather than deleting the installation manually.

Restart the gateway after updating:

```bash
polyrouter
```

## Local Data and SQLite

PolyRouter keeps its primary settings, provider configuration, and SQLite database on the machine that runs the gateway unless you intentionally enable a remote feature.

Default application-data locations:

- **macOS/Linux:** `~/.polyrouter/`
- **Windows:** `%APPDATA%\polyrouter\`

The main SQLite database is located at:

```text
$DATA_DIR/db/data.sqlite
```

Set the `DATA_DIR` environment variable to use another writable location.

## Documentation and Support

- [Project README](../README.md)
- [Docker deployment and persistence](../DOCKER.md)
- [Environment configuration](../.env.example)

For installation, configuration, or licensing assistance, contact the PolyRouter owner through your authorized distribution channel.

## Security

- Create a strong dashboard password during first-run setup.
- Keep the gateway on localhost unless you intentionally configure remote access.
- Never share API keys, OAuth tokens, local SQLite databases, logs, or the application-data directory.
- Use HTTPS and a secure reverse proxy for remote deployments.

## License

PolyRouter is proprietary, closed-source software. All rights reserved.

Unauthorized copying, redistribution, modification, sublicensing, or commercial use is prohibited except where expressly authorized by the owner.
