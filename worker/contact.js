const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseSubmission(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await request.json();
  }
  const text = await request.text();
  const params = new URLSearchParams(text);
  return Object.fromEntries(params.entries());
}

async function handleContactPost(request, env) {
  let payload;
  try {
    payload = await parseSubmission(request);
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  // Silently accept honeypot submissions so bots do not retry.
  if (typeof payload["bot-field"] === "string" && payload["bot-field"].trim() !== "") {
    return jsonResponse({ ok: true }, 200);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!name || !email || !subject || !message) {
    return jsonResponse({ error: "All fields are required." }, 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse({ error: "Please provide a valid email address." }, 400);
  }

  if (name.length > 100 || email.length > 160 || subject.length > 160 || message.length > 2000) {
    return jsonResponse({ error: "Input exceeds maximum allowed length." }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
    console.error("Missing RESEND_API_KEY or CONTACT_TO_EMAIL environment variable.");
    return jsonResponse({ error: "Email service is not configured." }, 500);
  }

  const safeName = name.replace(/[\r\n<>"]/g, "").trim() || "Visitor";
  const from =
    env.CONTACT_FROM_EMAIL ||
    `${safeName} (via Contact Form on your portfolio) <onboarding@resend.dev>`;
  const emailBody = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    "",
    message,
  ].join("\n");

  const resendRes = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `[Portfolio] ${subject}`,
      text: emailBody,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend API error:", resendRes.status, errText);
    return jsonResponse({ error: "Failed to send email." }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }
      return handleContactPost(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
