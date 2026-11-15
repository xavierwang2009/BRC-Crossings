# BRC Crossings 同渡 — real-user build

The version of the app meant for real Members. It started as a copy of `test-latest` with everything invented taken out.

## What is in it

Everything here works on one person's phone, with nothing sent anywhere:

- Daily one-tap check-in with the Companion, the optional longer check-in and the optional PHQ-2 / PHQ-9 questionnaire
- The Companion, its shop and badges
- Practice library, in English, 繁體中文 and 简体中文
- My activity (check-in history, mood patterns, a goal)
- Private journal (optional)
- Backgrounds and music, in Me → Settings
- Help: 988, text 988, the local crisis line, 911, and booking on bridgerivercounseling.com
- Installable from the browser, and opens without a connection after the first visit

## What was removed

- Sample posts, sample Members and friends, fictional Counselors, made-up Circle member counts
- Scripted Counselor replies and the Counselor workspace preview
- Sample check-in answers, the sample week, the test bar and the `?skip=1` / `?screen=…` review links
- The "sign in" that loaded a sample Member, and the replay button
- The phone frame, fake status bar and prototype notes
- The generated portrait used for "Guidance from a real person" and the community and friends pictures

## What is switched off, and why

`LIVE` at the top of `src/content.js`:

```js
const LIVE = { community: false, counselors: false };
```

- `community` covers the feed, Circles, Ask, posting and replying, and friends.
- `counselors` covers Counselor guide matching and messages.

Both need a server and real people behind them. With no server, a post would be seen by nobody and a message to a Counselor would reach nobody, so the screens, tabs and buttons that lead to them are hidden. The code is still here. Turn a flag on only when its real data source is connected; the wording in those screens still says "test version" in places and needs a pass at that point.

## Before real Members use it

- **Terms and Privacy Notice.** There are none yet. Setup asks the Member to confirm they are 18 or older and that they understand this is not therapy or an emergency service. It does not claim agreement to documents that do not exist.
- **Practice library.** The practices have not been reviewed by a Counselor.
- **Chinese-language crisis line.** Not confirmed, so none is shown.
- **Clinic logo.** Taken from bridgerivercounseling.com until official files arrive.
- **Background photos.** Loaded from Unsplash; host licensed copies for a launch.
- **Data.** Saved only in the browser on that device (`brc-crossings-real-v1`). Clearing the browser's data or changing phones loses it. There are no accounts.

## Build and test

```bash
python3 -I build.py
```

```bash
for f in tests/*.cjs; do node "$f"; done
```
