# Shepherd blog editor

A small side-by-side editor (left: markdown, right: live preview) that signs in
with GitHub and commits `content/shepherd.md` to **shepherd-agents/shepherd-gh-pages**.
Committing triggers that repo's Action, which rebuilds and deploys `shepherd-agents.ai/blog`.

It is a **Cloudflare Pages** app: a static page plus one Pages Function
(`functions/api/token.js`) that does the OAuth token exchange so the client
secret never reaches the browser. The preview reuses the live `blog.css` and is
a close (not byte-identical) render of the deploy.

## One-time setup

1. **Create a GitHub OAuth App** (github.com → Settings → Developer settings →
   OAuth Apps → New OAuth App):
   - Homepage URL: `https://edit.shepherd-agents.ai`
   - Authorization callback URL: `https://edit.shepherd-agents.ai/`
   - Note the **Client ID** and generate a **Client Secret**.

2. **Set the Client ID** in `editor.js` (`CLIENT_ID`). It is public; safe to commit.

3. **Deploy to Cloudflare Pages** (new Pages project from this `blog/editor/` dir):
   - Build settings: framework preset **None**, build command empty, output dir `/`.
   - Environment variables: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
     (mark the secret as encrypted).
   - Custom domain: `edit.shepherd-agents.ai`.

## Use

Open `edit.shepherd-agents.ai`, click **Sign in with GitHub** (you need write
access to the repo), the post loads, edit with live preview, then **Commit & deploy**.

## Keeping the preview honest

`dialect.js` is a hand port of `blog/build.py`'s dialect (callouts, sidenotes,
brand tokens, figures). If the dialect changes in `build.py`, mirror it here.
The deployed page (Action running `build.py`) is always the source of truth.
