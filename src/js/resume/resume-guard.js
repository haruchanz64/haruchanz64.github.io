export const MIN_RESUME_PAGE_TIME_MS = 1200;
export const RESUME_COOLDOWN_MS = 2000;

/**
 * Verify that a resume trigger came from a real, human-paced interaction.
 */
export function isResumeRequestAllowed({
  isTrusted = false,
  elapsedMs = 0,
  hasInteracted = false,
  lastTriggeredAt = 0,
  now = Date.now(),
} = {}) {
  if (!isTrusted) return false;
  if (!hasInteracted) return false;
  if (elapsedMs < MIN_RESUME_PAGE_TIME_MS) return false;
  if (lastTriggeredAt > 0 && now - lastTriggeredAt < RESUME_COOLDOWN_MS) return false;
  return true;
}
