import { readStorageItem, writeStorageItem } from "../core/cache.js";

export const MIN_PAGE_TIME_MS = 3000;
export const MIN_INTERACTION_TIME_MS = 1200;
export const COOLDOWN_MS = 60_000;
export const SPAM_SCORE_THRESHOLD = 5;
export const COOLDOWN_STORAGE_KEY = "haru_contact_last_submit";

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const MARKUP_INJECTION_REGEX = /<a\s+href=|\[url=|\[link=/i;
const REPEATED_CHARS_REGEX = /(.)\1{6,}/;

const SPAM_CATEGORY_PATTERNS = [
  {
    reason: "seo-marketing-spam",
    pattern:
      /\b(seo\s+services?|backlinks?|link\s+building|guest\s+post|domain\s+authority|rank\s*#?1|buy\s+followers|traffic\s+boost)\b/i,
  },
  {
    reason: "pharma-gambling-loan-spam",
    pattern:
      /\b(casino|gambling|viagra|cialis|porn|xxx|payday\s+loan|loan\s+approval|guaranteed\s+roi|passive\s+income)\b/i,
  },
  {
    reason: "messaging-shortener-spam",
    pattern:
      /\b(whatsapp\s+me|telegram\s*@|t\.me\/|bit\.ly\/|tinyurl\.com\/)\b/i,
  },
];

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "throwawaymail.com",
  "trashmail.com",
]);

/**
 * Counts URLs (http/https/www) in a string.
 * @param {string} text
 * @returns {number}
 */
export function countUrls(text) {
  if (!text) return 0;
  const matches = text.match(URL_REGEX);
  return matches ? matches.length : 0;
}

/**
 * Scores contact form content for common spam signals.
 * @param {{ name: string, email: string, subject: string, message: string }} fields
 * @returns {{ isSpam: boolean, score: number, reasons: string[] }}
 */
export function analyzeSpamContent({ name = "", email = "", subject = "", message = "" }) {
  let score = 0;
  const reasons = [];

  if (countUrls(name) > 0) {
    score += 5;
    reasons.push("url-in-name");
  }

  const bodyUrlCount = countUrls(subject) + countUrls(message);
  if (bodyUrlCount >= 3) {
    score += 4;
    reasons.push("excessive-urls");
  } else if (bodyUrlCount >= 1) {
    score += 1;
    reasons.push("contains-url");
  }

  const combinedText = `${name} ${subject} ${message}`;
  if (MARKUP_INJECTION_REGEX.test(combinedText)) {
    score += 4;
    reasons.push("markup-injection");
  }

  for (const { reason, pattern } of SPAM_CATEGORY_PATTERNS) {
    if (pattern.test(combinedText)) {
      score += 3;
      reasons.push(reason);
    }
  }

  const emailDomain = email.split("@")[1]?.toLowerCase().trim();
  if (emailDomain && DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
    score += 3;
    reasons.push("disposable-email");
  }

  if (
    REPEATED_CHARS_REGEX.test(name) ||
    REPEATED_CHARS_REGEX.test(subject) ||
    REPEATED_CHARS_REGEX.test(message)
  ) {
    score += 3;
    reasons.push("repeated-chars");
  }

  const letters = message.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20) {
    const uppercaseCount = letters.replace(/[^A-Z]/g, "").length;
    if (uppercaseCount / letters.length > 0.65) {
      score += 2;
      reasons.push("excessive-caps");
    }
  }

  return {
    isSpam: score >= SPAM_SCORE_THRESHOLD,
    score,
    reasons,
  };
}

/**
 * Verifies the submission was preceded by human-paced interaction.
 * @param {{ pageLoadedAt: number, firstInteractionAt: number | null, hasInteracted: boolean, now?: number }} state
 * @returns {{ isBot: boolean, reason: string | null }}
 */
export function checkSubmissionTiming({
  pageLoadedAt,
  firstInteractionAt,
  hasInteracted,
  now = Date.now(),
}) {
  if (!hasInteracted) {
    return { isBot: true, reason: "no-interaction" };
  }
  if (now - pageLoadedAt < MIN_PAGE_TIME_MS) {
    return { isBot: true, reason: "too-fast-page" };
  }
  if (firstInteractionAt !== null && now - firstInteractionAt < MIN_INTERACTION_TIME_MS) {
    return { isBot: true, reason: "too-fast-fill" };
  }
  return { isBot: false, reason: null };
}

/**
 * Returns remaining cooldown in milliseconds, or 0 if ready to submit.
 * @param {Storage | null | undefined} storage
 * @param {number} [now]
 * @returns {number}
 */
export function getCooldownRemainingMs(storage, now = Date.now()) {
  const raw = readStorageItem(COOLDOWN_STORAGE_KEY, storage);
  if (!raw) return 0;
  const lastSubmit = Number(raw);
  if (!Number.isFinite(lastSubmit) || lastSubmit > now) return 0;
  return Math.max(0, COOLDOWN_MS - (now - lastSubmit));
}

/**
 * Persists the latest submission timestamp for rate limiting.
 * @param {Storage | null | undefined} storage
 * @param {number} [now]
 */
export function recordSubmissionTime(storage, now = Date.now()) {
  writeStorageItem(COOLDOWN_STORAGE_KEY, String(now), storage);
}

/**
 * Runs all client-side spam checks on a contact form submission.
 * @param {{
 *   honeypot?: string,
 *   name: string,
 *   email: string,
 *   subject: string,
 *   message: string,
 *   timing: { pageLoadedAt: number, firstInteractionAt: number | null, hasInteracted: boolean },
 *   storage?: Storage | null,
 *   now?: number
 * }} params
 * @returns {{ blocked: boolean, silent: boolean, reason: string | null, userMessage: string | null }}
 */
export function detectSpam({
  honeypot = "",
  name,
  email,
  subject,
  message,
  timing,
  storage = null,
  now = Date.now(),
}) {
  if (honeypot.trim().length > 0) {
    return {
      blocked: true,
      silent: true,
      reason: "honeypot",
      userMessage: null,
    };
  }

  const timingResult = checkSubmissionTiming({ ...timing, now });
  if (timingResult.isBot) {
    return {
      blocked: true,
      silent: false,
      reason: timingResult.reason,
      userMessage: "Submission was too fast. Please take a moment and try again.",
    };
  }

  const remainingMs = getCooldownRemainingMs(storage, now);
  if (remainingMs > 0) {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
      blocked: true,
      silent: false,
      reason: "cooldown",
      userMessage: `Please wait ${remainingSeconds}s before sending another message.`,
    };
  }

  const contentResult = analyzeSpamContent({ name, email, subject, message });
  if (contentResult.isSpam) {
    return {
      blocked: true,
      silent: false,
      reason: contentResult.reasons.join(","),
      userMessage:
        "Your message was flagged as potential spam. Please remove promotional links or reach out via the social links below.",
    };
  }

  return {
    blocked: false,
    silent: false,
    reason: null,
    userMessage: null,
  };
}
