const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ALLOWED_CORS_ORIGINS = new Set([
  "https://haruchanz64.github.io",
  "https://haru-portfolio.haruchanz64.workers.dev",
  "https://haruchanz64-portfolio.haruchanz64.workers.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
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

function jsonResponse(body, status, request) {
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

function readTrimmedString(payload, key) {
  return typeof payload[key] === "string" ? payload[key].trim() : "";
}

export function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function buildEmailBody({
  name,
  email,
  company = "",
  role = "",
  referenceUrl = "",
  budget = "",
  timeline = "",
  subject,
  message,
}) {
  const lines = [`Name: ${name}`, `Email: ${email}`];
  if (company) lines.push(`Company / Organization: ${company}`);
  if (role) lines.push(`Role / Position: ${role}`);
  if (referenceUrl) lines.push(`Reference Link: ${referenceUrl}`);
  if (budget) lines.push(`Estimated Budget: ${budget}`);
  if (timeline) lines.push(`Timeline: ${timeline}`);
  lines.push(`Subject: ${subject}`, "", message);
  return lines.join("\n");
}

export async function verifyTurnstileToken({ token, secretKey, remoteIp = "", fetchImpl = fetch }) {
  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const res = await fetchImpl(TURNSTILE_VERIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    return { success: false, errorCodes: [`http-${res.status}`] };
  }

  const data = await res.json();
  return {
    success: Boolean(data?.success),
    errorCodes: Array.isArray(data?.["error-codes"]) ? data["error-codes"] : [],
  };
}

export async function handleContactPost(request, env, { fetchImpl = fetch } = {}) {
  const respond = (body, status = 200) => jsonResponse(body, status, request);

  let payload;
  try {
    payload = await parseSubmission(request);
  } catch {
    return respond({ error: "Invalid request body." }, 400);
  }

  // Silently accept honeypot submissions so bots do not retry.
  if (readTrimmedString(payload, "bot-field") !== "") {
    return respond({ ok: true }, 200);
  }

  const name = readTrimmedString(payload, "name");
  const email = readTrimmedString(payload, "email");
  const company = readTrimmedString(payload, "company");
  const role = readTrimmedString(payload, "role");
  const referenceUrl = readTrimmedString(payload, "referenceUrl");
  const budget = readTrimmedString(payload, "budget");
  const timeline = readTrimmedString(payload, "timeline");
  const subject = readTrimmedString(payload, "subject");
  const message = readTrimmedString(payload, "message");

  if (!name || !email || !subject || !message) {
    return respond({ error: "All fields are required." }, 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return respond({ error: "Please provide a valid email address." }, 400);
  }

  if (referenceUrl && !isValidHttpUrl(referenceUrl)) {
    return respond({ error: "Please provide a valid http(s) URL." }, 400);
  }

  if (
    name.length > 100 ||
    email.length > 160 ||
    company.length > 120 ||
    role.length > 120 ||
    referenceUrl.length > 300 ||
    budget.length > 60 ||
    timeline.length > 60 ||
    subject.length > 160 ||
    message.length > 1000
  ) {
    return respond({ error: "Input exceeds maximum allowed length." }, 400);
  }

  if (env.TURNSTILE_SECRET_KEY) {
    const turnstileToken = readTrimmedString(payload, "cf-turnstile-response");
    if (!turnstileToken) {
      return respond({ error: "Security verification required." }, 403);
    }

    const remoteIp = request.headers.get("CF-Connecting-IP") || "";
    const verification = await verifyTurnstileToken({
      token: turnstileToken,
      secretKey: env.TURNSTILE_SECRET_KEY,
      remoteIp,
      fetchImpl,
    });

    if (!verification.success) {
      console.error("Turnstile verification failed:", verification.errorCodes);
      return respond({ error: "Security verification failed. Please try again." }, 403);
    }
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
    console.error("Missing RESEND_API_KEY or CONTACT_TO_EMAIL environment variable.");
    return respond({ error: "Email service is not configured." }, 500);
  }

  const safeName = name.replace(/[\r\n<>"]/g, "").trim() || "Visitor";
  const from =
    env.CONTACT_FROM_EMAIL ||
    `${safeName} (via Contact Form on your portfolio) <onboarding@resend.dev>`;
  const emailBody = buildEmailBody({
    name,
    email,
    company,
    role,
    referenceUrl,
    budget,
    timeline,
    subject,
    message,
  });

  const resendRes = await fetchImpl(RESEND_ENDPOINT, {
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

    return env.ASSETS.fetch(request);
  },
};
