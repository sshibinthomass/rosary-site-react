# Rosary storefront redesign — implementation report

Branch: `claude/rosary-redesign-impl-4df8fb`
Source: Claude Design project `Rosary Redesign.dc.html`, direction **1a "the nursery bench"**

Every customer-facing screen has been rebuilt in the Organic direction. The
admin area was restyled to the new tokens but its behaviour is untouched.

**Verification:** 337/337 tests pass (319 before, plus 18 new), `vite build`
succeeds, and ESLint reports **zero new errors** against the pre-change baseline
(23 errors remain, all pre-existing in admin pages and services; 9 pre-existing
errors were fixed along the way).

---

## 1. The design system

`src/index.css` was rewritten around the Organic tokens: a cream `#f5ead8`
ground, terracotta `#c67139` primary, deep sage `#3d472b` panels, and 100–900
ramps for neutral, accent and sage. Caprasimo now sets every heading, price and
button label over Figtree body text; `index.html` loads both in place of Outfit.
Containers are 28px, every button, chip, input and badge is a pill, and
photographs carry a `.washed` filter so they sit back into the page.

The old brand names (`--color-forest`, `--color-terracotta`, `--bg-*`,
`--text-*`) are kept as aliases pointing at the new palette, so the admin screens
and anything else reading them re-skinned automatically rather than breaking.

New shared code:

| File | What it is |
| --- | --- |
| `src/components/Icon.jsx` | The rounded line-icon set (48 stroke icons + WhatsApp/Facebook/YouTube/Google brand marks). Replaces every emoji glyph in the storefront. |
| `src/components/storefront.jsx` | 14 shared primitives: `PageBar`, `SectionHeading`, `ChipRail`, `DeepPanel`, `NumberedStep`, `ListRow`, `EmptyState`, `StickyBar`, `QuantityStepper`, `PhotoBanner`, `WhatsAppButton`, `RoundButton`, `Eyebrow`. |
| `src/components/OrderCard.jsx` | The order summary shared by the account page and the orders list. |
| `src/utils/careInference.js` | Derives the compact care facts the design shows from the catalogue's prose (see §3). |
| `src/utils/nurseryMessages.js` | Builds the pre-written WhatsApp messages behind every "ask us" affordance. |
| `src/utils/orderStatus.js` | The shared definition of an active vs. placed order. |
| `docs/redesign-spec.md` | The implementation spec: tokens, component contracts, and the behaviour that had to survive. |

---

## 2. Screens rebuilt

**Chrome** — a sage announcement bar ("Free plant on orders over ₹1,000"), a
60px header with the wordmark and "Coonoor nursery · ships all India", a rounded
nav drawer, and a mobile tab bar whose centre slot is a raised sage cart circle.
The old floating cart button is gone, since the tab bar now carries it.

**Home** — typewriter search entry, full-bleed washed hero with the provenance
badge, an overlapping intro card, the deep sage stat strip, "Start with your
spot", the circular category rail, "New on the bench", "How your plant travels",
and a marquee of real reviews.

