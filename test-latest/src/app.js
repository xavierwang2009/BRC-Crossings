/* BRC Crossings — app shell: state, screens and actions.
   Screens are plain functions of state that return markup, so each maps to a React
   component in the next step. The 3D Companion lives in companion3d.js. */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const params = new URLSearchParams(location.search);
/* ?demo=1 shows the reviewer aids: sample answers, the sample week and the test bar. */
const DEMO = params.get("demo") === "1";

const S = {
  lang: "en", screen: "home", step: 0, tour: 0, stack: [],
  age: false, terms: false, optMatch: false, optJournal: false,
  focuses: [], mainFocus: null, state: null, species: "otter", petName: "", companionChosen: false,
  seeds: 20, earnedToday: 0, persona: "anon", replyPersona: "anon", draft: "", draftFocus: "parenting",
  mood: null, tags: [], note: "", checkedIn: false, shareMood: false, showCircles: false, showFriends: false,
  match: null, dm: [], dmDraft: "", joined: [], owned: [], wear: [], helpful: {}, showOriginal: {}, seen: {},
  posts: POSTS.map(p => ({ ...p, replies: p.replies.map(r => ({ ...r })) })), thread: null, circle: null,
  crisis: null, toast: null, posted: false, replyDraft: "", breathing: false, petHinted: false, timeOverride: null, enter: null,
  realName: "", nameShow: "anon", history: [], streakGoal: 7, activityDay: null,
  practiceQuery: "", practiceKind: "", practiceTopic: "", practiceDuration: "", practiceLanguage: "", savedPractices: [], savedOnly: false, practice: null,
  heroFeature: 0, heroPaused: false, appTour: null, member: false,
  daily: newDaily(), phq: null, phqSample: null, dMedNote: "", dLine: "", checkinSafety: false, phqSafety: false,
  care: null, careShareMode: "moment", journalDraft: "", journalEntries: [], careSound: null, careVolume: 20,
  friendships: {}, friendRecipient: null, friendMessages: {}, friendDrafts: {},
  scene: "riverbank", sceneAll: true, sceneFx: true, musicOn: false, musicKind: "piano", musicVol: 20, moodEdit: false, phqLast: null, bonusDay: {}, baseSpecies: null, guideZh: null, draftCircle: null, menu: null,
  away: false, talk: { node: null, shown: null, typed: null, at: 0, seen: {}, ambient: 0 },
};

/* ---------- activity dates and streaks ---------- */
function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function shiftDay(key, offset) {
  const date = new Date(key + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function streakStats(history, today = dayKey()) {
  const dates = [...new Set(history.map(row => row.date).filter(date => date <= today))].sort();
  let longest = 0, run = 0;
  dates.forEach((date, i) => { run = i && shiftDay(dates[i - 1], 1) === date ? run + 1 : 1; longest = Math.max(longest, run); });
  const seen = new Set(dates);
  let date = seen.has(today) ? today : shiftDay(today, -1), current = 0;
  while (seen.has(date)) { current++; date = shiftDay(date, -1); }
  return { current, longest };
}
function recordMood(mood, today = dayKey()) {
  if (S.activityDay && S.activityDay !== today) S.earnedToday = 0;
  const existing = S.history.find(row => row.date === today);
  const entry = { date: today, mood };
  if (existing) Object.assign(existing, entry);
  else S.history.push(entry);
  S.activityDay = today;
  return !existing;
}
/* ---------- activity presentation ---------- */
function activityDate(key, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(S.lang === "en" ? "en-US" : zhTag(), { ...options, timeZone: "UTC" }).format(new Date(key + "T12:00:00Z"));
}
/* Counts that only ever grow: a missed day takes nothing away. */
const daysLabel = n => t(n === 1 ? "day_one" : "streak_days", { n });
const monthCount = () => S.history.filter(row => row.date.slice(0, 7) === dayKey().slice(0, 7)).length;
function activityLink() {
  return `<button class="panel activity-link" data-a="go" data-v="activity">${icon("calendar")}<span><b>${t("activity")}</b><small>${t("month_count")} · ${daysLabel(monthCount())}</small></span>${icon("chev")}</button>`;
}
function activityScreen() {
  const today = dayKey(), total = S.history.length, dates = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const rows = S.history.filter(row => dates.includes(row.date));
  const first = [...S.history].sort((a, b) => a.date.localeCompare(b.date))[0];
  return `${hdrSub(t("activity"))}<div class="scroll activity-scroll">
    <p class="pad muted">${t("activity_note")}</p>
    <div class="streak-pair">${[["month_count", monthCount()], ["total_count", total]].map(([label, n]) => `<div><span>${t(label)}</span><strong>${daysLabel(n)}</strong></div>`).join("")}</div>
    <p class="pad muted">${t("streak_kind")}</p>
    <section class="panel activity-panel"><h2>${t("streak_goal")}</h2><div class="chips">${[7,14,30,50].map(n => `<button class="chip ${S.streakGoal === n ? "on" : ""}" data-a="streakGoal" data-v="${n}" aria-pressed="${S.streakGoal === n}">${t("streak_days", { n })}</button>`).join("")}</div><label for="streak-progress">${t("goal_progress", { n: total, goal: S.streakGoal })}</label><progress id="streak-progress" max="${S.streakGoal}" value="${Math.min(total, S.streakGoal)}"></progress>${total >= S.streakGoal ? `<p>${t("goal_reached")}</p>` : ""}</section>
    <section class="panel activity-panel"><h2>${t("weekly_mood")}</h2><p class="muted">${activityDate(dates[0])} – ${activityDate(today)}</p>
      <div class="mood-week">${dates.map(date => { const row = rows.find(r => r.date === date), mood = row && MOODS.find(m => m.id === row.mood); return `<div class="mood-day ${date === today ? "today" : ""}" aria-label="${activityDate(date)}: ${mood ? L(mood) : t("mood_missing")}"><small>${activityDate(date, { weekday: "narrow" })}</small>${mood ? moodFace(mood, 32) : '<span class="mood-gap" aria-hidden="true">—</span>'}<small>${activityDate(date, { day: "numeric" })}</small></div>`; }).join("")}</div>
      ${!rows.length ? `<p class="activity-empty">${t("mood_empty")}</p>` : `<h3>${t("mood_distribution")}</h3><div class="mood-distribution">${MOODS.map(m => { const count = rows.filter(r => r.mood === m.id).length; if (!count) return ""; return `<div><span>${L(m)}</span><meter min="0" max="${rows.length}" value="${count}" aria-label="${L(m)}"></meter><b>${Math.round(count / rows.length * 100)}%</b></div>`; }).join("")}</div>`}
      <p class="muted">${t("history_latest")}</p><button class="btn primary block" data-a="activityCheck">${t(S.history.some(r => r.date === today) ? "activity_edit" : "activity_check")}</button>
    </section>
    <section class="panel activity-panel"><h2>${t("badges")}</h2><div class="activity-achievement">${icon("sun")}<div><b>${t("first_badge")}</b><small>${first ? t("earned_date", { date: activityDate(first.date) }) : t("first_badge_note") + " · " + t("badge_locked")}</small></div>${first ? icon("check") : icon("lock")}</div></section>
    ${S.history.length ? `<section class="panel activity-panel"><h2>${t("mood_history")}</h2>${[...S.history].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 14).map(row => `<div class="activity-log"><time datetime="${row.date}">${activityDate(row.date)}</time><span>${L(MOODS.find(m => m.id === row.mood))}</span></div>`).join("")}</section>` : ""}
    ${DEMO ? `<div class="pad"><button class="btn quiet block" data-a="sampleWeek">${t("demo_week")}</button></div>` : ""}
  </div>`;
}

/* ---------- helpers ---------- */
function t(k, vars = {}) { const e = I18N[k]; let s = e ? (e[S.lang] || e.en) : k; for (const v in vars) s = s.split(`{${v}}`).join(vars[v]); return s; }
const L = o => (o ? o[S.lang] || o.en : "");
const focusName = id => L(FOCUS.find(f => f.id === id) || FOCUS[0]);
const stateName = id => L(STATES.find(s => s.id === id) || {});
const species = id => SPECIES.find(s => s.id === id) || SPECIES[0];
const counselor = id => COUNSELORS.find(c => c.id === id);
const licensedHere = () => !!S.state && !["OTHER", "INTL"].includes(S.state);
const initials = n => n.replace(/\./g, " ").split(/[ ,]/).filter(Boolean).slice(0, 2).map(w => w[0]).join("");
const CJK = /[\u3400-\u9fff]/;
/* The Member's name stays private; the community sees only what they chose:
   nothing (anon), initials ("L.Z.", or "張○○" for Chinese names) or the full name. */
function displayName(show = S.nameShow) {
  const n = S.realName.trim();
  if (!n || show === "anon") return null;
  if (show === "full") return n;
  if (CJK.test(n)) return [...n][0] + "○".repeat(Math.max(1, [...n].length - 1));
  return n.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + ".").join("");
}
/* What the Companion and the Counselor guide call the Member: a first or given name, else "friend". */
function callName() {
  const n = S.realName.trim();
  if (!n) return t("friend");
  if (CJK.test(n)) { const ch = [...n]; return ch.length >= 3 ? ch.slice(1).join("") : n; }
  return n.split(/\s+/)[0];
}
const zhTag = () => (S.lang === "hs" ? "zh-Hans" : "zh-Hant");
const ago = a => (a ? t(a[1] === "h" ? "ago_h" : "ago_d", { n: a[0] }) : t("ago_now"));
const hueFor = name => ["#3c6b4a", "#17616d", "#a8361f", "#6b4c00", "#5b4a8c"][[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 5];
/* A Mandarin-speaking Counselor is preferred when the Member says so; until they do, the app language is the hint. */
const wantsZh = () => (S.guideZh == null ? S.lang !== "en" : S.guideZh);
/* Circle posts are for that Circle's members; anything the Member hid or reported stays hidden. */
const canSee = p => !!p && !p.hiddenForMe && (!p.circle || p.mine || S.joined.includes(p.circle));
const circleName = id => L(CIRCLES.find(c => c.id === id)?.name);
const circleLanguage = c => t(c.lang === "EN" ? "english_label" : "chinese_label");
const guideLanguages = c => c.zh ? t("english_label") + " · " + t("mandarin_label") : t("english_label");
/* A new Member starts in the Circle for their main Focus Area, in their language. */
function suggestedCircles() {
  const fit = CIRCLES.filter(c => c.focus === S.mainFocus);
  const pick = fit.find(c => (c.lang !== "EN") === (S.lang !== "en")) || fit[0];
  return pick ? [pick.id] : [];
}
const suggestions = () => COUNSELORS.filter(c => !c.full && c.states.includes(S.state))
  .sort((a, b) => (b.focus.includes(S.mainFocus) - a.focus.includes(S.mainFocus))
    || (b.focus.filter(f => S.focuses.includes(f)).length - a.focus.filter(f => S.focuses.includes(f)).length)
    || (wantsZh() * (b.zh - a.zh))).slice(0, 3);
function earn(n) { const got = Math.max(0, Math.min(n, 25 - S.earnedToday)); S.seeds += got; S.earnedToday += got; return got; }
/* One small thank-you a day for taking part. More posts never earn more. */
function earnOnce(kind, n) {
  const today = dayKey();
  if (S.bonusDay[kind] === today) return 0;
  S.bonusDay[kind] = today;
  return earn(n);
}
/* ---------- saved on this device ----------
   A tester's check-ins, posts and Companion survive closing the app. Review links that
   carry ?parameters are throwaway and never read or change what is saved. */
const SAVE_KEY = "brc-crossings-v1";
const SAVED = ["lang", "member", "age", "terms", "optMatch", "optJournal", "focuses", "mainFocus", "state", "species", "baseSpecies", "petName", "companionChosen",
  "seeds", "earnedToday", "bonusDay", "activityDay", "mood", "checkedIn", "daily", "dMedNote", "dLine", "checkinSafety", "phqSafety", "phqLast", "history", "streakGoal",
  "joined", "owned", "wear", "helpful", "seen", "posts", "posted", "match", "dm", "realName", "nameShow", "savedPractices", "journalEntries",
  "friendships", "friendMessages", "shareMood", "guideZh", "careVolume", "petHinted", "scene", "sceneAll", "sceneFx", "musicOn", "musicKind", "musicVol"];
const PERSIST = !location.search;
// A reset invalidates any other open tabs holding the previous tester’s data.
let generation = null;
function saveState() {
  if (!PERSIST) return;
  try {
    const current = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if ((current?.generation || null) !== generation) { location.reload(); return; }
    const out = { generation };
    SAVED.forEach(k => { out[k] = S[k]; });
    localStorage.setItem(SAVE_KEY, JSON.stringify(out));
  } catch (e) { /* private mode or full storage: carry on unsaved */ }
}
function loadState() {
  if (!PERSIST) return false;
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!saved || typeof saved !== "object") return false;
    generation = saved.generation || null;
    if (!saved.member) { S.lang = saved.lang || "en"; return true; }
    SAVED.forEach(k => { if (k in saved && saved[k] !== undefined) S[k] = saved[k]; });
    return true;
  } catch (e) { return false; }
}
window.addEventListener("storage", event => {
  if (PERSIST && event.key === SAVE_KEY && (JSON.parse(event.newValue || "null")?.generation || null) !== generation) location.reload();
});
function toast(msg, ic = "seed") { S.toast = { msg, ic, id: Date.now() }; }
/* Home, Circles, Companion and Me are tab roots: going to one switches tabs instead of stacking a copy. */
const TAB_ROOTS = ["home", "circles", "companion", "me"];
const SECTION_OF = { settings: "me", dailyDone: "companion", phqIntro: "companion", phqResult: "companion", shop: "companion", circle: "circles" };
const NO_TAB_BAR = ["daily", "phq","compose", "thread", "dm", "friendDm", "counselor"];
/* Home is the public welcome page until the Member signs in or finishes setup; after that it is their own Home. */
const landing = () => S.screen === "home" && !S.member;
function sectionTab() {
  if (TAB_ROOTS.includes(S.screen)) return S.screen;
  if (SECTION_OF[S.screen]) return SECTION_OF[S.screen];
  const root = S.stack[0] && S.stack[0].screen;
  return TAB_ROOTS.includes(root) ? root : "home";
}
function go(screen, extra = {}) {
  if (TAB_ROOTS.includes(screen)) { Object.assign(S, extra, { screen, stack: [], breathing: false }); render(true); return; }
  S.stack.push({ screen: S.screen, thread: S.thread, circle: S.circle }); Object.assign(S, extra, { screen, breathing: false }); render(true);
}
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
  sliders: '<path d="M4.5 7h8M17.5 7h2M4.5 12h2.5M12 12h7.5M4.5 17h6M15.5 17h4"/><circle cx="15" cy="7" r="2.3"/><circle cx="9.5" cy="12" r="2.3"/><circle cx="13" cy="17" r="2.3"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  external: '<path d="M13.5 5.5h5v5M18.5 5.5l-8 8"/><path d="M17 14v4.5H5.5V7H10"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.3 2.3 3.4 5 3.4 8s-1.1 5.7-3.4 8c-2.3-2.3-3.4-5-3.4-8S9.7 6.3 12 4z"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  pin: '<path d="M12 20s6-5.4 6-10.2A6 6 0 0 0 6 9.8C6 14.6 12 20 12 20z"/><circle cx="12" cy="9.8" r="2.2"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  wind: '<path d="M3.5 9h10a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3.5 13.5h14a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3.5 18h6"/>',
  swap: '<path d="M7 7.5h11l-3-3M17 16.5H6l3 3"/>',
  more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  flag: '<path d="M6 20.5V4.5"/><path d="M6 5h11.5l-2.2 3.6 2.2 3.6H6"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7"/><path d="M7 7l.8 12.5h8.4L17 7"/>',
  hide: '<path d="M4 12s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5-8-5.5-8-5.5z"/><path d="M5 5l14 14"/>',
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
  world.labeler = st => st.showPet === false ? t("riverbank_preview") : t("diorama_label", { pet: S.petName, species: L(species(st.species)), state: st.asleep ? t("state_asleep") : t("state_awake") });
  world.on("pet", () => { S.petHinted = true; quip("pet"); });
  world.on("stroke", () => { S.petHinted = true; quip("stroke"); });
  world.on("hug", () => { S.petHinted = true; quip("hug"); });
  world.on("wake", () => { if (S.away) wakeFromAway(); else quip("wake"); });
  syncWorld();
  render();
}
function syncWorld() {
  if (!world) return;
  world.set({ showPet: S.screen !== "onboard" || (S.step === 5 && S.companionChosen), species: S.species, mood: S.checkedIn ? S.mood : null, asleep: S.away && S.screen !== "onboard", wear: S.wear, timeOverride: S.timeOverride, scene: sceneNow() });
}
function mountStage() {
  const el = document.querySelector("[data-stage]");
  if (!el) return;
  if (world) { world.attach(el, S.breathing ? "breathe" : el.dataset.stage); placeScene(el); return; }
  const h = hour();
  el.style.background = h < 6.5 || h >= 19.7 ? "linear-gradient(180deg,#1b2446,#363f73)" : "linear-gradient(180deg,#7dc4ed,#d6f0ff)";
  if (worldFailed && !el.querySelector(".fallback")) el.insertAdjacentHTML("afterbegin", `<div class="fallback">${t("three_d_off")}</div>`);
}
/* ---------- scenes: the Companion inside a photo ---------- */
const sceneSize = {}, sceneLoading = {};
const sceneNow = () => SCENES.find(s => s.id === S.scene && s.photo) || null;
const scenePhoto = (sc, w = 1200) => `https://images.unsplash.com/photo-${sc.photo}?w=${w}&q=75&auto=format&fit=crop`;
function placeScene(el) {
  const sc = sceneNow();
  if (!sc || !["companion", "home"].includes(el.dataset.stage)) { el.classList.remove("photo-scene"); return; }
  if (!sceneSize[sc.id] && !sceneLoading[sc.id]) {
    sceneLoading[sc.id] = true;
    const img = new Image();
    img.onload = () => { sceneSize[sc.id] = [img.naturalWidth, img.naturalHeight]; const now = document.querySelector("[data-stage]"); if (now) placeScene(now); };
    img.onerror = () => { sceneLoading[sc.id] = false; };
    img.src = scenePhoto(sc);
  }
  const W = el.clientWidth, H = el.clientHeight, [iw, ih] = sceneSize[sc.id] || [3, 2];
  // The Companion's speech panel lies over the foot of the stage, so the picture is framed in the part that shows
  // and fades into the page below it.
  const talk = el.parentElement.querySelector(".talk");
  const F = Math.max(120, Math.min(H - 24, talk ? talk.getBoundingClientRect().top - el.getBoundingClientRect().top + 14 : H));
  // Cover that frame, a little closer in, with the Companion's spot centred and its feet near the bottom of it.
  const k = Math.max(W / iw, F / ih) * 1.2, dw = iw * k, dh = ih * k;
  const left = Math.min(0, Math.max(W - dw, W / 2 - sc.at[0] * dw)), top = Math.min(0, Math.max(F - dh, F * 0.84 - sc.at[1] * dh));
  el.classList.add("photo-scene");
  const page = backdropOn() ? sc.tint : "#e6f3ee";
  Object.assign(el.style, { backgroundImage: `linear-gradient(180deg, rgba(${rgbOf(page)},0) ${Math.round(F - 34)}px, ${page} ${Math.round(F + 10)}px), url("${scenePhoto(sc)}")`,
    backgroundSize: `100% 100%, ${dw}px ${dh}px`, backgroundPosition: `0 0, ${left}px ${top}px` });
  if (sc.fx && S.sceneFx && !REDUCED_UI.matches && !el.querySelector(".scene-fx")) el.insertAdjacentHTML("beforeend", `<canvas class="scene-fx" data-fx="${sc.fx}" aria-hidden="true"></canvas>`);
  world.setAnchor({ x: left + sc.at[0] * dw, y: top + sc.at[1] * dh, h: sc.size * dh });
}
/* Drifting petals or snow over a scene that has them. */
const fxBits = [];
(function sceneFx(now) {
  requestAnimationFrame(sceneFx);
  const cv = document.querySelector(".scene-fx");
  if (!cv || document.hidden) return;
  const W = cv.clientWidth, H = cv.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2), snow = cv.dataset.fx === "snow", rain = cv.dataset.fx === "rain", t = now / 1000;
  if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
  const c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
  while (fxBits.length < 34) fxBits.push({ x: Math.random(), y: Math.random(), s: .6 + Math.random() * .8, p: Math.random() * 9, r: Math.random() * 6 });
  for (const q of fxBits) {
    if (rain) { q.y += .011 * q.s; q.x -= .0011 * q.s; }
    else { q.y += (snow ? .0011 : .0008) * q.s; q.x += (snow ? 0 : .0006) + Math.sin(t * .8 + q.p) * .0007; q.r += .02; }
    if (q.y > 1.03) { q.y = -.03; q.x = Math.random(); } if (q.x > 1.03) q.x = -.03; if (q.x < -.03) q.x = 1.03;
    c.save(); c.translate(q.x * W, q.y * H);
    if (rain) { c.strokeStyle = `rgba(236,243,250,${.28 + .22 * q.s / 1.4})`; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(-1.6 * q.s, 15 * q.s); c.stroke(); }
    else if (snow) { c.fillStyle = `rgba(255,255,255,${.5 + .3 * q.s / 1.4})`; c.beginPath(); c.arc(0, 0, 1 + q.s * 1.3, 0, 7); c.fill(); }
    else { c.rotate(q.r); c.scale(1, .55 + .45 * Math.sin(t * 2 + q.p)); c.fillStyle = "rgba(255,196,214,.85)"; c.beginPath(); c.ellipse(0, 0, 3.6 * q.s, 2.4 * q.s, 0, 0, 7); c.fill(); }
    c.restore();
  }
})(0);
/* The chosen scene also sits behind every page, under a veil of its own soft colour so words stay easy to read. */
const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(",");
const backdropOn = () => !!(sceneNow() && S.sceneAll && S.member && !["onboard", "counselor"].includes(S.screen));
let backdropFor = null;
function applyBackdrop() {
  const ph = document.querySelector("#phone"), bd = document.querySelector("#backdrop");
  if (!ph || !bd) return;
  const sc = backdropOn() ? sceneNow() : null;
  ph.classList.toggle("has-scene", !!sc);
  if (!sc) return;
  ph.style.setProperty("--scene-tint", rgbOf(sc.tint));
  ph.style.setProperty("--scene-veil", sc.dark ? ".9" : ".78");
  bd.style.backgroundPosition = `${Math.round(sc.at[0] * 100)}% 50%`;
  if (backdropFor === sc.id) return;
  backdropFor = sc.id;
  const url = scenePhoto(sc), img = new Image();
  img.onload = () => { if (backdropFor === sc.id) bd.style.backgroundImage = `url("${url}")`; };
  img.src = url;
}
const sceneCard = sc => { const on = S.scene === sc.id;
  return `<button class="scene-card ${on ? "on" : ""} ${sc.photo ? "" : "live"}" data-a="scene" data-v="${sc.id}" aria-pressed="${on}" ${sc.photo ? `style="background-image:url('${scenePhoto(sc, 320)}')"` : ""}><span><b>${L(sc)}</b>${sc.photo ? "" : `<small>${t("scene_live")}</small>`}</span>${on ? `<i class="scene-tick" aria-hidden="true">${icon("check")}</i>` : ""}</button>`; };
