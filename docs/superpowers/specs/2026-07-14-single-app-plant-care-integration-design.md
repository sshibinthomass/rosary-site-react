# Rosary Single-App Plant Care Integration Design

Date: 2026-07-14
Status: Approved for implementation
Target branch: `codex/plant-care-companion`

## Decision

Rosary Plant House will ship commerce and plant care as one application. The existing root React application remains the only web app, installable PWA, and Capacitor Android app. Plant Care becomes a first-class feature area inside it rather than a separate product installation.

This design supersedes the separate-runtime boundary described in `2026-07-14-plant-care-companion-design.md` and its Release 1 implementation plan. The completed `plant-care-app/` code is a tested migration source, not a second application that will remain in the repository.

## Product experience

The global mobile navigation becomes:

1. Home
2. Shop
3. Plant Care
4. Cart
5. Account

Wishlist moves to Account and remains available in the side menu. Desktop navigation receives the same first-class Plant Care destination.

Plant Care opens at `/care` and uses a scoped internal navigation for Today, My Garden, Add Plant, and Journal. Rosary Benefits is available from the Plant Care overview and Account. Plant details use `/care/plants/:plantId`. This gives care workflows enough space without creating another global application shell.

The public experience remains available without an account. Guests can create a local garden, receive check-first care prompts, record outcomes, and keep a private local journal. The existing Rosary Google account enables cloud synchronization and verified purchase benefits. Users never create or manage a separate Plant Care account.

## Architecture

### One root runtime

The root Vite application owns:

- React Router and the global layout.
- The existing `AuthProvider` and Firebase configuration.
- Storefront, account, cart, order, and Plant Care routes.
- The PWA service worker and install manifest.
- The Capacitor Android project with package ID `com.rosaryplants.app`.

The independent `plant-care-app/package.json`, Vite entry point, PWA manifest, and Android project are removed after their functionality is migrated. There will be no second dev server, deployment, Firebase client initialization, APK, or application package ID.

### Feature boundary

Migrated code lives under `src/features/plantCare/`. The boundary keeps the care engine, repository, weather adapter, notification adapter, journal, and UI independently understandable while sharing root infrastructure.

Suggested structure:

```text
src/features/plantCare/
  care/
  data/
  domain/
  integrations/
  pages/
  components/
  PlantCareProvider.tsx
  PlantCareLayout.tsx
  routes.tsx
  styles.css
```

The pure TypeScript care engine remains free of React, Firebase, browser, weather-network, and notification dependencies. The root build adds TypeScript type-checking for migrated `.ts` and `.tsx` modules rather than converting the tested domain logic to untyped JavaScript.

### Shared authentication and Firebase

The Plant Care feature consumes the user exposed by the existing root `AuthProvider`. Its former `AuthProvider` and Firebase configuration modules are not retained. A small typed adapter maps the existing Firebase user into the care feature where needed.

Firestore paths remain unchanged:

- `plantAppUsers/{uid}/locations`
- `plantAppUsers/{uid}/plants`
- `plantAppUsers/{uid}/tasks`
- `plantAppUsers/{uid}/events`
- `plantAppUsers/{uid}/photos`
- `plantAppUsers/{uid}/rosaryImports`
- `plantAppUsers/{uid}/entitlements`

Keeping these paths preserves the server security model and any signed-in garden data. Existing callable Functions continue to verify Rosary orders and create trusted imports. Client writes still cannot issue Rosary provenance or entitlements.

### Local data

Guest data continues to use IndexedDB database `rosary-plant-care`. Local locations, plants, tasks, events, and photos remain isolated from commerce state. Signing in merges local care data into the authenticated garden without affecting the cart, wishlist, orders, or delivery profile.

No automatic destructive migration runs. The standalone development origin at port 5176 has no production users; its local browser database is treated as development-only. Cloud data uses stable Firestore paths and therefore remains portable.

### Catalogue

The care catalogue remains generated from the root storefront's verified `src/data/products.json`. Generation moves to a root script and writes the minimized care profile data beneath `src/features/plantCare/data/`. Only published, identity-verified products with usable care metadata are included.

Plant Care may link a profile to its storefront product route, but the care workflow never requires a purchase. Rosary order imports use the trusted server-side product mapping already implemented in `functions/`.

## UI integration

### Global shell

The existing Rosary header, theme, error boundary, login flow, footer, and responsive layout remain authoritative. Plant Care pages render inside that shell.

The root mobile bottom navigation keeps five items. Plant Care replaces Wishlist in that bar; Wishlist remains reachable from Account and the side menu. The floating cart control is hidden on `/care` routes because Cart already remains in the global navigation.

### Plant Care shell

