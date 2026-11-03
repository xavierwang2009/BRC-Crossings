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
const unsafeAnswer = () => ["yes", "unsure"].includes(S.daily.safe);
const dailyFlag = () => S.checkinSafety || S.phqSafety || unsafeAnswer() || isRisky(S.dMedNote || "") || isRisky(S.dLine || "");
const CLINIC_URL = "https://www.bridgerivercounseling.com/services";

/* ---------- shared pieces ---------- */
function testBar() {
  return `<div class="testbar"><span>${t((S.screen.startsWith("phq") ? S.phq?.sample : S.daily.sample) ? "sample_active" : "test_bar")}</span><span class="langs">${[["en", "EN"], ["ht", "繁"], ["hs", "简"]].map(([l, n]) => `<button class="${S.lang === l ? "on" : ""}" data-a="lang" data-v="${l}" aria-pressed="${S.lang === l}">${n}</button>`).join("")}</span></div>`;
}
function hdrFlow(title, action) {
  return `<header class="hdr"><div class="hdr-row" style="padding-left:8px"><button class="back-btn" data-a="${action}" aria-label="${t("back")}">${icon("back")}<span>${t("back")}</span></button>
    <span class="hdr-title">${title}</span>${helpBtn()}</div></header>`;
}
function flowProgress(n, m, label) {
  return `<div class="flow-prog"><div class="progress" aria-hidden="true">${Array.from({ length: m }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div><span>${label}</span></div>`;
}
function askOpt(on, label, action, v) {
  return `<button class="who-opt ${on ? "on" : ""}" aria-pressed="${on}" data-a="${action}" data-v="${v}"><span class="t"><b>${label}</b></span><span class="radio" aria-hidden="true"></span></button>`;
}
function samplePicker(list, action, current) {
  return `<div class="test-box"><span class="label">${t("test_samples")}</span><div class="chips">${list.map(s => `<button class="chip ${current === s.id ? "on" : ""}" data-a="${action}" data-v="${s.id}" aria-pressed="${current === s.id}">${L(s.name)}</button>`).join("")}</div></div>`;
}
function helpPanel(titleKey, bodyKey, extra = "") {
  return `<div class="panel care in"><h3 class="panel-h" tabindex="-1" data-autofocus>${t(titleKey)}</h3><p>${t(bodyKey)}</p>${findHelpList()}
    <p class="muted">${S.state === "INTL" ? t("crisis_note_intl") : t("crisis_note")}</p>${extra}</div>`;
}
function clinicRow() {
  return `<a class="li" href="${CLINIC_URL}" target="_blank" rel="noopener" data-a="booked">${icon("calendar")}<span class="t"><b>${t("d_book")}</b><small>${t("d_book_sub")}</small></span>${icon("external")}</a>`;
}
function connectBlock() {
  return `<h2 class="section-h">${t("d_talk")}</h2>${guideCard()}${licensedHere() ? `<div class="list">${clinicRow()}</div>` : ""}`;
}
/* The same speech panel as talkBox, for a line that belongs to this screen only. */
function pebbleSays(key, o = {}) {
  return `<div class="talk ${o.flat ? "flat" : ""}" role="group" aria-label="${esc(tt("talk_label"))}"><div class="talk-box">
      <span class="talk-name">${icon("paw")}${esc(S.petName)}</span>
      <p class="talk-text">${esc(tt(key))}</p>
      ${o.note ? `<p class="talk-note">${icon("shield")}<span>${tt("note_companion")}</span></p>` : ""}
    </div></div>`;
}

