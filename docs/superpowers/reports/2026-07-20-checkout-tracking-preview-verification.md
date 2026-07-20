# Checkout Tracking Preview Verification

**Decision: GO for explicit production approval.** This means the reviewed release is ready to be approved for promotion; it has **not** been deployed to production, merged, pushed to `main`, or switched into production traffic.

## Release under review

- Reviewed commit: `243ff3f2323da1b9d9f218dea02259c1745a78bf` (`fix(admin): refresh resolution timestamps`).
- Final Preview deployment: `dpl_5ZYrceabrYNUD2PY2nCvYKhWcMtA`, target `preview`, status `Ready`.
- Immutable deployment URL: `https://rosary-site-react-j65tqdul2-sshibinthomass-2046s-projects.vercel.app`.
- Stable admin Preview alias: `https://rosary-site-react-checkout-preview.vercel.app`.
- Stable guest Preview alias: `https://rosary-site-react-checkout-guest-preview.vercel.app`.
- Fresh Vercel inspection confirms both aliases resolve to that same final deployment, which contains the checkout-attempt API functions.
- Delivery commits leading to the final review: `8efa57b`, `7f593b8`, `e525dc9`, and `243ff3f`.

## Fresh verification gate

All commands below ran in the release worktree on 2026-07-20.

| Check | Evidence | Result |
| --- | --- | --- |
| Full automated suite | `npm test` | 310 passed, 0 failed, 0 skipped |
| Client build | `npx vite build` | passed; 695 modules transformed |
| Feature-scoped lint | prescribed API/client file list | 0 errors, 0 warnings |
| Rule emulator | Firestore authorization matrix | 5 passed, 0 failed |
| Whitespace | `git diff --check` | exit 0 |
| Active rules | authenticated read-only Rules API comparison against `firestore.rules` | exact match |
| TTL | authenticated read-only Firestore field lookup | `checkoutAttempts.expiresAt` is `ACTIVE` |

The build retained only existing non-blocking warnings: chunks above 500 kB and stale Browserslist data. `npx vite build` regenerated the tracked SEO files; those five generated artifacts were restored exactly to `HEAD` after verification, so no generated-artifact diff remains. Repository-wide lint was not part of this final prescribed gate. Its recorded baseline is 52 errors and 12 warnings in unrelated historical files; the final feature-scoped command is clean.

## Environment, authentication, and Firestore controls

- Anonymous Firebase Authentication: enabled; the disposable anonymous-signup probe was created and cleaned up.
- Vercel credential control (Task 1 safe booleans): Production, Preview, and Development credential values were each non-empty, identical, matched the retained Admin SDK key ID, and each completed an Admin SDK Firestore read. The variable is encrypted in all three targets. No credential value, token, or service-account material was written to output or source control.
- Firestore configuration: the tested `firestore.rules` and indexes were deployed. The TTL field override is active for `checkoutAttempts.expiresAt`; the existing `orders` index was preserved.
- Security probes: direct anonymous Firestore write was denied (HTTP 403); the Preview endpoint correctly returned JSON `405 method-not-allowed` for GET and `401 writer-token-required` for an unauthenticated POST. Those responses contained no token, credential, stack trace, or raw Firebase error object.
- Firebase Authentication has 14 authorized domains. Fresh reads confirm these Preview domains are present: `rosary-site-react-checkout-preview.vercel.app`, `rosary-site-react-checkout-guest-preview.vercel.app`, and `rosary-site-react-j65tqdul2-sshibinthomass-2046s-projects.vercel.app`.

## Browser scenario matrix

