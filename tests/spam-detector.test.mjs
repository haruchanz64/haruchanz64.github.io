import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeSpamContent,
  COOLDOWN_MS,
  checkSubmissionTiming,
  detectSpam,
  getCooldownRemainingMs,
  MIN_INTERACTION_TIME_MS,
  MIN_PAGE_TIME_MS,
  recordSubmissionTime,
} from "../src/js/contact/spam-detector.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

const VALID_TIMING = {
  pageLoadedAt: 0,
  firstInteractionAt: 2000,
  hasInteracted: true,
  now: 10_000,
};

describe("analyzeSpamContent", () => {
  it("allows normal portfolio inquiries", () => {
    const result = analyzeSpamContent({
      name: "Alex Rivera",
      email: "alex@studio.dev",
      subject: "Freelance / Project Inquiry",
      message: "Hi! I saw your Flutter portfolio and would love to discuss a mobile app.",
    });
    assert.equal(result.isSpam, false);
    assert.equal(result.score, 0);
  });

  it("allows a single legitimate link (e.g. LinkedIn or GitHub)", () => {
    const result = analyzeSpamContent({
      name: "Alex Rivera",
      email: "alex@studio.dev",
      subject: "Job Opportunity / Interview",
      message: "Here is our company site https://example.com — would love to chat.",
    });
    assert.equal(result.isSpam, false);
  });

  it("flags URLs in the name field", () => {
    const result = analyzeSpamContent({
      name: "https://spam-site.com",
      email: "bot@example.com",
      subject: "General Question",
      message: "Check out this offer.",
    });
    assert.equal(result.isSpam, true);
    assert.ok(result.reasons.includes("url-in-name"));
  });

  it("flags SEO / promotional spam with links or multiple spam signals", () => {
    const result = analyzeSpamContent({
      name: "John",
      email: "promo@mailinator.com",
      subject: "Boost your site",
      message:
        "We offer cheap SEO services and backlinks to rank #1! Visit https://a.com https://b.com https://c.com",
    });
    assert.equal(result.isSpam, true);
    assert.ok(result.reasons.includes("excessive-urls"));
    assert.ok(result.reasons.includes("seo-marketing-spam"));
    assert.ok(result.reasons.includes("disposable-email"));
  });

  it("flags BBCode / HTML link injection", () => {
    const result = analyzeSpamContent({
      name: "Bot",
      email: "bot@example.com",
      subject: "Hello",
      message:
        'Check [url=https://spam.example]this[/url] and <a href="https://spam.example">here</a>',
    });
    assert.equal(result.isSpam, true);
    assert.ok(result.reasons.includes("markup-injection"));
  });

  it("flags repeated characters and excessive caps", () => {
    const result = analyzeSpamContent({
      name: "USER",
      email: "user@example.com",
      subject: "URGENT",
      message: "BUY NOWWWWWWWW THIS IS AN AMAZING OFFER FOR YOU RIGHT NOW",
    });
    assert.equal(result.isSpam, true);
    assert.ok(result.reasons.includes("repeated-chars"));
    assert.ok(result.reasons.includes("excessive-caps"));
  });
});

describe("checkSubmissionTiming", () => {
  it("blocks submissions without user interaction", () => {
    const result = checkSubmissionTiming({
      pageLoadedAt: 0,
      firstInteractionAt: null,
      hasInteracted: false,
      now: 10_000,
    });
    assert.equal(result.isBot, true);
    assert.equal(result.reason, "no-interaction");
  });

  it("blocks submissions made too soon after page load", () => {
    const result = checkSubmissionTiming({
      pageLoadedAt: 1000,
      firstInteractionAt: 1500,
      hasInteracted: true,
      now: 1000 + MIN_PAGE_TIME_MS - 100,
    });
    assert.equal(result.isBot, true);
    assert.equal(result.reason, "too-fast-page");
  });

  it("blocks submissions made too soon after first interaction", () => {
    const result = checkSubmissionTiming({
      pageLoadedAt: 0,
      firstInteractionAt: 5000,
      hasInteracted: true,
      now: 5000 + MIN_INTERACTION_TIME_MS - 100,
    });
    assert.equal(result.isBot, true);
    assert.equal(result.reason, "too-fast-fill");
  });

  it("allows human-paced submissions", () => {
    const result = checkSubmissionTiming(VALID_TIMING);
    assert.equal(result.isBot, false);
  });
});

describe("cooldown rate limiting", () => {
  it("enforces cooldown after recording a submission", () => {
    const storage = createMemoryStorage();
    recordSubmissionTime(storage, 10_000);

    assert.equal(getCooldownRemainingMs(storage, 25_000), COOLDOWN_MS - 15_000);
    assert.equal(getCooldownRemainingMs(storage, 10_000 + COOLDOWN_MS), 0);
  });
});

describe("detectSpam orchestrator", () => {
  it("silently blocks honeypot hits", () => {
    const result = detectSpam({
      honeypot: "i am a bot",
      name: "Alex",
      email: "alex@example.com",
      subject: "Hello",
      message: "Legitimate looking message",
      timing: VALID_TIMING,
      now: VALID_TIMING.now,
    });
    assert.equal(result.blocked, true);
    assert.equal(result.silent, true);
    assert.equal(result.reason, "honeypot");
  });

  it("blocks submissions during cooldown", () => {
    const storage = createMemoryStorage();
    recordSubmissionTime(storage, 9_000);

    const result = detectSpam({
      honeypot: "",
      name: "Alex",
      email: "alex@example.com",
      subject: "Hello",
      message: "Following up on my message.",
      timing: VALID_TIMING,
      storage,
      now: 10_000,
    });
    assert.equal(result.blocked, true);
    assert.equal(result.silent, false);
    assert.equal(result.reason, "cooldown");
  });

  it("allows clean human submissions", () => {
    const storage = createMemoryStorage();
    const result = detectSpam({
      honeypot: "",
      name: "Alex Rivera",
      email: "alex@studio.dev",
      subject: "Freelance / Project Inquiry",
      message: "Hi Haru, I'd like to collaborate on a Unity/Flutter project.",
      timing: VALID_TIMING,
      storage,
      now: VALID_TIMING.now,
    });
    assert.equal(result.blocked, false);
  });
});
