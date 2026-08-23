import { TOKEN_REFRESH_INFLIGHT_TTL_MS } from "../../config/runtimeConfig.js";

const REFRESH_RESULT_TTL_MS = 10_000;
const refreshDedupCache = new Map();

export async function dedupRefresh(provider, oldToken, fn, log) {
  if (!oldToken) return fn();
  const key = `${provider}:${oldToken}`;
  const hit = refreshDedupCache.get(key);
  if (hit) {
    if (hit.promise) {
      // The in-flight branch used to return `hit.promise` unconditionally — the
      // expiry check below only ever covered *settled* results. So a refresh that
      // never settled pinned this key permanently and every later caller awaited
      // the same dead promise until the process restarted. Bound it: past the TTL
      // the entry is dropped and a fresh attempt is made.
      if (Date.now() - (hit.startedAt || 0) < TOKEN_REFRESH_INFLIGHT_TTL_MS) {
        log?.info?.("TOKEN_REFRESH", `Reusing in-flight refresh for ${provider}`);
        return hit.promise;
      }
      log?.warn?.("TOKEN_REFRESH", `In-flight refresh for ${provider} exceeded ${TOKEN_REFRESH_INFLIGHT_TTL_MS}ms — discarding and retrying`);
      refreshDedupCache.delete(key);
    } else if (hit.expiresAt > Date.now()) {
      log?.info?.("TOKEN_REFRESH", `Reusing recent refresh result for ${provider}`);
      return hit.result;
    } else {
      refreshDedupCache.delete(key);
    }
  }
  const promise = (async () => {
    const result = await fn();
    refreshDedupCache.set(key, { result, expiresAt: Date.now() + REFRESH_RESULT_TTL_MS });
    return result;
  })().finally(() => {
    // Identity-guarded reap. On success the body above already replaced our entry
    // with the cached result (which has no `.promise`), so this is a no-op. On
    // failure — including the AbortSignal timeout on the underlying fetch — it
    // clears the key so the next caller retries instead of inheriting the error.
    const cur = refreshDedupCache.get(key);
    if (cur?.promise === promise) refreshDedupCache.delete(key);
  });
  refreshDedupCache.set(key, { promise, startedAt: Date.now() });
  return promise;
}