/* ---------- Companion entry point ---------- */
function dailyPanel() {
  const d = S.daily, m = MOODS.find(x => x.id === S.mood);
  const moodRow = `<button class="btn ghost block" data-a="phqOpen">${icon("heart")}${t("mood_check_link")}</button>`;
  if (d.done) return `<div class="panel tray in"><div style="display:flex;gap:14px;align-items:center">${moodFace(m, 48)}<div style="flex:1"><b style="color:var(--forest);font:600 var(--fs-m)/1.3 var(--display)">${t("checked_in")}</b><div class="muted">${dailySummary()}</div></div></div>
      <button class="btn quiet block" style="margin-top:14px" data-a="dailyOpen">${t("daily_see")}</button><button class="btn ghost block" data-a="dailyRestart">${t("activity_edit")}</button>${moodRow}<p class="muted">${t("test_bar")}</p></div>`;
  return `<div class="panel tray in"><h3 class="panel-h">${t("daily_title")}</h3><p class="muted" style="margin:-8px 0 14px">${t("daily_sub")}</p>
      <button class="btn sun block" data-a="dailyOpen">${icon("check")}${t("daily_start")}</button>${moodRow}<p class="muted">${t("test_bar")}</p></div>`;
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
    <div class="name-pick" role="group" aria-label="${t(q.q)}">${q.opts.map(([v, k]) => askOpt(val === v, t(k), "dailyPick", v)).join("")}</div>${medNote}
    ${val ? `<button class="btn primary block" style="margin-top:20px" data-a="dailyNext">${t("next")}${icon("chev")}</button>` : ""}
    ${n === 0 && !d.sample ? samplePicker(D_SAMPLES, "dailySample") : ""}</div>`;
}

/* ---------- check-in result: resources, activities, services ---------- */
function dailyResources() {
  const d = S.daily, ids = [];
  d.topics.forEach(id => ids.push(...TOPIC_HELP[id].res));
  if (d.trend === "worse") ids.push("notice");
  if (d.sleep === "poor") ids.push("notice");
  if (d.med === "yes") ids.push("notice");
  if (!ids.length) ids.push("notice");
  return [...new Set(ids)].slice(0, 3).map(id => RESOURCES.find(r => r.id === id));
}
function resourceRows(list) {
  return list.map(r => `<button class="li" data-a="openPractice" data-v="${r.id}">${icon("learn")}<span class="t"><b>${esc(L(r.t))}</b><small>${t("library_minutes", { n: r.min })}</small></span>${icon("chev")}</button>`).join("");
}
function activityRows() {
  const topic = S.daily.topics[0], focus = topic ? TOPIC_HELP[topic].focus : S.mainFocus;
  const c = CIRCLES.find(x => x.focus === focus);
  return `<button class="li" data-a="dailyBreathe">${icon("wind")}<span class="t"><b>${esc(t("d_breathe", { pet: S.petName }))}</b><small>${t("d_breathe_sub")}</small></span>${icon("chev")}</button>
    ${c ? `<button class="li" data-a="circle" data-v="${c.id}">${icon("circles")}<span class="t"><b>${esc(c.name)}</b><small>${t("d_circle_sub")} · ${c.lang}</small></span>${icon("chev")}</button>` : ""}
    <button class="li" data-a="go" data-v="ask">${icon("ask")}<span class="t"><b>${t("d_ask")}</b><small>${t("d_ask_sub")}</small></span>${icon("chev")}</button>`;
}
function dailyDone() {
  const d = S.daily, flagged = dailyFlag();
  const hard = HARD_MOODS.includes(S.mood) || d.trend === "worse" || d.topics.includes("mood");
  const line = flagged ? "d_r_safe" : hard ? "d_r_hard" : d.trend === "same" ? "d_r_same" : "d_r_ok";
  const invite = hard && !d.askOff ? `<div class="panel tray in"><h3 class="panel-h">${t("invite_title")}</h3><p class="muted" style="margin:-8px 0 14px">${t("invite_body")}</p>
      <button class="btn primary block" data-a="phqStart" data-v="2">${t("invite_short")}</button>
      <button class="btn quiet block" style="margin-top:8px" data-a="phqStart" data-v="9">${t("invite_full")}</button>
      <button class="btn ghost block" style="margin-top:2px" data-a="dailyAskOff">${t("invite_no")}</button></div>` : "";
  const med = d.med === "yes" ? `<div class="notice"><h3>${t("med_title")}</h3><p>${t("med_body")}</p>${S.dMedNote.trim() ? `<p class="muted">${esc(t("med_noted", { v: S.dMedNote.trim() }))}</p>` : ""}</div>` : "";
  const resources = `<h2 class="section-h">${t("d_for_today")}</h2><div class="list">${resourceRows(dailyResources())}</div>
    <h2 class="section-h">${t("d_try")}</h2><div class="list">${activityRows()}</div>`;
  const again = hard && !d.askOff ? "" : `<div class="list"><button class="li" data-a="phqOpen">${icon("heart")}<span class="t"><b>${t("mood_check_link")}</b><small>${t("mood_check_sub")}</small></span>${icon("chev")}</button></div>`;
  return `${hdrSub(t("daily_title"))}<div class="scroll">
    ${flagged ? `<div style="height:14px"></div>${helpPanel("safe_title", "safe_body")}` : ""}
    <section class="stage done" data-stage="companion"></section>
    <div class="sheet-top">${pebbleSays(line, { note: flagged || hard })}
      <p class="muted pad" style="padding-top:0;padding-bottom:6px;margin:0">${dailySummary()}</p>
      ${invite}${med}
      ${flagged || hard ? connectBlock() + resources : resources + connectBlock()}
      ${again}
      <div class="pad"><button class="btn quiet block" data-a="tab" data-v="companion">${t("companion")}</button></div>
    </div></div>`;
}

/* ---------- mood check: PHQ-2 and PHQ-9 ---------- */
const newPhq = (form, sample) => ({ form, i: 0, ans: sample ? [...sample.ans] : Array(9).fill(null), func: sample ? sample.func : null, sample: !!sample, carried: false, resume: 9 });
function phqScore() {
  const p = S.phq;
  if (!p || ![2, 9].includes(p.form)) return null;
  const answers = p.ans.slice(0, p.form);
  return answers.length === p.form && answers.every(n => Number.isInteger(n) && n >= 0 && n <= 3)
    ? answers.reduce((a, b) => a + b, 0) : null;
}
const phqFlag = () => S.phqSafety || (S.phq && S.phq.form === 9 && S.phq.ans[8] > 0);
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
      <div class="name-pick" role="group" aria-label="${L(PHQ.func)}">${PHQ.funcOpts.map((o, v) => askOpt(p.func === v, L(o), "phqFunc", v)).join("")}</div>
      ${p.func != null ? `<button class="btn sun block" style="margin-top:20px" data-a="phqNext">${t("phq_see")}${icon("chev")}</button>` : ""}</div>`;
  }
  const val = p.ans[p.i], last = p.i === p.form - 1 && p.form === 2;
  return `${hdrFlow(t("mood_check"), "phqBack")}${flowProgress(p.i + 1, p.form, t("phq_of", { form, n: p.i + 1, m: p.form }))}<div class="scroll pad flow">
    <p class="ask-stem">${L(PHQ.stem)}</p>
    <h2 class="ask-q" tabindex="-1" data-autofocus>${L(PHQ.items[p.i])}</h2>
    ${p.carried && p.i === 2 ? `<p class="muted ask-sub">${t("phq_carried")}</p>` : ""}
    <div class="name-pick" role="group" aria-label="${L(PHQ.items[p.i])}">${PHQ.opts.map((o, v) => askOpt(val === v, L(o), "phqPick", v)).join("")}</div>
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
  if (score === null) return phqScreen();
  const res = [RESOURCES.find(r => r.id === "notice")];
  const tail = `<div class="pad"><button class="btn quiet block" data-a="tab" data-v="companion">${t("companion")}</button></div>`;
  if (p.form === 2) {
    const above = score >= PHQ2_CUT;
    return `${hdrSub(t("result_title"))}<div class="scroll"><div style="height:30px"></div>${pebbleSays("p_r_done", { flat: true })}
      <div class="panel in"><div class="score"><span>PHQ-2 · ${t("result_score")}</span><b>${score}</b><i>/ 6</i></div>${bandList(PHQ2_BANDS, score)}
        <p class="r-plain">${t(above ? "r2_above" : "r2_below")}</p><p class="muted">${t("result_not_dx")}</p>
        <button class="btn ${above ? "sun" : "quiet"} block" data-a="phqContinue">${t("r2_continue")}${icon("chev")}</button></div>
      ${phqFlag() ? helpPanel("safe9_title", "safe9_body") : ""}${above ? connectBlock() : ""}
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
    <div style="height:${flagged ? 18 : 30}px"></div>${pebbleSays("p_r_done", { flat: true, note: urgent })}
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
function dailyToSafety(resume) { S.checkinSafety = true; Object.assign(S.daily, { step: "safety", resume }); if (world) world.emote("comfort"); render(true); }
function dailyAdvance() {
  const d = S.daily;
  if (!Number.isInteger(d.step) || (d.step < D_STEPS.length && !D_STEPS[d.step].opts.some(([v]) => v === d[D_STEPS[d.step].k]))) return;
  if (d.step === 2 && unsafeAnswer()) return dailyToSafety(3);
  if (d.step === 3 && isRisky(S.dMedNote)) return dailyToSafety(4);
  if (d.step === D_STEPS.length) { if (isRisky(S.dLine) && d.resume !== "finish") return dailyToSafety("finish"); return dailyFinish(); }
  d.step++; render(true);
}
function dailyFinish() {
  const d = S.daily, flagged = dailyFlag();
  if (!D_STEPS.every(q => q.opts.some(([v]) => v === d[q.k]))) return;
  S.care = null;
  S.mood = flagged ? "low" : { better: "good", same: "okay", worse: "low" }[d.trend];
  Object.assign(S, { checkedIn: true, petHinted: true, away: false, screen: "dailyDone" });
  d.done = true;
  /* Same seeds whatever the answers, and no toast on a safety answer: honesty never costs anything or feels rewarded. */
  const got = recordMood(S.mood) ? earn(5) : 0;
  if (got && !flagged) toast(t("seeds_earned", { n: got }));
  talkTo("r_" + S.mood, { silent: true });
  render(true);
  if (world) world.celebrate(HARD_MOODS.includes(S.mood));
}
function phqAdvance() {
  const p = S.phq;
  if (!p || !Number.isInteger(p.i) || (p.i < p.form ? p.ans[p.i] == null : p.func == null)) return;
  if (p.i === 8 && p.form === 9 && p.ans[8] > 0) { S.phqSafety = true; p.i = "safety"; if (world) world.emote("comfort"); render(true); return; }
  if (p.i === p.form - 1 && p.form === 2) return phqFinish();
  if (p.i === p.form) return phqFinish();
  p.i++; render(true);
}
function phqFinish() {
  if (phqScore() === null || (S.phq.form === 9 && S.phq.func == null)) return;
  const top = S.stack[S.stack.length - 1];
  if (top && ["phqIntro", "phqResult"].includes(top.screen)) S.stack.pop();
  S.screen = "phqResult"; render(true);
}
const CHECKIN_ACTIONS = {
  dailyRestart() { S.daily = newDaily(); S.dMedNote = ""; S.dLine = ""; go("daily"); },
  dailyOpen() {
    if (S.daily.done) { go("dailyDone"); return; }
    go("daily");
  },
  dailyPick(v) {
    const d = S.daily, k = D_STEPS[d.step].k;
    d[k] = v;
    if (k === "safe" && unsafeAnswer()) return dailyToSafety(3);
    render();
  },
  dailyNext() { dailyAdvance(); },
  dailyBack() {
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
    p.ans[i] = +v;
    if (i === 8 && +v > 0) return phqAdvance();
    render();
  },
  phqFunc(v) { S.phq.func = +v; render(); },
  phqNext() { phqAdvance(); },
  phqBack() {
    const p = S.phq;
    if (p.i === "safety") { p.i = 8; render(true); return; }
    if (p.i === 0) { if (p.carried) Object.assign(p, { form: 2, carried: false }); back(); return; }
    p.i--; render(true);
  },
  phqResume() { S.phq.i = 9; render(true); },
  /* PHQ-2 is the first two PHQ-9 questions, so those answers carry over and the Member starts at question 3. */
  phqContinue() {
    if (phqScore() === null) return;
    const p = S.phq, sample = PHQ_SAMPLES.find(x => x.id === S.phqSample);
    const ans = sample ? [...sample.ans] : Array(9).fill(null);
    ans[0] = p.ans[0]; ans[1] = p.ans[1];
    S.phq = { form: 9, i: 2, ans, func: sample ? sample.func : null, sample: p.sample, carried: true };
    S.stack.push({ screen: "phqResult", thread: S.thread, circle: S.circle });
    S.screen = "phq"; render(true);
  },
};
