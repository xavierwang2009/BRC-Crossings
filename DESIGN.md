---
name: BRC Crossings 同渡
description: A calm forest-and-mist community shell holding one living thing, a tiny 3D riverbank where your Companion lives.
colors:
  forest: "#24452f"
  forest-2: "#2f5a3d"
  forest-3: "#3c6b4a"
  ink: "#1d2a22"
  ink-2: "#47584d"
  ink-3: "#5d6f63"
  mist: "#e6f3ee"
  mist-2: "#d6eadf"
  card: "#fbfdfb"
  line: "#cfe2d7"
  meadow: "#79c267"
  meadow-ink: "#2f6b2a"
  river: "#3fa3b4"
  river-soft: "#e1f2f4"
  river-ink: "#17616d"
  sun: "#ffd15c"
  sun-soft: "#fff2c6"
  sun-ink: "#6b4c00"
  berry: "#ff8066"
  berry-soft: "#ffe6df"
  berry-ink: "#a8361f"
  on-forest: "#f2faf4"
  on-forest-2: "#c3dccb"
typography:
  display:
    fontFamily: "Fredoka, Noto Sans TC, Noto Sans SC, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.12
  headline:
    fontFamily: "Fredoka, Noto Sans TC, Noto Sans SC, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Fredoka, Noto Sans TC, Noto Sans SC, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Nunito, Noto Sans TC, Noto Sans SC, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Nunito, Noto Sans TC, Noto Sans SC, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  field: "12px"
  tile: "16px"
  card: "18px"
  sheet: "26px"
  pill: "999px"
spacing:
  chip-gap: "8px"
  gap: "12px"
  gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.forest-2}"
  button-sun:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.forest}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-quiet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.forest}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 15px"
    height: "44px"
  chip-on:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
  help-pill:
    backgroundColor: "{colors.berry-soft}"
    textColor: "{colors.berry-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "44px"
  field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "13px 14px"
  panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "16px"
  panel-tray:
    backgroundColor: "{colors.mist-2}"
    rounded: "{rounded.card}"
    padding: "16px"
  guide-card:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.on-forest}"
    rounded: "{rounded.card}"
    padding: "14px"
  post-lit:
    backgroundColor: "{colors.sun-soft}"
    rounded: "{rounded.card}"
    padding: "0 12px"
  comfort-card:
    backgroundColor: "{colors.berry-soft}"
    textColor: "{colors.berry-ink}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  tag-new:
    backgroundColor: "{colors.sun-soft}"
    textColor: "{colors.sun-ink}"
    rounded: "{rounded.pill}"
    height: "26px"
  tag-answer:
    backgroundColor: "{colors.river-soft}"
    textColor: "{colors.river-ink}"
    rounded: "{rounded.pill}"
    height: "26px"
  tab-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-3}"
---

# Design System: BRC Crossings 同渡

## Overview

**Creative North Star: "The Riverbank Diorama"**

The shell is calm and ordinary on purpose: a forest-ink header, a mist-green ground, rounded pill controls, and readable bilingual type. It holds one living thing, a small soft-shaded 3D riverbank where the Companion lives. The diorama is lit by the Member's real clock and weathered by their check-in, so the most animated object on screen is also the most truthful one. Everything else stays quiet so that it can be the thing that moves.

Density is relaxed and touch-first: 44px minimum targets, 48px primary buttons, a 16px gutter shared by every block. Color is used for meaning. Sun marks what changed and what to do next, berry marks warmth, help and hearts, river marks Counselor voice, and meadow marks earned growth. Surfaces are matte. Lift comes from soft, offset, tinted shadows, never from hard ledges or glow.

The world rejects the wellness-app default it was built against: pastel gradient shells, stacks of white cards for every piece of content, and a flat mascot.

**Key Characteristics:**
- Forest-ink header and tab-bar chrome around a mist-green ground.
- One live 3D diorama per screen at most, driven only by real data (clock, check-in, touch).
- Pill controls, 18px cards, soft offset shadows tinted forest.
- Chunky rounded display (Fredoka) over a rounded workhorse body (Nunito), Noto Sans TC/SC for Chinese.
- One motion grammar: a 0.42s gentle overshoot.

## Colors

A deep forest and pale mist base with four nature accents, each with a soft fill and a dark ink for text on that fill.