Plant Care retains its field-notebook character, check-first language, and forest/paper/clay palette, but its CSS is scoped beneath `.plant-care-surface`. It does not redefine global `body`, button, link, heading, or root color rules. Storefront dark-mode variables are mapped deliberately so care pages remain readable in either theme.

Desktop care pages use a compact secondary navigation. Mobile care pages use a horizontal or segmented sub-navigation within the content area rather than a second fixed bottom bar. This avoids competing with the global five-item navigation.

### Account integration

The root Account page gains a Plant Care card showing:

- Local or synchronized status.
- Plant and growing-place counts.
- Reminder settings.
- Rosary benefit status and import entry point.

Google sign-in remains the existing account action. The separate Plant Care Profile page is removed. The Account card shows summary state and links to `/care/settings`, which owns reminder controls, synchronization details, plan limits, and Rosary benefit status.

## PWA and Android

The root application becomes the only installable PWA. Its manifest identifies Rosary Plant House and launches the same combined app. Offline caching includes the commerce shell and Plant Care shell; private garden data continues to come from IndexedDB and Firestore's client behavior rather than being embedded in the service-worker cache.

The existing root Capacitor project remains authoritative:

- App ID: `com.rosaryplants.app`
- App name: `Rosary Plants`
- Web directory: `dist`

The local-notifications plugin and notification icons are migrated into this Android project. Inspection reminders remain optional and use observation language. The separate `com.rosaryplants.care` Android project is deleted after the root APK passes notification and offline verification.

## Data and interaction flow

### Guest care

1. User opens Plant Care from global navigation.
2. Plant Care loads IndexedDB through `PlantCareProvider`.
3. User creates one indoor or one balcony place and adds a plant.
4. The deterministic engine creates an immediate baseline observation task.
5. An outcome appends a care event and creates the next observation window.
6. Data and journal photos remain private on the device.

### Signed-in care

1. Root authentication exposes the existing Rosary user.
2. Plant Care merges local and remote garden records.
3. Firestore snapshots update the local repository.
4. Retriable failures use bounded backoff; permission errors stop retries and show an actionable message.
5. Signing out leaves local data intact.

### Rosary benefits

1. A signed-in user requests benefit synchronization.
2. Callable Functions query orders owned by that UID.
3. Eligible order lines produce idempotent imports.
4. Delivered or completed orders grant time-bounded entitlements.
5. Accepting an import transactionally creates the verified plant, first task, and event.

## Error handling and safety

- Missing Firebase configuration disables account sync but never blocks guest care.
- Weather timeout, provider failure, or invalid data falls back to labeled India-season guidance.
- Notification denial leaves every care function available.
- Photo upload failure retains the local photo and exposes pending synchronization state.
- Permission failures never retry indefinitely.
- Care tasks prompt observation and never issue an unconditional watering command.
- Plant Care does not diagnose disease, prescribe pesticide treatment, or claim sensor knowledge.
- Errors in a lazy-loaded Plant Care route are contained by the root error boundary and do not prevent shopping.

## Migration sequence

1. Add root TypeScript, IndexedDB, notification, PWA, and test dependencies.
2. Move and verify pure care/domain/catalogue modules.
3. Integrate the local repository and `PlantCareProvider` with root authentication.
4. Add `/care/*` routes and the scoped Plant Care layout.
5. Update global navigation and Account integration.
6. Migrate weather, journal, Firebase synchronization, and Rosary benefits.
7. Convert the root app into the only PWA and migrate Android notifications.
8. Port unit and browser tests into root commands.
9. Remove the independent `plant-care-app/` runtime and Android package.
10. Run the complete storefront, Plant Care, Functions, PWA, security-rule, browser, and root Android gates.

The independent app is removed only after the corresponding root routes pass feature-equivalent tests.

## Testing and acceptance

The consolidation is complete when:

- There is only one package users install and only one web application users visit.
- `/care` is publicly usable inside the Rosary shell.
- The global mobile navigation is Home, Shop, Plant Care, Cart, Account.
- Wishlist remains accessible from Account and the side menu.
- Existing login, cart, checkout, order, admin, SEO, and product flows retain their tests.
- All migrated care-engine, garden, weather, notification, sync, entitlement, and journal tests pass from the root repository.
- A guest can add a plant, record an observation, reload offline, and keep the rescheduled task and photo.
- A signed-in user uses the existing Rosary account and can synchronize private garden data.
- Client writes cannot create verified Rosary plants or entitlements.
- Root PWA installation opens the combined app.
- Root Android debug APK builds as `com.rosaryplants.app` and launches the combined app offline.
- The repository no longer contains a deployable second Plant Care application.

## Explicit exclusions

This integration does not add AI identification, AI diagnosis, subscriptions, payments for premium care, public community features, iOS packaging, cloud push notifications, or household sharing. Those remain later product decisions after the single-app Care Core is validated.
