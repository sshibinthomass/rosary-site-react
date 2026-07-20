# Checkout Attempt Tracking Design

## Goal

Give administrators a searchable history of every observable checkout attempt so customer complaints can be matched to the stage where order placement stopped. The system must capture attempts that fail before an order document exists without disrupting a valid checkout.

## Scope

- Track successful and failed checkout attempts.
- Let administrators find attempts by support code, order ID, customer name, or phone/WhatsApp number.
- Show customer name, attempted order cost, cart contents, current stage, result, and time in the admin list.
- Show a detailed event timeline, linked order, safe error information, and internal notes in the attempt details.
- Let administrators mark an attempt `open`, `investigating`, or `resolved`.
- Retain diagnostic records for 180 days. Resolved records are hidden by default but remain searchable until expiry.

This feature observes whether the site opened WhatsApp. It cannot determine whether the customer tapped Send inside WhatsApp, so the admin UI must label that stage accurately.

## Architecture

### Separate diagnostic records

Use a dedicated `checkoutAttempts` Firestore collection. Keeping diagnostics separate from `orders` allows an attempt to exist before an order is created, gives it an independent retention policy, and avoids expanding the operational order schema.

Each checkout creates a random document ID and a short human-readable support code before order processing begins. Customer diagnostic writes go only to the Vercel endpoint at `/api/checkout-attempts`. A named secondary Firebase app uses `browserLocalPersistence` and anonymous sign-in exclusively for diagnostic writer authorization; it never changes the default Firebase app or primary customer/admin authentication. Every create, update, and outbox flush refreshes the anonymous writer ID token. The endpoint verifies that token with Firebase Admin, derives an immutable `writerUid`, and permits only that writer to create/replay/advance the attempt.

An optional business `userId` uses a separate, freshly refreshed primary-user ID token only while the current primary user still matches. The API independently verifies that token and UID. No ID token is stored in Firestore, the outbox, URLs, logs, confirmation state, or customer-visible text.

The document stores:

- `supportCode`
- immutable anonymous `writerUid`
- optional `userId` only when a Firebase ID token verifies to the same UID
- customer `name`, `phone`, and `whatsapp`
- attempted `totalAmount`
- a cart snapshot containing product ID, name, unit price, and quantity
- `currentStage`, `result`, and `resolutionStatus`
- optional linked Firestore document ID and business order ID
- an append-only event timeline
- a sanitized error category, code, and message
- admin notes and resolution timestamps
- created, updated, and 180-day expiry timestamps

Email, street address, pincode, district, and state are deliberately excluded from diagnostics and the local outbox. The API uses exact field allowlists, bounded values, exact 180-day expiry, append-only matching events, idempotent operation identifiers, and forward-only lifecycle transitions. A repeated POST from the same writer returns the existing record state without overwriting it; a different writer conflicts.

Firestore rules deny every public create, update, get, list, and delete operation on `checkoutAttempts`. Administrators may get/list records and update only `resolutionStatus`, `adminNotes`, `resolvedAt`, and `updatedAt` under exact rule constraints. Deletes remain denied. The recursive admin fallback explicitly excludes both `orders` and `checkoutAttempts`.

### Checkout stages

The tracker records these observable stages:

1. `started`
2. `details_validated`
3. `order_saved`
4. `order_verified`
5. `whatsapp_opened`
6. `completed`

If processing fails, the record keeps the last successful stage and appends a `failed` event with a stable category such as validation, order write, server verification, WhatsApp launch, network, permission, or unknown. The tracker links the attempt to the order as soon as an order document exists.

`whatsapp_opened` means only that the site successfully handed the URL to WhatsApp. The application must not claim that the customer sent the message or that the order was confirmed.

### Failure isolation and offline retry

Diagnostic writes are best-effort and must never prevent a valid order from being placed. Retryable network, rate-limit, and server failures place the create anchor plus its updates in one bounded, expiring local outbox group. Groups preserve per-attempt FIFO order and idempotent operation IDs; capacity eviction never splits a group. Expired, malformed, and orphan-update groups are pruned. A permanent client error drops only its unchanged group, while a retryable group does not block later attempts.

The outbox stores no Firebase ID tokens or authorization objects. After a browser restart, Firebase restores the secondary anonymous identity and a fresh writer token is acquired at send time; an attempt created under a different/lost writer identity receives a permanent mismatch without blocking later groups. Flush removal compares processed operation IDs with current storage so operations enqueued during an awaited request survive with their create anchor and expiry.

No browser-only design can guarantee delivery when a customer goes offline and never returns. The admin page will therefore describe the data as recorded checkout attempts rather than a guaranteed record of every button press.

