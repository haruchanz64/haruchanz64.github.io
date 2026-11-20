import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateContactFields } from "../src/js/contact/contact.js";

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
