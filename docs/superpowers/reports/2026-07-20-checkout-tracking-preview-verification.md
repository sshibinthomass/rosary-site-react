# Checkout Tracking Preview Verification

**Decision: GO for explicit production approval.** This means the reviewed release is ready to be approved for promotion; it has **not** been deployed to production, merged, pushed to `main`, or switched into production traffic.

## Release under review

- Reviewed implementation commit: `b8dbbfd237c02de2b18afc8c18900a2ad3473071` (`fix(admin): harden checkout resolution fallback`).
- Final Preview deployment: `dpl_FtdAQZWySRPfXamrHGSXQ6SR6Wyu`, target `preview`, status `Ready`.
- Immutable deployment URL: `https://rosary-site-react-a311ulwj7-sshibinthomass-2046s-projects.vercel.app`.
- Stable admin Preview alias: `https://rosary-site-react-checkout-preview.vercel.app`.
- Stable guest Preview alias: `https://rosary-site-react-checkout-guest-preview.vercel.app`.
- Fresh Vercel inspection confirms both stable aliases resolve to that same final deployment, which contains the checkout-attempt API functions.
- Delivery commits leading to the reviewed implementation: `e7ed320`, `8efa57b`, `7f593b8`, `e525dc9`, `243ff3f`, and `b8dbbfd`.
- Report/final-evidence commits are separate from the implementation baseline: `908696bd361e40855747aa3468dc56c9cfe8caac` and `18aa748e3f48635ead83d1f0cb7c7b7d0182ebf0`.

## Fresh verification gate

All commands below ran in the release worktree on 2026-07-20.

| Check | Evidence | Result |
| --- | --- | --- |
| Full automated suite | `npm test` | 314 passed, 0 failed, 0 skipped |
| Focused admin suite | final refresh-resilience command | 20 passed, 0 failed |
| Client build | `npx vite build` | passed |
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
- Firebase Authentication has 15 authorized domains. Fresh reads confirm these Preview domains are present: `rosary-site-react-checkout-preview.vercel.app`, `rosary-site-react-checkout-guest-preview.vercel.app`, and final immutable host `rosary-site-react-a311ulwj7-sshibinthomass-2046s-projects.vercel.app`.

## Browser scenario matrix

| Scenario | Evidence | Result |
| --- | --- | --- |
| Named normal checkout and valid writer-token path | `CHK-N4CQTF`; INR 49.00; one item; successful/completed six-stage record visible to authenticated admin | passed |
| Blank-name checkout | `CHK-4WTN7P`; INR 49.00; one item; admin visibly shows exact `N/A`; successful/completed six-stage record | passed |
| WhatsApp messaging accuracy | both confirmations state handoff/no on-site payment; no WhatsApp message was sent | passed |
| Search, filters, timeline, and links | support/order/name search, result/stage/resolution/date filters, detail timeline, linked order, and Admin Orders `Checkout issues` deep link exercised | passed |
| Notes and resolution lifecycle | on the immutable Preview, the existing named record completed Resolved → Open → Investigating → Resolved; reopening immediately removed `Resolved at`, notes remained unchanged, and the transitions persisted | passed |
| Resolution timestamp | the final resolve loaded the fresh authoritative timestamp `20 Jul 2026, 4:53 pm` | passed |
| Refresh-after-save resilience | a durable mutation followed by a failed list refresh preserves safe local status/notes/`resolvedAt` semantics, reports saved-but-refresh-failed, and leaves the retry loader available | passed |
| Desktop/mobile admin | authenticated Admin Home, Orders, and Checkout Tracking usable at 390 × 844 with `scrollWidth <= clientWidth` (384) | passed |
| Existing public-site paths | homepage, shop/search, product, wishlist, cart, account, and public order view retained main content/no horizontal overflow | passed |
| Console | the final immutable-host blank-name and resolution-workflow review recorded no errors or warnings | passed |
| Privacy | blank record exposed only permitted operational fields; no address, email, pincode, district, state, writer identity, raw token, credential, or secret | passed |

This evidence satisfies the design's optional-name requirement, cost tracking/display, truthful WhatsApp semantics, 180-day diagnostic retention, constrained administrator workflow, and minimal-PII boundary. `whatsapp_opened` remains a handoff observation, not proof that a customer sent a message, paid, or received order acceptance. Final browser assertions used the newly authorized immutable hostname as a fresh origin; the stable alias's one service-worker-cached older shell is not used as final evidence.

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

The prior refresh-resilience review note is resolved in `b8dbbfd`: mutation failure remains distinct from a later refresh failure; a durably saved update is reflected locally with safe status, notes, and resolution-time semantics; and the administrator receives `Checkout attempt saved, but latest data could not be loaded. Retry loading attempts.` with the retry loader still available.

There are no release blockers in the evidence above. Production promotion still requires explicit user approval. Until then: do not merge, push a production branch, use `--prod`, or change production traffic.