### Primary
- **Forest Ink** (forest): header, tab-bar Ask disc, primary buttons, selected chips and options, the Counselor guide card, and every heading on the ground. Forest-2 is its hover and the logo-mark tile; forest-3 is the focus border on fields and the default avatar fill.

### Secondary
- **River Teal** (river): Counselor voice. The guide avatar and external-call buttons use river. Counselor answers, "Counselor answered" tags, links and the language pill use river-soft fills with river-ink text.
- **Meadow Green** (meadow): the diorama's grass and earned growth. Meadow-ink colours the RiverSeeds price icon. Meadow stays rare in the UI chrome.

### Tertiary
- **Sun** (sun): highlight and next action. Used for the Check in button, the focus outline, the RiverSeeds icon, earned badges, icons on forest, and text selection. Sun-soft with sun-ink is the "changed, not yet seen" state.
- **Berry** (berry): warmth, hearts and help. The Help pill (berry-soft with a berry disc), the active-tab dot, the Helpful heart (berry-ink), the main Focus Area star, crisis call buttons, the comfort card (berry-soft with berry-ink), and the field caret.

### Neutral
- **Mist** (mist): the ground every screen sits on, including sheets.
- **Mist Deep** (mist-2): trays, segmented-control tracks, anonymous avatars, progress tracks, unearned badges.
- **Card White** (card): lifted panels, lists, fields, chips, the tab bar.
- **Hairline** (line): 1.5px dividers between feed posts, rows and checklist items, and the inset stroke on chips, fields and options.
- **Ink** (ink, ink-2, ink-3): body text, secondary text, and tertiary text such as inactive tabs and placeholder prompts.
- **On Forest** (on-forest, on-forest-2): primary and secondary text on forest surfaces.

### Named Rules
**The Accent Means Something Rule.** Each accent has one job: sun for change and next action, berry for warmth and help, river for Counselor voice, meadow for growth. Never use an accent only for decoration.

**The Soft-Plus-Ink Rule.** An accent fill that carries text is always the soft tint with its own ink (sun-soft/sun-ink, berry-soft/berry-ink, river-soft/river-ink). Text never sits directly on full-strength sun, berry or river, except forest text on the sun button.

## Typography

**Display Font:** Fredoka (with Noto Sans TC / Noto Sans SC, system-ui)
**Body Font:** Nunito (with Noto Sans TC / Noto Sans SC, system-ui)

**Character:** Fredoka is chunky and rounded, so headings feel like soft toys. Nunito is a rounded workhorse with steady weights. Noto carries Chinese at the same visual size. Simplified Chinese puts Noto Sans SC first. In both Chinese locales the small and medium steps grow (14px and 16.5px) so the two scripts stay equally readable.

### Hierarchy
- **Display** (600, 30px, 1.12): the welcome headline and the breathing prompt only.
- **Headline** (600, 21px, 1.2): screen titles, section headings, the diorama greeting, and panel headings.
- **Title** (600, 16px, 1.2): button labels, the wordmark, guide and Counselor names, card titles.
- **Body** (500, 16px, 1.5): posts, answers, messages. Weight 700–800 picks out names and row titles.
- **Label** (700, 13.5px, 1.3): chips, tags, meta lines, tab labels, the Help and RiverSeeds pills, and the muted secondary text.

### Named Rules
**The Three Sizes Rule.** UI text ranks by weight across three working sizes (13.5 / 16 / 21px). Use display size only for the welcome headline and the breathing prompt. Use weight, not a new size, to separate things.

**The Equal Scripts Rule.** Every type role names a Noto fallback, and the Chinese locales bump the small and medium steps. Never set a Latin-only stack on text that may hold Chinese.

## Layout

The app is a single mobile column (up to 560px wide on small screens; a 394×830 device frame on desktop, with prototype notes beside it). Every block, including posts, panels, lists, the ask field, the guide card and section headings, sits on one shared 16px gutter. Blocks are 12px apart, and items in chip rows and tile grids are 8px apart. Multi-item grids divide the column into four: moods and species use 4 columns, shop items use 2 (each spanning two). Section headings have 26px above and 12px below.

