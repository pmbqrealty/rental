/* =========================================================
   BQ Realty · Bill Qin PM Team — shared site script
   (language switch, listings, forms, modals, motion)
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.BQ_CONFIG || {};
  const ZH = window.BQ_I18N_ZH || {};
  const TXT = window.BQ_TXT || { en: {}, zh: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  /* ---------------- Language ---------------- */
  let lang = store.get("bq_lang") === "zh" ? "zh" : "en";
  const t = (k) => (TXT[lang] && TXT[lang][k]) || TXT.en[k] || k;

  // remember the English original of every translatable node
  $$("[data-i18n]").forEach((el) => { el.dataset.en = el.textContent; });
  $$("[data-i18n-html]").forEach((el) => { el.dataset.enHtml = el.innerHTML; });
  $$("[data-i18n-ph]").forEach((el) => { el.dataset.enPh = el.getAttribute("placeholder") || ""; });

  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => { el.textContent = lang === "zh" && ZH[el.dataset.i18n] ? ZH[el.dataset.i18n] : el.dataset.en; });
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = lang === "zh" && ZH[el.dataset.i18nHtml] ? ZH[el.dataset.i18nHtml] : el.dataset.enHtml; });
    $$("[data-i18n-ph]").forEach((el) => { el.setAttribute("placeholder", lang === "zh" && ZH[el.dataset.i18nPh] ? ZH[el.dataset.i18nPh] : el.dataset.enPh); });
    $$(".lang button").forEach((b) => b.classList.toggle("is-on", b.dataset.lang === lang));
    renderListings();
    document.dispatchEvent(new CustomEvent("bq:lang", { detail: lang }));
  }
  $$(".lang button").forEach((b) => b.addEventListener("click", () => { lang = b.dataset.lang; store.set("bq_lang", lang); applyLang(); }));

  /* ---------------- Header & menu ---------------- */
  const header = $("#header");
  const onScroll = () => { if (header && !header.classList.contains("header--static")) header.classList.toggle("is-solid", window.scrollY > 40); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const menuBtn = $("#menuBtn");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $$("#nav a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("menu-open")));
  }
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- Reveal on scroll ---------------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;
  const watch = (root = document) => $$(".reveal:not(.is-in)", root).forEach((el) => io ? io.observe(el) : el.classList.add("is-in"));
  watch();

  /* ---------------- Modals ---------------- */
  let lastFocus = null;
  function openModal(id) {
    const m = document.getElementById(id); if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add("is-open"); m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const f = m.querySelector("input:not([type=hidden]):not(.hp), button.modal__close"); if (f) setTimeout(() => f.focus(), 60);
  }
  function closeModal(m) {
    m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]"); if (o) { e.preventDefault(); openModal(o.dataset.open); }
    const c = e.target.closest("[data-close]"); if (c) closeModal(c.closest(".modal"));
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal.is-open").forEach(closeModal); });

  /* ---------------- Listings ---------------- */
  let LISTINGS = null;
  const houseSVG = '<svg viewBox="0 0 100 80" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 76h80M18 76V38L50 12l32 26v38M12 42L50 12l38 30"/><path d="M42 76V56h16v20"/><rect x="25" y="46" width="11" height="11"/><rect x="64" y="46" width="11" height="11"/></svg>';

  function ghRepo() {
    if (CFG.GITHUB_OWNER && CFG.GITHUB_REPO) return { owner: CFG.GITHUB_OWNER, repo: CFG.GITHUB_REPO };
    const h = location.hostname;
    if (!/\.github\.io$/i.test(h)) return null;
    const owner = h.split(".")[0];
    const seg = location.pathname.split("/").filter(Boolean)[0];
    const repo = seg && !/\.html?$/i.test(seg) ? seg : `${owner}.github.io`;
    return { owner, repo };
  }

  async function findFolders(dir) {
    const gh = ghRepo();
    if (gh) {
      try {
        const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${dir}`, { headers: { Accept: "application/vnd.github+json" } });
        if (r.ok) {
          const items = await r.json();
          return items.filter((i) => i.type === "dir" && !i.name.startsWith("_")).map((i) => i.name);
        }
      } catch (e) { /* fall through to index.json */ }
    }
    try {
      const r = await fetch(`${dir}/index.json`, { cache: "no-store" });
      if (r.ok) return (await r.json()).filter((n) => !String(n).startsWith("_"));
    } catch (e) { /* none */ }
    return [];
  }

  async function loadListings() {
    if (!$("#listingGrid")) return;
    if (Array.isArray(window.BQ_PREVIEW_LISTINGS)) { LISTINGS = window.BQ_PREVIEW_LISTINGS; renderListings(); return; }
    const dir = CFG.LISTINGS_DIR || "listings";
    const folders = await findFolders(dir);
    const loaded = await Promise.all(folders.map(async (f) => {
      try {
        const r = await fetch(`${dir}/${f}/listing.json`, { cache: "no-store" });
        if (!r.ok) return null;
        const d = await r.json();
        d._dir = `${dir}/${f}`; d._id = f;
        return d;
      } catch (e) { return null; }
    }));
    // past leased homes kept in one file: listings/leased.json
    let history = [];
    try {
      const r = await fetch(`${dir}/leased.json`, { cache: "no-store" });
      if (r.ok) history = (await r.json()).filter((d) => d && d.city).map((d, i) => Object.assign({ status: "leased", _id: "past-" + i }, d, { status: "leased" }));
    } catch (e) { /* no history file */ }
    LISTINGS = loaded.filter(Boolean).concat(history);
    renderListings();
  }

  const money = (v) => { const n = Number(String(v).replace(/[^0-9.]/g, "")); return n ? "$" + n.toLocaleString("en-US") : esc(v); };
  const status = (d) => String(d.status || "").trim().toLowerCase();
  const photoSrc = (d) => d.photo ? (/^(https?:|data:)/.test(d.photo) || !d._dir ? d.photo : `${d._dir}/${d.photo}`) : "";
  function bedsLine(d) {
    const parts = [];
    if (d.beds != null && d.beds !== "") parts.push(isNaN(d.beds) ? esc(d.beds) : `${esc(d.beds)} ${t("beds")}`);
    if (d.baths != null && d.baths !== "") parts.push(`${esc(d.baths)} ${t("baths")}`);
    if (d.sqft) parts.push(`${Number(d.sqft).toLocaleString("en-US")} ${t("sqft")}`);
    return parts;
  }

  function fmtMonth(v) {
    const m = /^(\d{4})-(\d{1,2})/.exec(String(v || ""));
    if (!m) return v || "";
    if (lang === "zh") return `${m[1]} 年 ${Number(m[2])} 月`;
    return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
  }
  const TYPE_ZH = { "Single Family": "独立屋", "Townhouse": "联排别墅", "Condo": "公寓", "Apartment": "公寓" };
  const CITY_ZH = { "San Jose": "圣何塞", "Palo Alto": "帕洛阿尔托", "Los Gatos": "洛斯加托斯", "Dublin": "都柏林", "Sunnyvale": "桑尼维尔", "Santa Clara": "圣克拉拉", "Milpitas": "米尔皮塔斯", "Fremont": "弗里蒙特", "Cupertino": "库比蒂诺", "Mountain View": "山景城", "San Francisco": "旧金山" };
  const cityTxt = (c) => (lang === "zh" && CITY_ZH[c] ? `${CITY_ZH[c]} ${c}` : c);
  function renderListings() {
    const grid = $("#listingGrid"); if (!grid || !LISTINGS) return;
    const avail = LISTINGS.filter((d) => status(d) === "available");
    const leased = LISTINGS.filter((d) => status(d) === "leased")
      .sort((a, b) => String(b.leased_date || "").localeCompare(String(a.leased_date || "")));

    grid.innerHTML = avail.map((d, i) => {
      const img = photoSrc(d);
      const meta = bedsLine(d).map((p) => `<span>${p}</span>`).join("");
      const title = d.title || d.type || "";
      const href = d._dir ? `${d._dir}/` : "#";
      return `<article class="card reveal${i % 3 ? " reveal-d" + (i % 3) : ""}">
        <a href="${esc(href)}" class="card__media" aria-label="${esc(title || d.city)}">
          ${img ? `<img src="${esc(img)}" alt="${esc(title)} · ${esc(d.city)}" loading="lazy" onerror="this.remove()">` : ""}
          <div class="card__ph" style="${img ? "z-index:-1" : ""}">${houseSVG}</div>
          <span class="badge">${t("available")}${d.available ? " · " + esc(d.available) : ""}</span>
          ${d._sample ? `<span class="badge badge--sample">${t("sample")}</span>` : ""}
        </a>
        <div class="card__body">
          <span class="card__city">${esc(d.city)}</span>
          <h3 class="card__title">${esc(title)}</h3>
          <div class="card__meta">${meta}</div>
          <div class="card__foot">
            <div class="card__rent">${d.rent ? money(d.rent) : ""}<small>${d.rent ? t("perMonth") : ""}</small></div>
            <div class="card__actions">
              <a href="${esc(href)}" class="btn btn--sm">${t("details")}</a>
              <button type="button" class="btn btn--sm btn--solid" data-inquire="${esc(d._id || "")}">${t("inquire")}</button>
            </div>
          </div>
        </div>
      </article>`;
    }).join("");
    const empty = $("#listingEmpty"); if (empty) empty.hidden = avail.length > 0;

    const rentSec = $("#rentals"); if (rentSec) rentSec.hidden = avail.length === 0;
    const pathRent = $("#pathRent");
    if (pathRent) { if (avail.length) { pathRent.setAttribute("href", "#rentals"); pathRent.removeAttribute("data-inquire"); } else { pathRent.setAttribute("href", "#"); pathRent.setAttribute("data-inquire", ""); } }

    const sec = $("#leased"), lg = $("#leasedGrid");
    if (sec && lg) {
      sec.hidden = leased.length === 0;
      const SHOW = 6, MAX = 18;
      const open = lg.dataset.open === "1";
      lg.innerHTML = leased.slice(0, MAX).map((d, i) => {
        const img = photoSrc(d);
        const days = Number(d.days_to_lease);
        const typeTxt = d.type ? (lang === "zh" && TYPE_ZH[d.type] ? TYPE_ZH[d.type] : d.type) : "";
        const meta = [d.zip ? "CA " + esc(d.zip) : "", esc(typeTxt), bedsLine(d).slice(0, 2).join(" / ")].filter(Boolean).join(" · ");
        return `<article class="lcard reveal${i % 3 ? " reveal-d" + (i % 3) : ""}"${i >= SHOW && !open ? " hidden" : ""}>
          <div class="lcard__media">${img ? `<img src="${esc(img)}" alt="${esc(d.city)}" loading="lazy">` : `<div class="card__ph">${houseSVG}</div>`}<span class="lcard__tag">${t("leased")}</span></div>
          <div class="lcard__body">
            <div><div class="lcard__city">${esc(cityTxt(d.city))}</div><div class="lcard__meta">${meta}</div></div>
            ${days ? `<div class="lcard__days"><b>${days}</b><span>${days == 1 ? t("day") : t("days")}</span></div>` : ""}
          </div>
        </article>`;
      }).join("");
      const more = $("#leasedMore");
      if (more) more.hidden = open || leased.length <= SHOW;
      // stats
      const ds = leased.map((d) => Number(d.days_to_lease)).filter((n) => n > 0);
      if (ds.length) {
        const avg = $("#statAvg"), fast = $("#statFast");
        if (avg) avg.textContent = Math.round(ds.reduce((a, b) => a + b, 0) / ds.length);
        if (fast) fast.textContent = Math.min.apply(null, ds);
      }
    }
    watch(document);
  }

  // Inquiry buttons → showing modal pre-filled with the home
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-inquire]"); if (!b) return;
    const id = b.dataset.inquire;
    const d = (LISTINGS || []).find((x) => x._id === id);
    const m = $("#inquiryModal"); if (!m) return;
    const label = d ? [d.title || d.type, d.city, bedsLine(d).slice(0, 2).join(" / ")].filter(Boolean).join(" · ") : "";
    m.querySelector("[name=listing_id]").value = id || "";
    m.querySelector("[name=listing_label]").value = label;
    $("#inqHome").textContent = label;
    openModal("inquiryModal");
  });

  const lm = $("#leasedMore");
  if (lm) lm.addEventListener("click", () => { const g = $("#leasedGrid"); g.dataset.open = "1"; renderListings(); });
  const rm = $("#reviewMore");
  if (rm) rm.addEventListener("click", () => { $("#reviewGrid").classList.add("is-open"); rm.hidden = true; });

  /* ---------------- Reviews scroller ---------------- */
  $$("[data-scroll]").forEach((b) => b.addEventListener("click", () => {
    const tr = $("#reviewTrack"); if (!tr) return;
    const card = tr.querySelector(".review");
    tr.scrollBy({ left: Number(b.dataset.scroll) * ((card ? card.offsetWidth : 320) + 24), behavior: "smooth" });
  }));

  /* ---------------- Files: compress photos, max count ---------------- */
  const MAX_FILE_MB = 5;
  function compressImage(file, maxSide = 1600, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ name: file.name.replace(/\.[^.]+$/, "") + ".jpg", type: "image/jpeg", data: c.toDataURL("image/jpeg", quality).split(",")[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }
  function readRaw(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: file.name, type: file.type, data: String(r.result).split(",")[1] });
      r.onerror = reject; r.readAsDataURL(file);
    });
  }
  async function collectFiles(form) {
    const out = [];
    for (const input of $$("input[type=file]", form)) {
      const max = Number(input.dataset.max || 3);
      for (const f of Array.from(input.files || []).slice(0, max)) {
        if (/^image\//.test(f.type)) { try { out.push(await compressImage(f)); } catch (e) { /* skip unreadable image */ } }
        else if (f.type === "application/pdf" && f.size <= MAX_FILE_MB * 1048576) out.push(await readRaw(f));
      }
    }
    return out;
  }

  /* ---------------- Forms → Google Apps Script ---------------- */
  function showMsg(form, text, isError) {
    const box = $(".form__msg", form); if (!box) return;
    box.textContent = text; box.classList.toggle("is-error", !!isError); box.classList.add("is-on");
  }
  function visibleRequiredOK(form) {
    for (const el of $$("[required]", form)) {
      if (el.closest("[hidden]") || el.disabled) continue;
      if (el.type === "radio") {
        if (!form.querySelector(`input[name="${el.name}"]:checked`)) { el.closest("label").scrollIntoView({ behavior: "smooth", block: "center" }); return t("pickType"); }
        continue;
      }
      if (!String(el.value || "").trim()) { el.focus(); return t("required"); }
      if (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) { el.focus(); return t("badEmail"); }
    }
    return "";
  }

  $$("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bad = visibleRequiredOK(form); if (bad) { showMsg(form, bad, true); return; }
      const btn = $("button[type=submit]", form);
      const label = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.textContent = t("sending"); }

      const data = {};
      new FormData(form).forEach((v, k) => {
        if (v instanceof File) return;
        if (form.querySelector(`[name="${k}"]`)?.closest("[hidden]")) return;
        data[k] = data[k] ? data[k] + ", " + v : v;
      });
      const honeypot = data.website; delete data.website;
      const payload = { form: form.dataset.form, type: data.request_type || form.dataset.form, lang, page: location.pathname, submitted_at: new Date().toISOString(), fields: data, files: [] };

      try {
        if (honeypot) { /* bot: pretend success */ }
        else if (!CFG.APPS_SCRIPT_URL) { await new Promise((r) => setTimeout(r, 600)); showMsg(form, t("demo")); restore(); return; }
        else {
          payload.files = await collectFiles(form);
          await fetch(CFG.APPS_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
        }
        form.reset();
        form.dispatchEvent(new Event("bq:reset"));
        showMsg(form, t("ok"));
      } catch (err) {
        showMsg(form, t("err"), true);
      }
      restore();
      function restore() { if (btn) { btn.disabled = false; btn.innerHTML = label; } }
    });
  });


  /* ---------------- Request forms: tabs, conditional fields, files ---------------- */
  function typeOf(form) {
    const r = form.querySelector("input[type=radio][name=request_type]:checked");
    if (r) return r.value;
    const el = form.querySelector("[name=request_type]:not([type=radio])");
    return el ? el.value : "";
  }
  function updateShows(form) {
    const type = typeOf(form);
    $$("[data-show]", form).forEach((el) => { el.hidden = !el.dataset.show.split("|").includes(type); });
    const plan = form.querySelector("[name=plan]:checked");
    $$("[data-plan]", form).forEach((el) => { if (!el.hidden) el.hidden = !plan || plan.value !== el.dataset.plan; });
    const urgent = form.querySelector("[name=urgency]:checked");
    const hint = $("#urgentHint", form); if (hint) hint.hidden = !(urgent && urgent.value === "Urgent") || type !== "Service Request";
    // owner page: step 3 title follows the chosen card
    const body = $(".owner-body", form);
    if (body) {
      body.classList.toggle("is-waiting", !type);
      const title = $("#ownerTypeTitle"), sub = $("#ownerTypeHint");
      const card = form.querySelector("input[name=request_type]:checked");
      const strong = card ? card.parentNode.querySelector("strong") : null;
      if (title) {
        if (strong) { title.dataset.i18n = strong.dataset.i18n; title.dataset.en = strong.dataset.en || strong.textContent; title.textContent = strong.textContent; }
        else { title.dataset.i18n = "ow.s3"; title.dataset.en = "Request details"; title.textContent = lang === "zh" && ZH["ow.s3"] ? ZH["ow.s3"] : "Request details"; }
      }
      if (sub) sub.hidden = !!type;
    }
  }
  function setTab(type, scroll) {
    const form = $("form[data-form=tenant]"); if (!form) return;
    const btn = $$(".tab").find((b) => b.dataset.tab === type); if (!btn) return;
    $$(".tab").forEach((b) => { const on = b === btn; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on); });
    form.querySelector("[name=request_type]").value = type;
    const title = $("#formTitle"), label = btn.querySelector("span");
    if (title && label) { title.dataset.i18n = label.dataset.i18n; title.dataset.en = label.dataset.en || label.textContent; title.textContent = label.textContent; }
    const msg = $(".form__msg", form); if (msg) msg.classList.remove("is-on");
    updateShows(form);
    if (scroll && window.innerWidth < 960) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const tabSlug = { service: "Service Request", moveout: "Move-out / Renewal", renewal: "Move-out / Renewal", update: "Update My Info", contact: "Contact Us" };
  $$(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab, true)));
  $$("[data-urgent]").forEach((b) => b.addEventListener("click", () => {
    setTab("Service Request");
    const form = $("form[data-form=tenant]"); if (!form) return;
    const u = form.querySelector("[name=urgency][value=Urgent]"); if (u) { u.checked = true; updateShows(form); }
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { const n = form.querySelector("[name=name]"); if (n) n.focus({ preventScroll: true }); }, 500);
  }));
  if ($(".tab")) { const h = location.hash.replace("#", "").toLowerCase(); setTab(tabSlug[h] || "Service Request", false); }

  $$("form[data-form]").forEach((form) => {
    form.addEventListener("change", (e) => {
      if (!e.target.matches("[name=request_type], [name=plan], [name=urgency]")) return;
      updateShows(form);
      if (e.target.type === "radio" && e.target.name === "request_type" && window.innerWidth < 960) {
        const body = $(".owner-body", form); if (body) setTimeout(() => body.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      }
    });
    form.addEventListener("bq:reset", () => { const tab = $(".tab.is-on"); if (tab) setTab(tab.dataset.tab); else updateShows(form); $$(".thumbs", form).forEach((t) => (t.innerHTML = "")); });
    updateShows(form);
  });

  // file pickers: keep a list, show thumbnails, enforce limits
  $$("input[type=file]").forEach((input) => {
    const max = Number(input.dataset.max || 3);
    const box = input.closest(".field").querySelector(".thumbs");
    let picked = [];
    const sync = () => {
      const dt = new DataTransfer(); picked.forEach((f) => dt.items.add(f)); input.files = dt.files;
      if (!box) return;
      box.innerHTML = "";
      picked.forEach((f, i) => {
        const d = document.createElement("div"); d.className = "thumb";
        if (/^image\//.test(f.type)) d.style.backgroundImage = `url(${URL.createObjectURL(f)})`; else d.textContent = f.name;
        const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Remove");
        x.addEventListener("click", () => { picked.splice(i, 1); sync(); });
        d.appendChild(x); box.appendChild(d);
      });
    };
    input.addEventListener("change", () => {
      const form = input.form;
      const add = Array.from(input.files || []).filter((f) => !picked.includes(f));
      for (const f of add) {
        if (f.type === "application/pdf" && f.size > 5 * 1048576) { showMsg(form, t("pdfBig"), true); continue; }
        if (!/^image\//.test(f.type) && f.type !== "application/pdf") continue;
        if (picked.length >= max) { showMsg(form, t("tooMany"), true); break; }
        picked.push(f);
      }
      sync();
    });
    input.form && input.form.addEventListener("bq:reset", () => { picked = []; sync(); });
    const drop = input.closest(".drop");
    if (drop) {
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.add("is-over")));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("is-over")));
    }
  });

  /* ---------------- Start ---------------- */
  window.BQ = { openModal, t, get lang() { return lang; } };
  loadListings().then(applyLang);
})();
