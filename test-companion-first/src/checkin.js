/* Test build: daily check-in, then resources and services, plus voluntary PHQ-2 / PHQ-9.
   Screens are plain functions of state, like app.js. Answers stay in memory; nothing is saved.
   Safety rules: a yes or not sure on the safety question, risky free text, or any answer above
   0 on PHQ-9 question 9 shows help immediately, whatever the total score. Results never diagnose. */

const newDaily = () => ({ step: 0, trend: null, sleep: null, safe: null, med: null, topics: [], done: false, sample: false, askOff: false, resume: 0 });
const D_STEPS = [
  { k: "trend", q: "d_trend", opts: [["better", "d_better"], ["same", "d_same"], ["worse", "d_worse"]] },
  { k: "sleep", q: "d_sleep", opts: [["good", "d_good"], ["fair", "d_fair"], ["poor", "d_poor"]] },
  { k: "safe", q: "d_safe", note: "d_safe_note", opts: [["no", "d_no"], ["yes", "d_yes"], ["unsure", "d_unsure"]] },
  { k: "med", q: "d_med", opts: [["none", "d_none"], ["no", "d_no"], ["yes", "d_yes"]] },
];
const D_STEP_COUNT = D_STEPS.length + 1;
const dailyHard = () => HARD_MOODS.includes(S.mood) || S.daily.trend === "worse" || S.daily.topics.includes("mood");
const dailyNode = () => (dailyFlag() ? "d_safe" : dailyHard() ? "d_hard" : S.daily.trend === "same" ? "d_same" : "d_ok");
const unsafeAnswer = () => ["yes", "unsure"].includes(S.daily.safe);
const dailyFlag = () => unsafeAnswer() || isRisky(S.dMedNote || "") || isRisky(S.dLine || "");
const CLINIC_URL = "https://www.bridgerivercounseling.com/services";

/* ---------- shared pieces ---------- */
function testBar() {
  return `<div class="testbar"><span>${t("test_bar")}</span><span class="langs">${[["en", "EN"], ["ht", "繁"], ["hs", "简"]].map(([l, n]) => `<button class="${S.lang === l ? "on" : ""}" data-a="lang" data-v="${l}" aria-pressed="${S.lang === l}">${n}</button>`).join("")}</span></div>`;
}
function hdrFlow(title, action) {
  return `<header class="hdr"><div class="hdr-row" style="padding-left:8px"><button class="back-btn" data-a="${action}" aria-label="${t("back")}">${icon("back")}<span>${t("back")}</span></button>
    <span class="hdr-title">${title}</span>${helpBtn()}</div></header>`;
}
function flowProgress(n, m, label) {
  return `<div class="flow-prog"><div class="progress" aria-hidden="true">${Array.from({ length: m }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div><span>${label}</span></div>`;
}
function askOpt(on, label, action, v) {
  return `<button class="who-opt ${on ? "on" : ""}" role="radio" aria-checked="${on}" data-a="${action}" data-v="${v}"><span class="t"><b>${label}</b></span><span class="radio" aria-hidden="true"></span></button>`;
}
function samplePicker(list, action, current) {
  return `<div class="test-box"><span class="label">${t("test_samples")}</span><div class="chips">${list.map(s => `<button class="chip ${current === s.id ? "on" : ""}" data-a="${action}" data-v="${s.id}" aria-pressed="${current === s.id}">${L(s.name)}</button>`).join("")}</div></div>`;
}
function helpPanel(titleKey, bodyKey, extra = "") {
  return `<div class="panel care in"><h3 class="panel-h">${t(titleKey)}</h3><p>${t(bodyKey)}</p>${findHelpList()}
    <p class="muted">${S.state === "INTL" ? t("crisis_note_intl") : t("crisis_note")}</p>${extra}</div>`;
}
function clinicRow() {
  return `<a class="li" href="${CLINIC_URL}" target="_blank" rel="noopener" data-a="booked">${icon("calendar")}<span class="t"><b>${t("d_book")}</b><small>${t("d_book_sub")}</small></span>${icon("external")}</a>`;
}
function connectBlock() {
  return `<h2 class="section-h">${t("d_talk")}</h2>${guideCard()}${licensedHere() ? `<div class="list">${clinicRow()}</div>` : ""}`;
}
/* ---------- hooks on the Companion screen ----------
   Each one points to something real and follows what the Member just said: their topic if they
   gave one, otherwise their main Focus Area. A named Counselor needs matching consent and a
   license for the Member's state; everyone else gets the same card the guide screen explains. */
