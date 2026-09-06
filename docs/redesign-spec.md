# Rosary storefront redesign — implementation spec

The storefront is being rebuilt in the "Organic" direction from the Claude Design
project (`Rosary Redesign.dc.html`, direction 1a "the nursery bench"): a warm
cream ground, terracotta primary actions, a deep sage second voice, Caprasimo
display headings over Figtree body text, 28px container radii and 999px pills.

Mobile is the reference width (390px). Every screen must still work at desktop
widths — centre the column and widen grids rather than inventing new layouts.

---

## 1. Design tokens

Defined in `src/index.css`. Never hard-code a hex that a token already carries.

| Token | Value | Use |
| --- | --- | --- |
| `--bg-primary` | `#f5ead8` | page ground |
| `--bg-secondary` | `#f9f4ed` | cards on the ground |
| `--bg-tertiary` | `#ebddc5` | sunken surfaces, product cards, inputs |
| `--bg-sunken` | `#eee7db` | read-only fields |
| `--text-primary` | `#201e1d` | body text and headings |
| `--text-secondary` | `#645c50` | supporting text |
| `--text-muted` | `#82796a` | placeholders |
| `--border-color` | `rgba(32,30,29,.16)` | hairlines and outlined controls |
| `--color-terracotta` | `#c67139` | primary action |
| `--panel-deep` | `#3d472b` | full-bleed sage panels |
| `--panel-deep-text` / `--panel-deep-muted` | `#f9f4ed` / `#ccdbb2` | text on those panels |

Ramps: `--color-accent-100…900` (terracotta), `--color-sage-100…900`,
`--color-neutral-100…900`. Sage 200 (`#e1eecc`) is the tinted "yes" fill;
accent 200 (`#ffe1d0`) is the tinted "attention" fill.

Every ramp step is available as a Tailwind arbitrary value, e.g.
`bg-[var(--color-sage-200)]`, `text-[var(--color-accent-700)]`.

**Dark mode still works and light is the default.** Because everything reads
from the variables above, dark mode is automatic. Do not add `dark:` utilities
with hard-coded palette pairs unless a colour genuinely has no token.

## 2. Typography

- `font-display` (Caprasimo) for every heading, price, and button label.
  Sizes seen in the design: page h2 27–30px, section h3 21–25px, card title
  17–20px, price 17–32px.
- Figtree for body copy: 13–15px, `leading-relaxed`.
- `.eyebrow` = 11px, bold, `tracking-[0.11em]`, uppercase, secondary colour.

## 3. Shape and elevation

- Containers and cards: `rounded-[28px]`. Inner tiles: `rounded-[24px]` or
  `rounded-2xl`. Small tiles: `rounded-xl`.
- Every button, chip, input and badge is a pill (`rounded-full`).
- Photographs always carry `className="washed ... object-cover"` and live inside
  a rounded, overflow-hidden wrapper.
- Elevation only where the design shows it: `shadow-[var(--shadow-soft)]` on
  floating circles, `shadow-[var(--shadow-medium)]` on the bottom-bar cart.

## 4. Shared components

### `src/components/Icon.jsx`
`<Icon name="droplet" className="h-5 w-5" filled={false} strokeWidth={2.4} />`

Stroke names: `menu bag search gift home droplet sun package heart plus minus
check chevron-right chevron-left chevron-down chevron-up arrow-left sliders bell
phone mail instagram user clock log-out list send x map-pin share copy sprout
thermometer humidity leaf balcony indoors rain ruler book document camera help
info settings alert refresh truck star`.

Filled brand names (pass `filled`): `whatsapp facebook youtube star heart`.
`GoogleMark` is a separate named export for the multi-colour Google G.

### `src/components/storefront.jsx`
- `<Eyebrow>` — uppercase label.
- `<SectionHeading title description action actionTo|onAction />` — display
  heading with a trailing text link, matching "Shop by type / All 16".
- `<RoundButton icon label onClick|to|href badge filled tone size />` —
  tones `surface | plain | light | accent`.
- `<PageBar title trailing fallbackTo />` — the back-arrow + centred title bar
  every inner page opens with. Uses history when it can.
- `<ChipRail options value onChange ariaLabel />` — horizontal filter chips.
  `options` accept strings or `{ id, label, count }`.