**Shop** — category band computed from live stock ("212 plants on the bench
today. All from ₹25."), search, category rail, sort control, quick-filter chips,
one plant per row, the free-plant and "Not sure which one?" cards, and a sticky
cart bar.

**Product** — full-bleed gallery, rounded body sheet, quick answer, "How needy is
it?" bars, "Watering through the year", "Will it live at your place?", the
comfort/size facts, related plants and guides promoted above the fold, a "Read
more" accordion stack, and a sticky buy bar. Sold-out plants get the "Off the
bench" treatment with a WhatsApp restock alert and an alternatives rail.

**Cart / checkout** — the design's three screens: cart with the free-plant
progress card, the delivery-details form with its step indicator and "Four steps,
all on WhatsApp" panel, and the "One last step" send screen with the support
code, resend, call and copy-the-order-text affordances.

**Account side** — wishlist with price-drop and restock states, the account
profile card with stats and a menu block, the orders list, and the guest views.

**Content** — care guides with search and topic chips, guide articles with a
table of contents, reviews with a rating summary and filters, FAQ with category
chips, policies as label/value cards, about, contact, and the two dead ends
("No plant called …", "This one is not on the bench").

---

## 3. Capabilities the design showed that the site did not have

These are new behaviour, not restyling:

1. **Free-plant offer as site chrome** — previously buried in shop copy; now an
   announcement bar plus a live cart progress card ("Add ₹803 more and we drop in
   a free plant"), both reading the same `FREE_PLANT_THRESHOLD`.
2. **Shop sorting** — Newest first / Price low→high / Price high→low / Name A–Z.
   There was no sort control at all before.
3. **Quick filter chips** — Under ₹60, Under ₹100, Low water, Low light, Direct
   sun, Beginner. Each delegates to the existing `matchesShopSearch` parser, so
   a chip and the equivalent typed query can never disagree.
4. **URL-backed search** — `/shop?q=…` is now read and written, which is what
   makes the home page's "Start with your spot" rows work.
5. **"Start with your spot"** — three condition-led entry points that link to the
   shop search that produces their list.
6. **Care intensity bars, seasonal watering, placement verdicts, comfort/size
   tiles** — all new presentation layers over existing data (§4).
7. **Restock alerts** — sold-out product pages and saved plants now offer a
   WhatsApp "Tell me when it is back" carrying the plant name and id.
8. **Price-dropped badge** on saved plants whose live price is below the price
   stored when they were saved.
9. **"Add all"** on the wishlist.
10. ~~Care reminders toggle on the account page.~~ Removed on request — the
    nursery does not send watering nudges on WhatsApp.
11. **Copy the order text** on the send screen, with a clipboard fallback.
12. **Guide search and topic chips**, derived from each guide's own words.
13. **Guide article table of contents** with anchored sections.
14. **FAQ category chips** and **contact topic chips** that open WhatsApp with a
    matching pre-written message.
15. **Order support row** — support code, "Ask about it", and a call link.
16. **Three-step order progress** on the order and account screens.

---

## 4. Care details inferred

The catalogue stores care guidance as prose, so `src/utils/careInference.js`
derives the compact values the design needs. Every function degrades safely and
is covered by `tests/careInference.test.mjs` (18 tests, including assertions
across all 313 catalogue rows).

- **Needs bars (1–3)** — Water and Light read the catalogue's own care words and
  fall back to the prose. Humidity is read from the humidity sentence. Effort
  comes from `difficulty`, with "Easy to Moderate" shown as "Easy–Moderate".
- **Watering through the year** — day ranges are parsed out of the seasonal
  sentences ("About once every 5-7 days in heat" → **5–7 / days apart**), and
  reduce-language becomes **Barely / keep it dry**. Every one of the 313 plants
  yields three cells that fit the tile.
- **Will it live at your place?** — balcony and indoor suitability become
  Yes / Only if sunny / No with the sentence beneath, and a monsoon verdict is
  inferred from the monsoon-care wording and the plant's water need.
- **Comfort range / Grows to** — parsed from the temperature and mature-size
  sentences. All 313 plants resolve a comfort range. About half describe size
  qualitatively rather than in centimetres, so those fall back to a habit
  summary (Trails / Grows upright / Low clump / Clumps / Stays compact) taken
  from the size sentence. Growth-habit strings that list every option
  ("Compact, clumping, trailing, or rosette-forming…") are deliberately ignored,
  because reading "trailing" out of them mislabelled every rosette.

Spot-checked against the design's own screen: **Peanut Cactus #5** renders Water
Low / Light High / Humidity Low / Effort Easy, Summer 5–7, Monsoon Barely, Winter
12–18, balcony Yes, indoors Only if sunny, monsoon No, 12–35°C, 10–15 cm — which
matches the mock exactly.

---

## 5. Bugs found and fixed

1. **Component classes escaped Tailwind's cascade.** `.btn`, `.input`, `.card`
   and friends sat outside every layer, so they beat utility classes — the shop
   search icon overlapped its own placeholder because `pl-11` lost to the class's
   padding. They now live in `@layer components`.
2. **`position: fixed` broken by page transitions.** Page roots animate in, and
   an ancestor transform makes a containing block for fixed children, so the
   sticky action bar fell back into the document flow. `StickyBar` now renders
   through a portal.
3. **Sticky bar collided with the tab bar.** "Nothing is charged yet" sat under
   the mobile nav. The bar now offsets by the tab-bar height plus the device's
   safe-area inset.
4. **Shop never loaded in a background tab.** The catalogue load was gated on
   `requestAnimationFrame`, which does not fire while a tab is hidden, so the
   page sat on skeletons indefinitely. A timeout fallback now guarantees it runs.
5. **Seven pages had no `h1`** (cart, wishlist, account, orders, reviews, about,
   404). `PageBar` now renders its title as the page heading unless the page
   supplies its own, so every page has exactly one.
6. **Stale hash-route breadcrumb.** The product modal's category crumb used
   `window.location.href = '/#/category/…'`, a hash URL the app has not used
   since it moved to `BrowserRouter`. It is a router link now.
7. **Login popup leaked a timer** — the 15-second show timer was never cleared on
   unmount.
8. **`max-h-96` clipped long FAQ answers.** The height cap is gone.
9. **Wishlist empty state rendered no `<SEO>`**, because it returned before the
   tag. Both states now emit it.
10. **`UserOrdersPage` had no `<SEO>` at all**, and its totals ignored
    `manualDiscount` while the cart and order pages subtracted it — the same
    order showed two different numbers. Both fixed.
11. **Guide descriptions were clamped to one line**, hiding roughly three
    quarters of the text. Now two.
12. **Shop claimed "0 plants in stock" while loading.** It says "Counting the
    bench…" until the catalogue arrives.
13. Nine pre-existing lint errors (unused bindings, an empty catch, dead state)
    were cleared as a side effect.

---

## 6. Tests

- **18 new tests** in `tests/careInference.test.mjs` cover the inference rules,
  including whole-catalogue assertions that every plant yields renderable
  seasonal cells, three placement verdicts with a valid tone, and both facts.
- **`tests/cartCheckoutFlow.test.mjs` was updated**, not worked around. Those
  assertions froze the old button wording; the rule behind them — nothing on the
  page may imply money changes hands on the site — is unchanged, so the
  assertions now match the copy a customer actually reads ("Continue · ₹197",
  "Nothing is charged yet", "Send this order on WhatsApp"). An earlier attempt
  satisfied the old strings with hidden screen-reader duplicates; those were
  removed, because they made every button announce itself twice.
- Everything else in the suite passes unchanged, including the SEO, canonical,
  JSON-LD, checkout-diagnostics and admin tests.

## 7. Verified in the browser

Against the live dev server with real Firestore data: every route renders with
exactly one `h1` and no horizontal overflow; add-to-cart, quantity, wishlist,
"Add all", the cart totals and free-plant progress, sort, all six quick filters,
`?q=` deep links, the no-results dead end, the sold-out screen with its WhatsApp
restock link, the FAQ and guide accordions, the guide search, and the India Post
pincode lookup (560011 → Bangalore, Karnataka). Dark mode and the desktop layout
were checked separately.

**The order was deliberately not submitted.** Pressing "Send this order on
WhatsApp" writes a real order to production Firestore and opens a WhatsApp
handoff, so verification stops at the filled-in delivery form.

---

## 8. Known limitations

1. **Guest order lookup is a WhatsApp handoff, not a self-serve lookup.** The
   design shows "enter the code from your WhatsApp confirmation". It cannot be
   done client-side today: `firestore.rules` only allows `get` on a known order
   id, not `list`; the support code lives on `checkoutAttempts`, which is
   admin-only; and the code customers receive is the `RPH-…` order id rather
   than the Firestore document id that `/order/{id}` needs. The card therefore
   says "Ask us to pull it up" and opens WhatsApp with the code. Making it real
   needs either a `supportCode` field on the order plus a rules change, or a
   server endpoint next to `api/checkout-attempts.js`.
2. **Review source filters are absent.** `reviews.json` has no `source` field and
   no review carries a photo, so Google/Instagram/Facebook and "With photos"
   chips would have been fake. A "Repeat buyers" chip derived from the review
   text stands in, and "With photos" appears automatically once any review has
   one.
3. **Home page spot counts and starting price are static.** The spot rows carry
   descriptions instead of match counts, and the stat strip keeps ₹49 as a
   commented constant. (The home page does now load the full catalogue for
   "New on the bench", so counts are reachable if they are ever wanted.)
4. **Guide reading times all read "3 min".** The formula is words ÷ 200 with a
   floor of 3, and every guide is 210–430 words. Correct, but uninformative
   until the guides grow.
5. **Policy cancellation and privacy copy is page-local**, commented as such —
   `SITE_POLICY` carries no entries for them.
6. **`ProductLineArt.jsx` is now unreferenced.** Left in place rather than
   deleted, since removing it is outside this change.
7. **`.env.local` was copied into the worktree** so the dev server could reach
   Firebase for verification. It is gitignored and can be deleted.


---

## Follow-up fixes (second pass)

Reported after the first pass and fixed:

1. **"New on the bench" showed arbitrary plants.** It called `getProductsPage`,
   which returns Firestore's first page in *lexicographic* document-id order
   ("1", "10", "100", …). New `getLatestProducts` in `productService` sorts the
   cached catalogue numerically and returns the six newest in-stock plants; the
   skeleton now shows six slots to match.

2. **The shop's "Newest first" order could not be trusted.** The listing painted
   a 24-row page in that same lexicographic order, so the top of the shop was
   plants #122, #121, #120 for roughly a second before the full catalogue
   replaced them, and the result line briefly claimed "22 plants in stock".
   `loadProducts` now takes the whole (cached) catalogue in one read. The trade:
   a cold, uncached visit waits on skeletons about a second longer; in exchange
   the order and the count are right from the first painted card, and one
   Firestore query per visit disappears. Sorting itself was already id-based and
   is now commented as such.

3. **Sorting was a blind cycle button.** Tapping "Newest first" advanced to the
   next order with no way to see the choices. It is now a dropdown listing all
   four orders, styled as the same pill.

4. **The home search was a link, not a search.** Tapping the field jumped
   straight to /shop. It is a real input now; typing and submitting hands the
   query over as `/shop?q=…`, and the animated hint pauses once you type.

5. **A plant in the cart was a dead end.** Product cards, the product page and
   the product modal showed a static "In cart" pill with no way to change or
   undo it. A shared `InCartControls` replaces it: quantity stepper, live line
   total, and a remove button; stepping below one empties the line. The home
   bench tiles get the same stepper on their own row, since the tile is too
   narrow to hold it beside the price.

Verified end to end in the browser: add, increase, decrease, decrease-to-zero
and remove on all four surfaces; all four sort orders; the home search handover;
and the newest-first list starting at the highest in-stock id. 342 tests pass
(5 new), the production build succeeds, and no new lint errors.

One data observation, not fixed: several plants filed under `category:
"Echeveria"` in Firestore are not echeverias (#312 Aloe aristata, #310
Haworthiopsis limifolia, #304 Crassula muscosa). The category page filters
correctly; the records themselves are mislabelled.

6. **Removed on request after the follow-up pass:** the wishlist's "Restock
   alerts arrive on WhatsApp" note, and the account page's care-reminders
   toggle (with its profile field and save handler).

7. **Home bench tiles gained a remove control**, on the price line where the
   "+" sits before a plant is in the cart, with the stepper on the row below.

8. **The cart's "Remove" was an 11px muted word** stranded at the right edge on
   desktop. It is now a bordered pill with an ✕ and 13px label, on both the
   in-stock and out-of-stock rows.

9. **The RPH order code is now the support code the customer is given.** The
   order page and the send screen previously showed the checkout tracker's
   support code, which only exists on the admin-only `checkoutAttempts`
   collection and was usually blank; the code an admin actually looks an order
   up by is `order.orderId` (RPH-YYYYMMDD-XXXXXX). Both screens now show that,
   falling back to the tracker code only when no order was saved, and both ask
   the customer to screenshot it and send it on WhatsApp if anything about the
   order looks wrong or they are unsure.

10. **The shop now opens on plant #1 and counts upwards.** The default sort was
    highest-id-first; the dropdown's first entry (and so the default) is
    "Oldest first", with "Newest first" alongside it.
