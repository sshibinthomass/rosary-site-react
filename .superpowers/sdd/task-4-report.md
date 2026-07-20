# Task 4 Preview Scenario Matrix Report

**Status:** PASS

**Preview tested:** `https://rosary-site-react-a311ulwj7-sshibinthomass-2046s-projects.vercel.app`
**Deployment:** `dpl_FtdAQZWySRPfXamrHGSXQ6SR6Wyu` (Vercel Preview, Ready)
**Browser:** shared Chrome selected by the in-app browser runtime; final immutable-hostname review used the existing authenticated Google session.
**Test date:** 2026-07-20

## FINAL evidence

| Area | Result | Safe evidence |
|---|---|---|
| Final Preview | PASS | `dpl_FtdAQZWySRPfXamrHGSXQ6SR6Wyu` Ready; both stable Preview aliases resolve to this deployment. Only its new immutable hostname was added to Firebase Auth authorized domains (14 -> 15). No production deployment occurred. |
| Timestamp UI and workflow | PASS | On the immutable Preview, existing named attempt `CHK-N4CQTF` completed Resolved -> Open -> Investigating -> Resolved. Reopening immediately removed `Resolved at`; resolving displayed the new authoritative timestamp `20 Jul 2026, 4:53 pm`. Notes remained unchanged. |
| Named diagnostic record | PASS | `CHK-N4CQTF`, `Codex Preview Test`, INR 49.00, successful/completed, one item, linked order, and six successful stages are visible to authenticated admin. |
| Blank diagnostic record and privacy | PASS | Existing blank-name record `CHK-4WTN7P` visibly displays exactly `N/A`, INR 49.00, and successful/completed on the immutable Preview. Its list/detail UI exposes no address, email, pincode, district, state, writer identity, or token. |
| Admin controls and links | PASS | Support/order search, result/stage/resolution/date filters, disclosure details, Open linked order, and Admin Orders `Checkout issues` link were exercised with the named attempt. Notes and Open -> Investigating -> Resolved -> Open -> Resolved transitions persisted. |
| True authenticated mobile admin | PASS | At a real `innerWidth: 390`, `innerHeight: 844` viewport, authenticated Admin Home, Admin Orders, and Checkout Tracking each measured `scrollWidth <= clientWidth` (384). Mobile Orders search/expand/Checkout issues link and Tracking search/filter/expand/link/resolution controls were usable. |
| Refresh-after-save resilience | PASS | Commit `b8dbbfd` distinguishes durable mutation failure from a later list-refresh failure. A successful save plus failed refresh applies local status/notes, avoids stale `resolvedAt` on reopen/new resolution, preserves it for notes-only/stay-resolved updates, and displays: `Checkout attempt saved, but latest data could not be loaded. Retry loading attempts.` The existing retry loader remains available. |
| Automated verification | PASS | For commit `b8dbbfd`: focused admin tests 20 / 20, full suite 314 / 314, Firestore emulator rules 5 / 5, scoped ESLint, and `npx vite build` all passed. Build output contained only the existing chunk-size/Browserslist warnings. |
| Browser console | PASS | Final immutable-hostname N/A and resolution-workflow review returned zero browser warning/error entries. |

No production deployment, production merge, or new order was created during this reviewer follow-up. Browser tabs were used only for the existing test attempts; no credential, token, or customer-private value is recorded here.

The authenticated stable-alias browser session initially rendered an older service-worker-cached application shell, even though Vercel inspection showed both aliases already resolving to the final deployment. The final assertions therefore used the freshly authorized immutable hostname. No cross-session update defect was reproduced and no service-worker behavior was changed.

## Appendix: chronological notes

## Follow-up: server verifier compatibility deployment