const hookTopic = () => S.daily.topics[0];
const hookFocus = () => (hookTopic() ? TOPIC_HELP[hookTopic()].focus : S.mainFocus || "individual");
const wantLang = () => (S.lang === "en" ? "EN" : "中文");
function hookCircle() {
  const pick = f => { const list = CIRCLES.filter(x => x.focus === f); return list.find(x => x.lang === wantLang()); };
  return pick(hookFocus()) || pick(S.mainFocus);
}
function hookCounselor() {
  if (S.match || !licensedHere() || !S.optMatch) return null;
  const list = suggestions();
  return list.find(x => x.focus.includes(hookFocus())) || list[0] || null;
}
function hookReason() {
  const id = hookTopic();
  return id ? t("hook_because", { topic: L(D_TOPICS.find(x => x.id === id)) }) : t("hook_focus");
}
function counselorHook() {
  const c = hookCounselor();
  if (!c) return guideCard();
  return `<div class="hook-c"><div class="top"><span class="av" style="background:${c.hue}">${initials(c.name)}</span>
      <div class="t"><small>${esc(hookReason())}</small><b>${esc(c.name)}</b><span>${L(c.bio)}</span></div></div>
    <div class="acts"><button class="btn sun sm" data-a="match" data-v="${c.id}">${icon("chat")}${esc(t("hook_msg", { name: c.name.split(" ")[0] }))}</button>
      <button class="btn sm on-forest" data-a="go" data-v="guide">${t("hook_others")}</button></div></div>`;
}
function answerHook(c) {
  if (!licensedHere() || !S.optMatch || c.full || !c.states.includes(S.state)) return "";
  const mine = S.match === c.id;
  return `<button class="btn quiet sm" style="margin-top:12px" data-a="${mine ? "go" : "match"}" data-v="${mine ? "dm" : c.id}">${icon("chat")}${esc(t("hook_msg", { name: c.name.split(" ")[0] }))}</button>`;
}
function hookList() {
  const d = S.daily, hard = d.done && (dailyHard() || dailyFlag());
  const circle = hookCircle(), res = RESOURCES.find(r => r.id === dailyResources()[0]?.id);
  const answer = !S.seen.p1 ? `<button class="hook-new" data-a="thread" data-v="p1"><span class="tag new">${icon("shield")}${t("new_answer")}</span><b>${t("hook_answer")}</b>${icon("chev")}</button>` : "";
  const row = (eyebrow, title, sub, ic, attrs) => `<button class="li" ${attrs}>${icon(ic)}<span class="t"><small class="eyebrow">${eyebrow}</small><b>${title}</b><small>${sub}</small></span>${icon("chev")}</button>`;
  const rows = [
    circle ? row(t("hook_people"), esc(circle.name), `${t("members_n", { n: circle.members })} · ${circle.lang}`, "circles", `data-a="circle" data-v="${circle.id}"`) : "",
    d.done && res ? row(t("hook_read"), esc(L(res.t)), `${esc(res.by)} · ${t("min_read", { n: res.min })}`, "learn", 'data-a="toast" data-v="article_na"') : "",
    invited() ? "" : row(t("hook_self"), t("mood_check_link"), t("mood_check_sub"), "heart", 'data-a="phqOpen"'),
  ].join("");
  const list = rows ? `<div class="list">${rows}</div>` : "";
  return `<h2 class="section-h">${t(d.done ? "hook_after" : "hook_before")}</h2>${hard ? counselorHook() + answer + list : answer + counselorHook() + list}`;
}
const invited = () => S.daily.done && dailyHard() && !S.daily.askOff;
function todayCards() {
  const d = S.daily, m = MOODS.find(x => x.id === S.mood);
  const invite = invited() ? `<div class="panel tray in"><h3 class="panel-h">${t("invite_title")}</h3><p class="muted" style="margin:-8px 0 14px">${t("invite_body")}</p>
      <button class="btn primary block" data-a="phqStart" data-v="2">${t("invite_short")}</button>
      <button class="btn quiet block" style="margin-top:8px" data-a="phqStart" data-v="9">${t("invite_full")}</button>
      <button class="btn ghost block" style="margin-top:2px" data-a="dailyAskOff">${t("invite_no")}</button></div>` : "";
  const med = d.med === "yes" ? `<div class="notice"><h3>${t("med_title")}</h3><p>${t("med_body")}</p>${S.dMedNote.trim() ? `<p class="muted">${esc(t("med_noted", { v: S.dMedNote.trim() }))}</p>` : ""}</div>` : "";
  return `<div class="today-line">${moodFace(m, 36)}<div><b>${t("checked_in")}</b><span>${dailySummary()}</span></div></div>${med}${invite}`;
}
function dailySummary() {
  const d = S.daily, label = (k, v) => t(D_STEPS.find(s => s.k === k).opts.find(o => o[0] === v)[1]);
  const topics = d.topics.map(id => L(D_TOPICS.find(x => x.id === id)));
  return [t("d_trend_short", { v: label("trend", d.trend) }), t("d_sleep_short", { v: label("sleep", d.sleep) }), ...topics].map(esc).join(" · ");
}

