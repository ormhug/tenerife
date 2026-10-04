---
name: tenerife-travel
description: Photo-led travel experiences on Tenerife. Cool basalt-stone neutrals, one lava-rust accent, Unbounded headings over Onest text, frosted glass with fine grain, soft 16px photo surfaces. Motion is scroll-bound and exact on reversal.
colors:
  lava: "#b8441d"          # the only accent: primary buttons, selected states, progress, brand dot
  lava-hover: "#a33a17"
  lava-tint: "rgba(184,68,29,.12)"
  on-lava: "#f7f8f8"       # 5.1:1 on lava
  ink: "#1d2124"           # headlines and body on light surfaces
  ink-soft: "#3d4347"
  muted: "#5f666b"         # secondary text, 5:1 on stone-1
  stone-0: "#f7f8f8"       # inputs, raised surfaces
  stone-1: "#eceeef"       # page canvas
  line: "rgba(29,33,36,.12)"
typography:
  display: "Unbounded 600, letter-spacing -0.04em (headings, scene titles, card titles)"
  text: "Onest 400-650 (body, UI, buttons)"
  brief-action: "Commissioner 600 (CTA under the brief heading)"
  logo: "Bricolage Grotesque 750 (wordmark only, Latin)"
rounded:
  surface: 16px   # photos, cards, dialogs, forms
  panel: 12px     # glass captions inside photos
  control: 10px   # buttons, inputs, nav pill, icon buttons
  chip: 9999px    # small counters
---

## Rules
- One accent. Lava is used for primary actions and selection only. No second brand colour.
- Neutrals are cool stone greys. Do not reintroduce cream/beige/clay (taste-skill palette ban).
- Unbounded for headings and Onest for body and UI. The brief's CTA uses Commissioner. No serif.
- One label per intent: every contact action says "Обсудить поездку" (nav.booking).
- No labels on photos, no "01 / 04" counters, no scroll cues, no decorative dots or hairlines,
  no uppercase eyebrows, no em or en dashes in visible copy.
- Glass = `backdrop-filter` + 1px light edge + fine grain at 6-9 % opacity; solid fallback under
  `prefers-reduced-transparency`.
- Header glass uses lighter grain (1.8%, navigation pill 1.2%). In the brief carousel,
  each slide owns its grain below the caption, with a stable isolated stacking context.
- Motion explains something (scene change, selected answer, header arrival). Scene transitions
  are pure functions of scroll position. Everything collapses under `prefers-reduced-motion`.

## Components
- Primary button: lava fill, on-lava text, 10px radius, 46-54px tall, one line at desktop.
- Secondary button: transparent, 1px ink outline, ink text.
- Collection card: 4:5 photo, 16px radius, glass caption (12px) with title, note and count chip.
- Island story: Teide opens full-bleed and contracts to a right-hand landscape. Coast becomes a smaller left-hand landscape, Masca a taller portrait on the same side, then ocean moves into a low, wide right-hand frame. Each transition has its own curved path, size change and independent text entrance. Every stop has its own copy and action. Finally all four photos gather in a clickable 2x2 gallery. Narrow screens stack photo and copy with varied photo sizes; short screens and reduced motion use the static reading flow. Geometry is reversible with scroll; typography never scales.
- Services follows the gallery on a clean stone surface, with no waterline decoration.
- Journey steps: the whole card opens a native glass dialog with details for that step. The action focuses the relevant booking field; Escape and backdrop click close the dialog and return focus.
- Booking: the invitation heading and short hint are integrated at the start of the inquiry form, before its fields. The left column contains the trip introduction and contact details, with no separate invitation card or duplicate contact action.
- Page scroll: desktop Lenis preserves ordinary wheel distance (multiplier 1), with 0.16 smoothing and a 480px extreme-burst limit. Queued travel is bounded to 1.5 viewports, at most 1200px. Anchor transitions take 0.8s. Direction reversal interrupts queued travel. Textareas and listboxes scroll natively only while their own content can move in the wheel direction, after pending page travel is cancelled. Empty fields, field edges and collapsed selects keep the same page speed in both directions, including after reaching the bottom. Cancellation leaves root overflow and scrollbar width stable. Coarse pointers and windows up to 760px use native scrolling with no Lenis instance, secondary scene smoothing or resize scroll correction.
- Scroll rendering: the title animates with transforms on all devices and has no idle floating loop. Opening colour variables belong to the hero and benefits, not the document root. The fixed header uses a near-opaque tint without live backdrop blur. Scene travel uses 0.6 viewport heights per unit on desktop and 0.58 on native scrolling, with bounded minimum/maximum distances.
- Phone layout: the opening title is vertically centred within a stable 70svh entry; the brief appears within the first screen and its larger heading uses normal text flow. Browser chrome cannot alter scene height or toggle pinning. Scene and brief type does not drift on phones; widget copy follows the photo closely, steps use 132px photos and 15px body text. Short screens use compact static chapters. Moving mobile surfaces avoid nested live backdrop blur.
- Brief: heading followed directly by one CTA, with no answer list or helper. The CTA arrives once when visible, responds to hover/focus with arrow travel and a short sheen, and compresses on press. It opens the pictured collection through an orange screen fill; reduced motion removes movement and opens immediately.
- Scene CTA: transparent dark glass, white text and a light border over the photograph.
- Brief carousel captions: translucent stone tint, border and shadow, moving as part of the slide. Avoid live backdrop filtering and separate caption parallax inside the tilted photo; those layers can repaint in tiles while scrolling.
- Destination picker: large photographs and frosted translucent surface over a clear, softly blurred backdrop. The panel rises and fades in, followed by a short stagger of cards; reduced motion opens immediately. Help action uses a transparent orange tint.
- Inputs: stone-0 field, 1px ink-22 % hairline, focus = 1px ink ring, label above.

References: taste-skill (Leonxlnx/taste-skill), Airbnb DESIGN.md (awesome-design-md) for
photo-first cards, soft radii and single-accent discipline.