- Vercel runtime logs identified the remaining write failure as an ESM/CommonJS incompatibility in the deployed Firebase Admin verifier (`firebase-admin@14` -> `jose@6`). The endpoint converted that failure to `401 invalid-writer-token`.
- Added a regression test for the compatible verifier dependency shape, then pinned `firebase-admin@13.10.0`, which resolves `jose@4.15.9`. The new test failed before the pin and passed after it. Commit: `7f593b8 fix(auth): pin serverless-compatible Firebase Admin verifier`.
- Deployed only Preview `dpl_Ahp1GeXtKyZ8Xhu7Zc4SVGmW7Doa` (Ready) at `https://rosary-site-react-3x7f63ywp-sshibinthomass-2046s-projects.vercel.app`. The stable admin alias now targets it. A separate clean guest alias, `https://rosary-site-react-checkout-guest-preview.vercel.app`, targets the same deployment.
- Added only the new immutable hostname and new guest alias to Firebase Authentication authorized domains (10 -> 12), confirming both are present. No production deployment or merge occurred.
- Re-ran after the dependency change: named suite 47 / 47, Firestore emulator rules 5 / 5, and `npx vite build` all pass.

### Valid-token probe blocker (no further orders created)

- A real anonymous Firebase ID token was obtained without exposing it and used for the exact diagnostic POST shape. From the shell this request reaches Vercel deployment protection and returns its outer `401`, before the application endpoint. It cannot validate the deployed handler.
- The authorized in-app Chrome session can render the Preview, but the required browser adapter's page-evaluation sandbox has neither `fetch` nor storage; the adapter explicitly rejected `javascript:` main-page execution by browser security policy. It therefore cannot issue the requested authenticated in-page POST or read a token from page memory.
- This is a tooling/Preview-protection boundary, not evidence that the handler still rejects a valid writer token. Per the required gate, no further replacement orders were created and the remaining live admin matrix is paused until an authenticated in-page request mechanism is available.

## Follow-up: staged normal-flow valid-token probe and final matrix

The controller superseded the synthetic-probe gate with a staged normal checkout on the clean guest alias. That checkout runs inside the existing authenticated Preview browser session and is therefore the required practical valid-token probe.

- Named guest probe: `CHK-N4CQTF`. It showed the truthful WhatsApp handoff/no-on-site-payment confirmation; no WhatsApp message was sent. After normal replay, authenticated Checkout Tracking displayed the named record as `successful` / `completed`, INR 49.00, with its canonical business order ID, one Yellow Flower item, linked order, and all six successful timeline stages.
- Blank guest case: `CHK-4WTN7P`. It showed the same truthful confirmation, with every customer delivery field left blank and no message sent. Controller Vercel logs confirmed POST 201, a safe idempotent POST 200, then five PATCH 200 responses. A normal admin reload displayed `Unknown customer`, INR 49.00, canonical order ID, `successful` / `completed`, and all six successful timeline stages.
- Admin exercise: support-code and order-ID search, customer-name search, result/stage/resolution filters, Include resolved, and current-date range all returned the expected named/blank records. The named record's linked-order path and Admin Orders `Checkout issues` deep link both resolve to the same attempt.
- Resolution workflow on the named record: saved open notes; moved Open -> Investigating -> Resolved; edited notes while Resolved; reopened; then resolved again. Reload/filter state showed the final `resolved` status and edited note. The page does not display the raw `resolvedAt` field, so live UI cannot show the two timestamp values directly; state transitions were persisted and are separately covered by deterministic tests.
- Privacy record audit: the blank record presents `Unknown customer` and only `Phone: Not recorded` / `WhatsApp: Not recorded`, plus item, cost, canonical order identifier, and sanitized timeline. No address, email, pincode, district, state, writer identity, raw token, or secret appears in the list/detail UI.
- Console audit: guest and authenticated admin tabs had no error or warning entries after the final flows.

### Superseded mobile caveat

This applied to the earlier deployment session only. The final deployment session reacquired the viewport capability and verified a real authenticated `innerWidth: 390`, `innerHeight: 844` viewport; see FINAL evidence above.

## Follow-up: Preview authentication repair

