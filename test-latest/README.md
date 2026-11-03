# BRC Crossings 同渡

A clickable prototype of the community app for Bridge River Counseling (Dallas & Frisco): peer support, answers from licensed Counselors, a Counselor guide, and a daily check-in with a living 3D Companion. Works in English, 繁體中文 and 简体中文.

## Quick start

### ▶ [Open the prototype](https://xavierwang2009.github.io/BRC-Crossings/test-latest/)

Runs in any modern browser, on a phone or a computer. Nothing to install.

Jump straight to a screen:

- [Home, skipping sign-up](https://xavierwang2009.github.io/BRC-Crossings/test-latest/?skip=1)
- [Check in with your Companion](https://xavierwang2009.github.io/BRC-Crossings/test-latest/?screen=companion)
- [A good evening: rabbit with a hat, lantern and bridge lights](https://xavierwang2009.github.io/BRC-Crossings/test-latest/?skip=1&checkedin=1&mood=great&time=22&species=rabbit&wear=hat,lantern,bridge)
- [A hard day: rain at dusk, with comfort and breathing](https://xavierwang2009.github.io/BRC-Crossings/test-latest/?screen=companion&checkedin=1&mood=sad&time=18.8)
- [繁體中文](https://xavierwang2009.github.io/BRC-Crossings/test-latest/?lang=ht) · [简体中文](https://xavierwang2009.github.io/BRC-Crossings/test-latest/?lang=hs)
- [Original v1 prototype, with three layout variants](https://xavierwang2009.github.io/BRC-Crossings/prototype-v1/)

Things to try:

- Tap, stroke or press and hold the Companion.
- Pick a mood and check in; the weather and the Companion change with it.
- The diorama follows your real clock. On a computer, the panel beside the phone previews morning, day, dusk and night.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. The page loads three.js and fonts from CDNs, so it needs an internet connection.

## Change it

`index.html` is built from the files in `src/`. Edit those, then rebuild:

```bash
python3 build.py
```

| File | What's in it |
| --- | --- |
| `src/content.js` | All copy in three languages, sample posts, Counselors, crisis lines |
| `src/styles.css` | Colours, type, components and motion |
| `src/app.js` | Screens, state and actions |
| `src/companion3d.js` | The 3D riverbank and Companion (three.js) |
| `DESIGN.md` | The design system |
| `PRODUCT.md` | Product notes and principles |

## Notes

- All people, posts and Counselor names are fictional samples.
- The logo is from bridgerivercounseling.com until official files arrive.
- The Chinese-language crisis line stays hidden until a partner is confirmed.
- This is a prototype. It is not therapy and not a crisis service.

## Activity preview

Open `?screen=activity`, or choose **My activity** in Companion or Me. A completed mood check-in counts once per local calendar day. Editing the same day replaces that mood and gives no extra check-in seeds. Current streak includes yesterday until today ends; missing a full day resets the current streak, while the longest streak remains. Goals: 7, 14, 30 or 50 days. The weekly view uses categorical moods, leaves missed days blank, and shows a distribution and dated history.

History stays in memory and clears on refresh. **Load a sample week** adds explicitly illustrative past entries without replacing current entries. No mood is transmitted or monitored by clinic staff.

Run date/streak checks with `node tests/activity.cjs`.

### Practice library preview

Open `?screen=learn`, or Practice library from Home or Me. Six sample practices support English, Traditional Chinese, and Simplified Chinese. Search and topic/duration/language filters combine; selecting a resource language also changes the practice text. Open a card for its steps, or save/remove it in the Saved view. Saves and filters remain during navigation but clear on refresh. Content is prototype copy, not counselor-reviewed. Run `node tests/library.cjs` for filtering checks.

### Friends preview

Open `?screen=friends` or Me → Friends. Named sample posts offer Add friend; anonymous posts do not expose identity or friend actions. Requests remain pending until accepted. Friends has incoming requests, sent requests with cancellation, and accepted friends with removal. Preview an incoming request adds a fictional request from Jenny H. All relationships are session-only; no requests reach real people. Run `node tests/friends.cjs`.

### Ask destinations

Ask and the Home prompt open a destination chooser (`?screen=ask`): counselor (existing guide or matching), community (named/anonymous post), or one accepted friend. Pending requests are excluded. Friend drafts and messages are separated by member ID and stay in memory; messages are explicitly not delivered.

### After a mood check-in

Companion offers breathing, generated ambient tones/rain/waves, session-only private journaling, and quiet company. Good/Great moods also offer celebration, saving a good moment, savoring, sharing a community/friend draft, and thanking an accepted friend. Sharing never copies private journal text or sends automatically. Audio is tap-to-play with volume/stop; it stops when leaving Companion, changing activities, or hiding the page. All journal entries clear on refresh. Preview `?screen=companion&checkedin=1&mood=good` (or `mood=low`).

### Counselor workspace preview

Open `?screen=counselor` or Me → Preview counselor workspace. This separate English-language demo contains an assigned-member inbox, community questions with topic/language filters, member visibility examples, and profile/availability settings. Replies, flags, resolution state and settings are simulated in memory and clear on refresh. No clinic staff are notified. It uses isolated fictional data and never reads member journal entries or resolves anonymous identities. Clinic invitation, credential verification and production access control are described but not implemented.

### Home feature orbit

Home (`?screen=home`) replaces the pet/riverbank hero with an adult editorial feature introduction. Four distinct generated images introduce Community, Counselor guidance, Friends, and Companion. The description slides to match the frontmost image during automatic rotation, dragging, and photo/dot or previous/next selection. Get started opens setup with empty profile fields and unchecked consents; Sign in opens the sample member experience. Motion pauses on hover/focus, supports manual pause and swipe, respects reduced motion, and is cleaned up on navigation. The pet remains on Companion and the setup picker.

`src/orbit.js` adapts the non-React engine from the user-supplied React Bits OrbitImages source, created by Dominik Koch (https://x.com/dominikkoch). React Bits copyright/license is retained in source and `assets/licenses/react-bits-LICENSE.md`. The Community photo uses the generated group image in `assets/home-community.png`. Friends, Counselor, and Companion use separate generated images in `assets/home-friends.png`, `assets/home-counselor.png`, and `assets/home-companion.png`. People are fictional illustrations, not actual members or counselors; the otter illustrates a selectable pet, not an adopted pet. The exact built-in generation prompts are saved in `assets/home-image-prompts.md` (Counselor and Companion) and `assets/home-image-prompts-v3.md` (current diverse Community and Friends images). The build embeds these images and orbit code into index.html.

### Home button borders

Get started and Sign in adapt the user-supplied React Bits StarBorder canvas engine in `src/starborder.js`, without React or extra dependencies. Existing button actions and colors are retained. Border motion pauses with Home rotation, respects reduced motion, suspends while the page is hidden, and cleans up on navigation. License retained in source and `assets/licenses/react-bits-LICENSE.md`. Run `node tests/starborder.cjs` for drawing and lifecycle checks.
