/**
 * Project ID Service - Fetch and cache real Project IDs from Google Cloud Code API
 *
 *
 * Instead of generating random project IDs (e.g. "useful-spark-a1b2c"),
 * this service fetches the real Project ID bound to the authenticated user's account.
 * This significantly reduces the risk of being flagged by Google's anti-abuse systems.
 */

import {
    CLOUD_CODE_API,
    LOAD_CODE_ASSIST_HEADERS,
    LOAD_CODE_ASSIST_METADATA,
    ANTIGRAVITY_LOAD_CODE_ASSIST_HEADERS,
    ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA,
} from "../config/appConstants.js";

// ─── Cache ────────────────────────────────────────────────────────────────────
// connectionId -> { projectId: string, fetchedAt: number }
const projectIdCache = new Map();

/** How long a cached project ID is considered fresh (1 hour). */
const CACHE_TTL_MS = 60 * 60 * 1000;

// ─── Pending-fetch deduplication ─────────────────────────────────────────────
// connectionId -> { promise: Promise<string|null>, controller: AbortController, startedAt: number }
const pendingFetches = new Map();

/** Abort and evict a pending fetch that has been running longer than this (2 min). */
const PENDING_TTL_MS = 2 * 60 * 1000;

/** Per-call deadline for loadCodeAssist. Mirrors onboardUser's per-attempt 30s. */
const LOAD_CODE_ASSIST_TIMEOUT_MS = 30_000;

// ─── Periodic cleanup ────────────────────────────────────────────────────────
/** How often the background sweep runs (10 min). */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

let _cleanupTimer = null;

/** Run one sweep immediately: evict stale cache entries and abort orphaned pending fetches. */
export function cleanupNow() {
    const now = Date.now();

    for (const [id, entry] of projectIdCache) {
        if (!entry || now - entry.fetchedAt >= CACHE_TTL_MS) {
            projectIdCache.delete(id);
        }
    }

    for (const [id, item] of pendingFetches) {
        if (!item || typeof item.startedAt !== "number") {
            pendingFetches.delete(id);
            continue;
        }
        if (now - item.startedAt > PENDING_TTL_MS) {
            try { item.controller.abort(); } catch (_) { /* ignore */ }
            pendingFetches.delete(id);
        }
    }
}

/** Start the periodic background cleanup (idempotent). Called automatically on module load. */
export function startCacheCleanup() {
    if (_cleanupTimer) return;
    _cleanupTimer = setInterval(() => {
        try { cleanupNow(); } catch (e) {
            console.warn("[ProjectId] cleanup sweep error:", e?.message ?? e);
        }
    }, CLEANUP_INTERVAL_MS);
    // Unref so the timer doesn't prevent Node from exiting when it is otherwise idle
    _cleanupTimer?.unref?.();
}

/** Stop the periodic background cleanup (e.g. during graceful shutdown). */
export function stopCacheCleanup() {
    if (!_cleanupTimer) return;
    clearInterval(_cleanupTimer);
    _cleanupTimer = null;
}

// Start automatically when the module is first imported
startCacheCleanup();

// ─── BYOP (Bring Your Own Project) terminal state ─────────────────────────────
// Google no longer auto-creates a Cloud Code project for standard-tier/personal
// accounts: onboardUser returns done:true with no `cloudaicompanionProject`. That
// is a terminal state, not a transient failure — cache it per-connection for the
// process lifetime so we stop burning an ~18s onboard round-trip on every request
// (OmniRoute parity, tracked upstream as #8491).
const requiresManualProjectCache = new Set();

// Internal sentinel returned by fetchProjectId → getProjectIdForConnection to
// distinguish "Google requires a user-defined project" from "transient failure".
const ANTIGRAVITY_REQUIRES_MANUAL_PROJECT = "__REQUIRES_GCP_PROJECT__";

