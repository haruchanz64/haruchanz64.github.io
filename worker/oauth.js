const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const STATE_COOKIE_NAME = "oauth_state";

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function renderCallbackHtml(status, payload, clearCookie = true) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const serializedMessage = JSON.stringify(message);
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (clearCookie) {
    headers["Set-Cookie"] =
      `${STATE_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/api/callback; Max-Age=0`;
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>GitHub Authorization</title>
  </head>
  <body>
    <p>${status === "success" ? "Authorization complete. Closing window..." : "Authorization failed."}</p>
    <script>
      (function () {
        var result = ${serializedMessage};
        function receiveMessage(event) {
          if (!window.opener) return;
          window.opener.postMessage(result, event.origin);
          window.removeEventListener("message", receiveMessage, false);
          window.close();
        }
        window.addEventListener("message", receiveMessage, false);
        if (window.opener) {
          window.opener.postMessage("authorizing:github", "*");
        }
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: status === "success" ? 200 : 400,
    headers,
  });
}

/**
 * Redirects the CMS popup to GitHub's OAuth authorization screen.
 */
export function handleOAuthStart(request, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID configuration.", { status: 500 });
  }

  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/callback`;

  const authUrl = new URL(GITHUB_AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "repo");
  authUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      "Cache-Control": "no-store",
      "Set-Cookie": `${STATE_COOKIE_NAME}=${encodeURIComponent(state)}; HttpOnly; Secure; SameSite=Lax; Path=/api/callback; Max-Age=600`,
    },
  });
}

/**
 * Handles the GitHub OAuth callback, exchanges the code for an access token,
 * and posts the result back to the CMS opener window.
 */
export async function handleOAuthCallback(request, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return renderCallbackHtml("error", { error: "GitHub OAuth is not configured on the server." });
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    const desc = url.searchParams.get("error_description") || oauthError;
    return renderCallbackHtml("error", { error: desc });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request.headers.get("Cookie"));

  if (!code || !state || !cookies[STATE_COOKIE_NAME] || state !== cookies[STATE_COOKIE_NAME]) {
    return renderCallbackHtml("error", { error: "Invalid or expired OAuth state." });
  }

  let tokenData;
  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/callback`,
      }),
    });

    if (!tokenRes.ok) {
      return renderCallbackHtml("error", {
        error: `GitHub token exchange failed (HTTP ${tokenRes.status}).`,
      });
    }

    tokenData = await tokenRes.json();
  } catch {
    return renderCallbackHtml("error", { error: "Failed to contact GitHub token endpoint." });
  }

  if (tokenData.error || !tokenData.access_token) {
    return renderCallbackHtml("error", {
      error: tokenData.error_description || tokenData.error || "Missing access token.",
    });
  }

  return renderCallbackHtml("success", {
    token: tokenData.access_token,
    provider: "github",
  });
}
