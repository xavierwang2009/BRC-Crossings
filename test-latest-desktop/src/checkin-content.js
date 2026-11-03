/* Test build: copy for the daily check-in and the voluntary mood screening (EN / 繁 / 简).
   PHQ below is verbatim from the published forms on phqscreeners.com:
   PHQ-9 English, Traditional Chinese for Taiwan, Simplified Chinese for Mainland China.
   Those two Chinese forms are separate translations, so one is not converted from the other.
   Do not edit PHQ wording, including the 沒 the Simplified form prints. */
const PHQ = {
  stem: {
    en: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
    ht: "在過去兩個星期，有多少時候您受到以下任何問題所困擾？",
    hs: "在过去两周，您经常受到以下问题的困扰吗？",
  },
  items: [
    { en: "Little interest or pleasure in doing things", ht: "做事時提不起勁或沒有樂趣", hs: "做任何事都觉得沉闷或者根本不想做任何事" },
    { en: "Feeling down, depressed, or hopeless", ht: "感到心情低落、沮喪或絕望", hs: "情绪低落、抑郁或绝望" },
    { en: "Trouble falling or staying asleep, or sleeping too much", ht: "入睡困難、睡不安穩或睡眠過多", hs: "难于入睡；半夜会醒，或相反，睡觉时间过多" },
    { en: "Feeling tired or having little energy", ht: "感覺疲倦或沒有活力", hs: "觉得疲倦或沒有活力" },
    { en: "Poor appetite or overeating", ht: "食慾不振或吃太多", hs: "胃口极差或饮食过量" },
    { en: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", ht: "覺得自己很糟—或覺得自己很失敗，或讓自己或家人失望", hs: "不喜欢自己──觉得自己做得不好、对自己失望或有负家人期望" },
    { en: "Trouble concentrating on things, such as reading the newspaper or watching television", ht: "對事物專注有困難，例如閱讀報紙或看電視時", hs: "难于集中精神做事，例如看报纸或看电视" },
    { en: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", ht: "動作或說話速度緩慢到別人已經察覺，或正好相反—煩躁或坐立不安、動來動去的情況更勝於平常", hs: "其它人反映你行动或说话迟缓；或者相反，你比平常活动更多──坐立不安、停不下来" },
    { en: "Thoughts that you would be better off dead or of hurting yourself in some way", ht: "有不如死掉或用某種方式傷害自己的念頭", hs: "想到自己最好去死或者自残" },
  ],
  opts: [
    { en: "Not at all", ht: "完全沒有", hs: "从来沒有" },
    { en: "Several days", ht: "幾天", hs: "有几天" },
    { en: "More than half the days", ht: "一半以上的天數", hs: "刚超过一半天数" },
    { en: "Nearly every day", ht: "幾乎每天", hs: "接近每天" },
  ],
  func: {
    en: "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
    ht: "如果您發現自己有上述所提的任何問題，這些問題在您工作、照顧家庭事務或與他人相處上造成了多大的困難？",
    hs: "如果你选出以上任何问题，这些问题对你的工作、处理家中事务或与人相处时来说造成多大困难？",
  },
  funcOpts: [
    { en: "Not difficult at all", ht: "毫無困難", hs: "完全沒有困难" },
    { en: "Somewhat difficult", ht: "有點困難", hs: "有一些困难" },
    { en: "Very difficult", ht: "非常困難", hs: "非常困难" },
    { en: "Extremely difficult", ht: "極度困難", hs: "极度困难" },
  ],
  credit: {
    en: "Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.",
    ht: "本問卷由 Robert L. Spitzer 博士、Janet B.W. Williams 博士、Kurt Kroenke 博士和同事用 Pfizer Inc.提供的教育基金設計。無需准許即可複製、翻譯、展示或分發。",
    hs: "本问卷由 Robert L. Spitzer 博士、Janet B.W. Williams 博士、Kurt Kroenke 博士和同事用 Pfizer Inc.提供的教育基金设计。无需准许即可复制、翻译、展示或分发。",
  },
};
/* Standard scoring: PHQ-9 total 0–27 with cut points at 5, 10, 15, 20. PHQ-2 total 0–6, follow up at 3 or more. */
const PHQ9_BANDS = [
  { min: 0, max: 4, name: { en: "None or minimal", ht: "無或極少", hs: "无或极少" } },
  { min: 5, max: 9, name: { en: "Mild", ht: "輕度", hs: "轻度" } },
  { min: 10, max: 14, name: { en: "Moderate", ht: "中度", hs: "中度" } },
  { min: 15, max: 19, name: { en: "Moderately severe", ht: "中重度", hs: "中重度" } },
  { min: 20, max: 27, name: { en: "Severe", ht: "重度", hs: "重度" } },
];
const PHQ2_CUT = 3;
const PHQ2_BANDS = [
  { min: 0, max: 2, name: { en: "Below the usual follow-up point", ht: "低於通常建議進一步了解的分數", hs: "低于通常建议进一步了解的分数" } },
  { min: 3, max: 6, name: { en: "At or above the usual follow-up point", ht: "達到或高於通常建議進一步了解的分數", hs: "达到或高于通常建议进一步了解的分数" } },
];

const D_TOPICS = [
  { id: "sleep", en: "Sleep", ht: "睡眠", hs: "睡眠" },
  { id: "stress", en: "Stress", ht: "壓力", hs: "压力" },
  { id: "mood", en: "My mood", ht: "情緒", hs: "情绪" },
  { id: "family", en: "Family", ht: "家庭", hs: "家庭" },
  { id: "kids", en: "Kids", ht: "孩子", hs: "孩子" },
  { id: "partner", en: "Partner", ht: "伴侶", hs: "伴侣" },
  { id: "work", en: "Work", ht: "工作", hs: "工作" },
  { id: "health", en: "Health", ht: "健康", hs: "健康" },
];
const TOPIC_HELP = {
  sleep: { res: ["notice"], focus: "individual" }, stress: { res: ["notice", "work"], focus: "career" }, mood: { res: ["notice"], focus: "individual" },
  family: { res: ["family"], focus: "parenting" }, kids: { res: ["family"], focus: "parenting" }, partner: { res: ["listen"], focus: "couples" },
  work: { res: ["work"], focus: "career" }, health: { res: ["notice"], focus: "individual" },
};

/* Sample answers for the clickable prototype. */
const D_SAMPLES = [
  { id: "steady", name: { en: "Steady day", ht: "平穩的一天", hs: "平稳的一天" }, a: { trend: "better", sleep: "good", safe: "no", med: "none", topics: ["work"] } },
  { id: "low", name: { en: "Low day", ht: "低落的一天", hs: "低落的一天" }, a: { trend: "worse", sleep: "poor", safe: "no", med: "no", topics: ["mood", "family"] } },
  { id: "med", name: { en: "Medication side effect", ht: "藥物副作用", hs: "药物副作用" }, a: { trend: "same", sleep: "fair", safe: "no", med: "yes", topics: ["health"] }, note: { en: "Dizzy in the mornings this week", ht: "這星期早上會頭暈", hs: "这星期早上会头晕" } },
  { id: "safety", name: { en: "Safety concern", ht: "安全疑慮", hs: "安全疑虑" }, a: { trend: "worse", sleep: "poor", safe: "unsure", med: "none", topics: ["mood"] } },
];
const PHQ_SAMPLES = [
  { id: "few", name: { en: "Few symptoms", ht: "症狀很少", hs: "症状很少" }, ans: [0, 1, 0, 1, 0, 0, 0, 0, 0], func: 0 },
  { id: "moderate", name: { en: "Moderate", ht: "中度", hs: "中度" }, ans: [2, 2, 2, 2, 1, 1, 1, 0, 0], func: 1 },
  { id: "item9", name: { en: "Question 9 answered", ht: "第 9 題有勾選", hs: "第 9 题有勾选" }, ans: [2, 2, 2, 3, 2, 2, 1, 1, 1], func: 2 },
];

Object.assign(I18N, {
  test_bar: { en: "Preview · answers clear on refresh", ht: "測試版 · 模擬回答，不會儲存", hs: "测试版 · 模拟回答，不会保存" },
  test_samples: { en: "Test only: fill in sample answers", ht: "僅供測試：填入模擬回答", hs: "仅供测试：填入模拟回答" },

  daily_title: { en: "Today's check-in", ht: "今日打卡", hs: "今日打卡" },
  daily_sub: { en: "5 short questions, about a minute.", ht: "點選 5 題，約一分鐘。", hs: "点选 5 题，约一分钟。" },
  daily_start: { en: "Start check-in", ht: "開始打卡", hs: "开始打卡" },
  daily_see: { en: "See today's suggestions", ht: "查看今日建議", hs: "查看今日建议" },
  q_of: { en: "Question {n} of {m}", ht: "第 {n} 題，共 {m} 題", hs: "第 {n} 题，共 {m} 题" },
  next: { en: "Next", ht: "下一步", hs: "下一步" },

  d_trend: { en: "Compared with yesterday, how do you feel today?", ht: "跟昨天相比，你今天感覺怎麼樣？", hs: "跟昨天相比，你今天感觉怎么样？" },
  d_better: { en: "A little better", ht: "好一些", hs: "好一些" },
  d_same: { en: "About the same", ht: "差不多", hs: "差不多" },
  d_worse: { en: "A little worse", ht: "差一些", hs: "差一些" },
  d_sleep: { en: "How did you sleep last night?", ht: "昨晚睡得怎麼樣？", hs: "昨晚睡得怎么样？" },
  d_good: { en: "Well", ht: "好", hs: "好" },
  d_fair: { en: "So-so", ht: "一般", hs: "一般" },
  d_poor: { en: "Not well", ht: "不好", hs: "不好" },
  d_safe: { en: "Right now, do you feel unsafe, or have thoughts of hurting yourself or someone else?", ht: "你現在是否覺得不安全，或有傷害自己、他人的想法？", hs: "你现在是否觉得不安全，或有伤害自己、他人的想法？" },
  d_safe_note: { en: "Any answer is okay. No one is watching this in real time, so if you answer yes or not sure, we'll show you who to reach right away.", ht: "怎麼回答都可以。這裡沒有人即時查看，所以如果你答「有」或「不確定」，我們會馬上告訴你可以聯絡誰。", hs: "怎么回答都可以。这里没有人实时查看，所以如果你答“有”或“不确定”，我们会马上告诉你可以联系谁。" },
  d_no: { en: "No", ht: "沒有", hs: "没有" },
  d_yes: { en: "Yes", ht: "有", hs: "有" },
  d_unsure: { en: "Not sure", ht: "不確定", hs: "不确定" },
  d_med: { en: "If you take a medication to help stabilize your mood 💊, have you noticed a change in how it works, discomfort or side effects?", ht: "如果正在服穩定情緒的藥物💊，有沒有感覺到效果變化或不舒服、副作用？", hs: "如果正在服稳定情绪的药物💊，有没有感觉到效果变化或不舒服、副作用？" },
  d_none: { en: "Not taking any", ht: "未服藥", hs: "未服药" },
  d_med_ph: { en: "Optional: what did you notice?", ht: "可選填：你注意到什麼？", hs: "可选填：你注意到什么？" },
  d_topic: { en: "What's on your mind most today?", ht: "今天你最關心的是什麼？", hs: "今天你最关心的是什么？" },
  d_topic_sub: { en: "Pick a topic, or write a line.", ht: "選擇主題，或簡單寫一句。", hs: "选择主题，或简单写一句。" },
  d_topic_ph: { en: "Or write a line (optional)", ht: "或簡單寫一句（可不填）", hs: "或简单写一句（可不填）" },
  d_finish: { en: "See what might help", ht: "看看有什麼幫助", hs: "看看有什么帮助" },

  safe_title: { en: "Thank you for telling us", ht: "謝謝你告訴我們", hs: "谢谢你告诉我们" },
  safe_body: { en: "You don't have to handle this alone. These lines can talk with you right now.", ht: "你不必獨自面對。這些專線現在就可以和你談。", hs: "你不必独自面对。这些热线现在就可以和你谈。" },
  safe_continue: { en: "Continue check-in", ht: "繼續打卡", hs: "继续打卡" },
  safe_clinic: { en: "Contact Bridge River Counseling", ht: "聯絡 Bridge River Counseling", hs: "联系 Bridge River Counseling" },
  safe_clinic_sub: { en: "For follow-up care, not emergencies", ht: "用於後續照護，非緊急情況", hs: "用于后续照护，非紧急情况" },

  d_told: { en: "Today", ht: "今天", hs: "今天" },
  d_trend_short: { en: "Compared with yesterday: {v}", ht: "跟昨天相比：{v}", hs: "跟昨天相比：{v}" },
  d_sleep_short: { en: "Sleep: {v}", ht: "睡眠：{v}", hs: "睡眠：{v}" },
  d_for_today: { en: "For today", ht: "今天可以看看", hs: "今天可以看看" },
  d_try: { en: "Things to try", ht: "可以試試", hs: "可以试试" },
  d_talk: { en: "Talk with someone", ht: "找人談談", hs: "找人谈谈" },
  d_breathe: { en: "Breathe with {pet}", ht: "和 {pet} 一起呼吸", hs: "和 {pet} 一起呼吸" },
  d_breathe_sub: { en: "A slow breathing exercise", ht: "緩慢的呼吸練習", hs: "缓慢的呼吸练习" },
  d_ask: { en: "Ask the community and Counselors", ht: "問問社群和輔導師", hs: "问问社群和咨询师" },
  d_ask_sub: { en: "Named or anonymous, you choose", ht: "具名或匿名，由你決定", hs: "具名或匿名，由你决定" },
  d_circle_sub: { en: "A Circle for this topic", ht: "這個主題的 Circle", hs: "这个主题的 Circle" },
  d_book: { en: "Book a session", ht: "預約諮商", hs: "预约咨询" },
  d_book_sub: { en: "On the clinic website", ht: "在診所網站", hs: "在诊所网站" },
  d_home: { en: "Back to Home", ht: "回到首頁", hs: "回到首页" },

  invite_title: { en: "Would a short mood check help?", ht: "要不要做一個簡短的情緒篩查？", hs: "要不要做一个简短的情绪筛查？" },
  invite_body: { en: "Two standard questions about the last 2 weeks. It's your choice, and it isn't a diagnosis.", ht: "兩個關於過去兩個星期的標準問題。做不做由你決定，結果也不是診斷。", hs: "两个关于过去两周的标准问题。做不做由你决定，结果也不是诊断。" },
  invite_short: { en: "Start, 2 questions", ht: "開始，2 題", hs: "开始，2 题" },
  invite_full: { en: "Go straight to all 9", ht: "直接做完整 9 題", hs: "直接做完整 9 题" },
  invite_no: { en: "Not today", ht: "今天不用", hs: "今天不用" },
  mood_check_link: { en: "Take a mood check", ht: "做情緒篩查", hs: "做情绪筛查" },
  mood_check_sub: { en: "PHQ-2 or PHQ-9, whenever you choose", ht: "PHQ-2 或 PHQ-9，隨時由你決定", hs: "PHQ-2 或 PHQ-9，随时由你决定" },

  med_title: { en: "Please tell the person who prescribes it", ht: "請告訴開藥的專業人員", hs: "请告诉开药的专业人员" },
  med_body: { en: "They are the right person to look at what you noticed. This app can't advise on medication, so please talk with them before changing anything. If a reaction feels severe or urgent, call 911.", ht: "他們最適合了解你注意到的情況。這個 App 無法提供用藥建議，所以有任何調整前，請先和他們談。如果反應嚴重或緊急，請撥打 911。", hs: "他们最适合了解你注意到的情况。这个 App 无法提供用药建议，所以有任何调整前，请先和他们谈。如果反应严重或紧急，请拨打 911。" },
  med_noted: { en: "What you noticed: {v}", ht: "你注意到的：{v}", hs: "你注意到的：{v}" },

  mood_check: { en: "Mood check", ht: "情緒篩查", hs: "情绪筛查" },
  phq_intro_title: { en: "A check-in on the last 2 weeks", ht: "看看過去兩個星期的狀況", hs: "看看过去两周的状况" },
  phq_intro_body: { en: "These are standard questionnaires used widely in health care. You decide whether and when to take one. The result isn't a diagnosis; it helps you see how things have been and what might help.", ht: "這些是醫療照護中廣泛使用的標準問卷。做不做、什麼時候做，都由你決定。結果不是診斷，而是幫助你了解最近的狀況，以及什麼可能有幫助。", hs: "这些是医疗照护中广泛使用的标准问卷。做不做、什么时候做，都由你决定。结果不是诊断，而是帮助你了解最近的状况，以及什么可能有帮助。" },
  phq2_pick: { en: "Short: 2 questions (PHQ-2)", ht: "簡短：2 題（PHQ-2）", hs: "简短：2 题（PHQ-2）" },
  phq2_pick_sub: { en: "A quick first look. You can continue to the full set if it helps.", ht: "快速初步了解。有需要時可以繼續做完整問卷。", hs: "快速初步了解。有需要时可以继续做完整问卷。" },
  phq9_pick: { en: "Full: 9 questions (PHQ-9)", ht: "完整：9 題（PHQ-9）", hs: "完整：9 题（PHQ-9）" },
  phq9_pick_sub: { en: "The complete questionnaire, plus 1 question about daily life.", ht: "完整問卷，再加 1 題關於日常生活的問題。", hs: "完整问卷，再加 1 题关于日常生活的问题。" },
  phq_of: { en: "{form} · Question {n} of {m}", ht: "{form} · 第 {n} 題，共 {m} 題", hs: "{form} · 第 {n} 题，共 {m} 题" },
  phq_func_label: { en: "PHQ-9 · One last question, not part of the score", ht: "PHQ-9 · 最後一題，不計入分數", hs: "PHQ-9 · 最后一题，不计入分数" },
  phq_carried: { en: "Your first 2 answers carried over from the short check. Tap Back to change them.", ht: "前 2 題的回答已從簡短篩查帶入。可點「返回」修改。", hs: "前 2 题的回答已从简短筛查带入。可点“返回”修改。" },
  phq_see: { en: "See my result", ht: "查看結果", hs: "查看结果" },

  safe9_title: { en: "Thank you for answering honestly", ht: "謝謝你誠實回答", hs: "谢谢你诚实回答" },
  safe9_body: { en: "You said you've had thoughts of being better off dead or of hurting yourself. Please talk with someone about this, even if the thoughts come and go. These lines can talk with you right now.", ht: "你提到曾有不如死掉或傷害自己的念頭。即使這些念頭時有時無，也請找人談談。這些專線現在就可以和你談。", hs: "你提到曾有最好去死或伤害自己的念头。即使这些念头时有时无，也请找人谈谈。这些热线现在就可以和你谈。" },

  result_title: { en: "Your result", ht: "你的結果", hs: "你的结果" },
  result_not_dx: { en: "This is a screening result, not a diagnosis. Only a licensed professional can diagnose.", ht: "這是篩查結果，不是診斷。只有持照的專業人員才能作出診斷。", hs: "这是筛查结果，不是诊断。只有持证的专业人员才能作出诊断。" },
  result_score: { en: "Score", ht: "分數", hs: "分数" },
  result_you: { en: "You", ht: "你", hs: "你" },
  r9_plain: { en: "Your answers fit the “{band}” range for symptoms of depression over the last 2 weeks.", ht: "你的回答落在過去兩個星期憂鬱症狀的「{band}」範圍。", hs: "你的回答落在过去两周抑郁症状的“{band}”范围。" },
  r9_next_0: { en: "Keep doing what helps. You can check again anytime things change.", ht: "繼續做對你有幫助的事。狀況有變化時，隨時可以再做一次。", hs: "继续做对你有帮助的事。状况有变化时，随时可以再做一次。" },
  r9_next_1: { en: "Small supports can help. Here are some to try, and you can check again in about 2 weeks.", ht: "小小的支持也能有幫助。下面有一些可以試試，大約兩個星期後可以再做一次。", hs: "小小的支持也能有帮助。下面有一些可以试试，大约两周后可以再做一次。" },
  r9_next_2: { en: "It would be a good idea to talk this over with a Counselor or your doctor.", ht: "建議你和輔導師或醫生談談這些狀況。", hs: "建议你和咨询师或医生谈谈这些状况。" },
  r9_next_3: { en: "We encourage you to talk with a Counselor or your doctor soon.", ht: "我們鼓勵你盡快和輔導師或醫生談談。", hs: "我们鼓励你尽快和咨询师或医生谈谈。" },
  r9_next_4: { en: "Please reach out to a Counselor or your doctor as soon as you can.", ht: "請盡快聯絡輔導師或醫生。", hs: "请尽快联系咨询师或医生。" },
  r_func_hard: { en: "You also said this is making daily life very hard. That matters on its own, so talking with someone could help whatever the score.", ht: "你也提到這些問題讓日常生活很困難。這本身就很重要，所以不論分數如何，找人談談都可能有幫助。", hs: "你也提到这些问题让日常生活很困难。这本身就很重要，所以不论分数如何，找人谈谈都可能有帮助。" },
  r_func_said: { en: "Daily life: {v}", ht: "日常生活：{v}", hs: "日常生活：{v}" },
  r2_above: { en: "Your answers reach the usual point where the full questionnaire is suggested. That doesn't mean something is wrong; it means a closer look could be useful.", ht: "你的回答達到通常建議做完整問卷的分數。這不代表有什麼問題，只是進一步了解可能有幫助。", hs: "你的回答达到通常建议做完整问卷的分数。这不代表有什么问题，只是进一步了解可能有帮助。" },
  r2_below: { en: "Your answers are below the usual point for looking further. If things still feel heavy, that counts too, and the full questionnaire or a conversation is always open to you.", ht: "你的回答低於通常建議進一步了解的分數。如果仍然覺得沉重，這也很重要，隨時可以做完整問卷或找人談談。", hs: "你的回答低于通常建议进一步了解的分数。如果仍然觉得沉重，这也很重要，随时可以做完整问卷或找人谈谈。" },
  r2_continue: { en: "Continue with PHQ-9, 7 more questions", ht: "繼續做 PHQ-9，還有 7 題", hs: "继续做 PHQ-9，还有 7 题" },
  r_answers: { en: "My answers and how they're scored", ht: "我的回答與計分方式", hs: "我的回答与计分方式" },
  r_scoring_9: { en: "Each answer scores 0 to 3, and the 9 scores are added together for a total of 0 to 27. The daily-life question isn't added.", ht: "每題 0 到 3 分，9 題相加，總分 0 到 27。日常生活的問題不計入。", hs: "每题 0 到 3 分，9 题相加，总分 0 到 27。日常生活的问题不计入。" },
  r_scoring_2: { en: "Each answer scores 0 to 3, and the 2 scores are added together for a total of 0 to 6.", ht: "每題 0 到 3 分，2 題相加，總分 0 到 6。", hs: "每题 0 到 3 分，2 题相加，总分 0 到 6。" },
});

Object.assign(TT, {
  d_r_ok: { en: "Thanks for checking in, {name}. I picked a few things for today.", ht: "謝謝你來打卡，{name}。我幫你挑了幾樣今天可以看看的。", hs: "谢谢你来打卡，{name}。我帮你挑了几样今天可以看看的。" },
  d_r_same: { en: "Same as yesterday still counts, {name}. You showed up. I picked a few things for today.", ht: "和昨天差不多也很好，{name}。你來了就很棒。我幫你挑了幾樣今天可以看看的。", hs: "和昨天差不多也很好，{name}。你来了就很棒。我帮你挑了几样今天可以看看的。" },
  d_r_hard: { en: "Thanks for telling me, {name}. It's okay to say today is harder. I stayed close, and I found some real help too.", ht: "謝謝你告訴我，{name}。今天比較難，說出來沒關係。我陪著你，也幫你找了一些實際的幫助。", hs: "谢谢你告诉我，{name}。今天比较难，说出来没关系。我陪着你，也帮你找了一些实际的帮助。" },
  d_r_safe: { en: "I'm really glad you told me, {name}. I'm staying right here, and the people above can help you right now.", ht: "我很高興你告訴我，{name}。我會待在這裡陪你，上面這些專線現在就能幫你。", hs: "我很高兴你告诉我，{name}。我会待在这里陪你，上面这些热线现在就能帮你。" },
  p_r_done: { en: "You did that at your own pace, {name}. I'm here whatever the number says.", ht: "你按自己的步調完成了，{name}。不管分數是多少，我都在這裡。", hs: "你按自己的步调完成了，{name}。不管分数是多少，我都在这里。" },
  o_daily: { en: "Today's check-in", ht: "今日打卡", hs: "今日打卡" },
  o_mood_check: { en: "A short mood check", ht: "簡短情緒篩查", hs: "简短情绪筛查" },
});

Object.assign(TT, { hello_c: { en: "Take a moment to check in with yourself. I’m here with you.", ht: "花一點時間關心自己。我在這裡陪你。", hs: "花一点时间关心自己。我在这里陪你。" } });

Object.assign(I18N, { sample_active: { en: "Sample answers · clears on refresh", ht: "模擬回答 · 重新整理後清除", hs: "模拟回答 · 刷新后清除" } });