Home's first viewport, top to bottom: forest header (logo mark, wordmark, RiverSeeds pill, Help pill), the live diorama (372px), then a mist sheet that rises 24px over the diorama's lower edge. The Check in button sits on that edge. Below come the Counselor guide card, the ask field, and the feed. The tab bar has five slots with the Ask disc raised in the centre.

### Named Rules
**The One Gutter Rule.** Nothing pokes out past the 16px gutter, and that includes highlight states. A lit post insets its own 12px padding so its fill stays inside the gutter.

**The Said Once Rule.** A fact appears once per view. The check-in card shows the mood, so the diorama overlay doesn't.

## Elevation & Depth

This is a hybrid system. The ground (mist) and trays (mist-2) are tonal and flat. Lifted surfaces (card-white panels, lists, the ask field, selected segments, Counselor lines) use soft offset shadows tinted forest. Only the diorama itself is truly 3D: matte-vinyl toys under clock-driven light.

### Shadow Vocabulary
- **Lift** (`0 1px 2px rgba(22,52,34,.08), 0 10px 22px -14px rgba(22,52,34,.45)`): default for card-white panels, lists, the ask field, selected segments, and the hint pill.
- **Lift 2** (`0 2px 4px rgba(22,52,34,.1), 0 18px 34px -18px rgba(22,52,34,.55)`): the Counselor guide card and the booking card.
- **Sun lift** (`0 4px 8px -2px rgba(107,76,0,.28), 0 14px 26px -12px rgba(22,52,34,.6)`): sun buttons.
- **Forest drop** (`0 10px 18px -12px rgba(22,52,34,.9)`): forest primary buttons.

### Named Rules
**The Soft Offset Rule.** Every shadow is offset downward, blurred, and tinted forest or sun-ink. Never use a zero-blur ledge or a zero-offset glow halo.

**The Tray Is Flat Rule.** Trays (mist-2) and the comfort card never carry a shadow. Use a tray for the Companion check-in and its summary.

## Shapes

The corners are soft and toy-like. Cards are 18px, tiles and options 16px, icon buttons and tab hit areas 14px, fields and inner answer blocks 12px, and checkboxes 8px. Bottom sheets and the welcome body round their top corners to 24–26px. Every button, chip, tag, segment and pill is fully round (999px). Chat bubbles are 20px, with the corner nearest the speaker tucked to 6px. Strokes are 1.5px inset hairlines, thickening to 2–2.5px forest for a selected tile.

The stone arch bridge in the diorama echoes the clinic logo. It is turned diagonally (yaw -0.7) so both arches face the camera.

## Components

