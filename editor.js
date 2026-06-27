/* Editor logic: GitHub OAuth (web flow, token exchanged by /api/token),
   load + live-preview + commit content/shepherd.md to the gh-pages repo.
   Committing triggers the repo's Action, which rebuilds and deploys the blog. */
(function () {
  // Set after you create the GitHub OAuth App (Client ID is public; the secret
  // lives only in the /api/token Pages Function).
  const CLIENT_ID = "Ov23liHJaf1lXTaa19Ze";
  const REPO   = "shepherd-agents/shepherd-gh-pages";
  const PATH   = "content/shepherd.md";
  const BRANCH = "main";
  const SCOPE  = "public_repo";   // repo is public, so this is enough

  const $ = (id) => document.getElementById(id);
  let token = localStorage.getItem("gh_token") || null;
  let sha = null, timer = null;

  const status = (s) => { $("ed-status").textContent = s; };
  const preview = () => { $("ed-preview").innerHTML = renderDialect($("ed-src").value); };

  function signedIn() {
    $("ed-signin").textContent = "Signed in";
    $("ed-signin").disabled = true;
    $("ed-load").disabled = false;
    $("ed-commit").disabled = false;
    status("signed in");
  }

  async function gh(path, opts = {}) {
    return fetch("https://api.github.com/" + path, {
      ...opts,
      headers: { Authorization: "token " + token, Accept: "application/vnd.github+json", ...(opts.headers || {}) },
    });
  }

  function b64decodeUtf8(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, "")))); }
  function b64encodeUtf8(str) { return btoa(unescape(encodeURIComponent(str))); }

  async function load() {
    status("loading…");
    const r = await gh(`repos/${REPO}/contents/${PATH}?ref=${BRANCH}`);
    if (!r.ok) { status("load failed (" + r.status + ")"); return; }
    const d = await r.json();
    sha = d.sha;
    $("ed-src").value = b64decodeUtf8(d.content);
    preview();
    status("loaded");
  }

  async function commit() {
    if (!token) { status("sign in first"); return; }
    const msg = prompt("Commit message:", "edit blog via editor");
    if (!msg) return;
    status("committing…");
    const body = JSON.stringify({ message: msg, content: b64encodeUtf8($("ed-src").value), sha, branch: BRANCH });
    const r = await gh(`repos/${REPO}/contents/${PATH}`, { method: "PUT", body });
    if (r.ok) { sha = (await r.json()).content.sha; status("committed ✓ — deploying (~1 min)"); }
    else { status("commit failed (" + r.status + ") — try Reload, then re-apply"); }
  }

  // --- OAuth web flow ---
  $("ed-signin").onclick = () => {
    const redirect = location.origin + location.pathname;
    location.href = "https://github.com/login/oauth/authorize"
      + `?client_id=${CLIENT_ID}&scope=${SCOPE}&redirect_uri=${encodeURIComponent(redirect)}`;
  };

  const code = new URLSearchParams(location.search).get("code");
  if (code) {
    status("authorizing…");
    fetch("/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
      .then((r) => r.json())
      .then((d) => {
        history.replaceState({}, "", location.pathname);
        if (d.access_token) { token = d.access_token; localStorage.setItem("gh_token", token); signedIn(); load(); }
        else status("auth failed: " + (d.error || "unknown"));
      })
      .catch(() => status("auth request failed"));
  } else if (token) {
    signedIn();
    load();
  }

  $("ed-load").onclick = load;
  $("ed-commit").onclick = commit;
  $("ed-src").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(preview, 200); });
})();
