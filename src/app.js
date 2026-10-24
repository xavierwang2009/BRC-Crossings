/* BRC Crossings — app shell: state, screens and actions.
   Screens are plain functions of state that return markup, so each maps to a React
   component in the next step. The 3D Companion lives in companion3d.js. */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const params = new URLSearchParams(location.search);

const S = {
  lang: "en", screen: "onboard", step: 0, stack: [],
  age: false, terms: false, optMatch: false, optJournal: false,
  focuses: [], mainFocus: null, state: null, species: "otter", petName: "Pebble",
  seeds: 20, earnedToday: 0, persona: "anon", replyPersona: "anon", draft: "", draftFocus: "parenting",
  mood: null, tags: [], note: "", checkedIn: false, shareMood: false, showCircles: false, showFriends: false,
  match: null, dm: [], dmDraft: "", joined: ["c1"], owned: [], wear: [], helpful: {}, translated: {}, seen: {},
  posts: POSTS.map(p => ({ ...p, replies: p.replies.map(r => ({ ...r })) })), thread: null, circle: null,
  crisis: null, toast: null, posted: false, replyDraft: "", breathing: false, petHinted: false, timeOverride: null, enter: null,
};

/* ---------- helpers ---------- */
function t(k, vars = {}) { const e = I18N[k]; let s = e ? (e[S.lang] || e.en) : k; for (const v in vars) s = s.split(`{${v}}`).join(vars[v]); return s; }
const L = o => (o ? o[S.lang] || o.en : "");
const focusName = id => L(FOCUS.find(f => f.id === id) || FOCUS[0]);
const stateName = id => L(STATES.find(s => s.id === id) || {});
const species = id => SPECIES.find(s => s.id === id) || SPECIES[0];
const counselor = id => COUNSELORS.find(c => c.id === id);
const licensedHere = () => !!S.state && !["OTHER", "INTL"].includes(S.state);
const initials = n => n.split(/[ ,]/).filter(Boolean).slice(0, 2).map(w => w[0]).join("");
const zhTag = () => (S.lang === "hs" ? "zh-Hans" : "zh-Hant");
const ago = a => (a ? t(a[1] === "h" ? "ago_h" : "ago_d", { n: a[0] }) : t("ago_now"));
const hueFor = name => ["#3c6b4a", "#17616d", "#a8361f", "#6b4c00", "#5b4a8c"][[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 5];
const suggestions = () => COUNSELORS.filter(c => !c.full && c.states.includes(S.state))
  .sort((a, b) => (b.focus.includes(S.mainFocus) - a.focus.includes(S.mainFocus))
    || (b.focus.filter(f => S.focuses.includes(f)).length - a.focus.filter(f => S.focuses.includes(f)).length)
    || ((S.lang !== "en") * (b.zh - a.zh))).slice(0, 3);
function earn(n) { const got = Math.max(0, Math.min(n, 25 - S.earnedToday)); S.seeds += got; S.earnedToday += got; return got; }
function toast(msg, ic = "seed") { S.toast = { msg, ic, id: Date.now() }; }
function go(screen, extra = {}) { S.stack.push({ screen: S.screen, thread: S.thread, circle: S.circle }); Object.assign(S, extra, { screen, breathing: false }); render(true); }
function back() { const prev = S.stack.pop() || { screen: "home" }; Object.assign(S, prev, { breathing: false }); render(true); }
const isRoot = () => S.stack.length === 0;
function hour() { if (S.timeOverride != null) return S.timeOverride; const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
const skyDark = () => (world && world.sky ? world.sky.dark : (hour() < 6.5 || hour() >= 19.7));

/* ---------- icons: 24px grid, 2px stroke, round caps ---------- */
const ICONS = {
  home: '<path d="M4 11.2L12 4.5l8 6.7"/><path d="M6.2 9.6v9.9h11.6V9.6"/><path d="M10 19.5v-5h4v5"/>',
  circles: '<circle cx="9" cy="10" r="4.5"/><circle cx="15.5" cy="10" r="4.5"/><circle cx="12.2" cy="15.5" r="4.5"/>',
  ask: '<path d="M5 19.5l1.2-4.4L15.8 5.5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L9.4 18.3z"/><path d="M14 7.3l3 3"/>',
  paw: '<circle cx="6.8" cy="10.2" r="1.8"/><circle cx="10.4" cy="6.5" r="1.8"/><circle cx="14.6" cy="6.6" r="1.8"/><circle cx="17.7" cy="10.5" r="1.8"/><path d="M12.2 11.6c2.6 0 4.6 2.6 4.6 4.8 0 1.8-1.4 2.8-3 2.6-.9-.1-1.1-.6-1.6-.6s-.8.5-1.7.6c-1.6.2-3-.8-3-2.6 0-2.2 2.1-4.8 4.7-4.8z"/>',
  me: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
  learn: '<path d="M4 5.5c2.7-.8 5.4-.4 8 1.2 2.6-1.6 5.3-2 8-1.2v13c-2.7-.8-5.4-.4-8 1.2-2.6-1.6-5.3-2-8-1.2z"/><path d="M12 6.7v13"/>',
  help: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.6"/><path d="M6.2 6.2l3.2 3.2M17.8 6.2l-3.2 3.2M6.2 17.8l3.2-3.2M17.8 17.8l-3.2-3.2"/>',
  back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  chev: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  seed: '<path d="M12 20v-7"/><path d="M12 13c-.2-3.6-2.6-5.9-6.5-6 .1 3.7 2.6 6 6.5 6z"/><path d="M12 11.5c.3-3.3 2.6-5.4 6.2-5.5-.1 3.4-2.4 5.5-6.2 5.5z"/>',
  send: '<path d="M4.5 11.6L19.5 5l-5.9 14.5-2.4-6z"/><path d="M11.2 13.5l8.3-8.5"/>',
  mask: '<path d="M3.5 9c2.7-1.3 5.5-1.6 8.5-1.6s5.8.3 8.5 1.6c0 4.4-1.9 7-4.4 7-1.6 0-2.6-1.3-4.1-1.3s-2.5 1.3-4.1 1.3C5.4 16 3.5 13.4 3.5 9z"/><path d="M7.2 10.8c.8-.5 1.7-.5 2.5 0M14.3 10.8c.8-.5 1.7-.5 2.5 0"/>',
  translate: '<path d="M4 6h8M8 4.5V6M5.5 6c.6 2.8 2.5 5 5.2 6.2M10.5 6c-.6 2.8-2.5 5-5.2 6.2"/><path d="M12.5 20l3.5-8 3.5 8M13.7 17.3h4.6"/>',
  check: '<path d="M5 12.5l4.3 4.3L19 7.2"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
  hands: '<path d="M7.5 12.5l3.2-3.3a1.7 1.7 0 0 1 2.4 0l.2.2"/><path d="M4 14l3.5-3.5 4.6 4.6a1.7 1.7 0 0 1-2.4 2.4L8 15.8"/><path d="M20 14l-3.5-3.5-4.8 4.8"/><path d="M13.2 18.9l1.2-1.2"/>',
  chat: '<path d="M5 6.5h14v9H10l-4.2 3.3V15.5H5z"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  shield: '<path d="M12 3.8l7 2.6v5.2c0 4.3-3 7.6-7 8.8-4-1.2-7-4.5-7-8.8V6.4z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
  phone: '<path d="M6.5 4.5h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a1.8 1.8 0 0 1-2 1.8C10.7 18.6 5.4 13.3 4.7 6.5a1.8 1.8 0 0 1 1.8-2z"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  external: '<path d="M13.5 5.5h5v5M18.5 5.5l-8 8"/><path d="M17 14v4.5H5.5V7H10"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.3 2.3 3.4 5 3.4 8s-1.1 5.7-3.4 8c-2.3-2.3-3.4-5-3.4-8S9.7 6.3 12 4z"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  pin: '<path d="M12 20s6-5.4 6-10.2A6 6 0 0 0 6 9.8C6 14.6 12 20 12 20z"/><circle cx="12" cy="9.8" r="2.2"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  wind: '<path d="M3.5 9h10a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3.5 13.5h14a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3.5 18h6"/>',
  swap: '<path d="M7 7.5h11l-3-3M17 16.5H6l3 3"/>',
  touch: '<path d="M9 11V5.8a1.6 1.6 0 0 1 3.2 0V11"/><path d="M12.2 10.2a1.6 1.6 0 0 1 3.2 0v1.2a1.6 1.6 0 0 1 3.2 0v3.2c0 3-2.2 5.4-5.4 5.4h-.8c-2 0-3.4-.9-4.5-2.5L5.6 14a1.6 1.6 0 0 1 2.6-1.9L9 13"/>',
};
function icon(name, cls = "") {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}

/* Mood faces: soft rounded discs that match the Companion's world. */
function moodFace(m, size = 38) {
  if (!m) return "";
  const ink = "#24452f";
  const eye = (x, y) => `<circle cx="${x}" cy="${y}" r="2.1" fill="${ink}"/>`;
  const f = {
    grin: `<path d="M13 17.5q2-2.6 4 0M23 17.5q2-2.6 4 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M13 23h14q-1 6.5-7 6.5T13 23z" fill="${ink}"/>`,
    smile: `${eye(15, 17)}${eye(25, 17)}<path d="M14 23.5q6 5.5 12 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    flat: `${eye(15, 17)}${eye(25, 17)}<path d="M15 25h10" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`,
    low: `${eye(15, 18)}${eye(25, 18)}<path d="M15.5 26.5q4.5-2.6 9 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    sad: `${eye(15, 17)}${eye(25, 17)}<path d="M14.5 27q5.5-4.5 11 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M27.5 20.5q2 3 0 4.4-2-1.4 0-4.4z" fill="#3fa3b4"/>`,
    wavy: `${eye(15, 17)}${eye(25, 17)}<path d="M13.5 25.5q1.6-2 3.25 0t3.25 0 3.25 0 3.25 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    cross: `<path d="M12.5 13.5l5 2M27.5 13.5l-5 2" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>${eye(15, 18)}${eye(25, 18)}<path d="M15.5 26h9" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`,
    sleepy: `<path d="M12.5 17.5h5M22.5 17.5h5" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="25.5" r="2.4" fill="none" stroke="${ink}" stroke-width="2.2"/>`,
  }[m.face];
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><defs><radialGradient id="mg-${m.id}" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="20" cy="20.8" r="18" fill="rgba(36,69,47,.16)"/><circle cx="20" cy="19.5" r="18" fill="${m.color}"/><circle cx="20" cy="19.5" r="18" fill="url(#mg-${m.id})"/>${f}</svg>`;
}

/* ---------- 3D Companion wiring ---------- */
let world = null, worldFailed = false;
function initWorld() {
  if (world || !window.CompanionWorld) return;
  try { world = new window.CompanionWorld(); }
  catch (e) { console.warn("Companion3D unavailable", e); worldFailed = true; render(); return; }
  world.labeler = st => t("diorama_label", { pet: S.petName, species: L(species(st.species)), state: st.asleep ? t("state_asleep") : t("state_awake") });
  ["pet", "stroke", "hug", "wake"].forEach(e => world.on(e, () => { if (!S.petHinted) { S.petHinted = true; document.querySelector(".hint")?.remove(); } }));
  syncWorld();
  render();
}
function syncWorld() {
  if (!world) return;
  const picking = S.screen === "onboard" && S.step === 4;
  world.set({ species: S.species, mood: S.checkedIn ? S.mood : null, asleep: !S.checkedIn && !picking, wear: S.wear, timeOverride: S.timeOverride });
}
function mountStage() {
  const el = document.querySelector("[data-stage]");
  if (!el) return;
  if (world) { world.attach(el, S.breathing ? "breathe" : el.dataset.stage); return; }
  const h = hour();
  el.style.background = h < 6.5 || h >= 19.7 ? "linear-gradient(180deg,#1b2446,#363f73)" : "linear-gradient(180deg,#7dc4ed,#d6f0ff)";
  if (worldFailed && !el.querySelector(".fallback")) el.insertAdjacentHTML("afterbegin", `<div class="fallback">${t("three_d_off")}</div>`);
}
function thumb(sp, item) {
  if (world) { try { return `<img src="${world.thumb(sp, item)}" alt="">`; } catch (e) { /* fall through */ } }
  return `<span style="color:var(--forest)">${icon(item ? "star" : "paw")}</span>`;
}

/* ---------- shared pieces ---------- */
function helpBtn() { return `<button class="help" data-a="crisis" aria-label="${t("help_now")}">${icon("help")}${t("help")}</button>`; }
function seedsBtn() { return `<button class="seeds" data-a="go" data-v="shop" aria-label="${t("seeds_label", { n: S.seeds })}">${icon("seed")}${S.seeds}</button>`; }
function hdrMain() {
  return `<header class="hdr"><div class="hdr-row"><span class="mark" aria-hidden="true"></span>
    <span class="wordmark">BRC Crossings<small lang="zh-Hant">同渡</small></span><span class="spacer"></span>${seedsBtn()}${helpBtn()}</div></header>`;
}
function hdrRoot(title) { return `<header class="hdr"><div class="hdr-row" style="padding-left:var(--gut)"><span class="hdr-title">${title}</span>${seedsBtn()}${helpBtn()}</div></header>`; }
function hdrSub(title) {
  return `<header class="hdr"><div class="hdr-row" style="padding-left:6px"><button class="icon-btn" data-a="back" aria-label="${t("back")}">${icon("back")}</button>
    <span class="hdr-title">${title}</span>${helpBtn()}</div></header>`;
}
function tabs(active) {
  const tab = (id, ic, label) => `<button class="${active === id ? "on" : ""}" data-a="tab" data-v="${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span></button>`;
  return `<nav class="tabs" aria-label="Main">${tab("home", "home", t("home"))}${tab("circles", "circles", t("circles"))}
    <button class="fab" data-a="go" data-v="compose"><span class="disc">${icon("ask")}</span><span>${t("ask")}</span></button>
    ${tab("companion", "paw", t("companion"))}${tab("me", "me", t("me"))}</nav>`;
}
function avatar(name, anon) {
  return anon ? `<span class="av anon">${icon("mask")}</span>` : `<span class="av" style="background:${hueFor(name)}">${esc(initials(name))}</span>`;
}
function textFor(obj, orig, tr) {
  if (typeof obj === "string") return { text: obj, lang: orig === "zh" ? zhTag() : "en" };
  if (orig === "zh") return S.lang === "en" ? (tr ? { text: obj.en, lang: "en" } : { text: obj.ht, lang: "zh-Hant" }) : { text: obj[S.lang], lang: zhTag() };
  return S.lang !== "en" && tr ? { text: obj[S.lang], lang: zhTag() } : { text: obj.en, lang: "en" };
}
function postPanel(p, o = {}) {
  const canTr = !p.mine && (p.orig === "zh") === (S.lang === "en");
  const tr = canTr && S.translated[p.id];
  const body = textFor(p.text, p.orig, tr);
  const lit = (p.unseenAnswer || p.mine) && !S.seen[p.id];
  const state = p.held ? `<span class="tag held">${t("held")}</span>`
    : p.answer ? `<span class="tag ${lit ? "new" : "answer"}">${icon("shield")}${lit ? t("new_answer") : t("counselor_answered")}</span>`
    : p.mine && lit ? `<span class="tag new">${t("new")}</span>` : "";
  const helpfulOn = S.helpful[p.id];
  const c = p.answer ? counselor(p.answer.by) : null;
  const ans = p.answer ? textFor(p.answer.text, "en", tr) : null;
  const n = p.replies.filter(r => !r.held || r.mine).length;
  return `<article class="post ${lit && !o.full ? "lit" : ""} ${S.enter === p.id ? "enter" : ""}">
    <div class="post-head">${avatar(p.author, p.anon)}<div class="who"><b>${esc(p.anon ? t("anonymous") : p.author)}</b><span>${ago(p.ago)} · ${focusName(p.focus)}</span></div>${state}</div>
    <div class="post-body" ${o.full ? "" : `data-a="thread" data-v="${p.id}" style="cursor:pointer"`}><p lang="${body.lang}">${esc(body.text)}</p>
      ${tr ? `<span class="tr-note">${icon("translate")}${t("machine_tr")}</span>` : ""}</div>
    ${ans && (o.full || o.preview) ? `<div class="answer"><div class="by">${icon("shield")}${esc(c.name)}<span>· ${t("counselor")}</span></div><p lang="${ans.lang}">${esc(o.full ? ans.text : ans.text.split(/(?<=[.。])\s*/)[0])}</p>${o.full ? `<span class="disc">${t("not_therapy")}</span>` : ""}</div>` : ""}
    <div class="post-foot">
      <button class="act ${helpfulOn ? "on" : ""}" data-a="helpful" data-v="${p.id}" aria-pressed="${!!helpfulOn}">${icon("heart")}${t("helpful")} · ${p.helpful + (helpfulOn ? 1 : 0)}</button>
      <button class="act" data-a="thread" data-v="${p.id}">${icon("chat")}${n === 1 ? t("reply_1") : t("replies_n", { n })}</button>
      ${canTr ? `<button class="act" data-a="translate" data-v="${p.id}" style="margin-left:auto">${icon("translate")}${tr ? t("show_original") : t("translate")}</button>` : ""}
    </div></article>`;
}
const feedList = () => S.posts.map(p => postPanel(p, { preview: true })).join("");
function guideCard() {
  const g = S.match ? counselor(S.match) : null;
  const sub = g ? `${t("my_guide")} · ${g.langs}` : !licensedHere() ? t("oos_title") : S.optMatch ? t("guide_sub") : t("matching_off_title");
  return `<button class="guide" data-a="go" data-v="${g ? "dm" : "guide"}"><span class="av" style="${g ? `background:${g.hue}` : ""}">${g ? initials(g.name) : icon("shield")}</span>
    <span class="t"><b>${g ? esc(g.name) : t("find_guide")}</b><span>${sub}</span></span>${icon(g ? "chat" : "chev")}</button>`;
}

/* ---------- onboarding ---------- */
function onboarding() {
  const st = S.step;
  if (st === 0) return `<div class="welcome">
      <div class="over"><div class="langpick" role="group" aria-label="${t("language")}">${[["en", "EN"], ["ht", "繁"], ["hs", "简"]].map(([l, n]) => `<button class="${S.lang === l ? "on" : ""}" data-a="lang" data-v="${l}" aria-pressed="${S.lang === l}">${n}</button>`).join("")}</div>${helpBtn()}</div>
      <section class="stage welcome" data-stage="welcome"></section>
      <div class="body"><div class="brand"><span class="mark" aria-hidden="true"></span><b>BRC Crossings<span lang="zh-Hant">同渡</span></b></div>
        <h1>${t("welcome_title")}</h1><p>${t("welcome_sub")}</p>
        <button class="btn sun block" data-a="next">${t("get_started")}</button>
        <button class="btn ghost block" data-a="signin">${t("have_account")}</button></div></div>`;
  const prog = `<div class="progress" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</div>`;
  let inner = "", ok = true;
  if (st === 1) {
    ok = S.age && S.terms;
    const chk = (k, label, req, sub = "") => `<label class="check"><input type="checkbox" data-a="flag" data-v="${k}" ${S[k] ? "checked" : ""}><span class="t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="tag ${req ? "req" : ""}" style="${req ? "" : "background:var(--mist);color:var(--ink-2)"}">${req ? t("required") : t("optional")}</span></label>`;
    inner = `<h2>${t("age_title")}</h2><p class="lede">${t("age_body")}</p>
      <div class="panel" style="margin:0;padding:2px 14px">${chk("age", t("age_18"), true)}${chk("terms", t("agree_terms"), true)}${chk("optMatch", t("optin_match"), false, t("optin_match_sub"))}${chk("optJournal", t("optin_journal"), false, t("optin_journal_sub"))}</div>`;
  } else if (st === 2) {
    ok = S.focuses.length > 0;
    inner = `<h2>${t("focus_title")}</h2><p class="lede">${t("focus_sub")}</p>
      ${FOCUS.map(f => { const on = S.focuses.includes(f.id), main = S.mainFocus === f.id;
        return `<div class="focus-opt ${on ? "on" : ""}"><button class="focus-pick" data-a="focus" data-v="${f.id}" aria-pressed="${on}"><span class="box">${on ? icon("check") : ""}</span>${L(f)}</button>
          ${on ? `<button class="star ${main ? "main" : ""}" data-a="mainFocus" data-v="${f.id}" aria-pressed="${main}" aria-label="${t("set_main")}">${icon("star")}<span>${main ? t("main") : ""}</span></button>` : ""}</div>`; }).join("")}`;
  } else if (st === 3) {
    ok = !!S.state;
    inner = `<h2>${t("state_title")}</h2><p class="lede">${t("state_sub")}</p>
      ${STATES.map(s => `<button class="opt ${S.state === s.id ? "on" : ""}" data-a="state" data-v="${s.id}" aria-pressed="${S.state === s.id}">${icon(s.id === "INTL" ? "globe" : "pin")}<span>${L(s)}</span></button>`).join("")}`;
  } else if (st === 4) {
    ok = S.petName.trim().length > 0;
    inner = `<h2>${t("companion_title")}</h2><p class="lede" style="margin-bottom:12px">${t("companion_sub")}</p>
      <section class="stage picker" data-stage="picker"></section>
      <div class="species" role="group">${SPECIES.filter(s => !s.shopOnly).map(s => `<button class="${S.species === s.id ? "on" : ""}" data-a="species" data-v="${s.id}" aria-pressed="${S.species === s.id}">${thumb(s.id)}${L(s)}</button>`).join("")}</div>
      <label class="label" for="petName">${t("name_it")}</label>
      <input class="field" id="petName" maxlength="16" value="${esc(S.petName)}" data-model="petName" autocomplete="off">`;
  }
  return `<div class="ob"><div class="ob-top"><button class="icon-btn" data-a="prev" aria-label="${t("back")}">${icon("back")}</button>${prog}${helpBtn()}</div>
    <div class="stepn">${t("step_of", { n: st })}</div>${inner}
    <div class="foot"><button class="btn primary block" data-a="next" ${ok ? "" : "disabled"}>${st === 4 ? t("enter") : t("continue")}</button></div></div>`;
}

/* ---------- screens ---------- */
function greeting() { const h = hour(); return t(h < 12 && h >= 4 ? "greet_morning" : h < 18 && h >= 12 ? "greet_afternoon" : "greet_evening", { name: "Lily" }); }
function home() {
  const m = MOODS.find(x => x.id === S.mood);
  const status = S.checkedIn ? t("feeling", { mood: L(m) }) : t("napping", { pet: esc(S.petName) });
  return `${hdrMain()}<div class="scroll">
    <section class="stage home" data-stage="home">
      <div class="stage-copy ${skyDark() ? "dark" : ""}"><h1>${greeting()}</h1><p>${status}</p></div>
      <div class="stage-cta">${S.checkedIn ? "" : `<button class="btn sun" data-a="go" data-v="companion">${icon("check")}${t("check_in")}</button>`}</div>
      ${!S.petHinted && S.checkedIn ? `<div class="hint">${icon("touch")}${t("pet_hint", { pet: esc(S.petName) })}</div>` : ""}
    </section>
    <div class="sheet-top">
      ${guideCard()}
      <button class="askfield" data-a="go" data-v="compose">${icon("ask")}${t("ask_placeholder")}</button>
      <h2 class="section-h">${t("community")}<button class="more" data-a="go" data-v="learn">${icon("learn")}${t("learn")}</button></h2>
      ${feedList()}<div style="height:8px"></div>
    </div></div>${tabs("home")}`;
}
function compose() {
  const can = S.draft.trim().length > 3;
  return `${hdrSub(t("ask_title"))}<div class="scroll pad">
    <span class="label">${t("focus_area")}</span>
    <div class="chips" style="margin-bottom:18px">${FOCUS.map(f => `<button class="chip ${S.draftFocus === f.id ? "on" : ""}" data-a="draftFocus" data-v="${f.id}" aria-pressed="${S.draftFocus === f.id}">${L(f)}</button>`).join("")}</div>
    <label class="label" for="draft">${t("ask_placeholder")}</label>
    <textarea class="field" id="draft" rows="6" placeholder="${t("ask_placeholder")}" data-model="draft">${esc(S.draft)}</textarea>
    <span class="label" style="margin-top:18px">${t("post_as")}</span>
    <div class="seg" role="group">${[["anon", "mask", t("anonymous")], ["named", "me", "Lily Z."]].map(([v, ic, lb]) => `<button class="${S.persona === v ? "on" : ""}" data-a="persona" data-v="${v}" aria-pressed="${S.persona === v}">${icon(ic)}${lb}</button>`).join("")}</div>
    <p class="muted" style="display:flex;gap:8px;margin:10px 2px 0">${icon(S.persona === "anon" ? "lock" : "me")}<span>${S.persona === "anon" ? t("anon_note") : t("named_note")}</span></p>
    <button class="btn primary block" style="margin-top:22px" data-a="post" ${can ? "" : "disabled"}>${t("post")}</button>
  </div>`;
}
function thread() {
  const p = S.posts.find(x => x.id === S.thread) || S.posts[0];
  const tr = S.translated[p.id];
  const visible = p.replies.filter(r => !r.held || r.mine);
  const who = S.replyPersona === "anon" ? t("anonymous") : "Lily Z.";
  return `${hdrSub(focusName(p.focus))}<div class="scroll"><div style="height:6px"></div>${postPanel(p, { full: true })}
    ${visible.length ? `<h2 class="section-h" style="font-size:var(--fs-m)">${visible.length === 1 ? t("reply_1") : t("replies_n", { n: visible.length })}</h2>
      <div class="list">${visible.map(r => { const tx = textFor(r.text, r.orig || "en", tr && !r.mine); const anon = r.author === "Anonymous";
        return `<div class="li" style="align-items:flex-start">${avatar(r.author, anon)}<span class="t"><b>${anon ? t("anonymous") : esc(r.author)}${r.held ? ` <span class="tag held">${t("held")}</span>` : ""}</b><span lang="${tx.lang}">${esc(tx.text)}</span></span></div>`; }).join("")}</div>` : ""}
    <div style="height:16px"></div></div>
    <div class="as-wrap"><div class="as">${icon(S.replyPersona === "anon" ? "mask" : "me")}<span>${t("replying_as", { who })}</span><button data-a="replyPersona">${icon("swap")}${t("switch_identity")}</button></div>
    <div class="composer"><input placeholder="${t("reply_placeholder")}" data-model="replyDraft" value="${esc(S.replyDraft)}" aria-label="${t("reply")}"><button class="btn primary" data-a="reply" aria-label="${t("reply")}">${icon("send")}</button></div></div>`;
}
function findHelpList() {
  if (S.state === "INTL") return `<a class="line" href="https://findahelpline.com" target="_blank" rel="noopener"><span class="t"><span class="num">${t("intl_help")}</span><small>${t("intl_help_sub")}</small></span><span class="call ext">${icon("external")}</span></a>`;
  const ids = LINES_FOR[S.state] || LINES_FOR.OTHER;
  const lines = ids.map(id => { const l = CRISIS_LINES[id]; return `<a class="line" href="tel:${l.call}" aria-label="${t("call", { n: l.n })}"><span class="t"><span class="num">${l.n}</span><small>${L(l.d)}</small></span><span class="call">${icon("phone")}</span></a>`; }).join("");
  return S.state ? lines : lines + `<a class="line" href="https://findahelpline.com" target="_blank" rel="noopener"><span class="t"><span class="num" style="font-size:var(--fs-m)">${t("intl_help")}</span><small>${t("intl_help_sub")}</small></span><span class="call ext">${icon("external")}</span></a>`;
}
function guide() {
  if (!licensedHere()) {
    return `${hdrSub(t("my_guide"))}<div class="scroll"><div style="height:14px"></div><div class="notice"><h3>${t("oos_title")}</h3><p>${t("oos_body")}</p></div>
      <h2 class="section-h">${t("find_help_near")}</h2><div style="padding:0 var(--gut)">${findHelpList()}
      <a class="line" href="https://www.psychologytoday.com/us/therapists" target="_blank" rel="noopener"><span class="t"><span class="num" style="font-size:var(--fs-m)">${t("find_counselor")}</span><small>${t("psych_today")}</small></span><span class="call ext">${icon("external")}</span></a></div></div>`;
  }
  if (!S.optMatch) {
    return `${hdrSub(t("my_guide"))}<div class="scroll"><div style="height:14px"></div><div class="notice"><h3>${t("matching_off_title")}</h3><p>${t("matching_why")}</p>
      <button class="btn primary" data-a="flagOn" data-v="optMatch">${t("matching_on")}</button></div></div>`;
  }
  const list = suggestions(), cur = S.match ? counselor(S.match) : null;
  return `${hdrSub(t("my_guide"))}<div class="scroll"><p class="pad" style="margin:0;color:var(--ink-2)">${t("guide_intro")}</p>
    ${cur ? guideCard() : ""}
    ${list.length ? list.map(c => `<article class="panel cc"><div class="cc-top"><span class="av" style="background:${c.hue};width:48px;height:48px">${initials(c.name)}</span><div><div class="nm">${esc(c.name)}</div><div class="meta">${c.langs} · ${t("licensed_in", { s: c.states.join(", ") })}</div></div></div>
      <p>${L(c.bio)}</p>${S.match === c.id ? `<span class="tag answer">${icon("check")}${t("my_guide")}</span>` : `<button class="btn quiet block" data-a="match" data-v="${c.id}">${t("choose_guide")}</button>`}</article>`).join("")
      : `<div class="notice"><h3>${t("all_full_title")}</h3><p>${t("all_full_body")}</p><button class="btn primary" data-a="toast" data-v="waitlisted">${t("waitlist")}</button></div>`}
    <div style="height:12px"></div></div>`;
}
function dm() {
  const c = counselor(S.match) || COUNSELORS[0];
  const msgs = S.dm.map(m => m.type === "book"
    ? `<div class="bookcard"><div class="top">${icon("calendar")}${t("book_title")} · ${esc(c.name.split(",")[0])}</div><p>${t("book_note")}</p>
       <a class="btn primary block" href="https://www.bridgerivercounseling.com/services" target="_blank" rel="noopener" data-a="booked">${t("book_cta")}${icon("external")}</a></div>`
    : `<div class="bubble ${m.me ? "me" : "them"}">${m.me ? "" : `<span class="from">${esc(c.name)}</span>`}${esc(m.key ? t(m.key, { me: "Lily", c: c.name.split(",")[0] }) : m.text)}</div>`).join("");
  return `${hdrSub(esc(c.name))}<div class="dm-banner">${icon("shield")}<span>${t("dm_banner")}</span></div>
    <div class="scroll" id="dmScroll"><div style="height:12px"></div>${msgs}<div style="height:8px"></div></div>
    <div class="composer"><input placeholder="${t("message_ph", { name: esc(c.name.split(" ")[0]) })}" data-model="dmDraft" value="${esc(S.dmDraft)}" aria-label="${t("message")}"><button class="btn primary" data-a="sendDm" aria-label="${t("send")}">${icon("send")}</button></div>`;
}
function companionScreen() {
  const m = MOODS.find(x => x.id === S.mood);
  const hard = S.checkedIn && HARD_MOODS.includes(S.mood);
  const sp = L(species(S.species));
  const checkin = S.checkedIn
    ? `<div class="panel tray in" style="display:flex;gap:14px;align-items:center">${moodFace(m, 48)}<div style="flex:1"><b style="color:var(--forest);font:600 var(--fs-m)/1.3 var(--display)">${t("checked_in")}</b><div class="muted">${L(m)}${S.tags.length ? " · " + S.tags.map(esc).join(", ") : ""}</div></div></div>`
    : `<div class="panel tray in"><h3 class="panel-h">${t("checkin_title")}</h3>
        <div class="moods" role="group">${MOODS.map(x => `<button class="mood ${S.mood === x.id ? "on" : ""}" data-a="mood" data-v="${x.id}" aria-pressed="${S.mood === x.id}">${moodFace(x)}${L(x)}</button>`).join("")}</div>
        <span class="label" style="margin-top:18px">${t("whats_part")}</span>
        <div class="chips">${L(TAGS).map(tg => `<button class="chip ${S.tags.includes(tg) ? "on" : ""}" data-a="tag" data-v="${esc(tg)}" aria-pressed="${S.tags.includes(tg)}">${tg}</button>`).join("")}</div>
        ${S.optJournal ? `<textarea class="field" style="margin-top:14px" rows="2" placeholder="${t("note_placeholder")}" aria-label="${t("note_placeholder")}" data-model="note">${esc(S.note)}</textarea>` : `<p class="muted" style="display:flex;gap:8px;margin:14px 2px 0">${icon("lock")}<span>${t("notes_off")}</span></p>`}
        <label class="row" style="border:0;margin-top:6px"><span class="k" style="font-weight:600">${t("share_mood")}</span><input type="checkbox" class="switch" data-a="flag" data-v="shareMood" ${S.shareMood ? "checked" : ""}></label>
        <button class="btn sun block" style="margin-top:4px" data-a="checkin" ${S.mood ? "" : "disabled"}>${icon("check")}${t("check_in")}</button></div>`;
  const top = isRoot();
  return `${top ? hdrRoot(t("companion")) : hdrSub(t("companion"))}<div class="scroll" id="compScroll">
    <section class="stage companion" data-stage="companion">
      <div class="stage-copy ${skyDark() ? "dark" : ""}"><h1>${esc(S.petName)}</h1><p>${S.checkedIn ? sp : `${sp} · ${t("napping", { pet: esc(S.petName) })}`}</p></div>
      ${S.breathing ? `<div class="breathe"><div class="ring"></div><div class="say"><span>${t("breathe_in")}</span><span>${t("breathe_out")}</span></div><button class="btn quiet" data-a="breathe">${t("done")}</button></div>` : ""}
      ${!S.petHinted && !S.breathing ? `<div class="hint">${icon("touch")}${t("pet_hint", { pet: esc(S.petName) })}</div>` : ""}
    </section>
    <div class="sheet-top">
      ${hard ? `<div class="comfort">${icon("heart")}<p>${t("comfort", { pet: esc(S.petName) })}</p></div><div style="padding:0 var(--gut) var(--gap)"><button class="btn primary block" data-a="breathe">${icon("wind")}${t("breathe", { pet: esc(S.petName) })}</button></div>` : ""}
      ${checkin}
      <h2 class="section-h">${t("badges")}</h2>
      <div class="badges">${BADGES.map(b => { const on = (b.id === "first_checkin" && S.checkedIn) || (b.id === "first_post" && S.posted);
        return `<div class="badge ${on ? "earned" : ""}"><div class="b">${icon(b.icon)}</div>${L(b)}</div>`; }).join("")}</div>
      <h2 class="section-h">${t("shop")}<button class="more" data-a="go" data-v="shop">${t("see_all")}${icon("chev")}</button></h2>
      <div class="grid2">${SHOP.slice(0, 2).map(shopItem).join("")}</div>
    </div></div>${top ? tabs("companion") : ""}`;
}
function shopItem(it) {
  const own = S.owned.includes(it.id);
  const inUse = it.kind === "species" ? S.species === "fox" : S.wear.includes(it.id);
  const action = it.badge ? `<span class="tag" style="margin-left:auto;background:var(--mist);color:var(--ink-2)">${icon("lock")}${t("badge_only")}</span>`
    : own ? `<button class="btn ${inUse ? "primary" : "quiet"} sm" data-a="wear" data-v="${it.id}" aria-pressed="${inUse}">${inUse ? t("in_use") : t("use")}</button>`
    : `<button class="btn sun sm" data-a="buy" data-v="${it.id}" ${S.seeds < it.p ? "disabled" : ""}>${t("buy")}</button>`;
  const art = it.kind === "species" ? thumb("fox") : it.kind === "badge" ? thumb(S.species, "ribbon") : thumb(S.species, it.id);
  return `<div class="item ${it.badge ? "locked" : ""}"><div class="art">${art}</div><div class="nm">${L(it)}</div>
    <div class="price">${it.badge ? `<span class="muted" style="font-weight:700">${L(it.badge)}</span>` : icon("seed") + it.p}${it.badge ? "" : action}</div>${it.badge ? `<div class="price">${action}</div>` : ""}</div>`;
}
function shopScreen() {
  return `${hdrSub(t("shop"))}<div class="scroll"><div class="pad" style="display:flex;align-items:center;gap:12px"><span class="seeds" style="background:var(--forest);flex:none">${icon("seed")}${S.seeds}</span><span class="muted">${t("never_bought")}</span></div>
    <div class="grid2">${SHOP.map(shopItem).join("")}</div></div>`;
}
function circleList() {
  return `<div class="list">${CIRCLES.map(c => { const j = S.joined.includes(c.id);
    return `<div class="li"><button class="t" style="border:0;background:none;text-align:left;padding:0;min-height:44px" data-a="circle" data-v="${c.id}"><b>${esc(c.name)}</b><small>${focusName(c.focus)} · ${t("members_n", { n: c.members })}</small></button>
      <span class="lang-pill">${c.lang}</span><button class="btn ${j ? "quiet" : "primary"} sm" data-a="join" data-v="${c.id}" aria-pressed="${j}">${j ? t("joined") : t("join")}</button></div>`; }).join("")}</div>`;
}
function circlesScreen() {
  const top = isRoot();
  return `${top ? hdrRoot(t("circles")) : hdrSub(t("circles"))}<div class="scroll"><p class="pad muted" style="margin:0;display:flex;gap:8px">${icon("lock")}<span>${t("members_only")}</span></p>${circleList()}<div style="height:12px"></div></div>${top ? tabs("circles") : ""}`;
}
function circleScreen() {
  const c = CIRCLES.find(x => x.id === S.circle) || CIRCLES[0];
  const posts = S.posts.filter(p => p.focus === c.focus);
  return `${hdrSub(esc(c.name))}<div class="scroll"><p class="pad muted" style="margin:0;display:flex;gap:8px">${icon("lock")}<span>${t("members_n", { n: c.members })} · ${c.lang}</span></p>
    ${S.joined.includes(c.id) ? (posts.length ? posts.map(p => postPanel(p, { preview: true })).join("") : `<div class="notice"><p>${t("no_posts")}</p></div>`)
      : `<div class="notice"><h3>${t("join_to_see")}</h3><p>${t("members_only")}</p><button class="btn primary" data-a="join" data-v="${c.id}">${t("join")}</button></div>`}</div>`;
}
function learnScreen() {
  return `${hdrSub(t("learn"))}<div class="scroll"><p class="pad muted" style="margin:0">${t("written_by")}</p>
    <div class="list">${RESOURCES.map(r => `<button class="li" data-a="toast" data-v="article_na">${icon("learn")}<span class="t"><b>${esc(L(r.t))}</b><small>${esc(r.by)} · ${t("min_read", { n: r.min })} · ${focusName(r.f)}</small></span>${icon("chev")}</button>`).join("")}</div></div>`;
}
function meScreen() {
  const top = isRoot();
  const sw = (k, label) => `<label class="row"><span class="k">${label}</span><input type="checkbox" class="switch" data-a="flag" data-v="${k}" ${S[k] ? "checked" : ""}></label>`;
  const g = S.match ? counselor(S.match) : null;
  return `${top ? hdrRoot(t("me")) : hdrSub(t("me"))}<div class="scroll">
    <div class="pad" style="display:flex;gap:14px;align-items:center"><span class="item" style="width:92px;height:92px;padding:4px;flex:none"><span class="art" style="width:100%">${thumb(S.species, S.wear.find(w => ["hat", "scarf"].includes(w)))}</span></span>
      <div><div style="font:600 var(--fs-l)/1.2 var(--display);color:var(--forest)">Lily Z.</div><div class="muted">${esc(S.petName)} · ${L(species(S.species))}</div>
      <div class="muted" style="display:flex;gap:4px;align-items:center">${icon("star")}${focusName(S.mainFocus || "individual")}${S.focuses.length > 1 ? ` +${S.focuses.length - 1}` : ""}</div></div></div>
    <div class="panel" style="padding:2px 14px">
      <div class="row"><span class="k">${t("language")}</span><div class="chips">${[["en", "EN"], ["ht", "繁"], ["hs", "简"]].map(([l, n]) => `<button class="chip ${S.lang === l ? "on" : ""}" style="min-width:48px;justify-content:center" data-a="lang" data-v="${l}" aria-pressed="${S.lang === l}">${n}</button>`).join("")}</div></div>
      <div class="row" style="flex-wrap:wrap"><span class="k" style="flex-basis:100%">${t("location")}</span><div class="chips">${STATES.map(s => `<button class="chip ${S.state === s.id ? "on" : ""}" data-a="state" data-v="${s.id}" aria-pressed="${S.state === s.id}">${L(s)}</button>`).join("")}</div></div>
      <button class="row" style="width:100%;border:0;background:none;text-align:left;color:inherit" data-a="go" data-v="${g ? "dm" : "guide"}"><span class="k">${t("my_guide")}</span><span class="muted">${g ? esc(g.name) : ""}</span>${icon("chev")}</button>
    </div>
    <h2 class="section-h">${t("privacy")}</h2>
    <div class="panel" style="padding:2px 14px">${sw("optMatch", t("counselor_matching"))}${sw("shareMood", t("share_mood"))}${sw("showCircles", t("show_circles"))}${sw("showFriends", t("show_friends"))}${sw("optJournal", t("optin_journal"))}</div>
    <div class="pad"><button class="btn quiet block" data-a="replay">${t("replay")}</button></div></div>${top ? tabs("me") : ""}`;
}
function crisisSheet() {
  const ctx = S.crisis;
  const c = counselor(S.match) || COUNSELORS[0];
  const title = ctx === "held" ? t("held_title") : ctx === "dm" ? t("dm_held_title") : t("crisis_title");
  const body = ctx === "held" ? t("held_body") : ctx === "dm" ? t("dm_held_body", { c: c.name.split(",")[0] }) : (S.state === "INTL" ? t("crisis_note_intl") : t("crisis_note"));
  return `<div class="sheet-bg" data-a="closeCrisis"><div class="sheet" role="dialog" aria-modal="true" aria-label="${title}" data-stop>
    <div class="grab"></div><h2>${title}</h2><p>${body}</p>${findHelpList()}
    ${ctx !== "help" ? `<p class="muted" style="margin-top:10px">${S.state === "INTL" ? t("crisis_note_intl") : t("crisis_note")}</p>` : ""}
    <button class="btn quiet block" style="margin-top:6px" data-a="closeCrisis">${t("close")}</button></div></div>`;
}

/* ---------- render ---------- */
function view() {
  if (S.screen === "onboard") return onboarding();
  const map = { home, compose, thread, guide, dm, companion: companionScreen, shop: shopScreen, circles: circlesScreen, circle: circleScreen, learn: learnScreen, me: meScreen };
  return (map[S.screen] || home)();
}
let lastScreen = null;
function render(nav = false) {
  const sc = document.querySelector("#app .scroll");
  const keep = !nav && sc && lastScreen === S.screen ? sc.scrollTop : 0;
  const active = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.model : null;
  document.documentElement.dataset.lang = S.lang;
  document.documentElement.lang = S.lang === "en" ? "en" : zhTag();
  syncWorld();
  let html = view();
  if (S.crisis) html += crisisSheet();
  if (S.toast) html += `<div class="toast" role="status">${icon(S.toast.ic)}${esc(S.toast.msg)}</div>`;
  $("#app").innerHTML = html;
  const sb = $("#statusbar");
  const welcome = S.screen === "onboard" && S.step === 0;
  sb.className = "statusbar" + (welcome ? " sky" + (skyDark() ? " dark" : "") : "") + (S.screen === "onboard" && S.step > 0 ? " plain" : "");
  mountStage();
  const nsc = document.querySelector("#app .scroll");
  if (nsc) { nsc.style.scrollBehavior = "auto"; nsc.scrollTop = S.screen === "dm" ? nsc.scrollHeight : keep; nsc.style.scrollBehavior = ""; }
  if (active) { const el = document.querySelector(`[data-model="${active}"]`); if (el) { el.focus(); const v = el.value; el.value = ""; el.value = v; } }
  lastScreen = S.screen; S.enter = null;
  if (S.toast) { const id = S.toast.id; setTimeout(() => { if (S.toast && S.toast.id === id) { S.toast = null; $(".toast")?.remove(); } }, 2800); }
  renderNotes();
}

/* Prototype notes beside the phone (desktop only) */
const SCREEN_NOTES = {
  onboard: ["Help is reachable from the first screen.", "Optional consents start unticked; age and terms are required.", "Location has no default, because it gates Counselor services.", "The Companion is a live 3D model; tap the species to switch."],
  home: ["The diorama is lit by the real clock and season; weather follows today's check-in.", "Tap, stroke or hold the Companion. It naps until you check in.", "New Counselor answers stay lit until you open them.", "The Counselor guide card is on Home and in Me."],
  compose: ["Named or Anonymous for this post only.", "Risk screening matches whole phrases in English and Chinese; risky posts are held and crisis help shows immediately.", "Try “I don't want to live” to see the hold."],
  thread: ["Replies choose their own identity, defaulting to Anonymous.", "Replies are risk-screened like posts.", "Translate works both ways and is labelled."],
  guide: ["Suggestions need the matching consent, and are filtered by licensed state.", "Out-of-state Members get a referral list instead."],
  dm: ["Risky messages show crisis help instead of a booking card.", "The booking card links to the clinic website; DMs are never sent to clinic records."],
  companion: ["Pick a mood and the Companion stirs; check in to wake it with that mood's weather.", "On hard days it comforts you and offers a breathing exercise.", "Shop items appear on the 3D Companion."],
  shop: ["RiverSeeds buy accessories, seasonal items and a new species; some items are badge-only.", "Seeds can't be bought or cashed out, and there are no leaderboards."],
  circles: ["Clinic-curated Circles, one language each.", "Posts are visible to members only."],
  circle: ["Members-only posts. Stewards and Counselor drop-ins arrive in Phase 2."],
  learn: ["Starter library written by Counselors, in both languages, with human review."],
  me: ["Language, location and every privacy control in one place.", "Circles and the Friends list are hidden from Friends by default."],
};
function renderNotes() {
  const n = $("#screenName"); if (!n) return;
  const key = S.screen === "onboard" ? "onboard" : S.screen;
  n.textContent = S.screen === "onboard" ? (S.step ? `Onboarding · step ${S.step} of 4` : "Welcome") : key[0].toUpperCase() + key.slice(1);
  $("#screenNotes").innerHTML = (SCREEN_NOTES[key] || SCREEN_NOTES.home).map(x => `<li>${esc(x)}</li>`).join("");
  $("#times").innerHTML = [[null, "Live"], [7, "Morning"], [13, "Day"], [18.6, "Dusk"], [22, "Night"]].map(([h, l]) => `<button data-time="${h ?? ""}" class="${S.timeOverride === h ? "on" : ""}">${l}</button>`).join("");
  $("#stateDump").textContent = JSON.stringify({ screen: S.screen, lang: S.lang, location: S.state, counselorServices: licensedHere() ? "available" : "gated", matchingConsent: S.optMatch,
    focusAreas: S.focuses, mainFocus: S.mainFocus, riverSeeds: S.seeds, earnedToday: `${S.earnedToday}/25 cap`, checkedIn: S.checkedIn, mood: S.mood, companion: `${S.petName} (${S.species})`, wearing: S.wear,
    guide: S.match ? counselor(S.match).name : null, heldItems: S.posts.filter(p => p.held).length + S.posts.reduce((a, p) => a + p.replies.filter(r => r.held).length, 0) }, null, 2);
}

/* ---------- actions ---------- */
const actions = {
  next() {
    if (S.step < 4) { S.step++; if (S.step === 4 && world) world.anim.pop = world.time; }
    else { S.screen = "home"; S.stack = []; S.draftFocus = S.mainFocus || "individual"; toast(t("welcome_toast", { n: 20 })); }
    render(true);
  },
  prev() { S.step = Math.max(0, S.step - 1); render(true); },
  signin() { Object.assign(S, { age: true, terms: true, optMatch: true, focuses: ["parenting"], mainFocus: "parenting", state: "TX", screen: "home", stack: [] }); toast(t("sign_in_na"), "me"); render(true); },
  lang(v) { S.lang = v; render(); },
  flag(v, el) { S[v] = el.checked; render(); },
  flagOn(v) { S[v] = true; render(); },
  focus(v) {
    if (S.focuses.includes(v)) { S.focuses = S.focuses.filter(x => x !== v); if (S.mainFocus === v) S.mainFocus = S.focuses[0] || null; }
    else { S.focuses = [...S.focuses, v]; if (!S.mainFocus) S.mainFocus = v; }
    S.draftFocus = S.mainFocus || "individual"; render();
  },
  mainFocus(v) { S.mainFocus = v; S.draftFocus = v; render(); },
  state(v) { S.state = v; if (S.match && !counselor(S.match).states.includes(v)) S.match = null; render(); },
  species(v) { if (S.species === v) return; S.species = v; render(); },
  tab(v) { S.stack = []; S.screen = v; S.breathing = false; render(true); },
  go(v) { go(v); },
  back() { back(); },
  crisis() { S.crisis = "help"; render(); },
  closeCrisis() { S.crisis = null; render(); },
  thread(v) { S.seen[v] = true; go("thread", { thread: v }); },
  circle(v) { go("circle", { circle: v }); },
  translate(v) { S.translated[v] = !S.translated[v]; render(); },
  helpful(v) { S.helpful[v] = !S.helpful[v]; render(); },
  join(v) { S.joined = S.joined.includes(v) ? S.joined.filter(x => x !== v) : [...S.joined, v]; render(); },
  persona(v) { S.persona = v; render(); },
  replyPersona() { S.replyPersona = S.replyPersona === "anon" ? "named" : "anon"; render(); },
  draftFocus(v) { S.draftFocus = v; render(); },
  post() {
    const text = S.draft.trim(); if (text.length <= 3) return;
    const risky = isRisky(text);
    const p = { id: "u" + Date.now(), anon: S.persona === "anon", author: "Lily Z.", focus: S.draftFocus, ago: null, orig: S.lang === "en" ? "en" : "zh", text, answer: null, replies: [], helpful: 0, mine: true, held: risky };
    S.posts.unshift(p); S.draft = ""; S.posted = true; S.stack = []; S.screen = "home"; S.enter = p.id;
    if (risky) S.crisis = "held";
    else { const got = earn(5); toast(got ? `${t("posted")} · ${t("seeds_earned", { n: got })}` : t("posted")); }
    render(true);
  },
  reply() {
    const text = (S.replyDraft || "").trim(); if (!text) return;
    const p = S.posts.find(x => x.id === S.thread); const risky = isRisky(text);
    p.replies.push({ author: S.replyPersona === "anon" ? "Anonymous" : "Lily Z.", orig: S.lang === "en" ? "en" : "zh", text, mine: true, held: risky });
    S.replyDraft = "";
    if (risky) S.crisis = "held"; else { const got = earn(2); if (got) toast(t("seeds_earned", { n: got })); }
    render();
  },
  match(v) { S.match = v; S.dm = [{ me: false, key: "dm_hello" }]; go("dm"); },
  sendDm() {
    const text = (S.dmDraft || "").trim(); if (!text) return;
    S.dm.push({ me: true, text }); S.dmDraft = "";
    if (isRisky(text)) { S.crisis = "dm"; render(); return; }
    render();
    if (!S.dm.some(m => m.type === "book")) setTimeout(() => { S.dm.push({ me: false, key: "dm_suggest" }, { type: "book" }); if (S.screen === "dm") render(); }, 1100);
  },
  booked() { toast(t("opened_site"), "external"); setTimeout(render, 50); },
  mood(v) { S.mood = v; if (world) world.stir(); render(); },
  tag(v) { S.tags = S.tags.includes(v) ? S.tags.filter(x => x !== v) : [...S.tags, v]; render(); },
  checkin() {
    if (!S.mood) return;
    S.checkedIn = true; const got = earn(5);
    toast(t("seeds_earned", { n: got || 0 }));
    render();
    if (world) world.celebrate(HARD_MOODS.includes(S.mood));
    document.querySelector("#compScroll")?.scrollTo({ top: 0, behavior: "smooth" });
  },
  breathe() {
    S.breathing = !S.breathing;
    if (world) world.breathe(S.breathing);
    render();
    if (S.breathing) document.querySelector("#compScroll")?.scrollTo({ top: 0, behavior: "smooth" });
  },
  buy(v) {
    const it = SHOP.find(x => x.id === v); if (S.seeds < it.p) return;
    S.seeds -= it.p; S.owned.push(v);
    if (it.kind === "species") S.species = "fox"; else S.wear = [...S.wear, v];
    toast(t("got_item", { item: L(it), n: it.p })); render();
    if (world) world.anim.pop = world.time;
  },
  wear(v) {
    const it = SHOP.find(x => x.id === v);
    if (it.kind === "species") S.species = S.species === "fox" ? "otter" : "fox";
    else S.wear = S.wear.includes(v) ? S.wear.filter(x => x !== v) : [...S.wear, v];
    render(); if (world) world.anim.pop = world.time;
  },
  toast(v) { toast(t(v), v === "waitlisted" ? "check" : "learn"); render(); },
  replay() { Object.assign(S, { screen: "onboard", step: 0, stack: [] }); render(true); },
};

document.addEventListener("click", e => {
  const tb = e.target.closest("[data-time]");
  if (tb) { S.timeOverride = tb.dataset.time === "" ? null : +tb.dataset.time; render(); return; }
  const el = e.target.closest("[data-a]");
  if (!el || !el.closest("#app")) return;
  const stop = e.target.closest("[data-stop]");
  if (stop && !stop.contains(el)) return;
  if (el.tagName === "INPUT" && el.type === "checkbox") return;
  if (el.tagName === "LABEL") return;
  const a = el.dataset.a;
  if (a === "booked") { actions.booked(); return; }
  e.preventDefault();
  actions[a] && actions[a](el.dataset.v, el);
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.matches("input[type=checkbox][data-a]")) actions[el.dataset.a](el.dataset.v, el);
});
document.addEventListener("input", e => {
  const el = e.target; const k = el.dataset && el.dataset.model; if (!k) return;
  S[k] = el.value;
  if (k === "draft") { const b = document.querySelector('[data-a="post"]'); if (b) b.disabled = el.value.trim().length <= 3; }
  if (k === "petName") { const b = document.querySelector('[data-a="next"]'); if (b) b.disabled = !el.value.trim(); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.dataset && ["dmDraft", "replyDraft"].includes(e.target.dataset.model)) { e.preventDefault(); actions[e.target.dataset.model === "dmDraft" ? "sendDm" : "reply"](); return; }
  if (e.key === "Escape" && S.crisis) { S.crisis = null; render(); }
});

/* Logo: the clinic mark becomes a mask so it can take the palette's colours. */
(function logoMask() {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = c.height = 240; const g = c.getContext("2d");
    g.drawImage(img, 0, 0, 240, 240);
    const d = g.getImageData(0, 0, 240, 240);
    for (let i = 0; i < d.data.length; i += 4) { const l = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11; d.data[i + 3] = Math.max(0, Math.min(255, (l - 60) * 1.6)); d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; }
    g.putImageData(d, 0, 0);
    document.documentElement.style.setProperty("--logo-mask", `url(${c.toDataURL()})`);
  };
  img.src = window.BRC_LOGO;
})();

/* Deep links for reviewing screens: ?skip=1, ?screen=…, ?lang=ht, ?step=2, ?loc=INTL, ?checkedin=1, ?mood=sad, ?match=k1, ?sheet=held, ?thread=p1, ?draft=…, ?time=22 */
if (params.get("skip") === "1" || params.get("screen")) Object.assign(S, { screen: "home", age: true, terms: true, optMatch: true, focuses: ["parenting"], mainFocus: "parenting", state: "TX" });
if (params.get("screen")) { S.screen = params.get("screen"); if (!["home", "circles", "companion", "me"].includes(S.screen)) S.stack = [{ screen: "home" }]; }
if (params.get("lang")) S.lang = params.get("lang");
if (params.get("step")) { S.step = +params.get("step"); if (S.step >= 2) Object.assign(S, { age: true, terms: true }); }
if (params.get("loc")) S.state = params.get("loc");
if (params.get("checkedin") === "1") { S.checkedIn = true; S.mood = params.get("mood") || "good"; S.tags = ["Work"]; }
if (params.get("species")) S.species = params.get("species");
if (params.get("wear")) { S.wear = params.get("wear").split(","); S.owned = [...S.wear]; }
if (params.get("match")) { S.match = params.get("match"); S.dm = [{ me: false, key: "dm_hello" }, { me: true, text: "My son and I fight every night about homework. I'm exhausted." }, { me: false, key: "dm_suggest" }, { type: "book" }]; }
if (params.get("sheet")) S.crisis = params.get("sheet");
if (params.get("thread")) S.thread = params.get("thread");
if (params.get("draft")) S.draft = params.get("draft");
if (params.get("time")) S.timeOverride = +params.get("time");
if (params.get("hinted") === "1") S.petHinted = true;
render(true);
window.addEventListener("companion-ready", initWorld);
initWorld();
