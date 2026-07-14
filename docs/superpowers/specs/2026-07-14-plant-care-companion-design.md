# Rosary Plant Care Companion Design

Date: 2026-07-14
Status: Approved product design; Release 1 implementation planning pending
Internal project name: `plant-care-app`

## Executive summary

Rosary Plant House will add a separate, public plant-care application alongside its ecommerce storefront. The application is for anyone in India, while verified Rosary customers receive automatic plant imports and additional care benefits.

The product will begin as a care-first application for houseplants, succulents, cacti, and balcony plants. Its primary promise is:

> Know what each plant needs today, and learn how to keep it thriving.

The application will not compete head-on as another generic camera-based plant identifier. Its differentiator is a trustworthy, check-first care system adapted to Indian cities, seasons, heat, humidity, and monsoon conditions. Photo identification and health triage will support that system in a later release rather than define the first release.

Release 1 is the Care Core: a complete path from adding a plant through receiving, completing, and adapting daily care tasks. It includes a public free tier and verified Rosary purchase benefits, but excludes live subscription billing and AI diagnosis until the care loop is proven.

## Decisions approved by the user

- The application is public, not limited to Rosary customers.
- Rosary customers receive extra benefits.
- The main promise is helping users keep every plant alive.
- The first plant scope is houseplants, succulents, cacti, and balcony plants.
- The launch market is India only.
- The business model is freemium.
- The selected product approach is an India-focused plant-care operating system.
- Release 1 is the Care Core described in this document.

## Market research conclusion

The plant-app market has converged around a common bundle: photo identification, fixed care reminders, disease diagnosis, a plant encyclopedia, and a subscription. Major products already have significant distribution. Planta reports more than seven million users, PictureThis reports more than eighty million downloads, and Blossom reports more than ten million downloads. Scientific evaluations also show that photo identification accuracy varies by species, image, and context; it should not be presented as infallible.

The market gap most relevant to Rosary Plant House is not a larger identification database. It is the combination of:

1. India-specific care guidance.
2. Observation-driven tasks instead of blind watering instructions.
3. A longitudinal record that adapts future care.
4. Verified retailer data for purchased plants.
5. A useful public application that does not behave like a disguised store.

Retailer-linked care apps such as Vera by Bloomscape demonstrate the value of post-purchase plant profiles and journals, but its published FAQ historically limited availability to the United States and lacked household sharing. Rosary can apply the same useful connection while building specifically for Indian conditions and preserving portability for non-Rosary plants.

### Research references

