# polyrouter-client

A light client for employees whose company runs **PolyRouter in Office mode**. It signs you in to the office PolyRouter server and configures your AI coding tools to use it. Nothing runs in the background, and it has no dependencies.

Installing it is optional. Without it, you can sign in to the web portal at `<server>/portal`, create an API key and copy the setup snippets.

## Usage

```bash
npx polyrouter-client connect http://192.168.1.10:20128
```

Use the server URL your admin gave you, then sign in with your office email and password. The client:

1. Registers this computer as a device and gets an API key tied to your account and limits.
2. Configures the tools it finds:
   - **Claude Code**: `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` in `~/.claude/settings.json`.
   - **Codex**: `model_provider = "polyrouter"` plus a `[model_providers.polyrouter]` table in `~/.codex/config.toml`.
3. Saves the original values first, so `disconnect` puts your configs back exactly as they were.

| Command | What it does |
|---|---|
| `connect <url>` | Sign in and configure tools (`--email`, `--tools claude,codex`, `--claude-model`, `--codex-model`, `--no-tools`) |
| `status` | Your policy, usage against each limit, and today's and this month's spend |
| `sync` | Re-fetch your key (re-issued if it expired) and rewrite tool configs; accepts the same model and tool flags |
| `env [--shell bash\|powershell\|cmd]` | Print `OPENAI_*` / `ANTHROPIC_*` variables for any other tool |
| `disconnect` | Restore the original tool configs and sign this device out |

State lives in `~/.polyrouter-client/` (`config.json` holds the device token and is written with mode 0600). Set `POLYROUTER_CLIENT_HOME` to move it.

If your password is temporary, sign in to the web portal once to set your own password, then run `connect` again. Your admin can sign a device out from the dashboard at any time; that also deletes the device's API key.
