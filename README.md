# BRC Crossings 同渡

A clickable prototype of the community app for Bridge River Counseling (Dallas & Frisco): peer support, answers from licensed Counselors, a Counselor guide, and a daily check-in with a living 3D Companion. Works in English, 繁體中文 and 简体中文.

## Quick start

### ▶ [Open the prototype](https://xavierwang2009.github.io/BRC-Crossings/)

Runs in any modern browser, on a phone or a computer. Nothing to install.

Jump straight to a screen:

- [Home, skipping sign-up](https://xavierwang2009.github.io/BRC-Crossings/?skip=1)
- [Check in with your Companion](https://xavierwang2009.github.io/BRC-Crossings/?screen=companion)
- [A good evening: rabbit with a hat, lantern and bridge lights](https://xavierwang2009.github.io/BRC-Crossings/?skip=1&checkedin=1&mood=great&time=22&species=rabbit&wear=hat,lantern,bridge)
- [A hard day: rain at dusk, with comfort and breathing](https://xavierwang2009.github.io/BRC-Crossings/?screen=companion&checkedin=1&mood=sad&time=18.8)
- [繁體中文](https://xavierwang2009.github.io/BRC-Crossings/?lang=ht) · [简体中文](https://xavierwang2009.github.io/BRC-Crossings/?lang=hs)
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