### Buttons
- **Shape:** full pill (999px), 48px tall (44px small), Fredoka 600 label, 8px icon gap.
- **Primary (forest):** forest with on-forest text and the forest drop. Hover goes to forest-2.
- **Sun:** sun with forest text and the sun lift. This is the one "do it now" action per view, such as Check in on the diorama edge. Hover lightens it slightly.
- **Quiet:** card-white with a 1.5px inset hairline (#b9d6c5). Ghost is transparent with forest text.
- **Press:** scale 0.96 on the --spring curve. Disabled is grey-green (#c9d6cf) with no shadow.
- **Focus:** a 3px sun outline at 2px offset, used across the system.

### Chips
- **Style:** card-white pill, 44px, 1.5px line inset, forest label.
- **State:** selected chips fill forest with on-forest text and drop the stroke. Tags are smaller 26px pills (12.5px, 800): sun-soft for new, river-soft for Counselor answered, berry-soft for held, mist-2 for required.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** card-white for lifted panels and lists, mist-2 for trays, forest for the Counselor guide card, berry-soft for the comfort card.
- **Shadow Strategy:** lift for panels, lift 2 for the guide and booking cards, none for trays and comfort.
- **Internal Padding:** 16px. List rows are 12px × 14px, at least 64px tall, divided by 1.5px mist lines.

### Inputs / Fields
- **Style:** card-white, 12px radius, 1.5px line inset, berry caret.
- **Focus:** a 2px forest-3 inset plus a 4px soft sun ring.
- **Composer:** a mist pill input next to a round forest send button.

### Navigation
- **Header:** forest, at least 60px, with logo mark (sun logo on a forest-2 tile), wordmark with Chinese name, RiverSeeds pill (translucent on-forest), and the berry Help pill at top right.
- **Tab bar:** card-white with an upward soft shadow and five slots. Inactive tabs are ink-3; the active tab is forest with its icon scaled to 1.08 and a 5px berry dot. Ask is a 56px forest disc with a sun icon, raised 31px and ringed by 5px of card-white.

### Feed Post
Posts sit straight on the mist ground with 1.5px line dividers, not on cards. The author row has a 40px round avatar, then the body. A Counselor answer is a 12px block (river tint) with a river-ink byline. The action row (Helpful, reply) is ink-2 and turns berry-ink with a pop when active.

**The Sunlit Until Seen Rule.** A post that changed for this Member (new Counselor answer, or their own post) is lit: sun-soft fill, 18px radius, a 2px inset sun ring, and a sun-soft "New answer" tag. It stays lit until the Member opens it. Keep it inside the gutter and never add an outer halo.

### Companion Check-in
A shadowless mist-2 tray holds a four-column grid of 84px mood tiles. Each tile has a round shaded face in the mood's own colour. The selected tile lifts 2px onto card-white with a 2.5px forest ring. After check-in, the tray shows a summary (face, "Checked in today", mood and tags). Comfort and breathing on hard days come from the Companion's dialogue box above the tray, not from a separate card.

### Riverbank Diorama (signature)
This is a floating soft-shaded island with a river, the arch bridge, round trees, a lamp and flowers, all matte-vinyl. The sky gradient and sun position follow the real clock (day blue, night indigo). Weather follows the check-in mood. The Companion is awake whenever the Member visits. It naps only after a skipped day and wakes glad to see them, with no guilt. It breathes, blinks, follows the pointer, wanders to sniff a flower or wave, and comes home to face the Member when it talks. Eyebrows appear only for worry, sadness, frustration and surprise. Its gestures are wave, nod, tilt, cheer, dance, comfort, think, sniff and yawn. On Home the greeting is spoken by the Companion in the dialogue box. On the Companion screen the name label sits top-left, in a band that clouds fade out of. Text flips to on-forest when the sky is dark.

### Companion Dialogue (signature)
This is a cozy-game speech panel that rises 74px into the diorama, with a 20px tail pointing up at the Companion. It has a card ground, the 26px sheet radius and the lift-2 shadow. A sun name-tag pill with a paw icon overlaps its top-left edge. The line types out at about 35 characters a second, after a three-dot pause, while the Companion's mouth moves. Reply chips are 44px mist pills that spring in one after another; a forest chip is the suggested next step, a berry-soft chip is real help. Mood replies carry the mood's own face. On hard days a river-ink shield line says the Companion is a companion, not a counselor. Every line is scripted in three languages. The Companion brings things up on its own only from real data (a new answer, a Circle, the season, the clock), only after 14 seconds of quiet, never on a hard-day or exercise line, and at most four times a visit.

### Quip
This is a short card-white speech pop with a downward tail, placed at the Companion's head when it is tapped, stroked or hugged, or says hello. It rises and fades over 1.9s.

## Do's and Don'ts

### Do:
- **Do** put every block on the 16px gutter and keep highlight states inside it.
- **Do** mark changed items with sun-soft, a 2px inset sun ring and a sun-soft tag, and keep them lit until seen.
- **Do** animate entrances and presses with the --spring curve (cubic-bezier(.34,1.4,.64,1), 0.42s), and fall back to instant changes under reduced motion.
- **Do** drive the diorama only from real data: the clock, the check-in, and the Member's touch.
- **Do** give every accent fill that carries text its soft tint and matching ink.
- **Do** keep touch targets at least 44px and primary buttons 48px.

### Don't:
- **Don't** put feed posts on white cards; they sit on the mist ground with line dividers.
- **Don't** give sun buttons a zero-blur ledge, or any surface a zero-offset glow halo.
- **Don't** put a shadow on a tray or the comfort card.
- **Don't** add a second easing curve with overshoot or bounce; --spring is the only one.
- **Don't** show the same fact twice in one view (for example, the mood in the diorama overlay and on the check-in card).
- **Don't** place the diorama greeting at bottom-left, where it collides with the Check in button and the island rim.
- **Don't** let the Companion give advice, diagnose, or speak unscripted; on hard days it always offers a real person.
- **Don't** use a pastel gradient for shell surfaces or draw the Companion as a flat illustration. Gradients belong to the diorama sky.
