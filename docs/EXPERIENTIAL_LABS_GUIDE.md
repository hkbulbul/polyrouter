# Experiential Labs + PolyRouter: Free Frontier Models Guide

Use next-generation frontier models such as **Claude Fable 5.1**, **Astra**, and **GLM 5.3 Flash** for **free** in **Claude Code**, **Codex**, or any AI coding tool via **PolyRouter** and **Experiential Labs**.

---

## 1. Install or Update PolyRouter

If you haven't installed PolyRouter yet, install it globally via npm:

```bash
npm install -g polyrouter
```

If you already have PolyRouter installed, ensure you have the latest version:

```bash
npm install -g polyrouter@latest
```

---

## 2. Start the PolyRouter Server

Run PolyRouter in your terminal:

```bash
polyrouter
```

PolyRouter will start the local gateway and print the dashboard URL (typically `http://localhost:20128/dashboard`).

> [!IMPORTANT]
> Keep this terminal window open and running in the background.

---

## 3. Set Up Admin Password & Access Dashboard

1. Open your browser and go to:
   ```text
   http://localhost:20128/dashboard
   ```
2. On your initial startup, you will be prompted to set up an admin password. Choose a password and log in.

---

## 4. Get an Experiential Labs API Key

1. In the PolyRouter dashboard, click on **Providers** in the left sidebar.
2. Locate **Experiential Labs** (`explabs`) in the provider list and click on it.
3. Click the **Get API Key** button (or navigate directly to [Experiential Labs Platform](https://platform.experientiallabs.ai/settings/api-keys)).
4. Sign in or create an account using **Google Sign-in** or **GitHub**.
5. In the **API Keys** section, click **Create API Key**, give it a name, and copy the generated key.

---

## 5. Add the Connection in PolyRouter

1. Return to the PolyRouter dashboard on the **Experiential Labs** provider page.
2. Click **Add Connection** (or **Add**).
3. Fill in:
   - **Connection Name**: e.g., `Experiential Labs Main`
   - **API Key**: Paste the key you copied from Experiential Labs.
4. Click **Save** (and test the connection to verify).

---

## 6. Verify Models (Fable 5.1, Astra, GLM 5.3 Flash)

1. Under the Experiential Labs connection, check the **Models** list.
2. Supported models include:
   - `claude-fable-5.1` (Claude Fable 5.1)
   - `astra` (Astra)
   - `glm-5.3-flash` (GLM 5.3 Flash)
   - `claude-opus-5` (Claude Opus 5)
   - `claude-sonnet-4` / `claude-3-7-sonnet`
3. If a specific model is not already listed, click **Add Model**, enter its ID (e.g., `claude-fable-5.1` or `astra`), and click **Add**.

---

## 7. Connect CLI Tools (Claude Code / Codex)

1. In the PolyRouter dashboard sidebar, click **CLI Tools**.
2. Select your tool — either **Claude Code** or **Codex** (the configuration method is identical).
3. In the model dropdown, select your desired Experiential Labs model (e.g., `explabs/claude-fable-5.1` or `explabs/astra`).
4. Click **Apply**.
   - PolyRouter will automatically configure your CLI environment settings and endpoints to route through PolyRouter.

---

## 8. Launch CLI and Start Coding

1. Open a **new terminal window** (do not close the terminal where `polyrouter` is running).
2. Start your CLI tool:
   - For Claude Code:
     ```bash
     claude
     ```
   - For Codex:
     ```bash
     codex
     ```
3. Start coding! Your requests will now route seamlessly through PolyRouter to Experiential Labs.

---

## Troubleshooting & Notes

### 1. Claude Code Version Gate (>= 2.1.251 Required)
If you encounter:
```text
provider rejected the request: Claude Code 2.1.245 does not support this model; version 2.1.251 or newer is required.
```
- **Cause**: Upstream provider enforces a minimum client version for newer frontier models like Claude Fable 5.1.
- **Fix**: Update Claude Code globally:
  ```bash
  npm install -g @anthropic-ai/claude-code@latest
  ```
  PolyRouter also automatically safeguards and bumps forwarded client metadata and User-Agent headers to `>= 2.1.261`.

### 2. Thinking / Budget Tokens (400 Error)
If you encounter:
```text
API Error: 400: Invalid value for 'thinking': Value error, thinking.budget_tokens is required when thinking is enabled. (param: thinking)
```
- **Cause**: Anthropic Messages API (`/v1/messages`) strictly requires `thinking.budget_tokens` whenever `thinking.type` is set to `"enabled"`.
- **Fix**: PolyRouter automatically supplies a default `budget_tokens: 8192` whenever thinking is enabled and guarantees `max_tokens > budget_tokens`.

### 3. Model IDs Supported on Experiential Labs
- `explabs/claude-fable-5.1` (automatically aliases to latest stable Fable release)
- `explabs/claude-fable-latest` & `explabs/claude-fable-5`
- `explabs/astra` (aliases to `gpt-6-astra`)
- `explabs/claude-opus-5`
- `explabs/claude-sonnet-5`
- `explabs/glm-5.3-flash`
- `explabs/gpt-5.5` & `explabs/gpt-5.4-mini`
- `explabs/gemini-3.7-flash`