- [Planta features](https://getplanta.com/?language=en)
- [PictureThis application](https://www.picturethisai.com/app)
- [Blossom features](https://blossomplant.com/)
- [Greg features and pricing](https://apps.apple.com/us/app/greg-plant-identifier-care/id1512912236)
- [Pl@ntNet project and community validation](https://plantnet.org/en/about/)
- [iNaturalist community identification](https://www.inaturalist.org/pages/community)
- [Flora Incognita](https://floraincognita.com/flora-incognita-app/)
- [Seed to Spoon garden planning](https://www.seedtospoon.net/)
- [Vera by Bloomscape](https://bloomscape.com/vera/)
- [Plant identification accuracy in suspected poisoning cases](https://www.tandfonline.com/doi/full/10.1080/24734306.2024.2377523)
- [Repeatable plant-identification app scoring study](https://pmc.ncbi.nlm.nih.gov/articles/PMC10075466/)

## Product boundaries

### Included at launch

- Adults in India who keep plants at home or on balconies.
- Beginners with a small number of plants.
- Enthusiasts who need organization across rooms or growing locations.
- Rosary customers who want verified care after purchase.
- English interface and content, structured for later Indian-language localization.

### Excluded at launch

- Crop, farm, orchard, and commercial nursery management.
- Vegetable-garden planning and harvest management.
- Public social feeds, swaps, and marketplaces.
- Automated irrigation and hardware sensors.
- iOS packaging.
- Claims that the application can guarantee plant survival.
- Pesticide dosage or dangerous treatment instructions generated without curated source data.

Android and installable web/PWA are the Release 1 delivery surfaces. iOS remains a later packaging project after the Care Core is validated.

## Product principles

1. **Check before acting.** A reminder asks the user to inspect soil, leaves, or growth before watering or treating.
2. **Explain the reason.** Every task shows why it is due and which conditions affected it.
3. **Care is adaptive, not magical.** The application adjusts using explicit inputs and history rather than pretending to sense the plant remotely.
4. **Uncertainty is visible.** Unknown species, missing weather, and conflicting symptoms are surfaced plainly.
5. **Commerce is contextual.** Rosary products appear only when relevant or when the user enters the Rosary area.
6. **User data stays private by default.** Gardens, locations, photos, and logs are not public.
7. **The core remains useful for free.** Premium improves scale, automation, and insight rather than withholding basic care.

## Primary user journeys

### First-time public user

1. Open the application and read the care-first promise.
2. Continue as a local guest or sign in with Google.
3. Select an Indian city and create a growing location such as `Living room` or `South balcony`.
4. Add a plant through catalogue search or manual category selection.
5. Record placement, pot size, drainage, light, soil type, and acquisition date.
6. Receive the first check window and an explanation.
7. Complete, skip, or postpone the task after checking the plant.

Guest data is stored locally. A guest must sign in before cloud sync, Rosary account linking, or cross-device access. Signing in merges local guest plants into the authenticated account without discarding either collection.

### Returning user

1. Open `Today`.
2. Review a small, prioritized task list grouped by location.
3. Open a task and follow its observation prompt.
4. Record the outcome: completed, not needed, postponed, or problem noticed.
5. See the next check window and the reason for any adjustment.

### Rosary customer

1. Sign in with the Google account used on the Rosary storefront.
2. Request Rosary account linking.
3. A trusted server process verifies eligible orders.
4. Eligible purchased plants appear as import suggestions rather than being inserted silently.
5. Accepted plants receive a verified species link, Rosary care profile, acquisition date, and delivery-acclimatization programme.

Eligible orders use a server-owned status allow-list: `confirmed`, `processing`, `shipped`, `delivered`, or `completed`. `pending` and `cancelled` orders never grant entitlements or imports. The client cannot write its own Rosary entitlements.

## Information architecture

The primary mobile navigation has five destinations:

1. **Today** — due and upcoming care checks, weather/season context, and overdue items.
2. **My Garden** — plants grouped by location, search, filtering, and add-plant entry points.
3. **Add** — catalogue search, manual category setup, Rosary import, and later photo identification.
4. **Journal** — chronological plant photos and care events.
5. **Profile** — city, notifications, account linking, plan limits, data export, and support.

Each plant detail screen contains:

- Current status and next check.
- Care explanation.
- Recent events.
- Conditions and editable setup.
- Photo timeline.
- Problems and recovery entry point.
- Rosary provenance badge only when the plant was verified through a Rosary order.

## Freemium and Rosary entitlements

### Release 1 free tier

- Up to ten non-Rosary plants.
- Unlimited Rosary-verified plants.
- One growing location plus one balcony location.
- Watering, fertilizing, rotating, pruning, cleaning, and repotting checks.
- Indian seasonal guidance.
- Basic journal and photo timeline.
- Weather-aware adjustments when production weather access is available.
- Local reminders.

### Premium product definition

Premium is defined in Release 1 data and UI, but payment collection ships in Release 3. Premium capabilities are:

- Unlimited non-Rosary plants and locations.
- Advanced adaptive schedules.
- Guided recovery programmes.
- Higher photo-identification and health-triage allowance.
- Care analytics and trends.
- Household sharing.
- Cloud notifications and advanced scheduling.
- Full data export.

Release 1 uses development/admin entitlements to validate premium UI boundaries. No user is charged before Release 3.

### Rosary customer benefits

- Rosary-verified plants do not count toward the free plant limit.
- Eligible purchases can be imported with verified plant identity.
- Imported plants receive a delivery-acclimatization sequence.
- Each qualifying order grants a ninety-day premium entitlement beginning when the order becomes `delivered` or `completed`.
- Multiple qualifying orders extend the entitlement, with a maximum stored future balance of 365 days.
- Users retain their plants and free features when premium expires.
- Support links can include order context after explicit user confirmation.

## Release decomposition

### Release 1: Care Core

Release 1 proves the recurring care loop and Rosary linkage:

- Separate React and TypeScript application.
- PWA and Capacitor Android shell.
- Guest onboarding and Google authentication.
- India city selection and growing locations.
- Curated species catalogue for launch categories.
- Manual plant creation when no species match exists.
- My Garden and plant detail screens.
- Deterministic care engine.
- Today task list.
- Check-first task completion.
- Care event log and photo timeline.
- Local reminders.
- Firestore offline persistence and synchronization.
- Free-tier enforcement.
- Rosary account linking, import suggestions, and entitlements.
- Basic admin-editable species profiles.

### Release 2: Health and recovery

- Photo-based identification behind a replaceable provider adapter.
- Symptom-based health triage with confidence and uncertainty.
- Curated recovery programmes.
- Follow-up checks after a treatment or care change.
- Safety boundary that avoids definitive toxicity or pesticide claims without curated evidence.

### Release 3: Commercial premium

- Subscription billing compliant with Android and web platform requirements.
- Server-verified premium receipts.
- Premium analytics.
- Household sharing and roles.
- Cloud notification scheduling.
- Full export.

### Release 4: Engagement and community

- Seasonal challenges.
- Rosary workshops and live sessions.
- Rewards and care milestones.
- Moderated question-and-answer areas.
- Community features only after moderation, reporting, privacy, and abuse controls are ready.

## Technical architecture

### Repository and deployment

The new application lives at `plant-care-app/` in this repository and has its own:

- `package.json` and lockfile.
- Vite configuration.
- TypeScript configuration.
- test configuration.
- PWA manifest and service worker.
- Capacitor configuration and Android application identifier.
- environment-variable schema.
- build and deployment documentation.

The existing storefront keeps its current root build. The care application is deployed as a separate project and is not added as a large route bundle to the ecommerce site. Minimal shared integration code may be added to the storefront only for account linking, order verification, and deep links.

### Runtime components

1. **Application shell** — routing, installation, navigation, offline state, and error boundaries.
2. **Identity module** — guest identity, Google sign-in, merge behavior, and account linking.
3. **Garden module** — locations, personal plant records, limits, and filtering.
4. **Species catalogue** — curated care profiles independent of sellable product inventory.
5. **Care engine** — a pure TypeScript rules package with no UI or Firebase dependency.
6. **Task module** — generated tasks, completion outcomes, postponement, and overdue logic.
7. **Journal module** — append-only care events and plant photos.
8. **Weather adapter** — city lookup and normalized weather inputs with cached fallback.
9. **Rosary integration** — server-verified orders, product-to-species links, and entitlements.
10. **Notification adapter** — local Android/PWA reminders in Release 1; cloud delivery later.
11. **Entitlement module** — free limits, Rosary benefits, development premium, and expiry.

Modules communicate through typed interfaces. The care engine accepts plain input data and returns task candidates and explanations. It never reads Firestore, calls weather APIs, or schedules notifications directly.

### Backend

The application shares the existing Firebase project for authentication and trusted access to Rosary order data. Its plant-care data uses namespaced collections and independent rules so the storefront does not gain implicit access to private plant journals.

Trusted server functions handle:

- Rosary order verification.
- Product-to-species mapping validation.
- Entitlement issuance and expiry.
- Administrative species-profile publishing.
- Later, payment receipt verification and cloud notifications.

No entitlement or verified-Rosary flag is accepted from a client write.

## Data model

### Public curated collections

- `plantCareSpecies/{speciesId}` — names, category, difficulty, safety flags, care ranges, seasonal modifiers, problem references, and publication status.
- `plantCareProductLinks/{productId}` — Rosary product ID to curated species ID, verified by an administrator.
- `plantCareRecoveryPrograms/{programId}` — curated later-release recovery steps.

Only published species profiles are readable by public clients. Publishing and product linking require an administrator.

### Per-user private data

- `plantAppUsers/{uid}` — onboarding, city reference, preferences, and plan summary.
- `plantAppUsers/{uid}/locations/{locationId}` — indoor/balcony type, light, exposure, and optional nickname.
- `plantAppUsers/{uid}/plants/{plantId}` — species link or manual category, location, pot, soil, provenance, state, and next-check summary.
- `plantAppUsers/{uid}/plants/{plantId}/events/{eventId}` — immutable care, observation, and schedule events.
- `plantAppUsers/{uid}/tasks/{taskId}` — generated task snapshot, due window, explanation, and state.
- `plantAppUsers/{uid}/rosaryImports/{orderItemKey}` — import suggestion and acceptance state.
- `plantAppUsers/{uid}/entitlements/{entitlementId}` — server-written benefit type, source, start, and expiry.

Photos are stored in Firebase Storage under a UID-owned path. Firestore records contain only storage references and derived thumbnails, never public download URLs that bypass rules.

### Event model

Care events are append-only. Corrections create a new `correction` event referring to the previous event. This preserves history and lets the care engine explain why a future check moved.

Minimum event types are:

- `plant_created`
- `plant_updated`
- `watered`
- `checked_not_needed`
- `fertilized`
- `rotated`
- `pruned`
- `cleaned`
- `repotted`
- `photo_added`
- `problem_noted`
- `task_postponed`
- `correction`

## Care engine

The Release 1 engine is deterministic and data-driven. It does not claim to measure soil moisture or plant health remotely.

### Inputs

- Curated species care ranges or a category fallback.
- Indoor or balcony location.
- City and India climate zone.
- Current season: summer/pre-monsoon, monsoon, post-monsoon, or winter.
- Pot size and drainage.
- Soil drainage category.
- Light exposure.
- Recent precipitation, temperature, and humidity when available.
- Last care events.
- User feedback such as `soil still moist` or `plant showed stress`.

### Outputs

- Earliest and latest check date.
- Observation prompt.
- Allowed outcomes.
- Priority.
- Human-readable explanation.
- Conditions that would trigger an earlier follow-up.

### Watering behavior

The engine schedules a check window, not an unconditional watering date. A typical task says:

> Check the top 3 cm of soil. Water only if it is dry and the pot feels lighter. The check is earlier because your balcony has been hot and dry.

For succulents and cacti, the default observation depth and dry interval are stricter. Recent rain postpones balcony checks when the plant may have received water. Monsoon humidity can delay checks even when rainfall did not reach an indoor plant, but the explanation must distinguish humidity from direct watering.

### Adaptation

- `checked_not_needed` moves the next check by a bounded species/category interval.
- Repeated early dryness shortens future check windows within safe bounds.
- Repeated moisture delays widen future windows.
- Repotting resets pot and soil assumptions and creates a short follow-up.
- A reported problem creates an observation follow-up but does not invent a diagnosis.
- Every adjustment remains bounded by the curated species/category profile.

## Weather, location, and offline behavior

Release 1 stores a selected city and coarse coordinates. Precise continuous location is neither required nor collected. Users can change the city manually.

The weather adapter normalizes:

- Daily minimum and maximum temperature.
- Relative humidity.
- Precipitation sum and probability.
- Shortwave radiation or sunshine duration when available.
- Forecast timestamp and freshness.

Open-Meteo is the default development provider because it offers documented geocoding and forecast APIs. Its free access is restricted to qualifying non-commercial use, so production must use an appropriate commercial plan or a contract-compatible replacement through the same adapter. Provider licensing is a release gate, not an assumption.

Weather data is cached by city and day so users in the same city do not trigger per-user fetches. If the provider is unavailable or the cache is stale, the care engine uses Indian seasonal modifiers and labels the task `season-based` rather than `weather-adjusted`.

Firestore persistent local cache supports offline reads and queued writes. The UI shows whether data is pending synchronization. Conflicting edits use append-only events where possible; mutable plant metadata uses last-write-wins plus an audit event.

## Notifications

Release 1 notifications are local device reminders derived from persisted task windows. They contain observation language, not watering commands.

- Users choose a preferred reminder period.
- Permission is requested only after the user creates the first task.
- Denial does not block the app.
- Completing a task reschedules related local reminders.
- The application reconciles notifications at startup and after synchronization.
- Time-zone handling uses the device zone and stores due dates as explicit UTC timestamps plus the originating local date.

Cloud notifications, multi-device deduplication, and server scheduling are Release 3 concerns.

## Rosary integration

The care application and store share Firebase Authentication, allowing the same Google account to be used in both apps. Order linking remains an explicit user action.

The server-side integration:

1. Finds orders belonging to the authenticated UID.
2. Filters using the eligible status allow-list.
3. Maps product IDs through `plantCareProductLinks`.
4. Creates idempotent import suggestions using `orderId + lineItemId` as the key.
5. Issues entitlements only from trusted order state.
6. Reconciles later order changes without deleting user-created plant history.

If an order is cancelled after an import, the plant stays in the garden but loses the verified Rosary provenance and any unearned future entitlement. Already elapsed premium time is not clawed back.

## Error handling and safety

### Unknown species

The user selects a broad category and receives conservative category guidance. The UI labels it as generic and encourages later identification or manual correction.

### Missing or stale weather

The engine uses seasonal rules, displays the fallback, and does not block task completion.

### Authentication or sync failure

Local actions remain available. The UI shows pending state and retries with bounded exponential backoff. Signing out does not erase un-synced local data until the user explicitly confirms removal.

### Duplicate Rosary imports

Import keys are idempotent. The user can reject, merge, or accept suggestions. An accepted purchase is not recreated on every sync.

### Incorrect care outcome

Users can correct an event. The correction is recorded and the care engine recalculates tasks. The application avoids language that implies a guaranteed outcome.

### Health and toxicity safety

Release 1 does not diagnose disease from images. Curated safety warnings can identify known pet/child risks, but the app must advise contacting a veterinarian, poison service, or qualified professional for exposure. Later AI results must show confidence, alternatives, and escalation paths.

## Privacy and security

- Guest data is local until sign-in.
- Exact GPS tracking is not used.
- City and coarse coordinates are private user data.
- Plant photos are private by default.
- Firestore rules enforce UID ownership for all user collections.
- Storage rules enforce UID ownership and file-type/size limits.
- Admin roles use server-issued custom claims.
- Rosary order verification runs server-side.
- App Check is enabled before public production launch.
- Account deletion removes private plant-care data and scheduled storage cleanup handles photos.
- Analytics events exclude plant notes, photo contents, addresses, and exact coordinates.

## Testing strategy

### Unit tests

- Care engine inputs and outputs remain pure and deterministic.
- Seasonal modifiers for representative Indian cities.
- Indoor versus balcony behavior.
- Succulent/cactus dry-check constraints.
- Check-not-needed adaptation and bounds.
- Repotting resets and follow-ups.
- Free-limit and Rosary-plant exemptions.
- Entitlement dates, extension, expiry, and 365-day cap.
- Weather normalization and fallback.

### Contract and security tests

- Firestore emulator tests for public catalogue reads.
- UID isolation for gardens, tasks, events, photos, and imports.
- Client attempts to grant entitlements or Rosary verification are denied.
- Admin-only species publishing and product links.
- Idempotent order import behavior.

### Integration tests

- Guest plant creation followed by Google-account merge.
- Add plant, generate task, complete check, log event, and reschedule.
- Offline completion followed by successful synchronization.
- Weather failure followed by seasonal fallback.
- Eligible order followed by import suggestion and entitlement.
- Cancelled or pending order never grants benefits.

### End-to-end tests

- Mobile PWA onboarding and first plant.
- Today workflow with screen-reader labels and keyboard support.
- Plant-limit boundary.
- Rosary import review.
- Android local-notification permission, scheduling, completion, and reconciliation.
- Installable PWA and offline relaunch.

### Release gates

- All care-engine tests pass.
- Firestore and Storage rule tests pass.
- Production build succeeds independently of the storefront build.
- The existing storefront test and build gates still pass.
- No critical accessibility violations in primary journeys.
- No client path can self-issue a verified Rosary status or paid entitlement.
- Weather provider licensing is valid for the intended production traffic.
- Android smoke test passes on a physical device.

## Success metrics

Release 1 is successful when it proves useful recurring care, not merely downloads.

Primary metrics:

- At least 60% of users who add a plant complete one care check within seven days.
- At least 30% of activated users return in week four.
- At least 50% of generated tasks receive a meaningful outcome rather than being ignored.
- Fewer than 10% of completed watering checks are immediately corrected.
- At least 40% of eligible Rosary customers accept one import suggestion.

Guardrail metrics:

- Notification opt-out rate.
- Task postponement and `not needed` rates by species/category.
- Weather-fallback frequency.
- Sync failure and duplicate-import rates.
- Support reports alleging harmful or overconfident care instructions.

Metrics are launch targets for product evaluation, not guarantees. They can be revised after a documented beta baseline.

## Rollout

1. Seed a curated catalogue from high-confidence Rosary care data and common Indian household plants.
2. Run internal tests with synthetic users and orders.
3. Run a small invite-only beta with Rosary customers and non-customer plant owners.
4. Review task outcomes, corrections, and safety reports.
5. Expand the catalogue only when each profile meets publication checks.
6. Publish the PWA and Android beta.
7. Begin Release 2 only after the core care loop meets quality and retention thresholds.

## Implementation order for Release 1

The implementation plan should sequence the first release as independent vertical slices:

1. Application scaffold, routing, test harness, and PWA shell.
2. Pure care-engine model and tests.
3. Local guest garden and full Today workflow.
4. Firebase authentication, private persistence, and guest merge.
5. Weather adapter and seasonal fallback.
6. Local notifications.
7. Rosary order linking and trusted entitlements.
8. Photo journal and offline synchronization hardening.
9. Security, accessibility, Android, and production smoke gates.

## Final scope statement

The first implementation plan covers Release 1 only. Releases 2 through 4 are documented so that Release 1 creates stable extension points, but they are not bundled into the initial build. This prevents AI, billing, and community complexity from weakening the core promise: helping an Indian plant owner know what to check and do today.