/* ---------- the check-in, one question at a time ---------- */
function dailyScreen() {
  const d = S.daily;
  if (d.step === "safety") {
    return `${hdrFlow(t("daily_title"), "dailyBack")}<div class="scroll"><div style="height:14px"></div>
      ${helpPanel("safe_title", "safe_body")}
      ${licensedHere() ? `<div class="list"><a class="li" href="${CLINIC_URL}" target="_blank" rel="noopener" data-a="booked">${icon("calendar")}<span class="t"><b>${t("safe_clinic")}</b><small>${t("safe_clinic_sub")}</small></span>${icon("external")}</a></div>` : ""}
      <div class="pad" style="padding-top:4px"><button class="btn quiet block" data-a="dailyResume">${t("safe_continue")}</button></div></div>`;
  }
  const n = d.step;
  const prog = flowProgress(n + 1, D_STEP_COUNT, t("q_of", { n: n + 1, m: D_STEP_COUNT }));
  if (n === D_STEPS.length) {
    return `${hdrFlow(t("daily_title"), "dailyBack")}${prog}<div class="scroll pad flow">
      <h2 class="ask-q" tabindex="-1" data-autofocus>${t("d_topic")}</h2><p class="muted ask-sub">${t("d_topic_sub")}</p>
      <div class="chips">${D_TOPICS.map(x => { const on = d.topics.includes(x.id); return `<button class="chip ${on ? "on" : ""}" data-a="dailyTopic" data-v="${x.id}" aria-pressed="${on}">${L(x)}</button>`; }).join("")}</div>
      <textarea class="field" style="margin-top:16px" rows="2" placeholder="${t("d_topic_ph")}" aria-label="${t("d_topic_ph")}" data-model="dLine">${esc(S.dLine)}</textarea>
      <button class="btn sun block" style="margin-top:20px" data-a="dailyNext">${t("d_finish")}${icon("chev")}</button></div>`;
  }
  const q = D_STEPS[n], val = d[q.k];
  const medNote = q.k === "med" && val === "yes" ? `<textarea class="field" style="margin-top:12px" rows="2" placeholder="${t("d_med_ph")}" aria-label="${t("d_med_ph")}" data-model="dMedNote">${esc(S.dMedNote)}</textarea>` : "";
  return `${hdrFlow(t("daily_title"), "dailyBack")}${prog}<div class="scroll pad flow">
    <h2 class="ask-q" tabindex="-1" data-autofocus>${t(q.q)}</h2>
    ${q.note ? `<p class="muted ask-sub" style="display:flex;gap:8px">${icon("lock")}<span>${t(q.note)}</span></p>` : ""}
    <div class="name-pick" role="radiogroup" aria-label="${t(q.q)}">${q.opts.map(([v, k]) => askOpt(val === v, t(k), "dailyPick", v)).join("")}</div>${medNote}
    ${val ? `<button class="btn primary block" style="margin-top:20px" data-a="dailyNext">${t("next")}${icon("chev")}</button>` : ""}
    ${n === 0 && !d.sample ? samplePicker(D_SAMPLES, "dailySample") : ""}</div>`;
}

