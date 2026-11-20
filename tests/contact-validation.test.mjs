import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidHttpUrl, validateContactFields } from "../src/js/contact/contact.js";

describe("isValidHttpUrl", () => {
  it("accepts http and https URLs and rejects other schemes or malformed inputs", () => {
    assert.equal(isValidHttpUrl("https://example.com"), true);
    assert.equal(isValidHttpUrl("http://studio.dev/jobs/123"), true);
    assert.equal(isValidHttpUrl("javascript:alert(1)"), false);
    assert.equal(isValidHttpUrl("ftp://example.com"), false);
    assert.equal(isValidHttpUrl("not-a-url"), false);
    assert.equal(isValidHttpUrl(""), false);
  });
});

describe("validateContactFields", () => {
  it("returns all required field errors in form order when fields are empty", () => {
    const errors = validateContactFields({
      name: "   ",
      email: "",
      selectedSubject: "",
      customSubject: "",
      message: "\n\t",
    });

    assert.deepEqual(errors, [
      { field: "name", messageKey: "contact.toast.enterName" },
      { field: "email", messageKey: "contact.toast.invalidEmail" },
      { field: "subjectSelect", messageKey: "contact.toast.selectSubject" },
      { field: "message", messageKey: "contact.toast.enterMessage" },
    ]);
  });

  it("flags malformed email addresses", () => {
    const errors = validateContactFields({
      name: "Haru",
      email: "not-an-email",
      selectedSubject: "General Question",
      customSubject: "",
      message: "Hello there!",
    });

    assert.deepEqual(errors, [{ field: "email", messageKey: "contact.toast.invalidEmail" }]);
  });

  it("requires custom subject input only when __custom__ is selected", () => {
    const missingCustom = validateContactFields({
      name: "Haru",
      email: "haru@example.com",
      selectedSubject: "__custom__",
      customSubject: "   ",
      message: "Hello there!",
    });

    assert.deepEqual(missingCustom, [
      { field: "subjectCustom", messageKey: "contact.toast.enterCustomSubject" },
    ]);

    const filledCustom = validateContactFields({
      name: "Haru",
      email: "haru@example.com",
      selectedSubject: "__custom__",
      customSubject: "Speaking Invitation",
      message: "Hello there!",
    });

    assert.deepEqual(filledCustom, []);
  });

  it("validates optional referenceUrl only when provided", () => {
    const invalidUrl = validateContactFields({
      name: "Alex Rivera",
      email: "alex@studio.dev",
      referenceUrl: "javascript:alert(1)",
      selectedSubject: "Job Opportunity / Interview",
      customSubject: "",
      message: "We have an open role.",
    });

    assert.deepEqual(invalidUrl, [
      { field: "referenceUrl", messageKey: "contact.toast.invalidUrl" },
    ]);

    const validOptional = validateContactFields({
      name: "Alex Rivera",
      email: "alex@studio.dev",
      company: "Indie Studio",
      referenceUrl: "https://studio.dev/careers/game-dev",
      selectedSubject: "Job Opportunity / Interview",
      customSubject: "",
      role: "Game Programmer",
      message: "We have an open role.",
    });

    assert.deepEqual(validOptional, []);
  });

  it("flags optional fields that exceed max length", () => {
    const errors = validateContactFields({
      name: "Alex Rivera",
      email: "alex@studio.dev",
      company: "A".repeat(121),
      referenceUrl: `https://example.com/${"a".repeat(290)}`,
      selectedSubject: "Job Opportunity / Interview",
      customSubject: "",
      role: "B".repeat(121),
      message: "Hello!",
    });

    assert.deepEqual(errors, [
      { field: "company", messageKey: "contact.toast.fieldTooLong" },
      { field: "referenceUrl", messageKey: "contact.toast.fieldTooLong" },
      { field: "role", messageKey: "contact.toast.fieldTooLong" },
    ]);
  });

  it("returns an empty array for valid input", () => {
    const errors = validateContactFields({
      name: "Alex Rivera",
      email: "alex@studio.dev",
      selectedSubject: "Freelance / Project Inquiry",
      customSubject: "",
      message: "Would love to collaborate on a project.",
    });

    assert.deepEqual(errors, []);
  });
});