function settingsScreen() {
  const cur = sceneNow(), sw = (k, label, sub, a = "flag") => `<label class="row"><span class="k">${label}${sub ? `<small>${sub}</small>` : ""}</span><input type="checkbox" class="switch" data-a="${a}" data-v="${k}" ${S[k] ? "checked" : ""}></label>`;
  const grid = list => `<div class="scene-grid" role="group">${list.map(sceneCard).join("")}</div>`;
  return `${hdrSub(t("settings"))}<div class="scroll" id="settingsScroll">
    <h2 class="section-h">${t("bg_title")}</h2><p class="pad muted scene-sub">${t("bg_sub", { pet: esc(S.petName) })}</p>
    <h3 class="scene-group">${t("bg_quiet")}</h3>${grid(SCENES.filter(s => !s.people))}
    <h3 class="scene-group">${t("bg_people")}<small>${t("bg_people_sub")}</small></h3>${grid(SCENES.filter(s => s.people))}
    ${cur ? `<p class="pad muted scene-credit">${t("scene_credit", { who: esc(cur.credit) })}</p>` : ""}
    <div class="panel" style="padding:2px 14px;margin-top:14px">${sw("sceneAll", t("bg_everywhere"), t("bg_everywhere_sub"))}${sw("sceneFx", t("fx_on"), t("fx_sub"))}</div>
    <h2 class="section-h">${t("sound_title")}</h2>
    <div class="panel" style="padding:2px 14px">${sw("musicOn", t("music_on"), t("music_on_sub"), "musicFlag")}
      <div class="row" style="flex-wrap:wrap"><span class="k" style="flex-basis:100%">${t("music_choice")}</span><div class="chips">${["piano", "ambient"].map(k => `<button class="chip ${S.musicKind === k ? "on" : ""}" data-a="musicKind" data-v="${k}" aria-pressed="${S.musicKind === k}">${t("music_" + k)}</button>`).join("")}</div></div>
      <label class="row" for="music-volume"><span class="k">${t("care_volume")}</span><input id="music-volume" class="vol" type="range" min="0" max="100" value="${S.musicVol}" aria-label="${t("music_volume")}"></label>
    </div><p class="pad muted" style="margin-top:0">${t("music_note")}</p></div>`;
}
function settingsLink() {
  const sc = SCENES.find(s => s.id === S.scene) || SCENES[0];
  return `<button class="panel activity-link settings-link" data-a="go" data-v="settings"><i class="settings-thumb ${sc.photo ? "" : "live"}" ${sc.photo ? `style="background-image:url('${scenePhoto(sc, 320)}')"` : ""} aria-hidden="true"></i><span><b>${t("settings")}</b><small>${t("settings_sub", { scene: L(sc), music: t(S.musicOn ? "on" : "off") })}</small></span>${icon("chev")}</button>`;
}
function scenePicker() {
  const card = sc => { const on = S.scene === sc.id;
    return `<button class="scene-card ${on ? "on" : ""} ${sc.photo ? "" : "live"}" data-a="scene" data-v="${sc.id}" aria-pressed="${on}" ${sc.photo ? `style="background-image:url('${scenePhoto(sc, 320)}')"` : ""}><span><b>${L(sc)}</b>${sc.people ? `<small>${t("scene_people")}</small>` : sc.photo ? "" : `<small>${t("scene_live")}</small>`}</span></button>`; };
  const cur = sceneNow();
  return `<h2 class="section-h">${t("scene_title")}</h2><p class="pad muted scene-sub">${t("scene_sub", { pet: esc(S.petName) })}</p>
    <div class="scene-row" role="group" aria-label="${t("scene_title")}">${SCENES.map(card).join("")}</div>${cur ? `<p class="pad muted scene-credit">${t("scene_credit", { who: esc(cur.credit) })}</p>` : ""}`;
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
  return `<header class="hdr"><div class="hdr-row" style="padding-left:8px"><button class="back-btn" data-a="back" aria-label="${t("back")}: ${backLabel()}">${icon("back")}<span>${backLabel()}</span></button>
    <span class="hdr-title">${title}</span>${helpBtn()}</div></header>`;
}
const BACK_LABEL = { settings: "settings", dailyDone: "daily_title", phqResult: "result_title", phqIntro: "mood_check", ask: "ask", friends: "friends_title", home: "home", circles: "circles", companion: "companion", me: "me", shop: "shop", learn: "learn", guide: "my_guide" };
function backLabel() { const prev = S.stack[S.stack.length - 1]; const k = prev && BACK_LABEL[prev.screen]; return k ? t(k) : t("back"); }
function tabs(active) {
  const tab = (id, ic, label) => `<button class="${active === id ? "on" : ""}" data-a="tab" data-v="${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span></button>`;
  return `<nav class="tabs" aria-label="${t("main_navigation")}">${tab("home", "home", t("home"))}${tab("circles", "circles", t("circles"))}
    <button class="fab" data-a="go" data-v="ask"><span class="disc">${icon("ask")}</span><span>${t("ask")}</span></button>
    ${tab("companion", "paw", t("companion"))}${tab("me", "me", t("me"))}</nav>`;
}
function avatar(name, anon) {
  return anon ? `<span class="av anon">${icon("mask")}</span>` : `<span class="av" style="background:${hueFor(name)}">${esc(initials(name))}</span>`;
}
function textFor(obj, orig, original = false) {
  if (typeof obj === "string") return { text: obj, lang: orig === "zh" ? "zh" : "en" };
  const language = original ? (orig === "zh" ? "ht" : "en") : S.lang;
  return { text: obj[language], lang: { en: "en", ht: "zh-Hant", hs: "zh-Hans" }[language] };
}
function postPanel(p, o = {}) {
  const canTr = !p.mine && [p, p.answer, ...p.replies].some(item => item && typeof item.text === "object" && (item.orig === "zh" ? S.lang !== "ht" : S.lang !== "en"));
  const tr = canTr && S.showOriginal[p.id];
  const body = textFor(p.text, p.orig, tr);
  const lit = (p.unseenAnswer || p.mine) && !S.seen[p.id];
  const state = p.held ? `<span class="tag held">${t("held")}</span>`
    : p.answer ? `<span class="tag ${lit ? "new" : "answer"}">${icon("shield")}${lit ? t("new_answer") : t("counselor_answered")}</span>`
    : p.mine && lit ? `<span class="tag new">${t("new")}</span>` : "";
  const helpfulOn = S.helpful[p.id];
  const c = p.answer ? counselor(p.answer.by) : null;
  const ans = p.answer ? textFor(p.answer.text, "en", tr) : null;
  const n = p.replies.filter(r => !r.hiddenForMe && (!r.held || r.mine)).length;
  return `<article class="post ${lit && !o.full ? "lit" : ""} ${S.enter === p.id ? "enter" : ""}">
    <div class="post-head">${avatar(p.author, p.anon)}<div class="who"><b>${esc(p.anon ? t("anonymous") : p.author)}</b><span>${ago(p.ago)} · ${p.circle ? esc(circleName(p.circle)) : focusName(p.focus)}</span></div>${state}<button class="more-btn" data-a="postMenu" data-v="${p.id}" aria-label="${t("more_actions")}">${icon("more")}</button></div>
    ${!p.anon && !p.mine && p.memberId ? `<div class="friend-post">${friendButton(p.memberId)}</div>` : ""}
    <div class="post-body" ${o.full ? "" : `data-a="thread" data-v="${p.id}" style="cursor:pointer"`}><p lang="${body.lang}">${esc(body.text)}</p>
      </div>
    ${ans && (o.full || o.preview) ? `<div class="answer"><div class="by">${icon("shield")}${esc(c.name)}<span>· ${t("counselor")}</span></div><p lang="${ans.lang}">${esc(o.full ? ans.text : ans.text.split(/(?<=[.。])\s*/)[0])}</p>${o.full ? `<span class="disc">${t("not_therapy")}</span>` : ""}</div>` : ""}
    <div class="post-foot">
      <button class="act ${helpfulOn ? "on" : ""}" data-a="helpful" data-v="${p.id}" aria-pressed="${!!helpfulOn}">${icon("heart")}${t("helpful")} · ${p.helpful + (helpfulOn ? 1 : 0)}</button>
      <button class="act" data-a="thread" data-v="${p.id}">${icon("chat")}${n === 1 ? t("reply_1") : t("replies_n", { n })}</button>
      ${canTr ? `<button class="act" data-a="translate" data-v="${p.id}" style="margin-left:auto">${icon("translate")}${tr ? t("show_selected") : t("show_original")}</button>` : ""}
    </div></article>`;
}
const feedList = () => S.posts.map(p => postPanel(p, { preview: true })).join("");
function guideCard() {
  const g = S.match ? counselor(S.match) : null;
  const sub = g ? `${t("my_guide")} · ${guideLanguages(g)}` : !licensedHere() ? t("oos_title") : S.optMatch ? t("guide_sub") : t("matching_off_title");
  return `<button class="guide" data-a="go" data-v="${g ? "dm" : "guide"}"><span class="av" style="${g ? `background:${g.hue}` : ""}">${g ? initials(g.name) : icon("shield")}</span>
    <span class="t"><b>${g ? esc(g.name) : t("find_guide")}</b><span>${sub}</span></span>${icon(g ? "chat" : "chev")}</button>`;
}

/* ---------- the Companion's voice ----------
   A scripted conversation: Pebble speaks first, the Member answers with reply chips.
   Lines come from TT in content.js; nothing is generated. */
