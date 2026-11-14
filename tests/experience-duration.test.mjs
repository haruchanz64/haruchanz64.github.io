import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeExperienceDuration,
  formatDuration,
  parseMonthYear,
} from "../src/js/experience-duration.js";

describe("parseMonthYear", () => {
  it("parses full and abbreviated month names", () => {
    assert.deepEqual(parseMonthYear("July 2026"), { year: 2026, month: 6 });
    assert.deepEqual(parseMonthYear("Dec 2022"), { year: 2022, month: 11 });
  });

  it("parses Present using the provided date", () => {
    const now = new Date(2026, 10, 14); // Nov 2026
    assert.deepEqual(parseMonthYear("Present", now), { year: 2026, month: 10 });
  });

  it("returns null for invalid inputs", () => {
    assert.equal(parseMonthYear(""), null);
    assert.equal(parseMonthYear("2026"), null);
    assert.equal(parseMonthYear("Smarch 2026"), null);
  });
});

describe("formatDuration", () => {
  it("formats months, years, and combined durations", () => {
    assert.equal(formatDuration(1), "1 mo");
    assert.equal(formatDuration(5), "5 mos");
    assert.equal(formatDuration(12), "1 yr");
    assert.equal(formatDuration(16), "1 yr 4 mos");
    assert.equal(formatDuration(24), "2 yrs");
    assert.equal(formatDuration(0), "");
    assert.equal(formatDuration(-3), "");
  });
});

describe("computeExperienceDuration", () => {
  const nov2026 = new Date(2026, 10, 14);

  it("computes inclusive durations for closed date ranges", () => {
    assert.equal(computeExperienceDuration("May 2024 – April 2025"), "1 yr");
    assert.equal(computeExperienceDuration("December 2022 – May 2024"), "1 yr 6 mos");
  });

  it("computes inclusive durations up to Present", () => {
    assert.equal(computeExperienceDuration("July 2026 – Present", nov2026), "5 mos");
    assert.equal(computeExperienceDuration("August 2025 – Present", nov2026), "1 yr 4 mos");
  });

  it("returns empty string for future start dates or malformed ranges", () => {
    const jan2026 = new Date(2026, 0, 1);
    assert.equal(computeExperienceDuration("July 2026 – Present", jan2026), "");
    assert.equal(computeExperienceDuration("Invalid"), "");
  });
});