| Scenario | Evidence | Result |
| --- | --- | --- |
| Named normal checkout and valid writer-token path | `CHK-N4CQTF`; INR 49.00; one item; successful/completed six-stage record visible to authenticated admin | passed |
| Blank-name checkout | `CHK-4WTN7P`; INR 49.00; one item; admin shows `Unknown customer`; successful/completed six-stage record | passed |
| WhatsApp messaging accuracy | both confirmations state handoff/no on-site payment; no WhatsApp message was sent | passed |
| Search, filters, timeline, and links | support/order/name search, result/stage/resolution/date filters, detail timeline, linked order, and Admin Orders `Checkout issues` deep link exercised | passed |
| Notes and resolution lifecycle | Open → Investigating → Resolved → Open → Resolved persisted across reloads | passed |
| Resolution timestamp | timestamp A `20 Jul 2026, 4:13 pm` persisted across a notes save; reopening cleared it; timestamp B `20 Jul 2026, 4:14 pm` appeared after resolving again | passed |
| Desktop/mobile admin | authenticated Admin Home, Orders, and Checkout Tracking usable at 390 × 844 with `scrollWidth <= clientWidth` (384) | passed |
| Existing public-site paths | homepage, shop/search, product, wishlist, cart, account, and public order view retained main content/no horizontal overflow | passed |
| Console | guest and authenticated-admin tabs recorded no errors or warnings after final flows | passed |
| Privacy | blank record exposed only permitted operational fields; no address, email, pincode, district, state, writer identity, raw token, credential, or secret | passed |

This evidence satisfies the design's optional-name requirement, cost tracking/display, truthful WhatsApp semantics, 180-day diagnostic retention, constrained administrator workflow, and minimal-PII boundary. `whatsapp_opened` remains a handoff observation, not proof that a customer sent a message, paid, or received order acceptance.

## Test-artifact ledger

Only support codes and technical record/order identifiers are listed. No raw customer data is included. Read-only current-state checks confirmed all six linked test orders exist. No protected order was deleted, and this report makes no cleanup/deletion claim.

| Support code | Diagnostic record ID | Linked order document / business ID | Disposition |
| --- | --- | --- | --- |
| `CHK-N4CQTF` | `0a470cb4-0c06-45bb-8b6f-53c67da44054` | `3IU66z6XjrhVUQfSqEnY` / `RPH-20260720-7KJAAZ` | final named live Preview record; currently resolved |
| `CHK-4WTN7P` | `24de73d7-4f34-4199-b95a-ff1d71bcf8c4` | `PULsElsVjmdJd5JuwREh` / `RPH-20260720-XKMX2L` | final blank live Preview record; currently open |
| `CHK-C5376L` | no matching remote diagnostic record | `01IORY30pK33kjHk2PjF` / `RPH-20260720-KHE3FD` | earlier named order created before the authorized-domain repair; retained |
| `CHK-K7GBNM` | no matching remote diagnostic record | `NnaI19gRnc1mAozNWGl5` / `RPH-20260720-BQF3Y9` | earlier blank order created before the authorized-domain repair; retained |
| `CHK-FMSJUD` | no matching remote diagnostic record | `3GhI8gJ51PqkLxcWFeyM` / `RPH-20260720-EE3BOJ` | earlier named origin attempt exposed the pre-fix replay deadline; retained |
| `CHK-HZ6W85` | no matching remote diagnostic record | `AKYqNzgB3COZZlV2wJW7` / `RPH-20260720-GFHJWP` | earlier blank origin attempt exposed the pre-fix replay deadline; retained |

The live named/blank records were created only after the replay fix and final Preview deployment flow. Their successful POST/PATCH evidence, idempotent replay, linked orders, and admin inspection close the earlier persistence issue without retroactively creating diagnostic records for the retained earlier test orders.

## Follow-up and approval boundary

One reviewer note is non-blocking: strengthen refresh resilience after a successful resolution mutation if the subsequent authoritative list refresh is temporarily unavailable. The current implementation correctly refreshes server timestamps in the normal path and all tested resolution transitions persist.

There are no release blockers in the evidence above. Production promotion still requires explicit user approval. Until then: do not merge, push a production branch, use `--prod`, or change production traffic.