const REDUCED_UI = window.matchMedia("(prefers-reduced-motion: reduce)");
let lastInput = Date.now();
function tt(k, vars = {}) {
  let s = L(TT[k]) || k;
  const all = { name: callName(), pet: S.petName, greet: greeting(), ...vars };
  for (const v in all) s = s.split(`{${v}}`).join(all[v]);
  return s;
}
const isLate = () => { const h = hour(); return h >= 23 || h < 4.5; };
function season() { const m = new Date().getMonth(); return m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter"; }
function talkStart() {
  if (S.away) return "away";
  if (!S.checkedIn) return isLate() ? "late" : S.petHinted ? "hello" : "hello_first";
  return "r_" + S.mood;
}
function talkTo(node, opts = {}) {
  Object.assign(S.talk, { node, at: Date.now(), typed: null });
  if (!opts.ambient) S.talk.ambient = 0;
  const n = TALK[node] && TALK[node]();
  if (n && n.emote && world) world.emote(n.emote);
  if (!opts.silent) render();
}
function checkInFrom(mood) { actions.quickCheckin(mood); }
function startBreathe() {
  if (S.screen !== "companion") { S.stack = []; S.screen = "companion"; }
  S.breathing = true; if (world) world.breathe(true); render(true);
}
function wakeFromAway() {
  S.away = false; render();
  if (world) { world.emote("surprise"); setTimeout(() => world && world.emote("wave"), 950); }
  talkTo("back");
}
function guideOpt() {
  if (S.match) return { label: tt("o_msg_guide"), icon: "chat", go: () => go("dm") };
  if (licensedHere()) return { label: tt("o_find_guide"), icon: "shield", go: () => go("guide") };
  return null;
}
const O = {
  thanks: () => ({ label: tt("o_thanks"), go: () => { if (world) world.sit(false); talkTo("bye"); } }),
  breathe: (k = "o_breathe") => ({ label: tt(k), icon: "wind", kind: "primary", go: startBreathe }),
  sit: (k = "o_sit") => ({ label: tt(k), icon: "heart", go: () => { if (world) { world.sit(true); world.emote("comfort"); } talkTo("sit"); } }),
  help: (k = "o_help", level = "reach") => ({ label: tt(k), icon: "help", kind: "help", go: () => { S.crisis = level; render(); } }),
  later: () => ({ label: tt("o_later"), go: () => talkTo("bye") }),
  read: () => ({ label: tt("o_read"), icon: "learn", go: () => go("learn") }),
  next: node => ({ label: tt("o_next"), kind: "primary", go: () => talkTo(node) }),
};
const moodOpt = id => { const m = MOODS.find(x => x.id === id); return { label: L(m), face: m, go: () => checkInFrom(id) }; };
const askMood = () => [moodOpt("great"), moodOpt("good"), moodOpt("okay"), { label: tt("o_not_great"), face: MOODS.find(x => x.id === "low"), go: () => talkTo("notgreat") }];
const TALK = {
  hello: () => ({ text: tt("hello"), emote: "wave", opts: askMood() }),
  hello_first: () => ({ text: tt("hello_first"), emote: "wave", opts: askMood() }),
  hello_c: () => ({ text: tt("hello_c"), emote: "tilt" }),
  late: () => ({ text: tt("late"), emote: "yawn", opts: [O.breathe("o_winddown"), { label: tt("o_just_checking"), go: () => talkTo("hello") }] }),
  away: () => ({ text: tt("away"), opts: [{ label: tt("o_wake"), icon: "sun", kind: "primary", go: wakeFromAway }] }),
  back: () => ({ text: tt("back"), emote: "surprise", opts: askMood() }),
  notgreat: () => ({ text: tt("notgreat"), emote: "comfort", opts: ["low", "sad", "anxious", "frustrated", "tired"].map(moodOpt) }),
  r_great: () => ({ text: tt("r_great"), emote: "cheer", opts: [{ label: tt("o_share_win"), icon: "ask", kind: "primary", go: () => { S.draft = tt("win_draft"); S.draftFocus = "individual"; go("compose"); } }, { label: tt("o_dance"), icon: "sun", go: () => talkTo("dance") }, O.thanks()] }),
  r_good: () => ({ text: tt("r_good"), emote: "nod", opts: [{ label: tt("o_play"), icon: "paw", go: () => talkTo("play") }, O.thanks()] }),
  r_okay: () => ({ text: tt("r_okay"), emote: "tilt", opts: [O.breathe(), O.read(), O.sit("o_hangout")] }),
  r_low: () => ({ text: tt("r_low"), emote: "comfort", opts: [O.breathe(), O.sit(), guideOpt(), O.help()].filter(Boolean), note: true }),
  r_sad: () => ({ text: tt("r_sad"), emote: "comfort", opts: [O.breathe(), O.sit(), guideOpt(), O.help()].filter(Boolean), note: true }),
  r_anxious: () => ({ text: tt("r_anxious"), emote: "comfort", opts: [O.breathe(), { label: tt("o_ground"), icon: "globe", go: () => talkTo("g5") }, O.sit("o_notnow"), O.help()], note: true }),
  r_frustrated: () => ({ text: tt("r_frustrated"), emote: "nod", opts: [O.breathe("o_three"), { label: tt("o_ask"), icon: "ask", go: () => go("compose") }, O.sit(), O.help()], note: true }),
  r_tired: () => ({ text: tt("r_tired"), emote: "comfort", opts: [O.breathe("o_winddown"), O.sit(), O.read()], note: true }),
  g5: () => ({ text: tt("g5"), emote: "think", opts: [O.next("g4")] }),
  g4: () => ({ text: tt("g4"), emote: "nod", opts: [O.next("g3")] }),
  g3: () => ({ text: tt("g3"), emote: "tilt", opts: [O.next("g2")] }),
  g2: () => ({ text: tt("g2"), emote: "sniff", opts: [O.next("g1")] }),
  g1: () => ({ text: tt("g1"), emote: "comfort", opts: [O.next("g_end")] }),
  g_end: () => ({ text: tt("g_end"), emote: "tilt", opts: [{ label: tt("o_calmer"), go: () => talkTo("proud") }, { label: tt("o_still"), go: () => talkTo("still_hard") }] }),
  proud: () => ({ text: tt("proud"), emote: "cheer", opts: [O.thanks()] }),
  still_hard: () => ({ text: tt("still_hard"), emote: "comfort", opts: [guideOpt(), O.help(), O.sit()].filter(Boolean), note: true }),
  sit: () => ({ text: tt("sit"), opts: [O.thanks()] }),
  dance: () => ({ text: tt("dance"), emote: "dance", opts: [{ label: tt("o_again"), icon: "sun", go: () => talkTo("dance") }, O.thanks()] }),
  play: () => ({ text: tt("play"), emote: "jump", opts: [{ label: tt("o_trick"), icon: "sun", go: () => talkTo("dance") }, O.thanks()] }),
  bye: () => ({ text: tt("bye"), emote: "nod", opts: [{ label: tt("o_talk"), icon: "chat", go: () => talkTo(S.checkedIn ? "play" : "hello") }] }),
  after_breathe: () => ({ text: tt("after_breathe"), emote: "nod", opts: [O.breathe("o_again"), O.thanks()] }),
  posted: () => ({ text: tt("posted"), emote: "cheer", opts: [O.thanks()] }),
  after_hold: () => ({ text: tt("after_hold"), emote: "comfort", opts: [O.help("o_help_lines", "crisis"), O.sit(), guideOpt()].filter(Boolean), note: true }),
  nudge_answer: () => ({ text: tt("nudge_answer"), emote: "tilt", opts: [{ label: tt("o_read_it"), icon: "shield", kind: "primary", go: () => actions.thread("p1") }, O.later()] }),
  nudge_guide: () => ({ text: tt("nudge_guide"), emote: "wave", opts: [{ label: tt("o_show"), icon: "shield", kind: "primary", go: () => go("guide") }, O.later()] }),
  nudge_circle: () => ({ text: tt("nudge_circle"), emote: "tilt", opts: [{ label: tt("o_peek"), icon: "circles", kind: "primary", go: () => actions.circle("c1") }, O.later()] }),
  amb_season: () => ({ text: tt("amb_" + season()), emote: "sniff" }),
  amb_night: () => ({ text: tt("amb_night"), emote: "think" }),
  amb_rain: () => ({ text: tt("amb_rain"), emote: "tilt", opts: [O.sit(), O.later()] }),
  amb_weekend: () => ({ text: tt("amb_weekend"), emote: "tilt" }),
  amb_morning: () => ({ text: tt("amb_morning"), emote: "wave", opts: [{ label: tt("o_slept_ok"), go: () => talkTo("glad") }, { label: tt("o_slept_bad"), go: () => talkTo("rough_night") }] }),
  glad: () => ({ text: tt("glad"), emote: "nod" }),
  rough_night: () => ({ text: tt("rough_night"), emote: "comfort", opts: [O.breathe(), O.thanks()] }),
};
/* Nodes the Companion may move on from by itself when the Member is quiet. Hard-day
   and exercise nodes are never interrupted. */
const RESTFUL = ["bye", "glad", "proud", "posted", "r_good", "r_great", "dance", "play", "after_breathe", "amb_season", "amb_night", "amb_weekend", "hello_c"];
function pickAmbient() {
  const seen = S.talk.seen, h = hour();
  const next = [
    ["nudge_answer", !S.seen.p1 && canSee(S.posts.find(p => p.id === "p1"))],
    ["nudge_guide", !S.match && licensedHere() && S.optMatch],
    ["nudge_circle", S.focuses.includes("parenting")],
    ["amb_morning", h >= 5 && h < 11],
    ["amb_night", h < 6 || h >= 20],
    ["amb_rain", S.checkedIn && S.mood === "sad"],
    ["amb_weekend", [0, 6].includes(new Date().getDay())],
    ["amb_season", true],
  ].find(([id, ok]) => ok && !seen[id]);
  if (!next) return null;
  seen[next[0]] = true;
  return next[0];
}
function talkBox(where) {
  if (!S.talk.node) Object.assign(S.talk, { node: talkStart(), at: Date.now() });
  let id = S.talk.node;
  if (where === "companion" && !S.checkedIn && ["hello", "hello_first"].includes(id)) id = "hello_c";
  S.talk.shown = id;
  let n = TALK[id] ? TALK[id]() : TALK.bye();
  // the check-in panel sits right below on the Companion screen, so mood chips would say it twice
  if (where === "companion" && id === "back") n = { ...n, opts: null };
  const key = id + "|" + S.lang;
  const typed = S.talk.typed === key || REDUCED_UI.matches;
  return `<div class="talk" role="group" aria-label="${esc(tt("talk_label"))}"><div class="talk-box">
      <span class="talk-name">${icon("paw")}${esc(S.petName)}</span>
      <p class="talk-text" aria-live="polite"><span class="sr">${esc(n.text)}</span><span class="talk-typed" aria-hidden="true" data-key="${key}" data-full="${esc(n.text)}">${typed ? esc(n.text) : ""}</span>${typed ? "" : '<span class="talk-dots" aria-hidden="true"><i></i><i></i><i></i></span>'}</p>
      ${n.opts && n.opts.length ? `<div class="talk-opts ${typed ? "" : "wait"}">${n.opts.map((o, i) => `<button class="talk-opt ${o.kind || ""}" data-a="talk" data-v="${i}" style="--i:${i}">${o.face ? moodFace(o.face, 26) : o.icon ? icon(o.icon) : ""}<span>${esc(o.label)}</span></button>`).join("")}</div>` : ""}
      ${n.note ? `<p class="talk-note">${icon("shield")}<span>${tt("note_companion")}</span></p>` : ""}
    </div></div>`;
}
function runTypewriter() {
  const el = document.querySelector(".talk-typed");
  if (!el) return;
  const key = el.dataset.key;
  if (S.talk.typed === key) return;
  S.talk.typed = key;
  const full = el.dataset.full, cjk = /[㐀-鿿]/.test(full), step = cjk ? 1 : 2;
  if (world) world.talk(Math.min(4.5, 0.8 + full.length / (cjk ? 14 : 32)));
  let i = 0;
  setTimeout(function tick() {
    if (!el.isConnected) return;
    el.parentNode.querySelector(".talk-dots")?.remove();
    i += step; el.textContent = full.slice(0, i);
    if (i < full.length) setTimeout(tick, 28);
    else el.closest(".talk-box")?.querySelector(".talk-opts")?.classList.remove("wait");
  }, 480);
}
let quipAt = 0, quipN = 0;
function quip(kind, vars = {}) {
  const stage = document.querySelector("[data-stage]");
  if (!stage || !world || Date.now() - quipAt < 1000) return;
  quipAt = Date.now();
  const list = L(QUIPS[kind]);
  let text = list[quipN++ % list.length];
  for (const v in vars) text = text.split(`{${v}}`).join(vars[v]);
  const p = world.headScreen();
  stage.querySelector(".quip")?.remove();
  stage.insertAdjacentHTML("beforeend", `<div class="quip" role="status" style="left:${Math.round(p.x)}px;top:${Math.round(p.y - 16)}px">${esc(text)}</div>`);
  setTimeout(() => stage.querySelector(".quip")?.remove(), 1900);
  world.talk(0.8);
}
/* When the Member is quiet for a while, the Companion brings up something real:
   a new answer, a Circle, the season, the night sky. A few times per visit at most. */
setInterval(() => {
  if (!["home", "companion"].includes(S.screen) || S.crisis || S.breathing || S.away) return;
  if (!RESTFUL.includes(S.talk.shown)) return;
  if (Date.now() - lastInput < 14000 || Date.now() - S.talk.at < 14000 || S.talk.ambient >= 4) return;
  const a = document.activeElement;
  if (a && ["INPUT", "TEXTAREA"].includes(a.tagName)) return;
  const next = pickAmbient();
  if (next) { S.talk.ambient++; talkTo(next, { ambient: true }); }
}, 2000);
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => (lastInput = Date.now()), true));

function nameChoice() {
  const has = !!S.realName.trim();
  const ini = displayName("initials"), full = displayName("full");
  const av = n => n ? `<span class="av" style="background:${hueFor(S.realName)}">${esc(initials(n))}</span>` : `<span class="av">${icon("me")}</span>`;
  const opt = (v, title, sub, face) => {
    const on = S.nameShow === v, off = v !== "anon" && !has;
    return `<button class="who-opt ${on ? "on" : ""}" role="radio" aria-checked="${on}" data-a="nameShow" data-v="${v}" ${off ? "disabled" : ""}>${face}
      <span class="t"><b>${title}</b><small>${off ? t("needs_name") : sub}</small>${v === "anon" ? `<span class="tag new" style="margin-top:6px">${t("most_private")}</span>` : ""}</span><span class="radio" aria-hidden="true"></span></button>`;
  };
  return `<div class="name-pick" role="radiogroup" aria-label="${t("show_as")}">
    ${opt("anon", t("show_anon"), t("show_anon_sub"), `<span class="av anon">${icon("mask")}</span>`)}
    ${opt("initials", ini ? `${t("show_initials")} · ${esc(ini)}` : t("show_initials"), t("show_initials_sub"), av(ini))}
    ${opt("full", full ? `${t("show_full")} · ${esc(full)}` : t("show_full"), t("show_full_sub"), av(full))}
  </div>`;
}

/* ---------- onboarding ---------- */
const TOUR = [
  ["welcome_title", "welcome_sub"],
  ["tour_share_title", "tour_share_body"],
  ["tour_circles_title", "tour_circles_body"],
  ["tour_guide_title", "tour_guide_body"],
  ["tour_pet_title", "tour_pet_body"],
];
function tourControls() {
  return `<div class="tour-controls"><button class="tour-arrow" data-a="tour" data-v="prev" aria-label="${t("tour_previous")}" ${S.tour === 0 ? "disabled" : ""}>${icon("back")}</button>
    <div class="tour-dots" role="group" aria-label="${t("tour_label")}">${TOUR.map((slide, i) => `<button data-a="tour" data-v="${i}" aria-label="${t("tour_slide", { n: i + 1, total: TOUR.length })}: ${t(slide[0])}" aria-pressed="${S.tour === i}"><span></span></button>`).join("")}</div>
    <button class="tour-arrow" data-a="tour" data-v="next" aria-label="${t("tour_next")}" ${S.tour === TOUR.length - 1 ? "disabled" : ""}>${icon("chev")}</button></div>`;
}
function mountTour() {
  const track = $(".tour-track");
  if (!track) return;
  track.scrollLeft = S.tour * track.clientWidth;
  let timer;
  track.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!track.isConnected) return;
      const index = Math.round(track.scrollLeft / track.clientWidth);
      if (index === S.tour || index < 0 || index >= TOUR.length) return;
      S.tour = index;
      track.querySelectorAll(".tour-slide").forEach((slide, i) => { slide.inert = i !== index; slide.setAttribute("aria-hidden", i !== index); });
      document.querySelectorAll(".tour-dots button").forEach((button, i) => button.setAttribute("aria-pressed", i === index));
      document.querySelector('.tour-arrow[data-v="prev"]').disabled = index === 0;
      document.querySelector('.tour-arrow[data-v="next"]').disabled = index === TOUR.length - 1;
      $(".tour-status").textContent = t("tour_slide", { n: index + 1, total: TOUR.length });
    }, 100);
  });
  track.addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    actions.tour(e.key === "Home" ? "0" : e.key === "End" ? String(TOUR.length - 1) : e.key === "ArrowLeft" ? "prev" : "next");
  });
}

function speciesPicker() {
  return `<div class="species" role="group" aria-label="${t("change_companion")}">${SPECIES.filter(s => !s.shopOnly || (S.member && S.owned.includes(s.id))).map(s => `<button class="${S.companionChosen && S.species === s.id ? "on" : ""}" data-a="species" data-v="${s.id}" aria-pressed="${S.companionChosen && S.species === s.id}">${thumb(s.id)}${L(s)}</button>`).join("")}</div>`;
}

function onboarding() {
  const st = S.step;
  if (st === 0) return `<div class="welcome">
      <div class="over"><div class="langpick" role="group" aria-label="${t("language")}">${[["en", "EN"], ["ht", "繁"], ["hs", "简"]].map(([l, n]) => `<button class="${S.lang === l ? "on" : ""}" data-a="lang" data-v="${l}" aria-pressed="${S.lang === l}">${n}</button>`).join("")}</div>${helpBtn()}</div>
      <section class="stage welcome" data-stage="welcome"></section>
      <div class="body"><div class="brand"><span class="mark" aria-hidden="true"></span><b>BRC Crossings<span lang="zh-Hant">同渡</span></b></div>
        <div class="tour-track" tabindex="0" role="region" aria-roledescription="carousel" aria-label="${t("tour_label")}">
          ${TOUR.map(([title, body], i) => `<section class="tour-slide" role="group" aria-label="${t("tour_slide", { n: i + 1, total: TOUR.length })}" aria-hidden="${i !== S.tour}" ${i !== S.tour ? "inert" : ""}><h1>${t(title)}</h1><p>${t(body)}</p></section>`).join("")}
        </div>${tourControls()}<span class="tour-status sr-only" aria-live="polite" aria-atomic="true">${t("tour_slide", { n: S.tour + 1, total: TOUR.length })}</span>
        <button class="btn sun block" data-a="next">${t("get_started")}</button>
        <button class="btn ghost block" data-a="signin">${t("have_account")}</button></div></div>`;
  const prog = `<div class="progress" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</div>`;
  let inner = "", ok = true;
  if (st === 1) {
    ok = S.age && S.terms;
    const chk = (k, label, req, sub = "") => `<label class="check"><input type="checkbox" data-a="flag" data-v="${k}" ${S[k] ? "checked" : ""}><span class="t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="tag ${req ? "req" : ""}" style="${req ? "" : "background:var(--mist);color:var(--ink-2)"}">${req ? t("required") : t("optional")}</span></label>`;
    inner = `<h2>${t("age_title")}</h2><p class="lede">${t("age_body")}</p>
      <div class="panel" style="margin:0;padding:2px 14px">${chk("age", t("age_18"), true)}${chk("terms", t("agree_terms"), true)}${chk("optMatch", t("optin_match"), false, t("optin_match_sub"))}${chk("optJournal", t("optin_journal"), false, t("optin_journal_sub"))}</div><details class="panel"><summary>${t("demo_notice")}</summary><p>${t("demo_notice_body")}</p></details>`;
  } else if (st === 2) {
    inner = `<h2>${t("name_title")}</h2><p class="lede">${t("name_sub")}</p>
      <label class="label" for="realName">${t("your_name")}</label>
      <input class="field" id="realName" data-model="realName" value="${esc(S.realName)}" placeholder="${t("name_ph")}" autocomplete="name" maxlength="40">
      <span class="label" style="margin-top:20px">${t("show_as")}</span>${nameChoice()}
      <p class="muted" style="margin:10px 2px 0">${t("change_later")}</p>`;
  } else if (st === 3) {
    ok = S.focuses.length > 0;
    inner = `<h2>${t("focus_title")}</h2><p class="lede">${t("focus_sub")}</p>
      ${FOCUS.map(f => { const on = S.focuses.includes(f.id), main = S.mainFocus === f.id;
        return `<div class="focus-opt ${on ? "on" : ""}"><button class="focus-pick" data-a="focus" data-v="${f.id}" aria-pressed="${on}"><span class="box">${on ? icon("check") : ""}</span>${L(f)}</button>
          ${on ? `<button class="star ${main ? "main" : ""}" data-a="mainFocus" data-v="${f.id}" aria-pressed="${main}" aria-label="${t("set_main")}">${icon("star")}<span>${main ? t("main") : ""}</span></button>` : ""}</div>`; }).join("")}`;
  } else if (st === 4) {
    ok = !!S.state;
    inner = `<h2>${t("state_title")}</h2><p class="lede">${t("state_sub")}</p>
      ${STATES.map(s => `<button class="opt ${S.state === s.id ? "on" : ""}" data-a="state" data-v="${s.id}" aria-pressed="${S.state === s.id}">${icon(s.id === "INTL" ? "globe" : "pin")}<span>${L(s)}</span></button>`).join("")}`;
  } else if (st === 5) {
    ok = S.companionChosen && S.petName.trim().length > 0;
    inner = `<h2>${t("companion_title")}</h2><p class="lede" style="margin-bottom:12px">${t("companion_sub")}</p>
      <section class="stage picker" data-stage="picker"></section>
      ${speciesPicker()}
      <label class="label" for="petName">${t("name_it")}</label>
      <input class="field" id="petName" maxlength="16" value="${esc(S.petName)}" data-model="petName" autocomplete="off">`;
  }
  return `<div class="ob"><div class="ob-top"><button class="icon-btn" data-a="prev" aria-label="${t("back")}">${icon("back")}</button>${prog}${helpBtn()}</div>
    <div class="stepn">${t("step_of", { n: st })}</div>${inner}
    <div class="foot"><button class="btn primary block" data-a="next" ${ok ? "" : "disabled"}>${st === 5 ? t("enter") : t("continue")}</button></div></div>`;
}

