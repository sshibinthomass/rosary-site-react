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

Each checkout creates a random document ID, a separate high-entropy client write token, and a short human-readable support code before order processing begins. The document stores:

- `supportCode`
- `userId` when signed in
- customer `name`, `phone`, and `whatsapp`
- normalized search values for the contact numbers
- attempted `totalAmount`
- a cart snapshot containing product ID, name, unit price, and quantity
- `currentStage`, `result`, and `resolutionStatus`
- optional linked Firestore document ID and business order ID
- an append-only event timeline
- a sanitized error category, code, and message
- admin notes and resolution timestamps
- created, updated, and 180-day expiry timestamps

The client write token is never shown in the admin interface. Firestore rules permit a client to create one attempt and update only its allowed diagnostic fields when the immutable token matches. Attempt reads and list queries are admin-only. Admin-only fields such as notes and resolution state cannot be changed through the customer update path.

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

Diagnostic writes are best-effort and must never prevent a valid order from being placed. Failed diagnostic writes are placed in a bounded local outbox and retried on the next suitable page load or connectivity event. The support code is retained with the queued record.

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

Administrators can search by support code, business order ID, customer name, or phone/WhatsApp number, and filter by result, stage, resolution status, and date. Resolved records are excluded by default.

Expanding an attempt displays the cart snapshot, full stage timeline, sanitized diagnostic details, linked order, and internal notes. Administrators can change the resolution status and save notes. The existing Admin Orders page links to related checkout diagnostics when an attempt has produced an order.

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

## Testing

Automated tests will verify:

- attempt creation contains the agreed customer, cost, item, support-code, and retention fields;
- checkout stages occur in the correct order and link the created order;
- failures identify the correct last successful stage and sanitized error category;
- tracking failures never prevent verified checkout or WhatsApp handoff;
- failed tracking writes enter the bounded local outbox and retry without duplicate timeline events;
- failed checkout keeps the cart and displays its support code;
- admin search and filters cover support code, order ID, name, phone, result, stage, and resolution status;
- admin notes and status updates persist;
- Firestore rules deny public reads, lists, deletes, and unauthorized field changes;
- the admin route is protected and linked from Admin home and related orders; and
- the full test suite, lint, and production build pass.

## Deployment Requirements

- Deploy the web application.
- Publish the updated Firestore security rules and any required indexes.
- Enable Firestore TTL on `checkoutAttempts.expiresAt` so the 180-day policy is enforced.

## Non-goals

- Reading whether a customer tapped Send inside WhatsApp.
- Treating a WhatsApp handoff as a confirmed or paid order.
- Capturing unrelated site errors outside checkout.
- Replacing the existing orders collection or admin order-management workflow.
- Permanently retaining diagnostic records.