/* ---------- check-in result: resources, activities, services ---------- */
function dailyResources() {
  const d = S.daily, ids = [];
  d.topics.forEach(id => ids.push(...TOPIC_HELP[id].res));
  if (d.trend === "worse") ids.push("low");
  if (d.sleep === "poor") ids.push("sleep");
  if (d.med === "yes") ids.push("prescriber");
  if (!ids.length) ids.push("grounding");
  return [...new Set(ids)].slice(0, 3).map(id => RESOURCES.find(r => r.id === id));
}
function resourceRows(list) {
  return list.map(r => `<button class="li" data-a="toast" data-v="article_na">${icon("learn")}<span class="t"><b>${esc(L(r.t))}</b><small>${esc(r.by)} · ${t("min_read", { n: r.min })}</small></span>${icon("chev")}</button>`).join("");
}
function activityRows() {
  const topic = S.daily.topics[0], focus = topic ? TOPIC_HELP[topic].focus : S.mainFocus;
  const c = CIRCLES.find(x => x.focus === focus);
  return `<button class="li" data-a="dailyBreathe">${icon("wind")}<span class="t"><b>${esc(t("d_breathe", { pet: S.petName }))}</b><small>${t("d_breathe_sub")}</small></span>${icon("chev")}</button>
    ${c ? `<button class="li" data-a="circle" data-v="${c.id}">${icon("circles")}<span class="t"><b>${esc(c.name)}</b><small>${t("d_circle_sub")} · ${c.lang}</small></span>${icon("chev")}</button>` : ""}
    <button class="li" data-a="go" data-v="compose">${icon("ask")}<span class="t"><b>${t("d_ask")}</b><small>${t("d_ask_sub")}</small></span>${icon("chev")}</button>`;
}
/* ---------- mood check: PHQ-2 and PHQ-9 ---------- */
const newPhq = (form, sample) => ({ form, i: 0, ans: sample ? [...sample.ans] : Array(9).fill(null), func: sample ? sample.func : null, sample: !!sample, carried: false, resume: 9 });
const phqScore = () => S.phq.ans.slice(0, S.phq.form).reduce((a, b) => a + (b || 0), 0);
const phqFlag = () => S.phq && S.phq.form === 9 && S.phq.ans[8] > 0;
function phqIntro() {
  const opt = (form, title, sub) => `<button class="who-opt" data-a="phqStart" data-v="${form}"><span class="t"><b>${title}</b><small>${sub}</small></span>${icon("chev")}</button>`;
  return `${hdrSub(t("mood_check"))}<div class="scroll pad flow">
    <h2 class="ask-q" tabindex="-1" data-autofocus>${t("phq_intro_title")}</h2><p class="muted ask-sub">${t("phq_intro_body")}</p>
    <div class="name-pick">${opt(2, t("phq2_pick"), t("phq2_pick_sub"))}${opt(9, t("phq9_pick"), t("phq9_pick_sub"))}</div>
    <p class="muted" style="margin-top:14px">${t("result_not_dx")}</p>
    ${samplePicker(PHQ_SAMPLES, "phqSample", S.phqSample)}</div>`;
}
function phqScreen() {
  const p = S.phq;
  if (p.i === "safety") {
    return `${hdrFlow(t("mood_check"), "phqBack")}<div class="scroll"><div style="height:14px"></div>
      ${helpPanel("safe9_title", "safe9_body")}
      <div class="pad" style="padding-top:4px"><button class="btn quiet block" data-a="phqResume">${t("safe_continue")}</button></div></div>`;
  }
  const form = `PHQ-${p.form}`;
  if (p.i === p.form) {
    return `${hdrFlow(t("mood_check"), "phqBack")}${flowProgress(10, 10, t("phq_func_label"))}<div class="scroll pad flow">
      <h2 class="ask-q" tabindex="-1" data-autofocus>${L(PHQ.func)}</h2>
      <div class="name-pick" role="radiogroup" aria-label="${L(PHQ.func)}">${PHQ.funcOpts.map((o, v) => askOpt(p.func === v, L(o), "phqFunc", v)).join("")}</div>
      ${p.func != null ? `<button class="btn sun block" style="margin-top:20px" data-a="phqNext">${t("phq_see")}${icon("chev")}</button>` : ""}</div>`;
  }
  const val = p.ans[p.i], last = p.i === p.form - 1 && p.form === 2;
  return `${hdrFlow(t("mood_check"), "phqBack")}${flowProgress(p.i + 1, p.form, t("phq_of", { form, n: p.i + 1, m: p.form }))}<div class="scroll pad flow">
    <p class="ask-stem">${L(PHQ.stem)}</p>
    <h2 class="ask-q" tabindex="-1" data-autofocus>${L(PHQ.items[p.i])}</h2>
    ${p.carried && p.i === 2 ? `<p class="muted ask-sub">${t("phq_carried")}</p>` : ""}
    <div class="name-pick" role="radiogroup" aria-label="${L(PHQ.items[p.i])}">${PHQ.opts.map((o, v) => askOpt(val === v, L(o), "phqPick", v)).join("")}</div>
    ${val != null ? `<button class="btn ${last ? "sun" : "primary"} block" style="margin-top:20px" data-a="phqNext">${last ? t("phq_see") : t("next")}${icon("chev")}</button>` : ""}</div>`;
}
function bandList(bands, score) {
  return `<ul class="bands">${bands.map(b => { const on = score >= b.min && score <= b.max;
    return `<li class="${on ? "on" : ""}"><span class="rng">${b.min}–${b.max}</span><span class="nm">${L(b.name)}</span>${on ? `<span class="tag req">${t("result_you")}</span>` : ""}</li>`; }).join("")}</ul>`;
}
function answersPanel() {
  const p = S.phq;
  const rows = PHQ.items.slice(0, p.form).map((it, i) => `<li><span>${L(it)}</span><small>${L(PHQ.opts[p.ans[i]])} · <b>${p.ans[i]}</b></small></li>`).join("");
  const func = p.form === 9 && p.func != null ? `<p class="muted"><b>${L(PHQ.func)}</b> ${L(PHQ.funcOpts[p.func])}</p>` : "";
  return `<details class="answers"><summary>${t("r_answers")}</summary><p class="muted"><b>${L(PHQ.stem)}</b></p><ol>${rows}</ol>${func}<p class="muted">${t(p.form === 9 ? "r_scoring_9" : "r_scoring_2")}</p></details>
    <p class="credit">${L(PHQ.credit)}</p>`;
}
function phqResult() {
  const p = S.phq, score = phqScore();
  const res = [RESOURCES.find(r => r.id === "low"), RESOURCES.find(r => r.id === "grounding")];
  const tail = `<div class="pad"><button class="btn quiet block" data-a="tab" data-v="companion">${esc(t("d_home", { pet: S.petName }))}</button></div>`;
  if (p.form === 2) {
    const above = score >= PHQ2_CUT;
    return `${hdrSub(t("result_title"))}<div class="scroll"><div style="height:14px"></div>
      <div class="panel in"><div class="score"><span>PHQ-2 · ${t("result_score")}</span><b>${score}</b><i>/ 6</i></div>${bandList(PHQ2_BANDS, score)}
        <p class="r-plain">${t(above ? "r2_above" : "r2_below")}</p><p class="muted">${t("result_not_dx")}</p>
        <button class="btn ${above ? "sun" : "quiet"} block" data-a="phqContinue">${t("r2_continue")}${icon("chev")}</button></div>
      ${above ? connectBlock() : ""}
      <h2 class="section-h">${t("d_for_today")}</h2><div class="list">${resourceRows(res)}</div>
      ${above ? "" : connectBlock()}
      <div class="pad" style="padding-bottom:0">${answersPanel()}</div>${tail}</div>`;
  }
  const b = PHQ9_BANDS.findIndex(x => score >= x.min && score <= x.max);
  const flagged = phqFlag(), hardLife = p.func >= 2;
  const urgent = b >= 2 || flagged || hardLife;
  const lines = !flagged && b === 4 ? `<div class="panel care in">${findHelpList()}<p class="muted">${S.state === "INTL" ? t("crisis_note_intl") : t("crisis_note")}</p></div>` : "";
  return `${hdrSub(t("result_title"))}<div class="scroll">
    ${flagged ? `<div style="height:14px"></div>${helpPanel("safe9_title", "safe9_body")}` : ""}
    <div style="height:14px"></div>
    <div class="panel in"><div class="score"><span>PHQ-9 · ${t("result_score")}</span><b>${score}</b><i>/ 27</i></div>${bandList(PHQ9_BANDS, score)}
      <p class="r-plain">${t("r9_plain", { band: L(PHQ9_BANDS[b].name) })} ${t("r9_next_" + b)}</p>
      ${p.func != null ? `<p class="muted">${t("r_func_said", { v: L(PHQ.funcOpts[p.func]) })}</p>` : ""}
      ${hardLife && b < 2 ? `<p class="r-plain">${t("r_func_hard")}</p>` : ""}
      <p class="muted" style="margin-bottom:0">${t("result_not_dx")}</p></div>
    ${lines}
    ${urgent ? connectBlock() : ""}
    <h2 class="section-h">${t("d_for_today")}</h2><div class="list">${resourceRows(res)}</div>
    <h2 class="section-h">${t("d_try")}</h2><div class="list">${activityRows()}</div>
    ${urgent ? "" : connectBlock()}
    <div class="pad" style="padding-bottom:0">${answersPanel()}</div>${tail}</div>`;
}