/** True when Google told us this connection must supply its own GCP project id. */
export function requiresManualGcpProject(connectionId) {
    return !!connectionId && requiresManualProjectCache.has(connectionId);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the Project ID for a connection, with caching.
 * Returns null on failure (callers should fall back to random generation).
 *
 * @param {string} connectionId - The connection identifier for cache keying
 * @param {string} accessToken  - Valid OAuth access token
 * @returns {Promise<string|null>} Real project ID or null
 */
/** Sentinel re-export for executor BYOP branching. */
export { ANTIGRAVITY_REQUIRES_MANUAL_PROJECT };

export async function getProjectIdForConnection(connectionId, accessToken, provider = "antigravity") {
    if (!connectionId || !accessToken) return null;

    // BYOP terminal state: fail fast without a network round-trip.
    if (connectionId && requiresManualProjectCache.has(connectionId)) {
        return ANTIGRAVITY_REQUIRES_MANUAL_PROJECT;
    }

    // Return cached value if still fresh
    const cached = projectIdCache.get(connectionId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.projectId;
    }

    // Deduplicate concurrent fetches for the same connection
    if (pendingFetches.has(connectionId)) {
        return pendingFetches.get(connectionId).promise;
    }

    // Each fetch gets its own AbortController so it can be canceled via removeConnection()
    const controller = new AbortController();

    const promise = (async () => {
        try {
            const projectId = await fetchProjectId(accessToken, controller.signal, provider);
            if (projectId === ANTIGRAVITY_REQUIRES_MANUAL_PROJECT) {
                requiresManualProjectCache.add(connectionId);
                console.warn("[ProjectId] BYOP required for connection", connectionId.slice(0, 8), "— Google requires a user-supplied GCP project");
                return ANTIGRAVITY_REQUIRES_MANUAL_PROJECT;
            }
            if (projectId) {
                projectIdCache.set(connectionId, {projectId, fetchedAt: Date.now()});
                return projectId;
            }
            console.warn("[ProjectId] could not fetch projectId for connection", connectionId.slice(0, 8));
            return null;
        } catch (error) {
            console.warn(`[ProjectId] Error fetching project ID: ${error.message}`);
            return null;
        } finally {
            pendingFetches.delete(connectionId);
        }
    })();

    pendingFetches.set(connectionId, {promise, controller, startedAt: Date.now()});
    return promise;
}

/**
 * Invalidate the cached project ID for a connection.
 * Call this when a connection's credentials are fully revoked or refreshed.
 */
export function invalidateProjectId(connectionId) {
    // Do not clear requiresManualProjectCache here — BYOP is terminal, not transient
    projectIdCache.delete(connectionId);
}

/**
 * Fully remove a connection: abort any in-flight fetch and delete its cached project ID.
 * Wire this into your connection close / disconnect lifecycle events to prevent memory leaks.
 *
 * @param {string} connectionId
 */
export function removeConnection(connectionId) {
    if (!connectionId) return;
    requiresManualProjectCache.delete(connectionId);
    projectIdCache.delete(connectionId);
    const pending = pendingFetches.get(connectionId);
    if (pending) {
        try { pending.controller.abort(); } catch (_) { /* ignore */ }
        pendingFetches.delete(connectionId);
    }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fetch project ID via loadCodeAssist endpoint.
 * Falls back to onboardUser when loadCodeAssist returns no project.
 *
 * @param {string}      accessToken
 * @param {AbortSignal} signal
 * @returns {Promise<string|null>}
 */
async function fetchProjectId(accessToken, signal, provider = "antigravity") {
    const isAntigravity = provider === "antigravity";
    const headers = isAntigravity ? ANTIGRAVITY_LOAD_CODE_ASSIST_HEADERS : LOAD_CODE_ASSIST_HEADERS;
    const metadata = isAntigravity ? ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA : LOAD_CODE_ASSIST_METADATA;

    // `signal` comes from a caller-owned AbortController that only fires on
    // removeConnection() or the 2-minute PENDING_TTL_MS sweep — and that sweep only
    // runs every CLEANUP_INTERVAL_MS, so a silent endpoint could leave this
    // connection's pendingFetches entry (and therefore every later request for it,
    // via the dedupe check in getProjectId) stuck for up to ~12 minutes. Bounding
    // the call directly cuts that to seconds and makes the caller's `finally` the
    // normal path rather than the sweeper. onboardUser below already does this for
    // each of its attempts; this matches it.
    const localCtrl = new AbortController();
    const timeoutId = setTimeout(() => localCtrl.abort(), LOAD_CODE_ASSIST_TIMEOUT_MS);
    timeoutId.unref?.();
    const forwardAbort = () => localCtrl.abort();
    signal?.addEventListener("abort", forwardAbort, { once: true });

    let response;
    try {
        response = await fetch(CLOUD_CODE_API.loadCodeAssist, {
            method: "POST",
            headers: { ...headers, "Authorization": `Bearer ${accessToken}` },
            body: JSON.stringify({ metadata }),
            signal: localCtrl.signal
        });
    } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", forwardAbort);
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`loadCodeAssist failed: HTTP ${response.status} ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const projectId = extractProjectId(data);
    if (projectId) return projectId;

    // Determine the tier to use for onboarding
    let tierID = "legacy-tier";
    if (Array.isArray(data.allowedTiers)) {
        for (const tier of data.allowedTiers) {
            if (tier && typeof tier === "object" && tier.isDefault === true) {
                if (tier.id && typeof tier.id === "string" && tier.id.trim()) {
                    tierID = tier.id.trim();
                    break;
                }
            }
        }
    }

    return onboardUser(accessToken, tierID, signal, provider);
}

/**
 * Fetch project ID via onboardUser endpoint (polls until done).
 *
 * @param {string}      accessToken
 * @param {string}      tierID
 * @param {AbortSignal} externalSignal  – propagated from the connection's AbortController
 * @returns {Promise<string|null>}
 */
async function onboardUser(accessToken, tierID, externalSignal, provider = "antigravity") {
    console.log(`[ProjectId] Onboarding user with tier: ${tierID}`);

    const isAntigravity = provider === "antigravity";
    const headers = isAntigravity ? ANTIGRAVITY_LOAD_CODE_ASSIST_HEADERS : LOAD_CODE_ASSIST_HEADERS;
    const metadata = isAntigravity ? ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA : LOAD_CODE_ASSIST_METADATA;
    const reqBody = { tier_id: tierID, metadata };
    const MAX_ATTEMPTS = 5;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Bail out immediately if the connection was removed
        if (externalSignal?.aborted) return null;

        // Per-attempt timeout controller; forwards external abort as well
        const localCtrl = new AbortController();
        const timeoutId = setTimeout(() => localCtrl.abort(), 30_000);
        const forwardAbort = () => localCtrl.abort();
        externalSignal?.addEventListener("abort", forwardAbort);

        try {
            const response = await fetch(CLOUD_CODE_API.onboardUser, {
                method: "POST",
                headers: { ...headers, "Authorization": `Bearer ${accessToken}` },
                body: JSON.stringify(reqBody),
                signal: localCtrl.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                throw new Error(`onboardUser HTTP ${response.status}: ${errorText.slice(0, 200)}`);
            }

            const data = await response.json();

            if (data.done === true) {
                const projectId = extractProjectIdFromOnboard(data);
                if (projectId) {
                    console.log(`[ProjectId] Successfully onboarded, project ID: ${projectId}`);
                    return projectId;
                }
                // BYOP terminal state: Google completed onboarding but did not create a
                // project (standard-tier/personal account). Cache per-connection so we
                // stop burning ~18s on every request and let the executor surface the
                // actionable gcp_project_required 422 instead of generic missing_project_id.
                // OmniRoute parity (#8491).
                return ANTIGRAVITY_REQUIRES_MANUAL_PROJECT;
            }

            // Server not done yet – wait and retry
            console.log(`[ProjectId] Onboard attempt ${attempt}/${MAX_ATTEMPTS}: not done yet, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                console.warn(`[ProjectId] onboardUser attempt ${attempt} aborted (timeout or connection removed)`);
                if (externalSignal?.aborted) return null;   // connection gone – stop retrying
                continue;
            }
            if (attempt === MAX_ATTEMPTS) {
                console.warn(`[ProjectId] onboardUser failed after ${MAX_ATTEMPTS} attempts: ${error.message}`);
                return null;
            }
            // Continue to next attempt instead of throwing (which would skip remaining retries)
            console.warn(`[ProjectId] onboardUser attempt ${attempt} failed: ${error.message}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            clearTimeout(timeoutId);
            externalSignal?.removeEventListener("abort", forwardAbort);
        }
    }

    return null;
}

/**
 * Extract project ID from loadCodeAssist response.
 */
function extractProjectId(data) {
    if (!data) return null;

    if (typeof data.cloudaicompanionProject === "string") {
        const id = data.cloudaicompanionProject.trim();
        if (id) return id;
    }

    if (data.cloudaicompanionProject && typeof data.cloudaicompanionProject === "object") {
        const id = data.cloudaicompanionProject.id;
        if (typeof id === "string" && id.trim()) return id.trim();
    }

    return null;
}

/**
 * Extract project ID from onboardUser response.
 */
function extractProjectIdFromOnboard(data) {
    if (!data?.response) return null;

    const project = data.response.cloudaicompanionProject;

    if (typeof project === "string") {
        const id = project.trim();
        if (id) return id;
    }

    if (project && typeof project === "object") {
        const id = project.id;
        if (typeof id === "string" && id.trim()) return id.trim();
    }

    return null;
}