/* ---------- screens ---------- */
function greeting() { const h = hour(); return t(h < 12 && h >= 4 ? "greet_morning" : h < 18 && h >= 12 ? "greet_afternoon" : "greet_evening", { name: callName() }); }
const HOME_FEATURES = [
  {title:"hero_community", body:"hero_community_body", label:"community", screen:"circles", image:"community", position:"50% 50%"},
  {title:"hero_guidance", body:"hero_guidance_body", label:"counselor", screen:"guide", image:"counselor", position:"50% 50%"},
  {title:"hero_friends", body:"hero_friends_body", label:"friends_title", screen:"friends", image:"friends", position:"50% 50%"},
  {title:"hero_reflect", body:"hero_reflect_body", label:"companion", screen:"companion", image:"companion", position:"50% 50%"},
  {title:"hero_checkin", body:"hero_checkin_body", label:"hero_checkin_label", screen:"companion", image:"checkin", position:"50% 0%"},
];
let heroCleanup = null;
function heroFeatureCopy() {
  const feature = HOME_FEATURES[S.heroFeature];
  return `<h2><span>${t(feature.title)}</span></h2><p>${t(feature.body)}</p>`;
}
function homeLanguages() {
  return `<div class="home-languages" role="group" aria-label="${t("language")}"><span class="home-language-label">${t("language")}</span>${[["en", "EN", "English"], ["ht", "繁", "繁體中文"], ["hs", "简", "简体中文"]].map(([id, label, name]) => `<button type="button" data-a="lang" data-v="${id}" aria-label="${name}" aria-pressed="${S.lang === id}">${label}</button>`).join("")}</div>`;
}
function homeHero() {
  return `<section class="home-feature-hero" aria-label="${t("hero_label")}"><div class="home-brand"><img src="${window.BRC_LOGO}" alt="${t("clinic_logo")}" width="56" height="56"><div><b>BRC Crossings <span lang="zh-Hant">同渡</span></b><p>${t("welcome_sub")}</p></div></div>${homeLanguages()}<h1><span class="home-masked-title">${t("hero_title")}</span></h1>
    <div class="orbit-container feature-orbit" data-draggable>
      <svg class="orbit-path-svg" data-orbit-svg aria-hidden="true"><path data-orbit-path data-orbit-stroke d="M 100 300 A 200 80 0 1 0 500 300 A 200 80 0 1 0 100 300" transform="rotate(-8 300 300)" fill="none" stroke="#cbd2c9" /></svg>
      ${HOME_FEATURES.map((f,i) => `<div class="orbit-item" data-orbit-item="${i}" data-clickable role="button" tabindex="0" aria-label="${t(f.title)}"><div class="orbit-item-inner"><span class="feature-photo${f.image ? ` feature-photo-${f.image}` : ""}" style="background-position:${f.position}" role="img" aria-label="${t(f.title)}"></span><span class="feature-label">${t(f.label)}</span></div></div>`).join("")}
      <div class="orbit-center-content" data-orbit-center></div>
    </div><div class="hero-orbit-controls"><button type="button" data-hero-step="-1" aria-label="${t("tour_previous")}">${icon("back")}</button><div class="hero-dots">${HOME_FEATURES.map((f,i) => `<button type="button" data-hero-index="${i}" aria-label="${t(f.title)}" aria-pressed="${S.heroFeature === i}"></button>`).join("")}</div><button type="button" data-hero-step="1" aria-label="${t("tour_next")}">${icon("chev")}</button><button type="button" data-hero-pause>${t(S.heroPaused ? "hero_resume" : "hero_pause")}</button></div>
    <div class="hero-feature-copy" aria-live="polite" aria-atomic="true">${heroFeatureCopy()}</div><button class="btn primary block star-border" data-a="getStarted"><canvas class="star-border__light" aria-hidden="true"></canvas>${t("get_started")}</button><button class="btn quiet block star-border" data-a="signin"><canvas class="star-border__light" aria-hidden="true"></canvas>${t("hero_signin")}</button><button class="app-tour-launch" data-a="appTourStart">${t("app_tour_start")}</button></section>`;
}
function mountHomeHero() {
  const root = document.querySelector('.feature-orbit');
  if (!root) return;
  const panel = root.closest('.home-feature-hero'), motion = matchMedia('(prefers-reduced-motion: reduce)');
  const config = {current:{baseWidth:600, rotation:-8, duration:40, itemSize:180, direction:'normal', fill:true, pathWidth:1, pathDash:0, easing:'linear', paused:S.heroPaused, depth:.6, hoverScale:1.04, hoverSpeed:0, draggable:true, clickToFront:true, alignToPath:false, intro:false, sources:HOME_FEATURES.map(f => f.title), onFrontChange:(index, side) => select(index, side)}};
  const engine = window.BRCOrbit(root, config, () => {});
  const borders = [...panel.querySelectorAll('.star-border')].map(window.BRCStarBorder);
  const pauseButton = panel.querySelector('[data-hero-pause]');
  function syncPause() { panel.toggleAttribute('data-title-paused', S.heroPaused || document.hidden); borders.forEach(border => border.setPaused(S.heroPaused)); config.current.paused = S.heroPaused || !!panel.querySelector('.orbit-item:focus-visible'); pauseButton.textContent = t(motion.matches ? 'hero_motion_off' : S.heroPaused ? 'hero_resume' : 'hero_pause'); pauseButton.disabled = motion.matches; engine.wake(); }
  function select(index, side) {
    if (index === S.heroFeature) return;
    S.heroFeature = index;
    const copy = panel.querySelector('.hero-feature-copy');
    copy.style.setProperty('--copy-offset', `${side * 32}px`);
    copy.innerHTML = `<div class="hero-copy-slide">${heroFeatureCopy()}</div>`;
    panel.querySelectorAll('[data-hero-index]').forEach(el => el.setAttribute('aria-pressed', String(+el.dataset.heroIndex === S.heroFeature)));
  }
  panel.querySelectorAll('[data-hero-index],[data-hero-step]').forEach(el => el.addEventListener('click', () => { const index = el.hasAttribute('data-hero-index') ? +el.dataset.heroIndex : (S.heroFeature + +el.dataset.heroStep + HOME_FEATURES.length) % HOME_FEATURES.length; engine.bringToFront(index); }));
  pauseButton.addEventListener('click', () => { S.heroPaused = !S.heroPaused; syncPause(); });
  panel.addEventListener('focusin', syncPause);
  panel.addEventListener('focusout', () => queueMicrotask(syncPause));
  motion.addEventListener('change', syncPause);
  document.addEventListener('visibilitychange', syncPause);
  const initialFeature = S.heroFeature;
  engine.refresh(); engine.bringToFront(initialFeature); syncPause();
  heroCleanup = () => { borders.forEach(border => border.destroy()); engine.destroy(); motion.removeEventListener('change', syncPause); document.removeEventListener('visibilitychange', syncPause); };
}
function home() {
  return S.member ? memberHome() : `<div class="scroll home-entry">${homeHero()}${installCard()}</div>`;
}
/* ---------- install as an app ---------- */
let installEvent = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvent = e; render(); });
window.addEventListener("appinstalled", () => { installEvent = null; render(); });
function installCard() {
  if (standalone()) return "";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<section class="panel install-card">${icon("phone")}<div><b>${t("install_title")}</b><p class="muted">${t(installEvent ? "install_ready" : ios ? "install_ios" : "install_other")}</p>${installEvent ? `<button class="btn primary sm" data-a="install">${t("install_btn")}</button>` : ""}</div></section>`;
}
/* ---------- the Member's Home ----------
   What changed for them, then friends, then their Circles, then the rest of the community.
   Each post shows once. Friends appear only through named posts and named replies;
   anonymous posts and replies never reveal who wrote them. */
const isFriend = id => S.friendships[id] === "friend";
function friendReplies() {
  const friends = MEMBERS.filter(m => isFriend(m.id));
  return S.posts.flatMap(p => p.replies.filter(r => !r.held).map(r => ({ p, r, m: friends.find(m => m.name === r.author) }))).filter(x => x.m);
}
function todayCard() {
  const m = S.checkedIn && MOODS.find(x => x.id === S.mood);
  const sub = !S.checkedIn ? t("daily_sub") : S.daily.done ? dailySummary() : L(m);
  return `<section class="panel today-card">${m ? `<span class="today-pet">${moodFace(m, 44)}</span>` : `<span class="today-pet">${thumb(S.species)}</span>`}
    <span class="today-copy"><b>${S.checkedIn ? t("checked_in") : t("daily_title")}</b><span class="muted">${sub}</span>
    ${S.checkedIn ? `<button class="btn quiet sm" data-a="tab" data-v="companion">${t("home_visit", { pet: esc(S.petName) })}</button>` : `<button class="btn sun sm" data-a="tab" data-v="companion">${t("daily_start")}</button>`}</span></section>`;
}
function memberHome() {
  const shown = new Set(), take = list => list.filter(p => !shown.has(p.id) && shown.add(p.id));
  const all = S.posts.filter(canSee);
  const fresh = take(all.filter(p => (p.unseenAnswer || p.mine) && !S.seen[p.id]));
  const friends = take(all.filter(p => !p.anon && p.memberId && isFriend(p.memberId)));
  const circles = take(all.filter(p => S.joined.includes(p.circle)));
  const rest = take(all);
  const hasFriends = MEMBERS.some(m => isFriend(m.id)), replies = friendReplies();
  const posts = list => list.map(p => postPanel(p, { preview: true })).join("");
  const empty = (key, action, v, label) => `<div class="feed-empty"><p>${t(key)}</p><button class="btn quiet sm" data-a="${action}" data-v="${v}">${label}</button></div>`;
  const section = (title, body, more = "") => `<h2 class="section-h">${title}${more}</h2>${body}`;
  const seeAll = (a, v) => `<button class="more" data-a="${a}" data-v="${v}">${t("see_all")}${icon("chev")}</button>`;
  const hello = `<div class="feed-hello"><h1>${greeting()}</h1><p class="muted">${t("home_sub")}</p></div>`;
  const ask = `<button class="askfield" data-a="go" data-v="ask">${icon("ask")}<span>${t("ask_placeholder")}</span></button>`;
  const newBlock = fresh.length ? section(t("home_new"), posts(fresh)) : "";
  // No friends yet: no empty block near the top, only a quiet link at the end.
  const friendsBlock = !hasFriends ? "" : section(t("home_friends"), friends.length ? posts(friends) : `<div class="feed-empty"><p>${t("home_friends_quiet")}</p></div>`, seeAll("go", "friends"));
  const findFriends = hasFriends ? "" : `<div class="pad"><button class="btn quiet block" data-a="go" data-v="friends">${icon("circles")}${t("home_find_friends")}</button></div>`;
  const today = S.checkedIn ? dailyResources()[0] : RESOURCES[0];
  const practiceBlock = section(t("d_for_today"), `<button class="guide practice-today" data-a="openPractice" data-v="${today.id}"><span class="av">${icon("learn")}</span><span class="t"><b>${esc(L(today.t))}</b><span>${t("home_practice")} · ${t("library_minutes", { n: today.min })}</span></span>${icon("chev")}</button>`, seeAll("go", "learn"));
  const repliesBlock = hasFriends && replies.length ? section(t("home_friend_replies"), `<div class="list">${replies.map(({ p, r, m }) => {
      const tx = textFor(r.text, r.orig || "en", false);
      return `<button class="li" data-a="thread" data-v="${p.id}">${avatar(m.name, false)}<span class="t"><b>${esc(t(p.anon ? "home_replied_anon" : "home_replied_post", { name: m.name, author: p.author }))}</b><small lang="${tx.lang}">${esc(tx.text)}</small></span>${icon("chev")}</button>`; }).join("")}</div>
      <p class="feed-note">${icon("lock")}<span>${t("home_named_only")}</span></p>`) : "";
  // A Circle post already shown above is not repeated; "no posts" only when the Circles really have none.
  const circlesAny = all.some(p => S.joined.includes(p.circle));
  const circlesBlock = !S.joined.length ? section(t("home_circles"), empty("home_no_circles", "tab", "circles", t("circles")))
    : circles.length || !circlesAny ? section(t("home_circles"), circles.length ? posts(circles) : `<div class="feed-empty"><p>${t("no_posts")}</p></div>`, seeAll("tab", "circles")) : "";
  const restBlock = rest.length ? section(t("home_more"), posts(rest)) : "";
  return `${hdrMain()}<div class="scroll feed-scroll">${hello}${todayCard()}${ask}${newBlock}${guideCard()}${practiceBlock}${friendsBlock}${repliesBlock}${circlesBlock}${restBlock}${findFriends}<div style="height:16px"></div></div>`;
}
function askScreen() {
  const friends = MEMBERS.filter(m => S.friendships[m.id] === "friend");
  return `${hdrSub(t("ask"))}<div class="scroll pad"><h1 class="ask-heading">${t("ask_where")}</h1>
    <button class="panel ask-destination" data-a="go" data-v="${S.match ? "dm" : "guide"}">${icon("shield")}<span><b>${t("ask_counselor")}</b><small>${t("ask_counselor_note")}</small></span>${icon("chev")}</button>
    <button class="panel ask-destination" data-a="go" data-v="compose">${icon("circles")}<span><b>${t("ask_community")}</b><small>${t("ask_community_note")}</small></span>${icon("chev")}</button>
    <section class="panel friends-panel ask-friends"><h2>${t("ask_friend")}</h2><p class="muted">${t("ask_friend_note")}</p>${friends.length ? friends.map(m => `<button class="btn quiet block" data-a="friendChat" data-v="${m.id}">${avatar(m.name,false)}${esc(m.name)}${icon("chev")}</button>`).join("") : `<p>${t("ask_no_friend")}</p>`}<button class="btn quiet block" data-a="go" data-v="friends">${t("friends_title")}</button></section></div>`;
}
function friendDm() {
  const m = MEMBERS.find(m => m.id === S.friendRecipient);
  if (!m || S.friendships[m.id] !== "friend") return askScreen();
  const messages = S.friendMessages[m.id] || [];
  return `${hdrSub(esc(m.name))}<div class="dm-banner"><span>${t("friend_message_demo")}</span></div><div class="scroll">${messages.length ? messages.map(text => `<div class="bubble me">${esc(text)}<small class="friend-local">${t("friend_message_local")}</small></div>`).join("") : `<p class="pad muted">${t("friend_message_empty",{name:esc(m.name)})}</p>`}</div>
    <form class="composer" id="friend-message-form"><input data-friend-draft value="${esc(S.friendDrafts[m.id] || "")}" aria-label="${t("message")}" placeholder="${t("message_ph",{name:esc(m.name)})}"><button type="submit" class="btn primary" aria-label="${t("send")}">${icon("send")}</button></form>`;
}
function sendFriendMessage() {
  const id = S.friendRecipient, text = (S.friendDrafts[id] || "").trim();
  if (S.friendships[id] !== "friend" || !text) return;
  (S.friendMessages[id] ||= []).push(text); S.friendDrafts[id] = ""; render();
}
function compose() {
  const can = S.draft.trim().length > 3;
  const me = displayName(), persona = me ? S.persona : "anon";
  const mine = CIRCLES.filter(c => S.joined.includes(c.id)), circle = mine.find(c => c.id === S.draftCircle);
  const where = mine.length ? `<span class="label">${t("post_where")}</span>
    <div class="chips" style="margin-bottom:18px"><button class="chip ${circle ? "" : "on"}" data-a="draftCircle" data-v="" aria-pressed="${!circle}">${t("post_everyone")}</button>${mine.map(c => `<button class="chip ${circle === c ? "on" : ""}" data-a="draftCircle" data-v="${c.id}" aria-pressed="${circle === c}">${esc(L(c.name))}</button>`).join("")}</div>` : "";
  const topic = circle ? "" : `<span class="label">${t("focus_area")}</span>
    <div class="chips" style="margin-bottom:18px">${FOCUS.map(f => `<button class="chip ${S.draftFocus === f.id ? "on" : ""}" data-a="draftFocus" data-v="${f.id}" aria-pressed="${S.draftFocus === f.id}">${L(f)}</button>`).join("")}</div>`;
  return `${hdrSub(t("ask_title"))}<div class="scroll pad">${where}${topic}
    <label class="label" for="draft">${t("ask_placeholder")}</label>
    <textarea class="field" id="draft" rows="6" placeholder="${t("ask_placeholder")}" data-model="draft">${esc(S.draft)}</textarea>
    <span class="label" style="margin-top:18px">${t("post_as")}</span>
    ${me ? `<div class="seg" role="group">${[["anon", "mask", t("anonymous")], ["named", "me", esc(me)]].map(([v, ic, lb]) => `<button class="${persona === v ? "on" : ""}" data-a="persona" data-v="${v}" aria-pressed="${persona === v}">${icon(ic)}${lb}</button>`).join("")}</div>`
      : `<div class="seg"><button class="on" aria-pressed="true" disabled style="color:var(--forest)">${icon("mask")}${t("anonymous")}</button></div>`}
    <p class="muted" style="display:flex;gap:8px;margin:10px 2px 0">${icon(persona === "anon" ? "lock" : "me")}<span>${me ? (persona === "anon" ? t("anon_note") : t("named_note")) : `${t("anon_note")} ${t("always_anon")}`}</span></p>
    <button class="btn primary block" style="margin-top:22px" data-a="post" ${can ? "" : "disabled"}>${icon(persona === "anon" ? "mask" : "me")}${persona === "anon" ? t("post_anon") : esc(t("post_named", { who: me }))}</button>
  </div>`;
}
function thread() {
  const p = S.posts.find(x => x.id === S.thread) || S.posts[0];
  const tr = S.showOriginal[p.id];
  const visible = p.replies.map((r, i) => ({ r, i })).filter(({ r }) => !r.hiddenForMe && (!r.held || r.mine));
  const me = displayName(), who = S.replyPersona === "anon" || !me ? t("anonymous") : me;
  return `${hdrSub(focusName(p.focus))}<div class="scroll"><div style="height:6px"></div>${postPanel(p, { full: true })}
    ${visible.length ? `<h2 class="section-h" style="font-size:var(--fs-m)">${visible.length === 1 ? t("reply_1") : t("replies_n", { n: visible.length })}</h2>
      <div class="list">${visible.map(({ r, i }) => { const tx = textFor(r.text, r.orig || "en", tr && !r.mine); const anon = r.author === "Anonymous";
        return `<div class="li" style="align-items:flex-start">${avatar(r.author, anon)}<span class="t"><b>${anon ? t("anonymous") : esc(r.author)}${r.held ? ` <span class="tag held">${t("held")}</span>` : ""}</b><span lang="${tx.lang}">${esc(tx.text)}</span></span><button class="more-btn" data-a="postMenu" data-v="${p.id}:${i}" aria-label="${t("more_actions")}">${icon("more")}</button></div>`; }).join("")}</div>` : ""}
    <div style="height:16px"></div></div>
    <div class="as-wrap"><div class="as">${icon(S.replyPersona === "anon" || !me ? "mask" : "me")}<span>${t("replying_as", { who: esc(who) })}</span>${me ? `<button data-a="replyPersona">${icon("swap")}${t("switch_identity")}</button>` : ""}</div>
    <div class="composer"><input placeholder="${t("reply_placeholder")}" data-model="replyDraft" value="${esc(S.replyDraft)}" aria-label="${t("reply")}"><button class="btn primary" data-a="reply" aria-label="${t("reply")}">${icon("send")}</button></div></div>`;
}
/* Help lines at two levels: "crisis" lists every line for the Member's location (988 first, 911 last);
   "reach" offers only 988, framed as someone to talk to, not an emergency. */
function findHelpList(level = "crisis") {
  if (S.state === "INTL") return `<a class="line" href="https://findahelpline.com" target="_blank" rel="noopener"><span class="t"><span class="num">${t("intl_help")}</span><small>${t("intl_help_sub")}</small></span><span class="call ext">${icon("external")}</span></a>`;
  const ids = level === "reach" ? ["988"] : LINES_FOR[S.state] || LINES_FOR.OTHER;
  const lines = ids.map(id => { const l = CRISIS_LINES[id]; return `<a class="line" href="tel:${l.call}" aria-label="${t("call", { n: l.n })}"><span class="t"><span class="num">${l.n}</span><small>${level === "reach" && id === "988" ? t("line_988_reach") : L(l.d)}</small></span><span class="call">${icon("phone")}</span></a>${id === "988" ? `<a class="line line-text" href="sms:988"><span class="t"><span class="txt">${t("text_988")}</span></span><span class="call ext">${icon("chat")}</span></a>` : ""}`; }).join("");
  return S.state ? lines : lines + `<a class="line" href="https://findahelpline.com" target="_blank" rel="noopener"><span class="t"><span class="num" style="font-size:var(--fs-m)">${t("intl_help")}</span><small>${t("intl_help_sub")}</small></span><span class="call ext">${icon("external")}</span></a>`;
}
function guide() {
  if (S.appTour !== null && S.screen === "guide") {
    const c = COUNSELORS[0];
    return `${hdrSub(t("my_guide"))}<div class="scroll"><p class="pad muted">${t("app_tour_guide_sample")}</p><article class="panel cc tour-guide-sample"><div class="cc-top"><span class="av" style="background:${c.hue};width:48px;height:48px">${initials(c.name)}</span><div><div class="nm">${esc(c.name)}</div><div class="meta">${guideLanguages(c)}</div></div></div><p>${esc(L(c.bio))}</p><span class="tag">${t("app_tour_sample_label")}</span></article></div>`;
  }
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
    <div class="pad" style="padding-top:0"><button class="chip ${wantsZh() ? "on" : ""}" data-a="guideZh" aria-pressed="${wantsZh()}">${wantsZh() ? icon("check") : ""}${t("guide_zh")}</button></div>
    ${cur ? guideCard() : ""}
    ${list.length ? list.map(c => `<article class="panel cc"><div class="cc-top"><span class="av" style="background:${c.hue};width:48px;height:48px">${initials(c.name)}</span><div><div class="nm">${esc(c.name)}</div><div class="meta">${guideLanguages(c)} · ${t("licensed_in", { s: c.states.join(", ") })}</div></div></div>
      <p>${L(c.bio)}</p>${c.approaches && c.approaches.length ? `<p class="approaches">${t("guide_approaches")}: ${c.approaches.map(id => `<span class="kind-chip kind-${id}">${L(supportKind(id))}</span>`).join("")}</p>` : ""}${S.match === c.id ? `<span class="tag answer">${icon("check")}${t("my_guide")}</span>` : `<button class="btn quiet block" data-a="match" data-v="${c.id}">${t("choose_guide")}</button>`}</article>`).join("")
      : `<div class="notice"><h3>${t("all_full_title")}</h3><p>${t("all_full_body")}</p><button class="btn primary" data-a="toast" data-v="waitlisted">${t("waitlist")}</button></div>`}
    <div style="height:12px"></div></div>`;
}
function dm() {
  const c = counselor(S.match);
  if (!c) return guide();
  const mood = S.shareMood && S.checkedIn ? MOODS.find(x => x.id === S.mood) : null;
  const msgs = S.dm.filter(m => m.type !== "book").map(m => `<div class="bubble ${m.me ? "me" : "them"}">${m.me ? "" : `<span class="from">${t("sample_reply")} · ${esc(c.name)}</span>`}${esc(m.key ? t(m.key, { me: callName(), c: c.name.split(",")[0] }) : m.text)}</div>`).join("");
  return `${hdrSub(esc(c.name))}<div class="dm-banner">${icon("shield")}<span>${t("dm_banner")} ${t(PERSIST ? "chat_storage" : "temporary_storage")}</span></div>${mood ? `<div class="dm-mood">${moodFace(mood, 22)}<span>${t("dm_mood_shared", { mood: L(mood) })}</span></div>` : ""}
    <div class="scroll" id="dmScroll"><div style="height:12px"></div>${msgs}<div class="list">${clinicRow()}</div><div style="height:8px"></div></div>
    <div class="composer"><input placeholder="${t("message_ph", { name: esc(c.name.split(" ")[0]) })}" data-model="dmDraft" value="${esc(S.dmDraft)}" aria-label="${t("message")}"><button class="btn primary" data-a="sendDm" aria-label="${t("send")}">${icon("send")}</button></div>`;
}
/* ---------- post-check-in care ---------- */
let careAudio = null;
function stopCareAudio() {
  if (careAudio) { careAudio.close(); careAudio = null; }
  S.careSound = null;
}
async function playCareAudio(kind) {
  stopBackgroundMusic();
  stopCareAudio();
  try {
    const ctx = new AudioContext(); careAudio = ctx;
    const master = ctx.createGain(); master.gain.value = S.careVolume / 100 * .25; master.connect(ctx.destination); ctx.careGain = master;
    if (kind === "ambient") {
      [174.61, 261.63, 349.23].forEach(hz => { const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.value = hz; gain.gain.value = .12; osc.connect(gain).connect(master); osc.start(); });
    } else {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), swell = ctx.createGain();
      noise.buffer = buffer; noise.loop = true; filter.type = "lowpass"; filter.frequency.value = kind === "rain" ? 1600 : 550;
      swell.gain.value = .45; noise.connect(filter).connect(swell).connect(master); noise.start();
      if (kind === "waves") { const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = .1; depth.gain.value = .35; lfo.connect(depth).connect(swell.gain); lfo.start(); }
    }
    await ctx.resume();
    if (careAudio !== ctx) return;
    S.careSound = kind; render();
  } catch { stopCareAudio(); toast(t("care_audio_error")); render(); }
}
function carePanel() {
  const happy = ["good", "great"].includes(S.mood);
  const button = (id, key) => `<button class="btn quiet" data-a="care" data-v="${id}" aria-pressed="${S.care === id}">${t(key)}</button>`;
  let body = "";
  if (S.care === "listen") body = `<p>${t("care_audio_note")}</p><div class="care-options">${["ambient","rain","waves"].map(kind => `<button class="btn quiet" data-a="carePlay" data-v="${kind}" aria-pressed="${S.careSound === kind}">${S.careSound === kind ? icon("check") : ""}${t("care_" + kind)}</button>`).join("")}</div><label class="label" for="care-volume">${t("care_volume")}</label><input id="care-volume" type="range" min="0" max="100" value="${S.careVolume}"><button class="btn primary" data-a="careStop" ${S.careSound ? "" : "disabled"}>${t("care_stop")}</button>`;
  if (S.care === "write" && !S.optJournal) body = `<p>${t("journal_off")}</p><button class="btn primary" data-a="flagOn" data-v="optJournal">${t("journal_on")}</button>`;
  if (S.care === "write" && S.optJournal) body = `<p>${t("care_journal_note")}</p><label class="label" for="journal-draft">${t(happy ? "care_good_prompt" : "care_prompt")}</label><textarea class="field" id="journal-draft" rows="5" data-model="journalDraft">${esc(S.journalDraft)}</textarea><button class="btn primary block" data-a="saveJournal" ${S.journalDraft.trim() ? "" : "disabled"}>${t("care_save")}</button>${S.journalEntries.length ? `<h3>${t("care_entries")}</h3>${S.journalEntries.map(entry => `<article class="care-entry"><small>${activityDate(entry.date)}</small><p>${esc(entry.text)}</p></article>`).join("")}` : ""}`;
  if (["sit", "celebrate"].includes(S.care)) body = `<p>${t(S.care === "sit" ? "care_sit_note" : "care_savor_note", {pet:esc(S.petName)})}</p>`;
  if (S.care === "share") {
    const friends = MEMBERS.filter(m => S.friendships[m.id] === "friend");
    body = `<p>${t("care_share_note")}</p><div class="chips">${[["moment","care_share"],["thank","care_thank"]].map(([id,key]) => `<button class="chip ${S.careShareMode === id ? "on" : ""}" data-a="careShareMode" data-v="${id}" aria-pressed="${S.careShareMode === id}">${t(key)}</button>`).join("")}</div>${S.careShareMode === "moment" ? `<button class="btn primary block" data-a="careCommunity">${t("ask_community")}</button>` : ""}${friends.map(m => `<button class="btn quiet block" data-a="careFriend" data-v="${m.id}">${esc(m.name)}</button>`).join("")}${!friends.length ? `<p>${t("ask_no_friend")}</p>` : ""}<button class="btn quiet block" data-a="go" data-v="friends">${t("friends_title")}</button>`;
  }
  return `<section class="panel care-panel"><h2>${t(happy ? "care_happy" : "care_title")}</h2><div class="care-options">${happy ? button("celebrate","care_celebrate") + button("share","care_share_short") : ""}${button("breathe","care_breathe")}${button("listen","care_listen")}${button("write","care_journal")}${button("sit","care_sit")}</div>${S.care ? `<div class="care-content"><p class="muted">${t("care_company",{pet:esc(S.petName)})}</p>${body}</div>` : ""}</section>`;
}
function companionScreen() {
  const sp = L(species(S.species));
  const checkin = dailyPanel();
  const top = isRoot();
  return `${top ? hdrRoot(t("companion")) : hdrSub(t("companion"))}<div class="scroll" id="compScroll">
    <section class="stage companion" data-stage="companion">
      <div class="stage-copy ${skyDark() ? "dark" : ""}"><h1>${esc(S.petName)}</h1><p>${sp}</p></div>
      ${S.breathing ? `<div class="breathe"><div class="ring"></div><div class="say"><span>${t("breathe_in")}</span><span>${t("breathe_out")}</span></div><button class="btn quiet" data-a="breathe">${t("done")}</button></div>` : ""}
    </section>
    <div class="sheet-top">
      ${S.breathing ? "" : talkBox("companion")}
      ${checkin}
      ${S.checkedIn ? carePanel() : ""}
      <div class="pad"><h2>${t("change_companion")}</h2>${speciesPicker()}</div>
      ${scenePicker()}
      ${activityLink()}
      <h2 class="section-h">${t("badges")}</h2>
      <div class="badges">${BADGES.map(b => { const on = (b.id === "first_checkin" && S.history.length > 0) || (b.id === "first_post" && S.posted) || (b.id === "thirty" && S.history.length >= 30);
        return `<div class="badge ${on ? "earned" : ""}"><div class="b">${icon(b.icon)}</div>${L(b)}</div>`; }).join("")}</div>
      <h2 class="section-h">${t("shop")}<button class="more" data-a="go" data-v="shop">${t("see_all")}${icon("chev")}</button></h2>
      <div class="grid2">${SHOP.slice(0, 2).map(shopItem).join("")}</div>
    </div></div>`;
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
    return `<div class="li"><button class="t" style="border:0;background:none;text-align:left;padding:0;min-height:44px" data-a="circle" data-v="${c.id}"><b>${esc(L(c.name))}</b><small>${focusName(c.focus)} · ${t("members_n", { n: c.members })}</small></button>
      <span class="lang-pill">${circleLanguage(c)}</span><button class="btn ${j ? "quiet" : "primary"} sm" data-a="join" data-v="${c.id}" aria-pressed="${j}">${j ? t("joined") : t("join")}</button></div>`; }).join("")}</div>`;
}
function circlesScreen() {
  const top = isRoot();
  return `${top ? hdrRoot(t("circles")) : hdrSub(t("circles"))}<div class="scroll"><p class="pad muted" style="margin:0;display:flex;gap:8px">${icon("lock")}<span>${t("members_only")}</span></p>${circleList()}<div style="height:12px"></div></div>`;
}
function circleScreen() {
  const c = CIRCLES.find(x => x.id === S.circle) || CIRCLES[0];
  const posts = S.posts.filter(p => p.circle === c.id && !p.hiddenForMe);
  const joined = S.joined.includes(c.id);
  return `${hdrSub(esc(L(c.name)))}<div class="scroll"><p class="pad muted" style="margin:0;display:flex;gap:8px">${icon("lock")}<span>${t("members_n", { n: c.members })} · ${circleLanguage(c)} · ${focusName(c.focus)}</span></p>
    ${joined ? `<div class="pad" style="padding-top:0"><button class="btn primary block" data-a="composeIn" data-v="${c.id}">${icon("ask")}${t("post_in_circle")}</button></div>
        ${posts.length ? posts.map(p => postPanel(p, { preview: true })).join("") : `<div class="notice"><p>${t("circle_first")}</p></div>`}`
      : `<div class="notice"><h3>${t("join_to_see")}</h3><p>${t("members_only")}</p><button class="btn primary" data-a="join" data-v="${c.id}">${t("join")}</button></div>`}</div>`;
}
/* ---------- practice filtering ---------- */
function filteredPractices() {
  const query = S.practiceQuery.trim().toLocaleLowerCase();
  return RESOURCES.filter(r => (!S.savedOnly || S.savedPractices.includes(r.id))
    && (!S.practiceKind || r.kind === S.practiceKind)
    && (!S.practiceTopic || r.f === S.practiceTopic)
    && (!S.practiceLanguage || r.languages.includes(S.practiceLanguage))
    && (!S.practiceDuration || (S.practiceDuration === "short" ? r.min <= 3 : S.practiceDuration === "medium" ? r.min >= 4 && r.min <= 5 : r.min >= 6))
    && (!query || (S.practiceLanguage ? [S.practiceLanguage] : r.languages).some(lang =>
      [r.t[lang], ...r.steps.map(step => step[lang]), (FOCUS.find(f => f.id === r.f) || {})[lang]].join(" ").toLocaleLowerCase().includes(query))));
}
/* ---------- practice presentation ---------- */
function practiceLang() { return { en: "en", ht: "zh-Hant", hs: "zh-Hans" }[S.practiceLanguage || S.lang]; }
function practiceText(text) { return text[S.practiceLanguage || S.lang] || text.en; }
const supportKind = id => SUPPORT_KINDS.find(k => k.id === id) || SUPPORT_KINDS[0];
function practiceMeta(r) {
  const k = supportKind(r.kind);
  return `<span class="practice-meta"><span class="kind-chip kind-${k.id}">${L(k)}</span>${focusName(r.f)} · ${t("library_minutes", { n: r.min })}</span>${k.selfCare ? `<span class="selfcare-note">${t("library_selfcare")}</span>` : ""}`;
}
function practiceSave(r) {
  const saved = S.savedPractices.includes(r.id);
  return `<button class="btn quiet" data-a="savePractice" data-v="${r.id}" aria-pressed="${saved}" aria-label="${t(saved ? "library_unsave" : "library_save")}: ${esc(practiceText(r.t))}">${icon(saved ? "check" : "heart")}${t(saved ? "library_saved" : "library_save")}</button>`;
}
function practiceResults() {
  const rows = filteredPractices();
  return `<p class="muted" role="status">${t("library_count", { n: rows.length })}</p>${rows.length ? rows.map(r => `<article class="panel practice-card">${practiceMeta(r)}<h2 lang="${practiceLang()}">${esc(practiceText(r.t))}</h2><p lang="${practiceLang()}">${esc(practiceText(r.steps[0]))}</p><div class="practice-actions"><button class="btn primary" data-a="openPractice" data-v="${r.id}">${t("library_open")}${icon("chev")}</button>${practiceSave(r)}</div></article>`).join("") : `<div class="notice"><p>${t(S.savedOnly && !S.savedPractices.length ? "library_no_saved" : "library_empty")}</p><button class="btn quiet" data-a="clearPracticeFilters">${t("library_clear")}</button>${S.savedOnly ? `<button class="btn primary" data-a="practiceTab" data-v="all">${t("library_all")}</button>` : ""}</div>`}`;
}
function learnScreen() {
  const select = (key, label, options) => `<label class="practice-filter">${t(label)}<select class="field" data-library-filter="${key}">${options.map(([value, text]) => `<option value="${value}" ${S[key] === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  return `${hdrSub(t("practice_library"))}<div class="scroll"><div class="pad practice-controls"><h1>${t("library_intro")}</h1><p class="muted">${t("library_note")}</p>
    <div class="chips">${["all", "saved"].map(tab => `<button class="chip ${S.savedOnly === (tab === "saved") ? "on" : ""}" aria-pressed="${S.savedOnly === (tab === "saved")}" data-a="practiceTab" data-v="${tab}">${t(tab === "all" ? "library_all" : "library_saved")}${tab === "saved" ? ` (${S.savedPractices.length})` : ""}</button>`).join("")}</div>
    <label class="label" for="practice-search">${t("library_search")}</label><input id="practice-search" type="search" class="field" data-model="practiceQuery" value="${esc(S.practiceQuery)}" placeholder="${t("library_search")}">
    <div class="practice-filters">${select("practiceKind", "library_kind", [["",t("library_any")], ...SUPPORT_KINDS.map(k => [k.id,L(k)])])}${select("practiceTopic", "library_topic", [["",t("library_any")], ...FOCUS.map(f => [f.id,L(f)])])}${select("practiceDuration", "library_duration", [["",t("library_any")], ...["short","medium","long"].map(v => [v,t("library_"+v)])])}${select("practiceLanguage", "library_language", [["",t("library_any")],["en","English"],["ht","繁體中文"],["hs","简体中文"]])}</div><button class="btn quiet" data-a="clearPracticeFilters">${t("library_clear")}</button>
    <div id="practice-results">${practiceResults()}</div></div></div>`;
}
function practiceScreen() {
  const r = RESOURCES.find(r => r.id === S.practice);
  if (!r) return learnScreen();
  return `${hdrSub(t("practice_library"))}<div class="scroll"><article class="pad practice-detail">${practiceMeta(r)}<h1 lang="${practiceLang()}">${esc(practiceText(r.t))}</h1><p class="muted">${t("library_gentle")}</p><ol lang="${practiceLang()}">${r.steps.map(step => `<li>${esc(practiceText(step))}</li>`).join("")}</ol>${practiceSave(r)}<p class="muted">${t("library_note")}</p><button class="btn primary block" data-a="practiceDone">${t("library_finish")}</button></article></div>`;
}
/* ---------- friendship transitions ---------- */
function changeFriendship(id, action) {
  if (!MEMBERS.some(m => m.id === id)) return;
  const current = S.friendships[id];
  if (action === "send" && !current) S.friendships[id] = "outgoing";
  if (action === "accept" && current === "incoming") S.friendships[id] = "friend";
  if ((action === "decline" && current === "incoming") || (action === "cancel" && current === "outgoing") || (action === "remove" && current === "friend")) delete S.friendships[id];
}
/* ---------- friends presentation ---------- */
function friendButton(id) {
  const state = S.friendships[id];
  return `<button class="btn quiet" data-a="${state ? "go" : "friendSend"}" data-v="${state ? "friends" : id}">${t(state === "friend" ? "friends_title" : state === "incoming" ? "friend_review" : state === "outgoing" ? "friend_pending" : "friend_add")}</button>`;
}
function friendsScreen() {
  const group = (status, title, empty) => {
    const members = MEMBERS.filter(m => (S.friendships[m.id] || "none") === status);
    const action = (m, a, key) => `<button class="btn quiet" data-a="friendAction" data-v="${m.id}:${a}" aria-label="${t(key)}: ${esc(m.name)}">${t(key)}</button>`;
    return `<section class="panel friends-panel"><h2>${t(title)} (${members.length})</h2>${members.length ? members.map(m => `<div class="friend-row">${avatar(m.name, false)}<b>${esc(m.name)}</b><div class="friend-actions">${status === "incoming" ? action(m,"accept","friend_accept") + action(m,"decline","friend_decline") : status === "outgoing" ? action(m,"cancel","friend_cancel") : status === "friend" ? action(m,"remove","friend_remove") : friendButton(m.id)}</div></div>`).join("") : `<p class="muted">${t(empty)}</p>`}</section>`;
  };
  return `${hdrSub(t("friends_title"))}<div class="scroll"><p class="pad muted">${t("friend_note")}</p>${group("friend","friends_title","friend_empty")}${group("incoming","friend_incoming","friend_no_requests")}${group("outgoing","friend_outgoing","friend_no_requests")}${group("none","friend_people","friend_no_requests")}<div class="pad"><button class="btn quiet block" data-a="friendDemo" ${S.friendships.jenny ? "disabled" : ""}>${t("friend_demo")}</button></div></div>`;
}
/* Counselor preview is isolated from member journals, messages and identity data. */
const CW = {
  tab: 'inbox', selected: null, drafts: {}, replies: {}, resolved: {}, flags: {},
  accepting: true, away: false, response: 'day2',
  bio: null,
  topic: '', language: '',
};
const CW_MEMBERS = [
  { id: 'm1', name: 'L.Z.', topic: 'parenting', language: 'en', mood: 'unshared' },
  { id: 'm2', name: 'A.M.', topic: 'stress', language: 'en', mood: 'shared_good' },
];
const CW_QUESTIONS = [
  { id: 'q1', name: 'Anonymous', topic: 'parenting', language: 'en' },
  { id: 'q2', name: 'Anonymous', topic: 'stress', language: 'zh' },
  { id: 'q3', name: 'Kevin W.', topic: 'relationships', language: 'en' },
];
function counselorWorkspace() {
  const all = [...CW_MEMBERS, ...CW_QUESTIONS], selected = all.find(x => x.id === CW.selected);
  const label = key => t("cw_" + key);
  const name = x => x.name === "Anonymous" ? t("anonymous") : esc(x.name);
  const status = x => label(CW.resolved[x.id] ? "resolved" : CW.replies[x.id]?.length ? "replied" : "needs_reply");
  const card = x => `<button class="panel cw-card" data-a="cwOpen" data-v="${x.id}"><span class="cw-meta">${label(x.topic)} · ${label(x.language)} · ${status(x)}</span><b>${name(x)}</b><p>${label(x.id)}</p><span class="cw-link">${label("open")} ${icon('chev')}</span></button>`;
  let body = '';
  if (selected) {
    const publicQuestion = CW_QUESTIONS.includes(selected);
    body = `<button class="btn quiet" data-a="cwClose">${icon('back')} ${label(publicQuestion ? "back_community" : "back_inbox")}</button><section class="panel cw-panel"><span class="cw-meta">${publicQuestion ? label("public") : label("private")}</span><h2>${name(selected)}</h2><p>${label(selected.id)}</p>${selected.name === 'Anonymous' ? `<p class="cw-note">${label("anon_note")}</p>` : ''}${(CW.replies[selected.id] || []).map(text => `<div class="cw-reply"><b>${label("your_reply")}</b><p>${esc(text)}</p></div>`).join('')}<label class="label" for="cw-reply">${publicQuestion ? label("public_reply") : label("member_reply")}</label><textarea class="field" id="cw-reply" rows="5" data-cw-draft>${esc(CW.drafts[selected.id] || '')}</textarea><p class="muted">${label("guidance")}</p><button class="btn primary" data-a="cwReply" ${(CW.drafts[selected.id] || '').trim() ? '' : 'disabled'}>${label("save_reply")}</button><div class="cw-actions"><button class="btn quiet" data-a="cwResolve">${CW.resolved[selected.id] ? label("reopen") : label("resolve")}</button><button class="btn quiet" data-a="cwFlag">${CW.flags[selected.id] ? label("undo_flag") : label("flag")}</button></div>${CW.flags[selected.id] ? `<p role="status" class="cw-note">${label("flag_note")}</p>` : ''}</section>`;
  } else if (CW.tab === 'inbox') {
    body = `<h1>${label("your_questions")}</h1><p class="cw-note">${CW.away ? label("away") : label("available")} · ${CW.accepting ? label("accepting") : label("closed")}<br>${label("expected")}: ${label(CW.response)}</p><p class="muted">${t("cw_assigned", { n: CW_MEMBERS.filter(x => !CW.resolved[x.id]).length })}</p>${CW_MEMBERS.map(card).join('')}`;
  } else if (CW.tab === 'community') {
    const rows = CW_QUESTIONS.filter(x => (!CW.topic || x.topic === CW.topic) && (!CW.language || x.language === CW.language));
    body = `<h1>${label("questions")}</h1><p class="muted">${label("question_note")}</p><div class="cw-filters"><label>${label("topic")}<select class="field" data-cw-filter="topic">${['','parenting','stress','relationships'].map(v => `<option value="${v}" ${CW.topic === v ? 'selected' : ''}>${label(v || 'all_topics')}</option>`).join('')}</select></label><label>${t("language")}<select class="field" data-cw-filter="language">${['','en','zh'].map(v => `<option value="${v}" ${CW.language === v ? 'selected' : ''}>${label(v || 'all_languages')}</option>`).join('')}</select></label></div>${rows.length ? rows.map(card).join('') : `<p class="notice">${label("no_questions")}</p>`}`;
  } else if (CW.tab === 'members') {
    body = `<h1>${label("my_members")}</h1><p class="cw-note">${label("journal_note")}</p>${CW_MEMBERS.map(m => `<section class="panel cw-panel"><h2>${name(m)}</h2><p>${label(m.topic)} · ${label(m.language)}</p><p><b>${label("mood")}:</b> ${label(m.mood)}</p><button class="btn quiet" data-a="cwOpen" data-v="${m.id}">${label("conversation")}</button></section>`).join('')}`;
  } else {
    body = `<h1>${label("availability")}</h1><section class="panel cw-panel"><h2>Mei Lin, LPC</h2><span class="tag">${label("fictional")}</span><p>${t("english_label")} · ${t("mandarin_label")}<br>${label("states")}<br>${label("specialties")}</p><p class="muted">${label("credentials")}</p></section><form id="cw-profile" class="panel cw-panel"><label class="label" for="cw-bio">${label("intro")}</label><textarea class="field" id="cw-bio" name="bio" rows="3" maxlength="400">${esc(CW.bio ?? label('bio'))}</textarea><label class="label" for="cw-response">${label("expected_time")}</label><select class="field" id="cw-response" name="response">${['day1','day2','day3'].map(v => `<option value="${v}" ${CW.response === v ? 'selected' : ''}>${label(v)}</option>`).join('')}</select><label class="check"><input type="checkbox" name="accepting" ${CW.accepting ? 'checked' : ''}> ${label("accepting")}</label><label class="check"><input type="checkbox" name="away" ${CW.away ? 'checked' : ''}> ${label("away")}</label><button class="btn primary block" type="submit">${label("save_settings")}</button></form><section class="panel cw-panel"><h2>${label("onboard")}</h2><ol><li>${label("invite")}</li><li>${label("submit")}</li><li>${label("verify")}</li><li>${label("set")}</li></ol><p class="muted">${label("simulated")}</p></section>`;
  }
  return `<header class="hdr"><div class="hdr-row"><button class="btn quiet" data-a="go" data-v="me">${icon('back')} ${label("member_view")}</button><b>${t("counselor")}</b></div></header><div class="scroll cw-workspace"><div class="cw-banner"><b>${label("banner")}</b><p>${label("notice")}</p></div><div class="cw-nav" role="group" aria-label="${label("sections")}">${['inbox','community','members','profile'].map(id => `<button class="chip ${CW.tab === id ? 'on' : ''}" data-a="cwTab" data-v="${id}" aria-pressed="${CW.tab === id}">${label(id)}</button>`).join('')}</div><div class="cw-body">${body}</div></div>`;
}

function meScreen() {
  const top = isRoot();
  const sw = (k, label) => `<label class="row"><span class="k">${label}</span><input type="checkbox" class="switch" data-a="flag" data-v="${k}" ${S[k] ? "checked" : ""}></label>`;
  const g = S.match ? counselor(S.match) : null;
  return `${top ? hdrRoot(t("me")) : hdrSub(t("me"))}<div class="scroll">
    <div class="pad" style="display:flex;gap:14px;align-items:center"><span class="item" style="width:92px;height:92px;padding:4px;flex:none"><span class="art" style="width:100%">${thumb(S.species, S.wear.find(w => ["hat", "scarf"].includes(w)))}</span></span>
      <div><div style="font:600 var(--fs-l)/1.2 var(--display);color:var(--forest)">${esc(S.realName.trim() || t("not_set"))}</div><div class="muted">${t("community_sees", { who: esc(displayName() || t("anonymous")) })}</div><div class="muted">${esc(S.petName)} · ${L(species(S.species))}</div>
      <div class="muted" style="display:flex;gap:4px;align-items:center">${icon("star")}${focusName(S.mainFocus || "individual")}${S.focuses.length > 1 ? ` +${S.focuses.length - 1}` : ""}</div></div></div>
    ${settingsLink()}
    <div class="panel" style="padding:2px 14px">
      <div class="row"><span class="k">${t("language")}</span><div class="chips">${[["en", "EN"], ["ht", "繁"], ["hs", "简"]].map(([l, n]) => `<button class="chip ${S.lang === l ? "on" : ""}" style="min-width:48px;justify-content:center" data-a="lang" data-v="${l}" aria-pressed="${S.lang === l}">${n}</button>`).join("")}</div></div>
      <div class="row" style="flex-wrap:wrap"><span class="k" style="flex-basis:100%">${t("location")}</span><div class="chips">${STATES.map(s => `<button class="chip ${S.state === s.id ? "on" : ""}" data-a="state" data-v="${s.id}" aria-pressed="${S.state === s.id}">${L(s)}</button>`).join("")}</div></div>
      <button class="row" style="width:100%;border:0;background:none;text-align:left;color:inherit" data-a="go" data-v="${g ? "dm" : "guide"}"><span class="k">${t("my_guide")}</span><span class="muted">${g ? esc(g.name) : ""}</span>${icon("chev")}</button>
    </div>
    ${activityLink()}
    <button class="panel activity-link" data-a="go" data-v="friends">${icon("circles")}<span><b>${t("friends_title")} (${Object.values(S.friendships).filter(v => v === "friend").length})</b><small>${t("friend_incoming")}: ${Object.values(S.friendships).filter(v => v === "incoming").length}</small></span>${icon("chev")}</button>
    <button class="panel activity-link" data-a="go" data-v="learn">${icon("learn")}<span><b>${t("practice_library")}</b></span>${icon("chev")}</button>
    <h2 class="section-h">${t("privacy")}</h2>
    <div class="panel tour-profile" style="padding:14px">
      <label class="label" for="meName">${t("name_label")}</label>
      <input class="field" id="meName" data-model="realName" value="${esc(S.realName)}" placeholder="${t("name_ph")}" autocomplete="name" maxlength="40">
      <span class="label" style="margin-top:16px">${t("show_as")}</span>${nameChoice()}
    </div>
    <div class="panel" style="padding:2px 14px">${sw("optMatch", t("counselor_matching"))}${sw("shareMood", t("share_mood"))}${sw("optJournal", t("optin_journal"))}</div>
    <div class="pad"><button class="btn quiet block" data-a="go" data-v="counselor">${t("cw_preview")}</button></div>
    ${installCard()}
    <div class="pad"><p class="muted" style="display:flex;gap:8px">${icon("lock")}<span>${t("saved_here")}</span></p><button class="btn ghost block" data-a="erase">${t("start_fresh")}</button></div></div>`;
}
/* Help is stepped to the level of need. The Help pill asks first; Pebble's "talk to someone"
   opens "reach"; risky words, safety answers and held posts open the crisis lines.
   Every level keeps a one-tap emergency line at the bottom. */
function menuTarget() {
  const [pid, ri] = String(S.menu || "").split(":");
  const post = S.posts.find(x => x.id === pid);
  return { post, index: ri === undefined ? null : +ri, item: !post ? null : ri === undefined ? post : post.replies[+ri] };
}
function menuSheet() {
  const { item } = menuTarget();
  if (!item) return "";
  const row = (a, ic, label, sub) => `<button class="li" data-a="${a}">${icon(ic)}<span class="t"><b>${label}</b><small>${sub}</small></span></button>`;
  return `<div class="sheet-bg" data-a="closeMenu"><div class="sheet" role="dialog" aria-modal="true" aria-label="${t("more_actions")}" data-stop>
    <div class="grab"></div><h2 tabindex="-1">${t("more_actions")}</h2><div class="list">${item.mine ? row("menuDelete", "trash", t("delete_mine"), t("delete_sub"))
      : row("menuReport", "flag", t("report"), t("report_sub")) + row("menuHide", "hide", t("hide_post"), t("hide_sub"))}</div>
    <button class="btn quiet block" style="margin-top:6px" data-a="closeMenu">${t("close")}</button></div></div>`;
}
function emergencyRow() {
  return S.state === "INTL" ? `<p class="help-danger">${icon("phone")}<span>${t("help_danger_intl")}</span></p>`
    : `<a class="help-danger" href="tel:911">${icon("phone")}<span>${t("help_danger_now")}</span></a>`;
}
function crisisSheet() {
  const ctx = S.crisis;
  const c = counselor(S.match) || COUNSELORS[0];
  const note = `<p class="muted" style="margin-top:10px">${S.state === "INTL" ? t("crisis_note_intl") : t("crisis_note")}</p>`;
  const other = `<button class="btn ghost block" data-a="helpLevel" data-v="help">${t("help_other")}</button>`;
  const row = (v, ic, label) => `<button class="li" data-a="helpGo" data-v="${v}">${icon(ic)}<span class="t"><b>${label}</b></span>${icon("chev")}</button>`;
  let title, inner;
  if (ctx === "help") {
    title = t("help_ask");
    inner = `<div class="name-pick help-pick">${[["calm", "help_opt_calm", "sun"], ["reach", "help_opt_talk", "chat"], ["crisis", "help_opt_danger", "help"]].map(([v, k, ic]) =>
      `<button class="who-opt help-opt ${v}" data-a="helpLevel" data-v="${v}">${icon(ic)}<span class="t"><b>${t(k)}</b></span>${icon("chev")}</button>`).join("")}</div>${emergencyRow()}`;
  } else if (ctx === "calm") {
    title = t("help_calm_title");
    inner = S.member ? `<p>${t("help_calm_body")}</p><div class="list">${row("breathe", "wind", t("help_breathe", { pet: esc(S.petName || t("companion")) }))}${row("learn", "learn", t("practice_library"))}${row("compose", "ask", t("ask_community"))}</div>${emergencyRow()}${other}`
      : `<p>${t("help_reach_body")}</p>${findHelpList("reach")}${emergencyRow()}${other}`;
  } else if (ctx === "reach") {
    title = t("help_reach_title");
    const guideRow = S.member && licensedHere() ? row("guide", S.match ? "chat" : "shield", S.match ? L(TT.o_msg_guide) : t("find_guide")) : "";
    const book = S.member && licensedHere() ? clinicRow() : "";
    inner = `<p>${t("help_reach_body")}</p>${guideRow || book ? `<div class="list">${guideRow}${book}</div>` : ""}${findHelpList("reach")}${emergencyRow()}${other}`;
  } else {
    title = ctx === "held" ? t("held_title") : ctx === "dm" ? t("dm_held_title") : t("crisis_title");
    const body = ctx === "held" ? t("held_body") : ctx === "dm" ? t("dm_held_body", { c: c.name.split(",")[0] }) : t("help_crisis_body");
    inner = `<p>${body}</p>${findHelpList()}${note}${ctx === "crisis" ? other : ""}`;
  }
  return `<div class="sheet-bg" data-a="closeCrisis"><div class="sheet help-${ctx}" role="dialog" aria-modal="true" aria-label="${title}" data-stop>
    <div class="grab"></div><h2 tabindex="-1">${title}</h2>${inner}
    <button class="btn quiet block" style="margin-top:6px" data-a="closeCrisis">${t("close")}</button></div></div>`;
}

const APP_TOUR = [
  ["circles", "app_tour_circles", "app_tour_circles_body", ".scroll .list .li"],
  ["ask", "app_tour_ask", "app_tour_ask_body", ".ask-destination[data-v=compose]"],
  ["friends", "app_tour_friends", "app_tour_friends_body", ".friends-panel:last-of-type"],
  ["guide", "app_tour_guide", "app_tour_guide_body", ".tour-guide-sample"],
  ["companion", "app_tour_companion", "app_tour_companion_body", "#compScroll .tray"],
  ["learn", "app_tour_library", "app_tour_library_body", ".practice-filters"],
  ["activity", "app_tour_activity", "app_tour_activity_body", ".streak-pair"],
  ["shop", "app_tour_shop", "app_tour_shop_body", ".grid2 .item"],
  ["me", "app_tour_profile", "app_tour_profile_body", ".tour-profile"],
  ["me", "app_tour_settings", "app_tour_settings_body", ".settings-link"],
];
function appTourPanel() {
  const index = S.appTour, step = APP_TOUR[index];
  return `<div class="app-tour-overlay"><div class="app-tour-spotlight" aria-hidden="true"></div><section class="app-tour-card" role="dialog" aria-modal="true" aria-labelledby="app-tour-title" aria-describedby="app-tour-body">
    <div class="app-tour-top"><span>${t("app_tour_demo")}</span><span>${t("app_tour_step", {n:index + 1, total:APP_TOUR.length})}</span></div>
    ${index === 0 ? homeLanguages() : ""}<h2 id="app-tour-title">${t(step[1])}</h2><p id="app-tour-body">${t(step[2])}${["friends", "activity"].includes(step[0]) ? " " + t(PERSIST ? "tour_storage" : "temporary_storage") : ""}</p>
    <div class="app-tour-actions"><button class="app-tour-exit" data-a="appTourExit">${t("app_tour_skip")}</button>${index ? `<button class="btn quiet" data-a="appTourMove" data-v="-1">${t("app_tour_previous")}</button>` : ""}<button class="btn primary" data-a="appTourMove" data-v="1" data-autofocus>${t(index === APP_TOUR.length - 1 ? "app_tour_finish" : "app_tour_next")}</button></div>
  </section></div>`;
}

function highlightAppTour() {
  if (S.appTour === null) return;
  const overlay = document.querySelector(".app-tour-overlay"), card = overlay?.querySelector(".app-tour-card");
  const target = document.querySelector(APP_TOUR[S.appTour][3]), spot = overlay?.querySelector(".app-tour-spotlight");
  if (!overlay || !card || !target || !spot) return;
  const scroll = target.closest(".scroll");
  if (scroll) {
    const area = scroll.getBoundingClientRect(), rect = target.getBoundingClientRect();
    const previous = scroll.style.scrollBehavior;
    scroll.style.scrollBehavior = "auto";
    scroll.scrollTop += rect.top - area.top - 12;
    scroll.style.scrollBehavior = previous;
  }
  const bounds = overlay.getBoundingClientRect(), rect = target.getBoundingClientRect();
  const moveUp = rect.top >= card.getBoundingClientRect().top - 10;
  overlay.classList.toggle("app-tour-card-top", moveUp);
  const cardRect = card.getBoundingClientRect();
  const bottom = moveUp ? bounds.height - 4 : cardRect.top - bounds.top - 10;
  const minimumTop = moveUp ? cardRect.bottom - bounds.top + 10 : 4;
  const left = Math.max(4, rect.left - bounds.left - 4), top = Math.max(minimumTop, rect.top - bounds.top - 4);
  const right = Math.min(bounds.width - 4, rect.right - bounds.left + 4);
  const end = Math.min(bottom, rect.bottom - bounds.top + 4);
  if (right <= left || end <= top) return;
  Object.assign(spot.style, {left:`${left}px`, top:`${top}px`, width:`${right-left}px`, height:`${end-top}px`});
}

/* ---------- render ---------- */
function view() {
  if (S.screen === "onboard") return onboarding();
  const map = { daily: dailyScreen, dailyDone, phqIntro, phq: phqScreen, phqResult, counselor: counselorWorkspace, ask: askScreen, friendDm, friends: friendsScreen, activity: activityScreen, home, compose, thread, guide, dm, companion: companionScreen, shop: shopScreen, circles: circlesScreen, circle: circleScreen, learn: learnScreen, practice: practiceScreen, me: meScreen, settings: settingsScreen };
  return (map[S.screen] || home)();
}
let lastScreen = null, lastSheet = null;
function render(nav = false) {
  if (heroCleanup) { heroCleanup(); heroCleanup = null; }
  if (S.screen !== "companion" || !S.checkedIn) stopCareAudio();
  if (S.activityDay && S.activityDay !== dayKey()) {
    S.checkedIn = false; S.mood = null; S.note = ""; S.tags = []; S.earnedToday = 0; S.activityDay = dayKey();
    S.daily = newDaily(); S.dMedNote = ""; S.dLine = "";
    // A safety answer shapes the rest of that day only.
    S.checkinSafety = false; S.phqSafety = false; S.moodEdit = false;
    if (["daily", "dailyDone"].includes(S.screen)) S.screen = "companion";
  }
  const sc = document.querySelector("#app .scroll");
  const keep = !nav && sc && lastScreen === S.screen ? sc.scrollTop : 0;
  const active = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.model : null;
  const tourFocus = !!document.activeElement?.closest?.(".app-tour-card");
  document.documentElement.dataset.lang = S.lang;
  document.documentElement.lang = S.lang === "en" ? "en" : zhTag();
  syncWorld();
  applyBackdrop();
  let html = view();
  if (DEMO && ["daily", "dailyDone", "phqIntro", "phq", "phqResult"].includes(S.screen)) html = testBar() + html;
  if (!landing() && S.screen !== "onboard" && !NO_TAB_BAR.includes(S.screen)) html += tabs(sectionTab());
  if (S.appTour !== null) html += appTourPanel();
  if (S.menu) html += menuSheet();
  if (S.crisis) html += crisisSheet();
  if (S.toast) html += `<div class="toast" role="status">${icon(S.toast.ic)}${esc(S.toast.msg)}</div>`;
  $("#app").innerHTML = html;
  const sb = $("#statusbar");
  const welcome = S.screen === "onboard" && S.step === 0;
  sb.className = "statusbar" + (welcome ? " sky" + (skyDark() ? " dark" : "") : "") + (S.screen === "onboard" && S.step > 0 ? " plain" : "");
  mountStage();
  const sceneRow = document.querySelector(".scene-row"), sceneOn = sceneRow && sceneRow.querySelector(".on");
  if (sceneOn) sceneRow.scrollLeft = sceneOn.offsetLeft - (sceneRow.clientWidth - sceneOn.offsetWidth) / 2;
  mountTour();
  mountHomeHero();
  const nsc = document.querySelector("#app .scroll");
  if (nsc) { nsc.style.scrollBehavior = "auto"; nsc.scrollTop = ["dm", "friendDm"].includes(S.screen) ? nsc.scrollHeight : keep; nsc.style.scrollBehavior = ""; }
  highlightAppTour();
  if (active) { const el = document.querySelector(`[data-model="${active}"]`); if (el) { el.focus(); const v = el.value; el.value = ""; el.value = v; } }
  if (nav || (tourFocus && S.appTour !== null)) document.querySelector("#app [data-autofocus]")?.focus({ preventScroll: true });
  // A sheet that has just opened takes the focus, so keyboard and screen-reader users land in it.
  const sheet = S.crisis || S.menu || null;
  if (sheet && sheet !== lastSheet) document.querySelector("#app .sheet h2")?.focus({ preventScroll: true });
  lastSheet = sheet;
  lastScreen = S.screen; S.enter = null;
  runTypewriter();
  saveState();

  if (S.toast) { const id = S.toast.id; setTimeout(() => { if (S.toast && S.toast.id === id) { S.toast = null; $(".toast")?.remove(); } }, 2800); }
  renderNotes();
}

/* Prototype notes beside the phone (desktop only) */
const SCREEN_NOTES = {
  counselor: ["note_counselor_1", "note_counselor_2"],
  onboard: ["note_onboard_1", "note_onboard_2", "note_onboard_3", "note_onboard_4"],
  feed: ["note_feed_1", "note_feed_2", "note_feed_3"],
  home: ["note_home_1", "note_home_2", "note_home_3"],
  compose: ["note_compose_1", "note_compose_2", "note_compose_3"],
  thread: ["note_thread_1", "note_thread_2", "note_thread_3"],
  guide: ["note_guide_1", "note_guide_2"],
  dm: ["note_dm_1", "note_dm_2"],
  companion: ["note_companion_1", "note_companion_2", "note_companion_3"],
  shop: ["note_shop_1", "note_shop_2"],
  circles: ["note_circles_1", "note_circles_2"],
  circle: ["note_circle_1"],
  learn: ["note_learn_1"],
  me: ["note_me_1", "note_me_2"],
};
function renderNotes() {
  const n = $("#screenName"); if (!n) return;
  const key = S.screen === "onboard" ? "onboard" : S.screen === "home" && S.member ? "feed" : S.screen;
  const screenLabels = {"feed": "home", "compose": "ask_title", "thread": "ask", "guide": "my_guide", "dm": "my_guide", "circle": "circles", "learn": "practice_library", "practice": "practice_library", "daily": "daily_title", "dailyDone": "daily_title", "activity": "activity", "phqResult": "result_title", "phqIntro": "mood_check", "phq": "mood_check", "counselor": "cw_preview", "friendDm": "friends_title", "friends": "friends_title"};
  n.textContent = key === "onboard" ? (S.step ? t("setup_step", { n: S.step }) : t("welcome_label")) : t(screenLabels[key] || key);
  document.title = t("notes_title");
  $(".notes").setAttribute("aria-label", t("notes_label"));
  document.querySelectorAll(".notes [data-copy]").forEach(el => { el.textContent = t(el.dataset.copy); });
  $("#screenNotes").innerHTML = (SCREEN_NOTES[key] || SCREEN_NOTES.home).map(id => `<li>${esc(t(id))}</li>`).join("");
  $("#times").innerHTML = [[null,"live"], [7,"morning"], [13,"day"], [18.6,"dusk"], [22,"night"], [23.6,"late"]].map(([h, period]) => `<button data-time="${h ?? ""}" class="${S.timeOverride === h ? "on" : ""}">${t("time_" + period)}</button>`).join("")
    + `<button data-away class="${S.away ? "on" : ""}">${t("time_away")}</button>`;
  const yesNo = value => t(value ? "d_yes" : "d_no");
  const info = S.screen === "counselor" ? [
    ["state_screen", n.textContent], ["state_section", t("cw_" + CW.tab)],
    ["cw_accepting", yesNo(CW.accepting)], ["cw_away", yesNo(CW.away)]
  ] : [
    ["state_screen", n.textContent], ["language", { en: "English", ht: "繁體中文", hs: "简体中文" }[S.lang]],
    ["location", stateName(S.state)], ["state_services", t(licensedHere() ? "cw_available" : "state_unavailable")],
    ["counselor_matching", yesNo(S.optMatch)], ["focus_area", S.focuses.map(focusName).join(", ")],
    ["state_main", S.mainFocus && focusName(S.mainFocus)], ["state_seeds", S.seeds], ["state_earned", S.earnedToday + "/25"],
    ["state_checked", yesNo(S.checkedIn)], ["cw_mood", L(MOODS.find(m => m.id === S.mood))],
    ["companion", [S.petName, L(species(S.species))].filter(Boolean).join(" · ")],
    ["state_worn", S.wear.map(id => L(SHOP.find(it => it.id === id))).join(", ")],
    ["my_guide", S.match && counselor(S.match)?.name],
    ["state_held", S.posts.reduce((count, p) => count + Number(!!p.held) + p.replies.filter(r => r.held).length, 0)]
  ];
  $("#stateDump").textContent = info.map(([key, value]) => t(key) + " · " + (value === 0 ? 0 : value || "—")).join("\n");
}

/* ---------- actions ---------- */
const actions = {
  appTourStart() { S.appTour = 0; S.stack = []; S.screen = APP_TOUR[0][0]; render(true); },
  appTourExit() { S.appTour = null; S.screen = "home"; S.stack = []; render(true); document.querySelector('[data-a="appTourStart"]')?.focus(); },
  appTourMove(v) { const next = S.appTour + Number(v); if (next >= APP_TOUR.length) { actions.appTourExit(); return; } S.appTour = next; S.screen = APP_TOUR[next][0]; S.stack = []; render(true); },
  ...CHECKIN_ACTIONS,
  music() { actions.musicFlag(null, { checked: !backgroundMusic }); },
  // Music is the Member's choice: off until they turn it on, and it comes back with the app once they have.
  async musicFlag(v, el) {
    S.musicOn = el.checked;
    if (S.musicOn === !!backgroundMusic) { render(); return; }
    musicVolume = S.musicVol;
    await toggleBackgroundMusic();
    if (S.musicOn && !backgroundMusic) { S.musicOn = false; render(); }
  },
  musicKind(v) { if (!["piano", "ambient"].includes(v) || v === S.musicKind) return; S.musicKind = v; chooseBackgroundMusic(v); },
  scene(v) { if (!SCENES.some(s => s.id === v)) return; S.scene = v; render(); document.querySelector("#compScroll")?.scrollTo({ top: 0, behavior: REDUCED_UI.matches ? "auto" : "smooth" }); },
  postMenu(v) { S.menu = v; render(); },
  closeMenu() { S.menu = null; render(); },
  menuDelete() {
    const { post, index, item } = menuTarget();
    S.menu = null;
    if (!item || !item.mine) { render(); return; }
    if (index === null) { S.posts = S.posts.filter(p => p !== post); if (S.screen === "thread" && S.thread === post.id) { toast(t("deleted"), "trash"); back(); return; } }
    else post.replies.splice(index, 1);
    toast(t("deleted"), "trash"); render();
  },
  menuReport() { actions.menuHide(true); },
  menuHide(reported) {
    const { post, index, item } = menuTarget();
    S.menu = null;
    if (!item || item.mine) { render(); return; }
    item.hiddenForMe = true; if (reported === true) item.reported = true;
    toast(t(reported === true ? "report_thanks" : "hidden_done"), reported === true ? "shield" : "hide");
    if (index === null && S.screen === "thread" && S.thread === post.id) { back(); return; }
    render();
  },
  composeIn(v) { S.draftCircle = v; go("compose"); },
  draftCircle(v) { S.draftCircle = v || null; render(); },
  guideZh() { S.guideZh = !wantsZh(); render(); },
  practiceDone() { const got = earnOnce("practice", 3); if (got) toast(t("seeds_earned", { n: got })); back(); },
  install() { if (!installEvent) return; installEvent.prompt(); installEvent.userChoice.finally(() => { installEvent = null; render(); }); },
  erase() {
    if (!confirm(t(PERSIST ? "reset_confirm" : "preview_reset"))) return;
    if (PERSIST) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ lang: S.lang, generation: crypto.randomUUID() }));
      } catch { toast(t("reset_failed")); render(); return; }
    }
    if (PERSIST) location.reload();
    else location.replace(location.pathname + "?lang=" + S.lang);
  },
  cwTab(tab) { CW.tab = tab; CW.selected = null; render(true); },
  cwOpen(id) { CW.selected = id; CW.tab = CW_QUESTIONS.some(x => x.id === id) ? 'community' : 'inbox'; render(true); },
  cwClose() { CW.selected = null; render(true); },
  cwReply() { const text = (CW.drafts[CW.selected] || '').trim(); if (!text) return; (CW.replies[CW.selected] ||= []).push(text); CW.drafts[CW.selected] = ''; CW.resolved[CW.selected] = false; render(); },
  cwResolve() { CW.resolved[CW.selected] = !CW.resolved[CW.selected]; render(); },
  cwFlag() { CW.flags[CW.selected] = !CW.flags[CW.selected]; render(); },
  care(id) {
    stopCareAudio();
    if (S.breathing && id !== "breathe") { S.breathing = false; if (world) world.breathe(false); }
    S.care = id;
    if (world) world.sit(["sit", "listen", "write"].includes(id));
    if (id === "breathe") { if (!S.breathing) actions.breathe(); return; }
    if (id === "celebrate" && world) { world.emote("cheer"); world.celebrate(false); }
    if (["sit", "listen", "write"].includes(id)) talkTo("sit", { silent: true });
    render();
  },
  careShareMode(mode) { S.careShareMode = mode; render(); },
  carePlay(kind) { playCareAudio(kind); },
  careStop() { stopCareAudio(); render(); },
  saveJournal() { const text = S.journalDraft.trim(); if (!text) return; S.journalEntries.unshift({date:dayKey(), text}); S.journalDraft = ""; toast(t("care_saved"), "lock"); if (isRisky(text)) S.crisis = "crisis"; render(); },
  careCommunity() { if (!S.draft.trim()) S.draft = t("care_share_draft"); go("compose"); },
  careFriend(id) { if (S.friendships[id] !== "friend") return; if (!(S.friendDrafts[id] || "").trim()) S.friendDrafts[id] = t(S.careShareMode === "thank" ? "care_thank_draft" : "care_share_draft"); go("friendDm", {friendRecipient:id}); },
  friendChat(id) { if (S.friendships[id] === "friend") go("friendDm", { friendRecipient: id }); },
  friendSend(id) { changeFriendship(id, "send"); render(); },
  friendAction(value) { const [id, action] = value.split(":"); changeFriendship(id, action); render(); },
  friendDemo() { if (!S.friendships.jenny) S.friendships.jenny = "incoming"; render(); },
  practiceTab(v) { S.savedOnly = v === "saved"; render(); },
  openPractice(v) { go("practice", { practice: v }); },
  savePractice(v) { S.savedPractices = S.savedPractices.includes(v) ? S.savedPractices.filter(id => id !== v) : [...S.savedPractices, v]; render(); },
  clearPracticeFilters() { Object.assign(S, { practiceQuery: "", practiceKind: "", practiceTopic: "", practiceDuration: "", practiceLanguage: "" }); render(); },
  streakGoal(v) { S.streakGoal = Number(v); render(); },
  activityCheck() { actions.dailyRestart(); },
  sampleWeek() {
    const today = dayKey();
    [[-6,"good"],[-5,"okay"],[-3,"sad"],[-2,"tired"],[-1,"good"]].forEach(([offset,mood]) => {
      const date = shiftDay(today, offset);
      if (!S.history.some(row => row.date === date)) S.history.push({ date, mood });
    });
    toast(t("demo_week_note")); render();
  },
  tour(v) {
    const index = Math.max(0, Math.min(TOUR.length - 1, v === "prev" ? S.tour - 1 : v === "next" ? S.tour + 1 : Number(v)));
    const track = $(".tour-track");
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  },
  next() {
    if (S.step === 5 && (!S.companionChosen || !S.petName.trim())) return;
    if (S.step < 5) { S.step++; if (S.step === 5 && world) world.anim.pop = world.time; }
    else { if (!S.joined.length) S.joined = suggestedCircles(); S.screen = "circles"; S.stack = []; S.member = true; S.draftFocus = S.mainFocus || "individual"; toast(t("welcome_toast", { n: 20 })); }
    render(true);
  },
  // Setup opened from Home's Get started returns to Home from step 1, not to the older welcome tour.
  prev() { if (S.step <= 1 && S.stack.length) { back(); return; } S.step = Math.max(0, S.step - 1); render(true); },
  getStarted() { Object.assign(S, { step: 1, age: false, terms: false, optMatch: false, optJournal: false, realName: "", nameShow: "anon", focuses: [], mainFocus: null, state: null, species: "otter", petName: "", companionChosen: false, match: null, joined: [] }); go("onboard"); },
  signin() { Object.assign(S, { member: true, joined: S.joined.length ? S.joined : ["c1"], friendships: { kevin: "friend", ...S.friendships }, realName: "Lily Zhang", nameShow: "initials", companionChosen: true, petName: "Pebble", age: true, terms: true, optMatch: true, focuses: ["parenting"], mainFocus: "parenting", state: "TX", screen: "circles", stack: [] }); toast(t("sign_in_na"), "me"); render(true); },
  lang(v) { S.lang = v; S.toast = null; S.practiceLanguage = ""; S.showOriginal = {}; render(); },
  flag(v, el) { S[v] = el.checked; render(); },
  flagOn(v) { S[v] = true; render(); },
  focus(v) {
    if (S.focuses.includes(v)) { S.focuses = S.focuses.filter(x => x !== v); if (S.mainFocus === v) S.mainFocus = S.focuses[0] || null; }
    else { S.focuses = [...S.focuses, v]; if (!S.mainFocus) S.mainFocus = v; }
    S.draftFocus = S.mainFocus || "individual"; render();
  },
  mainFocus(v) { S.mainFocus = v; S.draftFocus = v; render(); },
  state(v) { S.state = v; if (S.match && !counselor(S.match).states.includes(v)) { S.match = null; toast(t("guide_unmatched"), "pin"); } render(); },
  species(v) {
    if (!SPECIES.some(s => s.id === v && (!s.shopOnly || S.owned.includes(v)))) return;
    if (S.companionChosen && S.species === v) return;
    if (v === "fox") S.baseSpecies = S.species;
    S.species = v;
    S.companionChosen = true;
    render();
    if (world) world.emote("wave");
    if (S.screen !== "onboard") quip("species", { species: L(species(v)) });
  },
  tab(v) { S.stack = []; S.screen = v; S.breathing = false; render(true); },
  go(v) { go(v); },
  back() { back(); },
  crisis() { S.crisis = "help"; render(); },
  closeCrisis() { S.crisis = null; render(); },
  helpLevel(v) { S.crisis = v; render(); },
  helpGo(v) { S.crisis = null; if (v === "breathe") { startBreathe(); return; } go(v === "guide" ? (S.match ? "dm" : "guide") : v); },
  thread(v) { S.seen[v] = true; S.replyPersona = "anon"; go("thread", { thread: v }); },
  circle(v) { go("circle", { circle: v }); },
  translate(v) { S.showOriginal[v] = !S.showOriginal[v]; render(); },
  helpful(v) { const p = S.posts.find(x => x.id === v); if (p && p.mine) return; S.helpful[v] = !S.helpful[v]; render(); },
  join(v) { S.joined = S.joined.includes(v) ? S.joined.filter(x => x !== v) : [...S.joined, v]; render(); },
  persona(v) { S.persona = v; render(); },
  nameShow(v) { if (v !== "anon" && !S.realName.trim()) return; S.nameShow = v; render(); },
  replyPersona() { S.replyPersona = S.replyPersona === "anon" ? "named" : "anon"; render(); },
  draftFocus(v) { S.draftFocus = v; render(); },
  post() {
    const text = S.draft.trim(); if (text.length <= 3) return;
    const risky = isRisky(text);
    const me = displayName();
    const p = { id: "u" + Date.now(), anon: S.persona === "anon" || !me, author: me || "Anonymous", focus: S.draftFocus, ago: null, orig: CJK.test(text) ? "zh" : "en", text, answer: null, replies: [], helpful: 0, mine: true, held: risky };
    const circle = CIRCLES.find(c => c.id === S.draftCircle && S.joined.includes(c.id));
    if (circle) Object.assign(p, { circle: circle.id, focus: circle.focus });
    // The next post starts anonymous again, so a named post is always a fresh choice.
    S.posts.unshift(p); S.draft = ""; S.persona = "anon"; S.draftCircle = null; S.posted = true; S.stack = []; S.screen = "home"; S.enter = p.id;
    if (risky) { S.crisis = "held"; talkTo("after_hold", { silent: true }); }
    else { const got = earnOnce("share", 5); toast(got ? `${t("posted")} · ${t("seeds_earned", { n: got })}` : t("posted")); talkTo("posted", { silent: true }); }
    render(true);
  },
  reply() {
    const text = (S.replyDraft || "").trim(); if (!text) return;
    const p = S.posts.find(x => x.id === S.thread); const risky = isRisky(text);
    const me = displayName();
    p.replies.push({ author: S.replyPersona === "anon" || !me ? "Anonymous" : me, orig: CJK.test(text) ? "zh" : "en", text, mine: true, held: risky });
    S.replyDraft = "";
    if (risky) S.crisis = "held"; else { const got = earnOnce("share", 5); if (got) toast(t("seeds_earned", { n: got })); }
    render();
  },
  match(v) { S.match = v; S.dm = [{ me: false, key: "dm_hello" }]; go("dm"); },
  sendDm() {
    const text = (S.dmDraft || "").trim(); if (!text) return;
    S.dm.push({ me: true, text }); S.dmDraft = "";
    if (isRisky(text)) { S.crisis = "dm"; render(); return; }
    S.dm.push({ me: false, key: "dm_suggest" }); render();
  },
  booked() { toast(t("opened_site"), "external"); setTimeout(render, 50); },
  breathe() {
    stopCareAudio();
    S.breathing = !S.breathing;
    if (!S.breathing && S.care === "breathe") S.care = null;
    if (world) world.breathe(S.breathing);
    if (!S.breathing) talkTo("after_breathe", { silent: true });
    render();
    if (S.breathing) document.querySelector("#compScroll")?.scrollTo({ top: 0, behavior: "smooth" });
  },
  buy(v) {
    const it = SHOP.find(x => x.id === v); if (S.seeds < it.p) return;
    S.seeds -= it.p; S.owned.push(v);
    if (it.kind === "species") { S.baseSpecies = S.species; S.species = "fox"; } else S.wear = [...S.wear, v];
    toast(t("got_item", { item: L(it), n: it.p })); render();
    if (world) world.anim.pop = world.time;
  },
  wear(v) {
    const it = SHOP.find(x => x.id === v);
    if (it.kind === "species") { if (S.species === "fox") S.species = S.baseSpecies || "otter"; else { S.baseSpecies = S.species; S.species = "fox"; } }
    else S.wear = S.wear.includes(v) ? S.wear.filter(x => x !== v) : [...S.wear, v];
    render(); if (world) world.anim.pop = world.time;
  },
  toast(v) { toast(t(v), v === "waitlisted" ? "check" : "learn"); render(); },
  talk(i) {
    const n = TALK[S.talk.shown] && TALK[S.talk.shown]();
    const o = n && n.opts && n.opts[+i];
    if (!o) return;
    const before = S.screen;
    o.go();
    if (S.screen !== before && S.talk.node === S.talk.shown) Object.assign(S.talk, { node: "bye", typed: null });
  },
};

document.addEventListener("keydown", e => {
  if (S.appTour === null) return;
  if (e.key === "Escape") { e.preventDefault(); actions.appTourExit(); return; }
  if (e.key === "Tab") {
    const buttons = [...document.querySelectorAll(".app-tour-card button")];
    const current = buttons.indexOf(document.activeElement);
    if ((e.shiftKey && current <= 0) || (!e.shiftKey && (current < 0 || current === buttons.length - 1))) {
      e.preventDefault(); buttons[e.shiftKey ? buttons.length - 1 : 0].focus();
    }
  }
});

document.addEventListener("click", e => {
  const tb = e.target.closest("[data-time]");
  if (tb) { S.timeOverride = tb.dataset.time === "" ? null : +tb.dataset.time; if (!S.checkedIn && !S.away) talkTo(talkStart(), { silent: true }); render(); return; }
  if (e.target.closest("[data-away]")) { S.away = !S.away; if (S.away) S.checkedIn = false; talkTo(talkStart(), { silent: true }); render(); return; }
  const el = e.target.closest("[data-a]");
  if (!el || !el.closest("#app")) return;
  const stop = e.target.closest("[data-stop]");
  if (stop && !stop.contains(el)) return;
  if (el.tagName === "INPUT" && el.type === "checkbox") return;
  if (el.tagName === "LABEL" || el.tagName === "SELECT") return;
  const a = el.dataset.a;
  if (a === "booked") { actions.booked(); return; }
  e.preventDefault();
  actions[a] && actions[a](el.dataset.v, el);
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "music-choice") { chooseBackgroundMusic(el.value); return; }
  if (el.id === "music-volume") { saveState(); return; }
  if (el.dataset.cwFilter) { CW[el.dataset.cwFilter] = el.value; render(); return; }
  if (el.dataset.libraryFilter) { S[el.dataset.libraryFilter] = el.value; $("#practice-results").innerHTML = practiceResults(); return; }
  if (el.matches("input[type=checkbox][data-a]")) actions[el.dataset.a](el.dataset.v, el);
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.matches("[data-cw-draft]")) { CW.drafts[CW.selected] = el.value; document.querySelector('[data-a="cwReply"]').disabled = !el.value.trim(); return; }
  if (el.id === "music-volume") { musicVolume = S.musicVol = +el.value; if (backgroundMusic) backgroundMusic.master.gain.setTargetAtTime(musicVolume / 100 * .5, backgroundMusic.ctx.currentTime, .1); return; }
  if (el.id === "care-volume") { S.careVolume = +el.value; if (careAudio) careAudio.careGain.gain.setTargetAtTime(S.careVolume / 100 * .25, careAudio.currentTime, .1); return; }
  if (el.matches("[data-friend-draft]")) { S.friendDrafts[S.friendRecipient] = el.value; return; }
  const k = el.dataset && el.dataset.model; if (!k) return;
  S[k] = el.value;
  if (k === "journalDraft") { const b = document.querySelector('[data-a="saveJournal"]'); if (b) b.disabled = !el.value.trim(); }
  if (k === "practiceQuery") { $("#practice-results").innerHTML = practiceResults(); return; }
  if (k === "draft") { const b = document.querySelector('[data-a="post"]'); if (b) b.disabled = el.value.trim().length <= 3; }
  if (k === "realName") { if (!el.value.trim()) S.nameShow = "anon"; render(); return; }
  if (k === "petName") { const b = document.querySelector('[data-a="next"]'); if (b) b.disabled = !S.companionChosen || !el.value.trim(); }
});
document.addEventListener("submit", e => {
  if (e.target.id === "cw-profile") { e.preventDefault(); const data = new FormData(e.target); Object.assign(CW, {bio: CW.bio === null && data.get('bio') === t('cw_bio') ? null : String(data.get('bio')).trim(), response:data.get('response'), accepting:data.has('accepting'), away:data.has('away')}); toast(t('cw_saved'), 'check'); render(); return; }
 if (e.target.id === "friend-message-form") { e.preventDefault(); const risky = isRisky(S.friendDrafts[S.friendRecipient] || ""); sendFriendMessage(); if (risky) { S.crisis = "crisis"; render(); } } });
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.dataset && ["dmDraft", "replyDraft"].includes(e.target.dataset.model)) { e.preventDefault(); actions[e.target.dataset.model === "dmDraft" ? "sendDm" : "reply"](); return; }
  if (e.key === "Escape" && (S.crisis || S.menu)) { S.crisis = null; S.menu = null; render(); }
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

if (loadState()) {
  if (S.member) S.screen = "home";
  // A day or more away: the Companion naps and wakes glad to see the Member.
  if (S.member && S.activityDay && S.activityDay < shiftDay(dayKey(), -1)) S.away = true;
  if (!SCENES.some(s => s.id === S.scene)) S.scene = "riverbank";
  // Browsers only let sound start from a tap, so music the Member left on resumes at their first one.
  musicVolume = S.musicVol; musicChoice = S.musicKind;
  if (S.member && S.musicOn) startDefaultMusic();
}
/* Deep links for reviewing screens: ?skip=1, ?screen=…, ?lang=ht, ?step=2, ?loc=INTL, ?checkedin=1, ?mood=sad, ?match=k1, ?sheet=held, ?thread=p1, ?draft=…, ?time=22 */
if (params.get("skip") === "1" || params.get("screen")) Object.assign(S, { member: true, joined: ["c1"], friendships: { kevin: "friend" }, realName: "Lily Zhang", nameShow: "initials", companionChosen: true, petName: "Pebble", screen: "home", age: true, terms: true, optMatch: true, focuses: ["parenting"], mainFocus: "parenting", state: "TX" });
if (params.get("screen")) { S.screen = params.get("screen"); if (!["home", "circles", "companion", "me"].includes(S.screen)) S.stack = [{ screen: "home" }]; }
if (["en", "ht", "hs"].includes(params.get("lang"))) S.lang = params.get("lang");
if (params.get("step")) { S.step = +params.get("step"); if (S.step >= 2) Object.assign(S, { age: true, terms: true }); }
if (params.get("loc")) S.state = params.get("loc");
if (params.get("checkedin") === "1") { S.checkedIn = true; S.mood = params.get("mood") || "good"; S.tags = ["Work"]; recordMood(S.mood); }
if (params.get("species")) S.species = params.get("species");
if (params.get("wear")) { S.wear = params.get("wear").split(","); S.owned = [...S.wear]; }
if (params.get("match")) { S.match = params.get("match"); S.dm = [{ me: false, key: "dm_hello" }, { me: true, key: "dm_sample_question" }, { me: false, key: "dm_suggest" }]; }
if (params.get("sheet")) S.crisis = params.get("sheet");
if (params.get("thread")) S.thread = params.get("thread");
if (params.get("draft")) S.draft = params.get("draft");
if (params.get("time")) S.timeOverride = +params.get("time");
if (params.get("hinted") === "1") S.petHinted = true;
if (params.get("away") === "1") S.away = true;
if (params.get("name") !== null) S.realName = params.get("name");
if (params.get("show")) S.nameShow = displayName(params.get("show")) ? params.get("show") : "anon";
if (params.get("talk")) S.talk.node = params.get("talk");
render(true);
window.addEventListener("companion-ready", initWorld);
initWorld();

document.addEventListener("visibilitychange", () => { if (document.hidden && careAudio) { stopCareAudio(); render(); } });
window.addEventListener("pagehide", stopCareAudio);
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.member && S.musicOn && !backgroundMusic) startDefaultMusic(); });
window.addEventListener("resize", highlightAppTour);
window.addEventListener("resize", mountStage);