- Assigned non-production alias `https://rosary-site-react-checkout-preview.vercel.app` to deployment `dpl_2gtL9g2TnBeD6GWN5uCfDK7sHAoX`; Vercel inspect confirms the alias resolves to that Ready Preview deployment.
- Used the existing Firebase CLI OAuth session without printing credentials. Identity Toolkit config had 7 authorized domains; appended only `rosary-site-react-checkout-preview.vercel.app` using `updateMask=authorizedDomains`; returned 8 domains and confirmed the alias is present.
- The in-app browser then completed Google OAuth with the authorized existing account. The Firebase Auth preview-path blocker is resolved; no auth/500/ESM console issue was observed during the successful sign-in.
- Checkout Tracking authenticated successfully but returned zero records. The two original support-code checkouts were created before the previous hostname became authorized, so their diagnostic writes did not reach the live `checkoutAttempts` collection. They remain valid public orders but are not available for the requested admin matrix.

## Follow-up: origin outbox recovery and replacement attempts

- Added only the exact original Preview hostname to Identity Toolkit `authorizedDomains`, preserving the existing eight domains (8 -> 9, hostname presence confirmed). No credential or configuration value was printed.
- Revisited the original origin and triggered normal Account/Cart lifecycle replay, then waited and rechecked the stable-alias Checkout Tracking UI. Neither original support code (`CHK-C5376L`, `CHK-K7GBNM`) appeared; authenticated list remained empty. No manual Firestore writes were used.
- Following the authorized fallback, created exactly two new low-cost origin attempts after the domain repair: named `Codex Preview Test` support code `CHK-FMSJUD`, document reference `3GhI8gJ51PqkLxcWFeyM`; nameless support code `CHK-HZ6W85`, document reference `AKYqNzgB3COZZlV2wJW7`. Both showed truthful WhatsApp handoff confirmations; no message was sent.
- Triggered another original-origin Account lifecycle replay after both confirmations and rechecked Checkout Tracking. It still returned zero attempts. Browser console contained no surfaced error/warn event for the non-blocking diagnostic write.

This is now a reproducible live diagnostic-persistence failure: successful checkout and order persistence work, while the associated `checkoutAttempts` records do not appear remotely, including after authorized-domain recovery and normal outbox replay. The remaining admin scenario matrix cannot proceed until this owning-boundary failure is diagnosed and fixed with the required TDD/deploy/retest cycle.

## Follow-up: diagnostic replay fix

- Root cause: `flushCheckoutAttemptOutbox` used the 750 ms interactive checkout deadline even for a cold replay. Anonymous writer-token acquisition can exceed that budget, so replay retains the group before it can issue `/api/checkout-attempts`.
- Added `CHECKOUT_OUTBOX_REPLAY_DEADLINE_MS = 5000` for replay only; the interactive checkout deadline remains 750 ms.
- RED/GREEN evidence: new delayed-token replay regression failed after ~760 ms before the change and passed after the change.
- Commit: `8efa57b fix(checkout): allow diagnostic outbox auth replay`.
- Verification: named deterministic suite 46 / 46, Firestore emulator 5 / 5, and `npx vite build` passed.
- Preview deployment: `dpl_2y2XQQqBQz1co7nNPSwEKXZb78jL`, ready at `https://rosary-site-react-2tmfgcahn-sshibinthomass-2046s-projects.vercel.app`; stable alias was repointed to it.

The old origin-scoped outbox cannot execute the new client bundle because Vercel's immutable autogenerated deployment hostname remains pinned to the old deployment. The new stable alias is already an authorized Firebase domain, but has separate origin storage. Create replacement attempts only on the stable alias after the fix, then resume the remaining admin matrix.

## Deterministic checks

| Check | Result | Evidence |
|---|---|---|
| Named checkout test command from brief | PASS | 45 / 45 tests passed: verification, create/verify failure, popup handling, retry/timeout/offline replay, conflicts, sanitization, idempotency, and rule-shape coverage. |
| `npm run build` | PASS | Vite build, SEO generation, and image audit completed. Existing chunk-size and Browserslist warnings only. |
| `tests/firestoreRules.emulator.mjs` direct | Not runnable standalone by design | Test correctly requires `firebase emulators:exec`. |
| Firestore emulator authorization suite | PASS | With Android Studio JBR supplied via `JAVA_HOME`, `npx --yes firebase-tools emulators:exec --only firestore --project rosary-plant-house "node --test tests/firestoreRules.emulator.mjs"` passed 5 / 5. Expected permission-denied diagnostics were asserted by the tests. |

