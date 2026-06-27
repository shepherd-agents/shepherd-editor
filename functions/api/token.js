// Cloudflare Pages Function: exchange a GitHub OAuth `code` for an access token.
// The client secret stays server-side (set GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
// as the Pages project's environment variables / secrets).
export async function onRequestPost({ request, env }) {
  let code;
  try { ({ code } = await request.json()); } catch { return json({ error: "bad_request" }, 400); }
  if (!code) return json({ error: "missing_code" }, 400);

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const d = await r.json();
  return json({ access_token: d.access_token, error: d.error });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