- `<DeepPanel eyebrow title>` — the sage `--panel-deep` block.
- `<NumberedStep index title tone="deep|light">` — numbered explainer row.
- `<ListRow icon title subtitle to|href|onClick trailing />` — tappable row.
- `<EmptyState icon title description>{cta}</EmptyState>`.
- `<StickyBar>` — fixed bar sitting above the mobile tab bar.
- `<QuantityStepper value onDecrease onIncrease min size />`.
- `<PhotoBanner src alt eyebrow title description height />` — washed photo with
  a gradient scrim and overlaid copy.
- `<WhatsAppButton href tone="light|sage|accent">` — WhatsApp CTA.

### `src/utils/careInference.js`
Derives the compact care facts the design shows from the catalogue's prose.
- `buildCareIntensity(product)` → 4 rows `{ id, label, icon, tone, level 1-3, value }`
  for the "How needy is it?" bars (Water, Light, Humidity, Effort).
- `buildWateringYear(product)` → `{ seasons: [{ id, label, value, note }], summary }`
  for the Summer / Monsoon / Winter tiles. Values look like `"5–7"` + `"days apart"`
  or `"Barely"` + `"keep it dry"`.
- `buildPlacementVerdicts(product)` → 3 rows `{ id, icon, label, note, verdict,
  tone: 'yes'|'maybe'|'no' }` for "Will it live at your place?".
- `buildPlantFacts(product)` → `[{ id, label, value }]` for the Comfort range and
  Grows to tiles. Entries that cannot be derived are dropped.
- `getCareSectionBlurb(section)` → the one-line summary under a "Read more" row.
- `SPOT_ENTRIES` → the three "Start with your spot" entries, each carrying the
  shop search `query` that produces its list so counts and links cannot drift.

Verdict tone colours: `yes` → sage 200 fill / sage 800 text; `maybe` → accent 200
/ accent 700; `no` → neutral 200 / neutral 700.

### `src/utils/nurseryMessages.js`
`buildWhatsAppLink(message)` plus message builders:
`buildRestockAlertMessage`, `buildPlantAdviceMessage`, `buildPlantHelpMessage`,
`buildOrderSupportMessage`, `buildContactTopicMessage`.

### Constants (`src/config/constants.js`)
`FREE_PLANT_THRESHOLD` (1000), `NURSERY_PHONE_DISPLAY`, `NURSERY_PHONE_TEL`,
`NURSERY_EMAIL`, `NURSERY_HOURS`, `NURSERY_ADDRESS_LINES`, `NURSERY_MAP_URL`,
`INSTAGRAM_URL`, `INSTAGRAM_HANDLE`, `FACEBOOK_URL`, `YOUTUBE_URL`, plus the
pre-existing `CATEGORIES`, `CURRENCY`, `WHATSAPP_NUMBER`.

## 5. Chrome already rebuilt

`Layout.jsx` now renders, in order: the sage announcement bar ("Free plant on
orders over ₹1000"), a 60px header (hamburger, logo, wordmark + "Coonoor nursery
· ships all India", account pill, cart button), the rounded nav drawer, the page,
`Footer`, and a mobile tab bar whose centre slot is a raised sage cart circle.
The old floating cart button is gone — do not reintroduce it.

`Footer.jsx` carries the brand block, four link columns (Shop / Learn / Ordering
/ Nursery) and the social row. Its `pb-28` is the mobile tab-bar clearance.

`ProductCard.jsx` is the shop/grid card: washed 4:3 photo, heart bottom-right,
display title, "Category · #id", struck original + terracotta price pill, three
care tiles, then either a quantity stepper + "Add to cart", an "In cart · ₹X"
sage state, or a WhatsApp "Tell me when it is back" for sold-out plants.

## 6. Behaviour that must survive the re-skin

1. `reserveExternalUrlWindow()` stays the first synchronous statement in the
   checkout click handler, before any `await`.
2. The `backgroundLocation` modal route pattern: product links carry
   `state={{ backgroundLocation: location, product }}`.
3. `CATALOG_REFRESH_EVENT` listeners on the shop and cart pages.
4. The stock predicate `available !== false && (qtyAvailable !== 'NA' || inStock)`.
5. `getStorefrontProductTitle` for display, `getProductDisplayName` for SEO —
   they stay distinct.
6. `getProductPath`'s `/plant/{id}-{slug}/` shape and `extractProductIdFromParam`'s
   `L` handling for limited plants.
7. Every page keeps its `<SEO>` props, canonical URL and JSON-LD exactly as they
   are today. Private pages keep `noindex`.
8. Light is the default theme; `dark:` utilities key off the `.dark` class.
9. All existing toasts, error copy and support-code surfaces stay.
