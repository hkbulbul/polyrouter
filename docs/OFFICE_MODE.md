# Office mode

Office mode lets one PolyRouter installation serve a whole team. The admin adds employees by email and password, sets usage limits, and sees a leaderboard and cost analytics. Employees reach the server through the web portal or the optional `polyrouter-client`.

## Turning it on

**Settings → Office mode.** It requires a dashboard password. While it is on:

- Dashboard login is always required, even if "Require login" is off, because employees are on the same network as the admin API.
- An **Office** entry appears in the sidebar (`/dashboard/office`).
- Employees sign in at `/portal`.

Turning it off immediately rejects every employee key and portal session. Employees, policies and usage history are kept.

## Model

| Thing | Where | Notes |
|---|---|---|
| Employee | `officeUsers` | Email (normalized), bcrypt password, team, own policy, active flag, `sessionVersion` (bumped to end sessions) |
| Team | `officeTeams` | Optional policy for all members |
| Policy | `officePolicies` | Reusable limits (JSON). Effective policy is **user → team → office default**; the whole policy is picked, not merged field by field |
| Device | `officeDevices` | Light-client sign-ins. Only the SHA-256 of the device token is stored |
| Employee keys | `apiKeys.userId` (+ `expiresAt`, `deviceId`) | Owner keys have `userId = NULL` and are never office-gated |
| Attribution | `usageHistory.userId` | Stamped at insert from the API key's owner, so reports survive key deletion |
| Audit | `officeAuditLog` | Admin and employee account actions (bounded to 5,000 rows) |

## Limits (`src/lib/office/policy.js`)

- **Rates:** requests per minute, hour and day, and max concurrent requests.
- **Budgets:** tokens per day and month, and USD per day and month. Cost comes from the pricing table.
- **Per-request caps:** approximate max input tokens, and max output tokens. Output caps are enforced by clamping `max_tokens`, `max_output_tokens` or `maxOutputTokens` in the body.
- **Scope:** allowed and blocked model patterns (`*` glob, block wins), allowed request types (chat, embeddings, image, audio, video, search, fetch, rerank), and working hours.
- **When a budget runs out:** block (429), or switch chat requests to a cheaper fallback model.
- **Keys:** max self-service keys per employee, and key lifetime.

Request-rate counters are in memory and reset on restart. Token and cost budgets are read from `usageHistory`, so streaming usage is counted when the response finishes, and a request already in flight can overshoot slightly. `maxConcurrent` bounds that overshoot.

## Enforcement path

`src/lib/office/gate.js` → `withOfficeGate(handler, { kind, format })` wraps every cost-generating `/v1` route and the Gemini-native `/v1beta` route:

1. Resolve the key. A non-employee key or no key passes through untouched.
2. Reject if office mode is off, the account is disabled, or the key is revoked or expired.
3. Evaluate the policy with no `await` between the check and the counter update.
4. Optionally rewrite the body (fallback model, output cap).
5. Hold a concurrency lease until the response body ends or the client disconnects.

`/v1/models` is filtered to the employee's allowed models. Realtime voice refuses employee keys, because office policies do not cover it.

Errors use a shape both OpenAI and Anthropic clients understand: `{"type":"error","error":{"type":"rate_limit_error","code":"office_rate_limit","message":"…"}}`.

## Auth boundaries

- Employee portal sessions use the `office_session` cookie, signed with a key derived from the dashboard JWT secret (`getScopedSigningKey("office")`). The admin verifier also rejects any token carrying a `scope` claim, so an employee token can never act as an admin session.
- `/api/office/admin/*` uses normal admin auth. `/api/office/me/*` requires a portal session. `/api/office/client/*` requires a device token (`prd_…`).
- Employee logins are rate-limited per IP **and** per email.
- `office` cannot be changed through the generic `PATCH /api/settings`; only `PUT /api/office/admin/settings` validates and writes it.

## Light client

See [`client/README.md`](../client/README.md). It is a separate zero-dependency npm package (`polyrouter-client`) that writes Claude Code and Codex configs, and restores the originals on `disconnect`.
