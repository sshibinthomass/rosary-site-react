# Checkout Tracking Release Hardening Design

## Goal

Move checkout-attempt tracking toward production only after a deployed preview proves that customer checkout, diagnostic recording, admin investigation, security controls, and existing storefront behavior work together.

## Confirmed Product Decisions

- Customer name remains optional. Admin displays the recorded name when present and `N/A` when omitted.
- Order cost is always recorded from the verified checkout total and displayed in Admin Checkout Tracking.
- No production deployment or merge is performed until the preview test matrix passes and the user explicitly approves production promotion.
- Test orders and identities must be clearly controlled, minimized, and cleaned up when the platform permits safe cleanup.

## Chosen Approach

Use a staged preview rather than production-first configuration:

1. Enable Firebase Anonymous Authentication for the existing Firebase project.
2. Use temporary, non-committed service-account material to run Firebase CLI/API configuration.
3. Add the existing server-only Firebase Admin credential to Vercel Preview and Development without exposing its value or adding a `VITE_` prefix.
4. Deploy Firestore rules and indexes, then confirm the `checkoutAttempts.expiresAt` TTL policy.
5. Deploy the feature branch to a Vercel preview.
6. Exercise the complete browser and security matrix against that preview.
7. Stop before production and report evidence, failures, cleanup, and remaining risks for explicit approval.

## Configuration Safety

- Real credentials are never printed, committed, copied into browser-visible configuration, or stored in diagnostic records.
- Any temporary credential file is created outside the repository with a narrow path and removed after use.
- Firebase Anonymous Authentication is used only by the named secondary diagnostic Firebase app; primary Google customer/admin authentication remains unchanged.
- Vercel Preview/Development receive only the server credential required by `/api/checkout-attempts`.
- Firestore browser access to `checkoutAttempts` remains denied for public users. Admin access remains limited to reads and constrained investigation updates; deletes remain denied.

## Preview Test Matrix

### Customer checkout

- Successful checkout with a name records the name, items, cost, support code, order ID, and complete stage timeline.
- Successful checkout without a name remains allowed and displays `N/A` in the admin page.
- Order creation failure records a failed attempt while preserving the cart.
- Verification failure records the correct last stage and safe error category.
- Blocked WhatsApp popup saves the order, records `whatsapp-launch-failed`, shows the support code, and permits retry without creating a second order.
- Successful WhatsApp retry advances the same attempt.
- Offline/retryable diagnostic delivery queues and later flushes the whole attempt in order.
- Permanent writer conflict affects only its own outbox group.
- No checkout path stores ID tokens, email, street address, pincode, district, or state in `checkoutAttempts`.

### Admin investigation

- Admin home navigation opens Checkout Tracking.
- Summary counts, empty/loading/error states, desktop table, and mobile cards render without overflow.
- Records show name or `N/A`, contact, INR cost, items, support code, order ID, result, last stage, resolution status, and attempt time.
- Search works for support code, order ID, name, phone, and WhatsApp.
- Result, stage, status, resolved, and date filters work independently and together.
- Expanded details show chronological events and sanitized error information.
- Order-to-attempt and attempt-to-order links use canonical IDs.
- Notes save without changing status.
- Open, Investigating, Resolved, reopen, and resolved timestamp preservation work.

### Security and regression

- Anonymous/public Firestore create, update, get, list, and delete are denied.
- Admin get/list and constrained investigation updates succeed.
- Admin lifecycle edits and deletes are denied.
- Existing order deletion protection remains intact.
- Existing home, shop, search, product, wishlist, cart, account, order, and admin-orders paths remain usable.
- Browser console has no new application errors at desktop and mobile breakpoints.
- Full automated tests, production build, scoped lint, and diff checks pass at the established project baseline.

## Promotion Gate

Production promotion is blocked if any required preview scenario cannot be exercised or fails. After all required evidence passes, report the preview URL, test counts, browser results, security results, known baseline warnings, test data created, and cleanup status. Production or `main` changes require explicit user approval after that report.
