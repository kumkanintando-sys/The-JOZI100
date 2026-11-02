// JOZI 100 Journal — public website engine (Supabase edition).
// Read-only: the public site only ever reads content that Row Level Security allows
// (published articles, verified schools, published recognition, published interviews).
// Requires (in this order): supabase-js v2 CDN -> config.js -> app.js
(() => {
  "use strict";
  const db = window.joziDb;
  const $ = id => document.getElementById(id);
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=85";

  // ---------- helpers ----------
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => { try { const x = new URL(String(u || "").trim()); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } };
  const fmt = d => { try { return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const articleHref = a => "article.html?" + (a.slug ? "slug=" + encodeURIComponent(a.slug) : "id=" + encodeURIComponent(a.id));
  const snippet = (t, n) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n).trimEnd() + "…" : s; };
  // Plain text -> safe HTML. Blank line = new paragraph, line starting with "## " = heading.
  function renderBody(text) {
    return String(text || "").replace(/\r\n/g, "\n").split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(block => {
      if (block.startsWith("## ")) return "<h2>" + esc(block.slice(3).trim()) + "</h2>";
      return "<p>" + esc(block).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  // ---------- mobile menu ----------
  const toggle = $("menuToggle"), nav = $("mainNav");
  if (toggle && nav) toggle.addEventListener("click", () => nav.classList.toggle("open"));

  // ---------- homepage ----------
  async function loadArticles() {
    const target = $("latestStories"); if (!target) return;
    const { data, error } = await db.from("articles")
      .select("id,title,slug,category,author,excerpt,content,cover_image_url,published_at,created_at")
      .eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }).limit(6);
    if (error) throw error;
    if (!data || !data.length) return; // keep the built-in placeholder stories
    target.innerHTML = data.map((a, i) => {
      const img = safeUrl(a.cover_image_url) || FALLBACK_IMG;
      const text = a.excerpt || snippet(a.content, 150);
      return `<article class="story-card${i === 0 ? " story-featured" : ""}">
        <a href="${articleHref(a)}"><img src="${esc(img)}" alt="" loading="lazy"></a>
        <div class="story-meta"><span>${esc(String(a.category || "Journal").toUpperCase())}</span><span>${esc(fmt(a.published_at || a.created_at).toUpperCase())}</span></div>
        <h3><a href="${articleHref(a)}">${esc(a.title)}</a></h3>
        <p>${esc(text)}</p>
        <a class="text-link" href="${articleHref(a)}">Read the story ↗</a>
      </article>`;
    }).join("");
  }
  async function loadSchools() {
    const grid = $("schoolGrid"); if (!grid) return;
    const { data, error } = await db.from("schools")
      .select("id,name,area,school_type,description,contact,website,logo_url").eq("verification_status", "verified").order("name");
    if (error) throw error;
    if (!data || !data.length) return;
    grid.innerHTML = data.map(s => {
      const logo = safeUrl(s.logo_url), site = safeUrl(s.website);
      return `<article class="school-card">
        ${logo ? `<img class="school-logo" src="${esc(logo)}" alt="" loading="lazy">` : `<div class="school-logo school-logo-blank">${esc((s.name || "?").charAt(0))}</div>`}
        <div class="story-meta"><span>${esc(String(s.area || "Johannesburg").toUpperCase())}</span><span>${esc(String(s.school_type || "").toUpperCase())}</span></div>
        <h3>${esc(s.name)}</h3>
        ${s.description ? `<p>${esc(snippet(s.description, 160))}</p>` : ""}
        ${s.contact ? `<p class="school-contact">${esc(s.contact)}</p>` : ""}
        ${site ? `<a class="text-link" href="${esc(site)}" target="_blank" rel="noopener noreferrer">Visit website ↗</a>` : ""}
      </article>`;
    }).join("");
    grid.hidden = false;
    const ph = $("directoryPlaceholder"); if (ph) ph.hidden = true;
  }
  async function loadRecognition() {
    const list = $("recognitionPublic"); if (!list) return;
    const { data, error } = await db.from("recognition")
      .select("id,title,recipient,year,description").eq("status", "published").order("year", { ascending: false }).limit(6);
    if (error) throw error;
    if (!data || !data.length) return;
    list.innerHTML = data.map(r => `<li><strong>${esc(r.title)}</strong><span>${esc(r.recipient)}${r.year ? " · " + esc(r.year) : ""}</span></li>`).join("");
    list.hidden = false;
  }
  async function loadInterviews() {
    const grid = $("interviewGrid"); if (!grid) return;
    const { data, error } = await db.from("interviews")
      .select("id,interviewee_name,position,image_url,introduction,published_at,created_at")
      .eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }).limit(3);
    if (error) throw error;
    if (!data || !data.length) return;
    grid.innerHTML = data.map(i => {
      const href = "article.html?interview=" + encodeURIComponent(i.id);
      return `<article class="story-card">
        <a href="${href}"><img src="${esc(safeUrl(i.image_url) || FALLBACK_IMG)}" alt="" loading="lazy"></a>
        <div class="story-meta"><span>INTERVIEW</span><span>${esc(String(i.position || "").toUpperCase())}</span></div>
        <h3><a href="${href}">${esc(i.interviewee_name)}</a></h3>
        <p>${esc(snippet(i.introduction, 140))}</p>
        <a class="text-link" href="${href}">Read the interview ↗</a>
      </article>`;
    }).join("");
    grid.hidden = false;
  }

  // ---------- article / interview page ----------
  async function loadArticlePage() {
    if (!$("articleBody")) return;
    const params = new URLSearchParams(location.search);
    const key = params.get("slug") || params.get("id");
    const interviewId = params.get("interview");
    if (interviewId) return showInterview(interviewId);
    if (!key || key === "welcome") return; // built-in welcome article stays as written in article.html
    setText("articleTitle", "Loading…"); setText("articleCategory", "");
    setText("articleByline", ""); $("articleBody").innerHTML = "<p>Loading story…</p>";
    const cover = $("articleCover"); if (cover) cover.hidden = true;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const { data, error } = await db.from("articles").select("*").eq("status", "published").eq(isUuid ? "id" : "slug", key).maybeSingle();
    if (error) throw error;
    if (!data) return notFound("This story could not be found. It may have been moved or unpublished.");
    setText("articleTitle", data.title);
    setText("articleCategory", String(data.category || "Journal").toUpperCase());
    setText("articleByline", (data.author || "JOZI 100 EDITORIAL DESK").toUpperCase() + " · " + fmt(data.published_at || data.created_at).toUpperCase());
    const img = safeUrl(data.cover_image_url);
    if (cover) { if (img) { cover.src = img; cover.alt = data.title || ""; cover.hidden = false; } else cover.hidden = true; }
    $("articleBody").innerHTML = renderBody(data.content);
    document.title = data.title + " | JOZI 100 Journal";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", data.excerpt || snippet(data.content, 150));
  }
  async function showInterview(id) {
    setText("articleTitle", "Loading…"); setText("articleCategory", "INTERVIEW");
    setText("articleByline", ""); $("articleBody").innerHTML = "<p>Loading interview…</p>";
    const cover = $("articleCover"); if (cover) cover.hidden = true;
    const { data, error } = await db.from("interviews").select("*").eq("status", "published").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return notFound("This interview could not be found. It may have been moved or unpublished.");
    setText("articleTitle", data.interviewee_name);
    setText("articleByline", (data.position || "THE JOZI 100 INTERVIEW").toUpperCase());
    const img = safeUrl(data.image_url);
    if (cover) { if (img) { cover.src = img; cover.alt = data.interviewee_name || ""; cover.hidden = false; } else cover.hidden = true; }
    $("articleBody").innerHTML = (data.introduction ? "<p><em>" + esc(data.introduction) + "</em></p>" : "") + renderBody(data.content);
    document.title = data.interviewee_name + " | JOZI 100 Journal";
  }
  function notFound(message) {
    setText("articleTitle", "Story not found"); setText("articleCategory", "JOZI 100 JOURNAL"); setText("articleByline", "");
    const cover = $("articleCover"); if (cover) cover.hidden = true;
    $("articleBody").innerHTML = "<p>" + esc(message) + "</p><p><a class='text-link' href='index.html#latest'>Return to the latest stories ↗</a></p>";
  }

  // ---------- run ----------
  if (!db) { console.warn("Supabase is not available; showing built-in content only."); return; }
  const safely = (label, fn) => fn().catch(e => {
    console.warn("Could not load " + label + ".", e);
    if (label === "article" && $("articleBody")) notFound("We could not load this story right now. Please check your connection and try again.");
  });
  safely("articles", loadArticles);
  safely("schools", loadSchools);
  safely("recognition", loadRecognition);
  safely("interviews", loadInterviews);
  safely("article", loadArticlePage);
})();
