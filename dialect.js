/* Browser port of blog/build.py's custom dialect, for live preview.
   Mirrors: front-matter strip, figures, callouts, sidenotes, [TOC] (skipped),
   then marked() for base markdown, then brand-token replacement.
   The deploy (build.py via the Action) stays the source of truth; this is a
   close preview. Keep in sync with build.py if the dialect changes. */
(function () {
  const ASSET = "https://shepherd-agents.ai/assets/";

  function stripFrontMatter(t) {
    if (t.startsWith("---\n")) {
      const e = t.indexOf("\n---\n", 4);
      if (e !== -1) return t.slice(e + 5);
    }
    return t;
  }

  // A standalone image line -> <figure> with caption.
  function convertFigures(md) {
    return md.split("\n").map((line) => {
      const m = line.match(/^!\[(.*)\]\(([^)]+)\)\s*$/);
      if (!m) return line;
      const src = m[2].replace(/^\.\.\/assets\//, ASSET);
      return `\n<figure><img src="${src}" alt=""><figcaption>${marked.parseInline(m[1])}</figcaption></figure>\n`;
    }).join("\n");
  }

  // > [!tldr] / > [!insight] blockquote admonitions -> callout boxes.
  function convertCallouts(md) {
    const lines = md.split("\n"), out = [];
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(/^>\s*\[!(\w+)\]\s*$/);
      if (m) {
        const type = m[1].toLowerCase();
        i++;
        const inner = [];
        while (i < lines.length && lines[i].startsWith(">")) { inner.push(lines[i].replace(/^>\s?/, "")); i++; }
        const label = type === "insight"
          ? `<p class="callout__label">\u{1F4A1} Takeaway <img class="callout__logo" src="${ASSET}logo-shepherd.png" alt=""></p>`
          : "";
        out.push("", `<aside class="callout callout--${type}">`, label, marked.parse(inner.join("\n")), "</aside>", "");
      } else { out.push(lines[i]); i++; }
    }
    return out.join("\n");
  }

  // ^[ ... ] balanced-bracket sidenotes -> @@SN{i}@@ tokens.
  function extractSidenotes(body) {
    const notes = [];
    let out = "", i = 0;
    while (i < body.length) {
      if (body[i] === "^" && body[i + 1] === "[") {
        let depth = 1, j = i + 2;
        while (j < body.length && depth > 0) { if (body[j] === "[") depth++; else if (body[j] === "]") depth--; j++; }
        if (depth === 0) { out += `@@SN${notes.length}@@`; notes.push(body.slice(i + 2, j - 1)); i = j; continue; }
      }
      out += body[i]; i++;
    }
    return [out, notes];
  }

  function brand(html) {
    const sp = (cls, logo, word) => `<span class="${cls}"><img class="brand__logo" src="${ASSET}${logo}" alt="">${word}</span>`;
    return html
      .replace(/:smark:/g, sp("brand", "logo-shepherd.png", "Shepherd"))
      .replace(/:cro:/g, sp("brand", "logo-shepherd.png", "CRO"))
      .replace(/:treegrpo:/g, sp("brand", "logo-shepherd.png", "Tree-GRPO"))
      .replace(/:shepherd:/g, sp("brand", "logo-shepherd.png", "Shepherd"))
      .replace(/:worker:/g, sp("brand brand--worker", "logo-agent.png", "worker"))
      .replace(/:agent:/g, sp("brand brand--worker", "logo-agent.png", "agent"));
  }

  // Light front-matter -> title/byline/links header (the deploy renders the
  // full author block; this is a readable approximation for preview).
  function titleBlock(text) {
    if (!text.startsWith("---\n")) return "";
    const e = text.indexOf("\n---\n", 4);
    if (e === -1) return "";
    const fm = text.slice(4, e);
    const title = (fm.match(/^title:\s*"?(.+?)"?\s*$/m) || [])[1] || "";
    const authors = [...fm.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1])
      .filter((n) => !/University|Institute/.test(n));
    const links = [...fm.matchAll(/label:\s*"([^"]+)"(?:[^}]*url:\s*"([^"]+)")?/g)]
      .map((m) => (m[2] ? `<a href="${m[2]}">${m[1]}</a>` : `<span style="color:#999">${m[1]}</span>`));
    if (!title) return "";
    return `<header style="text-align:center;border-bottom:1px solid #e3e8ee;padding-bottom:18px;margin-bottom:26px">
      <h1 style="margin:0 0 10px;line-height:1.2">${title}</h1>
      <p style="color:#555;margin:0 0 8px">${authors.join(", ")}</p>
      <p style="margin:0;font-size:.9em">${links.join(" &nbsp;·&nbsp; ")}</p>
    </header>`;
  }

  marked.setOptions({ gfm: true, breaks: false });

  window.renderDialect = function (text) {
    const head = titleBlock(text);
    let body = stripFrontMatter(text);
    body = convertFigures(body);
    body = convertCallouts(body);
    let notes;
    [body, notes] = extractSidenotes(body);
    body = body.replace(/^\[TOC\]\s*$/m, "");   // contents box is generated on deploy
    let html = marked.parse(body);
    notes.forEach((n, idx) => {
      const num = idx + 1;
      const sn = `<span class="sn"><input type="checkbox" id="sn${num}" class="sn-toggle"><label for="sn${num}" class="sn-ref">${num}</label><span class="sn-body"><span class="sn-num">${num}.</span> ${marked.parseInline(n)}</span></span>`;
      html = html.replace(`@@SN${idx}@@`, sn);
    });
    return head + brand(html);
  };
})();
