import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEmailBody, handleContactPost } from "../worker/contact.js";

function makeFormRequest(fields, headers = {}) {
  return new Request("https://haruchanz64-portfolio.haruchanz64.workers.dev/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://haruchanz64.github.io",
      ...headers,
    },
    body: new URLSearchParams(fields).toString(),
  });
}

describe("buildEmailBody", () => {
  it("omits empty optional fields and includes populated ones", () => {
    const minimal = buildEmailBody({
      name: "Haru",
      email: "haru@example.com",
      subject: "General Question",
      message: "Hello!",
    });
    assert.equal(
      minimal,
      ["Name: Haru", "Email: haru@example.com", "Subject: General Question", "", "Hello!"].join(
        "\n",
      ),
    );

    const full = buildEmailBody({
      name: "Alex",
      email: "alex@studio.dev",
      company: "Pixel Forge",
      role: "Gameplay Engineer",
      referenceUrl: "https://pixelforge.dev/careers",
      budget: "$2,000 – $5,000",
      timeline: "1–3 months",
      subject: "Freelance / Project Inquiry",
      message: "Let's build a prototype.",
    });

    assert.equal(
      full,
      [
        "Name: Alex",
        "Email: alex@studio.dev",
        "Company / Organization: Pixel Forge",
        "Role / Position: Gameplay Engineer",
        "Reference Link: https://pixelforge.dev/careers",
        "Estimated Budget: $2,000 – $5,000",
        "Timeline: 1–3 months",
        "Subject: Freelance / Project Inquiry",
        "",
        "Let's build a prototype.",
      ].join("\n"),
    );
  });
});

describe("handleContactPost", () => {
  const baseEnv = {
    RESEND_API_KEY: "re_test_key",
    CONTACT_TO_EMAIL: "owner@example.com",
  };

  it("rejects invalid referenceUrl with 400", async () => {
    const req = makeFormRequest({
      name: "Alex",
      email: "alex@studio.dev",
      referenceUrl: "javascript:alert(1)",
      subject: "General Question",
      message: "Hi there",
    });

    const res = await handleContactPost(req, baseEnv, {
      fetchImpl: async () => {
        throw new Error("Should not call fetch");
      },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /URL/i);
  });

  it("requires and verifies Turnstile token when TURNSTILE_SECRET_KEY is configured", async () => {
    const envWithTurnstile = {
      ...baseEnv,
      TURNSTILE_SECRET_KEY: "secret-key",
    };

    const missingTokenRes = await handleContactPost(
      makeFormRequest({
        name: "Alex",
        email: "alex@studio.dev",
        subject: "General Question",
        message: "Hi there",
      }),
      envWithTurnstile,
      {
        fetchImpl: async () => {
          throw new Error("Should not call fetch without token");
        },
      },
    );
    assert.equal(missingTokenRes.status, 403);

    const failedVerifyRes = await handleContactPost(
      makeFormRequest({
        name: "Alex",
        email: "alex@studio.dev",
        subject: "General Question",
        message: "Hi there",
        "cf-turnstile-response": "bad-token",
      }),
      envWithTurnstile,
      {
        fetchImpl: async () =>
          new Response(
            JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }),
            {
              status: 200,
            },
          ),
      },
    );
    assert.equal(failedVerifyRes.status, 403);
  });

  it("verifies Turnstile and sends formatted email with optional fields via Resend", async () => {
    const calls = [];
    const envWithTurnstile = {
      ...baseEnv,
      TURNSTILE_SECRET_KEY: "secret-key",
    };

    const res = await handleContactPost(
      makeFormRequest(
        {
          name: "Alex",
          email: "alex@studio.dev",
          company: "Pixel Forge",
          referenceUrl: "https://pixelforge.dev",
          budget: "$500 – $2,000",
          timeline: "ASAP",
          subject: "Freelance / Project Inquiry",
          message: "Need help with a Unity prototype.",
          "cf-turnstile-response": "valid-token",
        },
        { "CF-Connecting-IP": "203.0.113.10" },
      ),
      envWithTurnstile,
      {
        fetchImpl: async (url, init) => {
          calls.push({ url, init });
          if (url.includes("turnstile")) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }
          return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
        },
      },
    );

    assert.equal(res.status, 200);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.includes("challenges.cloudflare.com/turnstile/v0/siteverify"));
    assert.match(calls[0].init.body, /response=valid-token/);
    assert.match(calls[0].init.body, /remoteip=203\.0\.113\.10/);

    const resendPayload = JSON.parse(calls[1].init.body);
    assert.equal(resendPayload.reply_to, "alex@studio.dev");
    assert.equal(resendPayload.subject, "[Portfolio] Freelance / Project Inquiry");
    assert.match(resendPayload.text, /Company \/ Organization: Pixel Forge/);
    assert.match(resendPayload.text, /Reference Link: https:\/\/pixelforge\.dev/);
    assert.match(resendPayload.text, /Estimated Budget: \$500 – \$2,000/);
    assert.match(resendPayload.text, /Timeline: ASAP/);
  });
});
