export const DEFAULT_RETRY_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(headerValue, maxDelayMs) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, maxDelayMs);
  }
  const targetTime = Date.parse(headerValue);
  if (Number.isFinite(targetTime)) {
    return Math.min(Math.max(0, targetTime - Date.now()), maxDelayMs);
  }
  return null;
}

/**
 * Execute a `fetch` request with per-attempt timeouts and exponential backoff retries
 * for transient HTTP statuses (including intermittent 404/429/5xx responses) and network errors.
 *
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{
 *   attempts?: number,
 *   baseDelayMs?: number,
 *   maxDelayMs?: number,
 *   timeoutMs?: number,
 *   retryStatuses?: Set<number>,
 *   fetchImpl?: typeof fetch,
 *   sleep?: (ms: number) => Promise<void>,
 * }} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(
  url,
  init = {},
  {
    attempts = 3,
    baseDelayMs = 400,
    maxDelayMs = 4000,
    timeoutMs = 10_000,
    retryStatuses = DEFAULT_RETRY_STATUSES,
    fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null,
    sleep = defaultSleep,
  } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch unavailable");
  }

  const maxAttempts = Math.max(1, attempts);
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller =
      typeof AbortController === "function" && timeoutMs > 0 ? new AbortController() : null;
    const externalSignal = init.signal;
    const onExternalAbort = () => controller?.abort(externalSignal.reason);

    if (controller && externalSignal) {
      if (externalSignal.aborted) {
        controller.abort(externalSignal.reason);
      } else {
        externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      }
    }

    const timer = controller
      ? setTimeout(
          () => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)),
          timeoutMs,
        )
      : null;

    try {
      const requestInit = controller ? { ...init, signal: controller.signal } : init;
      const response = await fetchImpl(url, requestInit);

      if (response.ok || !retryStatuses.has(response.status) || attempt === maxAttempts) {
        return response;
      }

      lastResponse = response;
      const retryAfterMs = parseRetryAfterMs(response.headers?.get?.("retry-after"), maxDelayMs);
      const backoffMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(retryAfterMs ?? backoffMs);
    } catch (err) {
      if (externalSignal?.aborted) {
        throw err;
      }
      lastError = err;
      if (attempt === maxAttempts) {
        throw err;
      }
      const backoffMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(backoffMs);
    } finally {
      if (timer !== null) clearTimeout(timer);
      if (controller && externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error(`Failed to fetch ${url}`);
}
