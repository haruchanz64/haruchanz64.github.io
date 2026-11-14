const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ALLOWED_CORS_ORIGINS = new Set([
  "https://haruchanz64.github.io",
  "https://haru-portfolio.haruchanz64.workers.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request) {
  const origin = request?.headers?.get("Origin") || "";
  if (!ALLOWED_CORS_ORIGINS.has(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(body, status = 200, request = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(request),
    },
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
  const respond = (body, status = 200) => jsonResponse(body, status, request);

  let payload;
  try {
    payload = await parseSubmission(request);
  } catch {
    return respond({ error: "Invalid request body." }, 400);
  }

  // Silently accept honeypot submissions so bots do not retry.
  if (typeof payload["bot-field"] === "string" && payload["bot-field"].trim() !== "") {
    return respond({ ok: true }, 200);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!name || !email || !subject || !message) {
    return respond({ error: "All fields are required." }, 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return respond({ error: "Please provide a valid email address." }, 400);
  }

  if (name.length > 100 || email.length > 160 || subject.length > 160 || message.length > 2000) {
    return respond({ error: "Input exceeds maximum allowed length." }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
    console.error("Missing RESEND_API_KEY or CONTACT_TO_EMAIL environment variable.");
    return respond({ error: "Email service is not configured." }, 500);
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
    return respond({ error: "Failed to send email." }, 502);
  }

  return respond({ ok: true }, 200);
}

async function handleResumeGatePost(request, env) {
  const respond = (body, status = 200) => jsonResponse(body, status, request);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Invalid JSON body." }, 400);
  }

  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  if (!token) {
    return respond({ error: "Missing Turnstile token." }, 400);
  }

  const secretKey = String(env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secretKey) {
    console.error("Missing TURNSTILE_SECRET_KEY environment variable.");
    return respond({ error: "Verification service is not configured." }, 500);
  }

  const verifyBody = {
    secret: secretKey,
    response: token,
  };
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) verifyBody.remoteip = ip;

  const verifyRes = await fetch(TURNSTILE_SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(verifyBody),
  });

  if (!verifyRes.ok) {
    const errText = await verifyRes.text().catch(() => "");
    console.error("Turnstile siteverify HTTP error:", verifyRes.status, errText);
    return respond({ error: "Turnstile verification unavailable." }, 502);
  }

  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    return respond({ error: "Human verification failed." }, 403);
  }

  return respond(
    {
      phone: env.RESUME_PHONE || "",
      email: env.RESUME_EMAIL || "",
    },
    200,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405, request);
      }
      return handleContactPost(request, env);
    }

    if (url.pathname === "/api/resume-gate") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405, request);
      }
      return handleResumeGatePost(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