Error records contain stable error codes and sanitized messages, not stack traces, credentials, Firestore configuration, or arbitrary serialized error objects.

## Admin Experience

Add a `Checkout Tracking` card to the Admin home page and a protected `/admin/checkout-attempts` route.

The page shows summary counts for failures, open investigations, resolved issues, and successful attempts. Its table or responsive cards show:

- customer name
- phone or WhatsApp number
- order cost
- support code
- linked order ID when available
- last successful stage
- success or failure result
- resolution status
- attempt date and time

Administrators can search by support code, canonical business/document order ID, customer name, or phone/WhatsApp number, and filter by result, stage, resolution status, and date. Resolved records are excluded by default, while an explicit support-code or order-ID URL query includes the matching resolved record.

Expanding an attempt displays the cart snapshot, full stage timeline, sanitized diagnostic details, linked order, and internal notes. Administrators can mark a record `open`, `investigating`, or `resolved`, and a standalone `Save notes` action preserves its current status. Saves are isolated per record, and a failed save leaves the unsaved note in the page. The existing Admin Orders page links to related checkout diagnostics when an attempt has produced an order.

When checkout fails, the customer-facing error includes the support code and asks the customer to provide it when contacting the business. Existing cart and delivery-detail preservation remains unchanged.

## Data Retention

Every attempt receives an `expiresAt` timestamp 180 days after creation. The deployment must enable a Firestore TTL policy for `checkoutAttempts.expiresAt`. Resolved records remain available and searchable until that expiry but are hidden by default in the admin view.

The tracking collection is not used as permanent order history. Orders continue to follow the existing archive behavior and remain accessible through their issued links.

## Error Handling

- A tracker initialization failure does not block checkout.
- A stage-write failure is queued locally and does not change the checkout result.
- An order failure records the last completed stage, error category, and support code when diagnostics are available.
- An admin load or update failure shows a retryable error without discarding unsaved notes in the current page session.
- A missing linked order is shown explicitly rather than treated as a tracking-page failure.
- Browser popup blocking and native launcher rejection are both `whatsapp-launch-failed`; `whatsapp_opened` is recorded only after a positive handoff. Web launch first opens a blank `_blank` handle, clears `opener`, and then navigates it; navigation failure closes the blank handle.
- A saved-order WhatsApp retry reports success or failure through the same in-memory tracker session and never creates a second order.

## Testing

Automated tests will verify:

- attempt creation contains the agreed customer, cost, item, support-code, and retention fields;
- checkout stages occur in the correct order and link the created order;
- failures identify the correct last successful stage and sanitized error category;
- tracking failures never prevent verified checkout or WhatsApp handoff;
- failed tracking writes enter whole bounded/expiring attempt groups and retry without duplicate timeline events;
- failed checkout keeps the cart and displays its support code;
- admin search and filters cover support code, order ID, name, phone, result, stage, and resolution status;
- admin notes and status updates persist;
- the secondary app persists anonymous writer identity without affecting primary auth, and refreshes its ID token for every request;
- the Vercel API verifies immutable writer ownership plus optional independent primary identity, rejects extra PII, and enforces idempotent forward transitions;
- concurrent outbox enqueues survive successful and permanent responses to an older flush snapshot;
- resolved notes preserve `resolvedAt`, first resolution sets it, and reopening clears it;
- Firestore rules deny every public checkout-attempt operation and allow only constrained admin investigation updates;
- the Firestore Emulator authorization matrix covers public denial, admin reads/updates, protected deletes, and unrelated admin fallback access;
- the admin route is protected and linked from Admin home and related orders; and
- the full test suite, lint, and production build pass.

## Deployment Requirements

1. Enable Firebase Anonymous Authentication for the project used by the existing public web configuration. Do not replace or sign out the default primary app.
2. Configure exactly one server-only credential value in Vercel: `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64`. Never expose either through a `VITE_` variable.
3. Publish `firestore.rules` so browser checkout-attempt access is denied, then publish `firestore.indexes.json`.
4. Confirm the `checkoutAttempts.expiresAt` TTL field override is enabled in Firestore.
5. Deploy the Vercel release containing both `/api/checkout-attempts` and the web client.
6. Perform the success, cold-reload outbox, writer-mismatch, blocked-popup/retry, admin resolution/notes, and minimal-PII live smoke checks documented in `README.md`.

## Non-goals

- Reading whether a customer tapped Send inside WhatsApp.
- Treating a WhatsApp handoff as a confirmed or paid order.
- Capturing unrelated site errors outside checkout.
- Replacing the existing orders collection or admin order-management workflow.
- Permanently retaining diagnostic records.