## Customer checkout scenarios

| Scenario | Result | Evidence |
|---|---|---|
| Named successful attempt | PASS | One INR 49 Yellow Flower item; name `Codex Preview Test`; checkout confirmation truthfully stated no on-site payment and showed support code `CHK-C5376L`. Canonical document/order reference: `01IORY30pK33kjHk2PjF`; public business order reference: `RPH-20260720-KHE3FD`. Public order showed one item and INR 49 subtotal/total. |
| Nameless successful attempt | PASS | Name, phone, WhatsApp, address, pincode, district, and state were blank. One INR 49 Yellow Flower item was accepted; truthful confirmation showed support code `CHK-K7GBNM`. Canonical document/order reference: `NnaI19gRnc1mAozNWGl5`. |
| WhatsApp handoff accuracy | PASS | Both confirmations said the request was opened in WhatsApp, requested a manual Send there, and said no payment was collected on-site. |

The browser created WhatsApp handoff tabs as part of the intended checkout flow; no WhatsApp message was sent.

## Admin tracking, links, filters, notes, and privacy record inspection

**Authentication is now executable in this Preview.** After the stable alias repair, the authorized admin account loaded Checkout Tracking with no runtime error. Its summary returned zero records, because both original test orders predated the auth-domain repair and did not create remote diagnostic records.

Original root-cause evidence:

- Vercel confirms this is the stated ready Preview deployment.
- Preview Firebase environment variable names are present for Preview (values were not read).
- Firebase client authentication rejects the dynamic Preview host before an authorized user session can be established.

This was external Firebase Authentication authorized-domain configuration; it was repaired without a source change or redeploy.

Consequently, the following required browser scenarios remain, pending two newly confirmed persisted diagnostic attempts:

1. Read both `checkoutAttempts` records as `sshibinthomass@gmail.com`; verify named display, blank-name `N/A`, INR amount, items, canonical order ID, completed timeline, and successful result.
2. Search each record by support code/order ID and the named record by `Codex Preview Test`; exercise successful/completed/open/resolved/date filters; expand both timelines and inspect sanitized errors.
3. Follow Checkout Tracking -> order and Admin Orders `Checkout issues` -> same attempt links.
4. On the named attempt, save Open notes; transition Investigating -> Resolved; record `resolvedAt`; edit notes without timestamp change; reopen and verify timestamp clears; resolve again and verify new server timestamp. Reload after every persisted update.
5. Authenticated desktop/mobile Admin home, Admin Orders, and Checkout Tracking usability checks.
6. Live admin record privacy-field inspection.

## Privacy audit available without admin access

Static and deterministic evidence supports the expected privacy boundary, but does not replace the blocked live-record inspection:

- The outbox rejects address, email, pincode, district, state, and token-related keys before persistence.
- The admin-facing safe attempt projection limits customer data to name/phone/WhatsApp, preserves item/cost fields, and sanitizes errors.
- API deterministic coverage passed its rejection of extra PII and its immutable writer-ID/identity behavior.

No tokens, API keys, raw identity values, service-account material, or real customer data were read or recorded.

## Public regression matrix

Desktop and 390 x 844 mobile checks passed for homepage, shop/search, product, wishlist, cart, account, and named public order view. Each route rendered a main region and reported no horizontal overflow. The public order preserved the expected one-item INR 49 total.

Unauthenticated admin routes also had no horizontal overflow, but redirect to Account means they are not a substitute for authenticated admin regression coverage. The only newly observed console error was the Firebase `auth/unauthorized-domain` error from the authorized sign-in attempt; no checkout runtime error was observed.

## Changes and deployments

- Commits: none.
- Deployments: no redeploy; one non-production alias assigned to the existing Preview.
- Protected orders: none deleted.
- Controller-owned `.superpowers/sdd/progress.md`: left untouched.

## Required context to finish

Create two replacement low-cost attempts through the stable alias and confirm their records appear in Checkout Tracking, then resume the six admin-only scenarios above. The auth-domain and Java prerequisites are now satisfied.