/* ---------- actions ---------- */
let flowTimer = null;
function afterPick(fn) { clearTimeout(flowTimer); flowTimer = setTimeout(fn, 200); }
function dailyToSafety(resume) { Object.assign(S.daily, { step: "safety", resume }); if (world) world.emote("comfort"); render(true); }
function dailyAdvance() {
  const d = S.daily;
  if (d.step === 2 && unsafeAnswer()) return dailyToSafety(3);
  if (d.step === 3 && isRisky(S.dMedNote)) return dailyToSafety(4);
  if (d.step === D_STEPS.length) { if (isRisky(S.dLine) && d.resume !== "finish") return dailyToSafety("finish"); return dailyFinish(); }
  d.step++; render(true);
}
function dailyFinish() {
  const d = S.daily, flagged = dailyFlag(), first = !S.checkedIn;
  if (flagged || first) S.mood = flagged ? "low" : { better: "good", same: "okay", worse: "low" }[d.trend];
  Object.assign(S, { checkedIn: true, petHinted: true, away: false, screen: "companion", stack: [] });
  d.done = true;
  /* Same seeds whatever the answers, and no toast on a safety answer: honesty never costs anything or feels rewarded. */
  const got = first ? earn(5) : 0;
  if (got && !flagged) toast(t("seeds_earned", { n: got }));
  talkTo(dailyNode(), { silent: true });
  render(true);
  if (world) world.celebrate(HARD_MOODS.includes(S.mood));
}
function phqAdvance() {
  const p = S.phq;
  if (p.i === 8 && p.form === 9 && p.ans[8] > 0) { p.i = "safety"; if (world) world.emote("comfort"); render(true); return; }
  if (p.i === p.form - 1 && p.form === 2) return phqFinish();
  if (p.i === p.form) return phqFinish();
  p.i++; render(true);
}
function phqFinish() {
  const top = S.stack[S.stack.length - 1];
  if (top && ["phqIntro", "phqResult"].includes(top.screen)) S.stack.pop();
  S.screen = "phqResult"; render(true);
}
const CHECKIN_TALK = {
  d_ok: () => ({ text: tt("d_r_ok"), emote: "cheer", opts: [O.circle(), guideOpt(), O.thanks()].filter(Boolean) }),
  d_same: () => ({ text: tt("d_r_same"), emote: "nod", opts: [O.circle(), guideOpt(), O.thanks()].filter(Boolean) }),
  d_hard: () => ({ text: tt("d_r_hard"), emote: "comfort", opts: [O.breathe(), guideOpt(), O.sit(), O.help()].filter(Boolean), note: true }),
  d_safe: () => ({ text: tt("d_r_safe"), emote: "comfort", opts: [guideOpt(), O.sit(), O.help("o_help_lines")].filter(Boolean), note: true }),
};
const CHECKIN_ACTIONS = {
  dailyOpen() {
    S.daily = newDaily(); S.dMedNote = ""; S.dLine = "";
    go("daily");
  },
  /* Pebble's greeting chips answer question 1, so the check-in opens on question 2. */
  dailyFrom(v) {
    S.daily = newDaily(); S.dMedNote = ""; S.dLine = "";
    Object.assign(S.daily, { trend: v, step: 1 });
    go("daily");
  },
  dailyPick(v) {
    const d = S.daily, k = D_STEPS[d.step].k;
    d[k] = v; render();
    if (d.sample || (k === "med" && v === "yes")) return;
    afterPick(() => { if (S.screen === "daily" && D_STEPS[d.step]?.k === k) dailyAdvance(); });
  },
  dailyNext() { clearTimeout(flowTimer); dailyAdvance(); },
  dailyBack() {
    clearTimeout(flowTimer);
    const d = S.daily;
    if (d.step === "safety") { d.step = d.resume === "finish" ? D_STEPS.length : d.resume - 1; d.resume = 0; render(true); return; }
    if (d.step === 0) { back(); return; }
    d.step--; render(true);
  },
  dailyResume() {
    const d = S.daily;
    if (d.resume === "finish") return dailyFinish();
    d.step = d.resume; render(true);
  },
  dailyTopic(v) { const d = S.daily; d.topics = d.topics.includes(v) ? d.topics.filter(x => x !== v) : [...d.topics, v]; render(); },
  dailySample(v) {
    const s = D_SAMPLES.find(x => x.id === v);
    Object.assign(S.daily, s.a, { sample: true, step: 0 });
    S.dMedNote = s.note ? L(s.note) : ""; S.phqSample = v === "low" ? "moderate" : null;
    render(true);
  },
  dailyAskOff() { S.daily.askOff = true; render(); },
  dailyBreathe() { startBreathe(); },
  phqOpen() { S.phqSample = null; go("phqIntro"); },
  phqSample(v) { S.phqSample = S.phqSample === v ? null : v; render(); },
  phqStart(v) {
    const form = +v, sample = PHQ_SAMPLES.find(x => x.id === S.phqSample);
    S.phq = newPhq(form, sample);
    go("phq");
  },
  phqPick(v) {
    const p = S.phq, i = p.i;
    p.ans[i] = +v; render();
    if (p.sample) return;
    afterPick(() => { if (S.screen === "phq" && S.phq.i === i) phqAdvance(); });
  },
  phqFunc(v) { S.phq.func = +v; render(); },
  phqNext() { clearTimeout(flowTimer); phqAdvance(); },
  phqBack() {
    clearTimeout(flowTimer);
    const p = S.phq;
    if (p.i === "safety") { p.i = 8; render(true); return; }
    if (p.i === 0) { if (p.carried) Object.assign(p, { form: 2, carried: false }); back(); return; }
    p.i--; render(true);
  },
  phqResume() { S.phq.i = 9; render(true); },
  /* PHQ-2 is the first two PHQ-9 questions, so those answers carry over and the Member starts at question 3. */
  phqContinue() {
    const p = S.phq, sample = PHQ_SAMPLES.find(x => x.id === S.phqSample);
    const ans = sample ? [...sample.ans] : Array(9).fill(null);
    ans[0] = p.ans[0]; ans[1] = p.ans[1];
    S.phq = { form: 9, i: 2, ans, func: sample ? sample.func : null, sample: p.sample, carried: true };
    S.stack.push({ screen: "phqResult", thread: S.thread, circle: S.circle });
    S.screen = "phq"; render(true);
  },
};
