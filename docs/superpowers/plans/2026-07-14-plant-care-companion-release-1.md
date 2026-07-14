# Plant Care Companion Release 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate India-first React/TypeScript PWA and Capacitor Android application that guides check-first plant care, works locally for guests, syncs signed-in gardens, and grants server-verified Rosary purchase benefits.

**Architecture:** `plant-care-app/` is an independent application with a local-first repository, a pure deterministic care engine, and replaceable adapters for Firebase, weather, and notifications. Firebase Authentication is shared with the storefront; namespaced Firestore data and callable Functions protect Rosary imports and entitlements. The existing root storefront remains an independent build and must retain its current passing tests.

**Tech Stack:** React 19.2.7, TypeScript 7.0.2, Vite 8.1.4, React Router 7.18.1, Firebase Web SDK 12.16.0, IndexedDB via `idb`, Vitest 4.1.10, Testing Library, vite-plugin-pwa 1.3.0, Capacitor 8.4.1, Firebase Functions 7.2.5, Firebase Admin 14.1.0, Node.js 22.

## Global Constraints

- Work only on branch `codex/plant-care-companion`.
- The new app lives under `plant-care-app/` and has its own package, build, tests, PWA manifest, and Capacitor configuration.
- Release 1 supports India only and covers houseplants, succulents, cacti, and balcony plants.
- Android and installable web/PWA are Release 1 surfaces; do not add iOS packaging.
- The free tier allows ten non-Rosary plants, one indoor location, one balcony location, and unlimited verified Rosary plants.
- Do not add paid billing, AI identification, disease diagnosis, household sharing, public community, crops, or sensor integrations.
- Care tasks must ask the user to inspect the plant before acting; never emit unconditional watering instructions.
- The care engine is a pure TypeScript module with no React, Firebase, browser, weather-network, or notification dependency.
- Rosary verification and entitlements are server-written; the client cannot self-issue them.
- Guest data stays local. Cloud sync and Rosary imports require Google sign-in.
- Store city/coarse coordinates only; do not request continuous GPS.
- The existing root commands `npm.cmd test` and `npm.cmd run build` remain release gates.
- Preserve existing untracked `.playwright-*`, `output/`, and screenshot files.
- Use TDD for every behavior change and make one topical commit per task.

---

## Planned file structure

```text
plant-care-app/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  index.html
  capacitor.config.ts
  .env.example
  public/
    icons/
  scripts/
    build-species-catalog.mjs
  src/
    main.tsx
    App.tsx
    app/
      AppShell.tsx
      ErrorBoundary.tsx
      routes.tsx
    domain/
      models.ts
      entitlements.ts
    care/
      careEngine.ts
      season.ts
      profiles.ts
    data/
      species.generated.json
      speciesCatalog.ts
      gardenRepository.ts
      indexedDbGardenRepository.ts
      firebaseGardenSync.ts
    features/
      auth/AuthProvider.tsx
      garden/GardenProvider.tsx
      garden/GardenService.ts
      garden/GardenPage.tsx
      garden/PlantDetailPage.tsx
      garden/AddPlantPage.tsx
      today/TodayPage.tsx
      today/TaskSheet.tsx
      journal/JournalPage.tsx
      profile/ProfilePage.tsx
      rosary/RosaryImportsPage.tsx
    integrations/
      firebase.ts
      weather/WeatherProvider.ts
      weather/openMeteoProvider.ts
      weather/seasonalFallback.ts
      notifications/NotificationScheduler.ts
      notifications/capacitorNotificationScheduler.ts
      rosary/rosaryFunctions.ts
    styles/
      tokens.css
      app.css
    test/
      setup.ts
  e2e/
    care-loop.spec.ts
  playwright.config.ts
  README.md
functions/
  package.json
  tsconfig.json
  src/
    index.ts
    rosaryBenefits.ts
  test/
    rosaryBenefits.test.ts
storage.rules
```

The application may add small focused test files beside their source modules. Avoid central files that combine unrelated care, persistence, and UI responsibilities.

---

### Task 1: Independent application shell and curated catalogue

**Files:**
- Create: `plant-care-app/package.json`
- Create: `plant-care-app/tsconfig.json`
- Create: `plant-care-app/vite.config.ts`
- Create: `plant-care-app/index.html`
- Create: `plant-care-app/src/main.tsx`
- Create: `plant-care-app/src/App.tsx`
- Create: `plant-care-app/src/app/AppShell.tsx`
- Create: `plant-care-app/src/app/routes.tsx`
- Create: `plant-care-app/src/styles/tokens.css`
- Create: `plant-care-app/src/styles/app.css`
- Create: `plant-care-app/scripts/build-species-catalog.mjs`
- Create: `plant-care-app/src/data/speciesCatalog.ts`
- Create: `plant-care-app/src/data/species.generated.json`
- Test: `plant-care-app/scripts/build-species-catalog.test.mjs`
- Test: `plant-care-app/src/App.test.tsx`

**Interfaces:**
- Consumes: root `src/data/products.json` as build input only.
- Produces: `getPublishedSpecies(): PlantSpeciesProfile[]`, `searchSpecies(query: string): PlantSpeciesProfile[]`, installable PWA shell, and bottom navigation routes.

- [ ] **Step 1: Add a failing catalogue-generation test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpeciesCatalog } from './build-species-catalog.mjs';

test('publishes only verified care profiles with stable IDs', () => {
  const result = buildSpeciesCatalog([
    { id: '1', identityVerified: true, seoStatus: 'published', careGuide: { plantName: 'Aloe vera', plantType: 'Succulent', watering: 'Dry well' } },
    { id: '2', identityVerified: false, seoStatus: 'published', careGuide: { plantName: 'Unknown' } },
  ]);
  assert.deepEqual(result.map(({ id, name, category }) => ({ id, name, category })), [
    { id: 'rph-1', name: 'Aloe vera', category: 'succulent' },
  ]);
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `node --test plant-care-app/scripts/build-species-catalog.test.mjs`

Expected: FAIL because `build-species-catalog.mjs` does not exist.

- [ ] **Step 3: Create the package and catalogue generator**

Use this package contract:

```json
{
  "name": "rosary-plant-care",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "catalog": "node scripts/build-species-catalog.mjs",
    "dev": "npm run catalog && vite",
    "prebuild": "npm run catalog",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "android:sync": "npm run build && cap sync android",
    "android:debug": "npm run android:sync && cd android && gradlew.bat --no-daemon --console=plain assembleDebug"
  }
}
```

Implement `buildSpeciesCatalog(products)` to filter `identityVerified === true`, `seoStatus === 'published'`, and a non-empty `careGuide.plantName`; map each row to `rph-${id}` and normalize `plantType/siteCategory` into `houseplant | succulent | cactus | balcony`.

- [ ] **Step 4: Generate the catalogue and verify it is deterministic**

Run: `node plant-care-app/scripts/build-species-catalog.mjs`

Expected: writes sorted `plant-care-app/src/data/species.generated.json` and reports a non-zero profile count.

- [ ] **Step 5: Build the app shell with accessible navigation**

Use routes `/today`, `/garden`, `/add`, `/journal`, `/profile`, and `/plants/:plantId`. The root redirects to `/today`. `AppShell` renders a skip link, `<main id="main-content">`, and a five-item bottom navigation. The visual direction uses warm off-white surfaces, deep forest text, moss accents, terracotta highlights, rounded cards, and botanical line details without emoji icons.

- [ ] **Step 6: Add the shell test**

```tsx
it('renders the care promise and five primary destinations', () => {
  render(<MemoryRouter initialEntries={['/today']}><App /></MemoryRouter>);
  expect(screen.getByText(/know what each plant needs today/i)).toBeVisible();
  for (const label of ['Today', 'My Garden', 'Add', 'Journal', 'Profile']) {
    expect(screen.getByRole('link', { name: label })).toBeVisible();
  }
});
```

- [ ] **Step 7: Install dependencies, test, and build**

Run: `npm.cmd install` in `plant-care-app/`.

Run: `npm.cmd test` in `plant-care-app/`.

Run: `npm.cmd run build` in `plant-care-app/`.

Expected: catalogue test and shell test PASS; `dist/` is generated.

- [ ] **Step 8: Commit**

```powershell
git add plant-care-app
git commit -m "feat: scaffold plant care companion"
```

---

### Task 2: Pure check-first care engine

**Files:**
- Create: `plant-care-app/src/domain/models.ts`
- Create: `plant-care-app/src/care/season.ts`
- Create: `plant-care-app/src/care/profiles.ts`
- Create: `plant-care-app/src/care/careEngine.ts`
- Test: `plant-care-app/src/care/season.test.ts`
- Test: `plant-care-app/src/care/careEngine.test.ts`

**Interfaces:**
- Consumes: `PlantSpeciesProfile`, `UserPlant`, `GrowingLocation`, `CareEvent`, `WeatherSnapshot`.
- Produces: `getIndianSeason(date: Date, zone: IndiaClimateZone): IndiaSeason`, `generateCareTasks(input: CareEngineInput): CareTaskDraft[]`, `rescheduleAfterOutcome(input: OutcomeInput): CareTaskDraft[]`.

- [ ] **Step 1: Define domain types and failing care tests**

```ts
export type PlantCategory = 'houseplant' | 'succulent' | 'cactus' | 'balcony';
export type IndiaSeason = 'summer' | 'monsoon' | 'post-monsoon' | 'winter';
export type CareAction = 'water-check' | 'fertilize' | 'rotate' | 'prune' | 'clean' | 'repot';
export type TaskOutcome = 'completed' | 'not-needed' | 'postponed' | 'problem-noted';

export interface CareTaskDraft {
  action: CareAction;
  earliestAt: string;
  latestAt: string;
  prompt: string;
  explanation: string;
  source: 'weather-adjusted' | 'season-based';
  priority: 'low' | 'normal' | 'high';
}
```

Tests must assert:

```ts
expect(task.prompt).toMatch(/check/i);
expect(task.prompt).not.toMatch(/^water\b/i);
expect(succulent.latestAt).toBeAfter(houseplant.latestAt);
expect(monsoonBalcony.explanation).toMatch(/rain|monsoon/i);
expect(noWeather.source).toBe('season-based');
```

- [ ] **Step 2: Run tests and verify failures**

Run: `npm.cmd test -- src/care/season.test.ts src/care/careEngine.test.ts`

Expected: FAIL with missing exported functions.

- [ ] **Step 3: Implement season mapping and bounded intervals**

`getIndianSeason` uses explicit month ranges per `north | south | humid-coastal | dry-interior | hill`. `profiles.ts` supplies conservative category fallbacks. All intervals use whole days and clamp to profile minimum/maximum values.

- [ ] **Step 4: Implement observation-driven watering tasks**

`generateCareTasks` must:

```ts
const prompt = category === 'cactus' || category === 'succulent'
  ? 'Check that the mix is dry well below the surface and the pot feels light. Water only if both checks pass.'
  : 'Check the top 3 cm of soil and the plant\'s leaves. Water only if the soil is dry for this plant.';
```

Weather may shorten or lengthen the check interval by at most 30%. Balcony precipitation applies only to exposed balcony locations. Humidity changes the check window but never claims the plant received water.

- [ ] **Step 5: Implement outcome adaptation**

`not-needed` postpones within the profile bounds, `completed` schedules the next normal check, `postponed` adds one day, and `problem-noted` creates a high-priority observation follow-up without a diagnosis.

- [ ] **Step 6: Run tests**

Run: `npm.cmd test -- src/care`

Expected: all season, category, weather, and outcome tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add plant-care-app/src/domain plant-care-app/src/care
git commit -m "feat: add adaptive check-first care engine"
```

---

### Task 3: Local-first guest garden and complete Today workflow

**Files:**
- Create: `plant-care-app/src/data/gardenRepository.ts`
- Create: `plant-care-app/src/data/indexedDbGardenRepository.ts`
- Create: `plant-care-app/src/features/garden/GardenService.ts`
- Create: `plant-care-app/src/features/garden/GardenProvider.tsx`
- Create: `plant-care-app/src/features/garden/GardenPage.tsx`
- Create: `plant-care-app/src/features/garden/AddPlantPage.tsx`
- Create: `plant-care-app/src/features/garden/PlantDetailPage.tsx`
- Create: `plant-care-app/src/features/today/TodayPage.tsx`
- Create: `plant-care-app/src/features/today/TaskSheet.tsx`
- Test: `plant-care-app/src/features/garden/GardenService.test.ts`
- Test: `plant-care-app/src/features/today/TodayPage.test.tsx`

**Interfaces:**
- Consumes: care-engine functions from Task 2 and catalogue functions from Task 1.
- Produces: `GardenRepository`, `GardenService.addPlant`, `GardenService.completeTask`, `GardenProvider`, `useGarden()`.

- [ ] **Step 1: Write failing service tests**

```ts
it('adds a plant, appends plant_created, and creates a first water check', async () => {
  const plant = await service.addPlant(input);
  expect((await repo.listPlants())).toContainEqual(expect.objectContaining({ id: plant.id }));
  expect((await repo.listEvents(plant.id))[0].type).toBe('plant_created');
  expect((await repo.listTasks()).some(task => task.action === 'water-check')).toBe(true);
});

it('records not-needed and reschedules instead of marking watered', async () => {
  await service.completeTask(task.id, 'not-needed');
  expect((await repo.listEvents(task.plantId)).at(-1)?.type).toBe('checked_not_needed');
  expect((await repo.listTasks()).some(next => next.status === 'open')).toBe(true);
});
```

- [ ] **Step 2: Run service tests and verify failure**

Run: `npm.cmd test -- src/features/garden/GardenService.test.ts`

Expected: FAIL because repository and service do not exist.

- [ ] **Step 3: Implement repository contract and IndexedDB adapter**

```ts
export interface GardenRepository {
  listLocations(): Promise<GrowingLocation[]>;
  saveLocation(location: GrowingLocation): Promise<void>;
  listPlants(): Promise<UserPlant[]>;
  getPlant(id: string): Promise<UserPlant | undefined>;
  savePlant(plant: UserPlant): Promise<void>;
  listTasks(): Promise<CareTask[]>;
  saveTask(task: CareTask): Promise<void>;
  listEvents(plantId?: string): Promise<CareEvent[]>;
  appendEvent(event: CareEvent): Promise<void>;
  clearGuestData(): Promise<void>;
}
```

IndexedDB database name is `rosary-plant-care`; object stores are `locations`, `plants`, `tasks`, `events`, and `photos`. Tests use an in-memory fake implementing the same interface.

- [ ] **Step 4: Implement GardenService**

`addPlant` enforces at most one indoor and one balcony location plus ten non-Rosary plants, creates immutable events, and persists generated tasks. `completeTask` closes the task, appends the mapped event, calls `rescheduleAfterOutcome`, and saves replacement tasks.

- [ ] **Step 5: Write and run UI tests**

```tsx
expect(screen.getByRole('heading', { name: 'Today' })).toBeVisible();
expect(screen.getByText(/check the top 3 cm/i)).toBeVisible();
await user.click(screen.getByRole('button', { name: /soil is still moist/i }));
expect(await screen.findByText(/next check/i)).toBeVisible();
```

Run: `npm.cmd test -- src/features/garden src/features/today`

Expected: PASS.

- [ ] **Step 6: Verify the first complete local journey in the browser**

Run: `npm.cmd run dev -- --host 127.0.0.1 --port 5176` in `plant-care-app/`.

Verify: create a location, add a catalogue plant, open Today, choose `Soil is still moist`, and confirm a later check appears after reload.

- [ ] **Step 7: Commit**

```powershell
git add plant-care-app/src/data plant-care-app/src/features
git commit -m "feat: add local-first garden care loop"
```

---

### Task 4: Google authentication, private Firestore sync, and guest merge

**Files:**
- Create: `plant-care-app/.env.example`
- Create: `plant-care-app/src/integrations/firebase.ts`
- Create: `plant-care-app/src/features/auth/AuthProvider.tsx`
- Create: `plant-care-app/src/data/firebaseGardenSync.ts`
- Modify: `plant-care-app/src/features/garden/GardenProvider.tsx`
- Modify: `firestore.rules`
- Test: `plant-care-app/src/data/firebaseGardenSync.test.ts`
- Test: `plant-care-app/src/features/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `GardenRepository`, Firebase environment variables shared with the storefront.
- Produces: `AuthState`, `signInWithGoogle()`, `signOut()`, `mergeGuestGarden(uid, repository)`, `startGardenSync(uid, repository)`.

- [ ] **Step 1: Write failing merge tests**

```ts
it('keeps local and remote plants and does not duplicate stable IDs', async () => {
  const result = mergeRecords(
    [{ id: 'local-1', updatedAt: '2026-07-14T10:00:00Z' }],
    [{ id: 'remote-1', updatedAt: '2026-07-14T11:00:00Z' }],
  );
  expect(result.map(item => item.id)).toEqual(['local-1', 'remote-1']);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm.cmd test -- src/data/firebaseGardenSync.test.ts src/features/auth/AuthProvider.test.tsx`

Expected: FAIL with missing sync/auth modules.

- [ ] **Step 3: Implement Firebase initialization and sign-in**

Use the six existing `VITE_FIREBASE_*` variables. Web uses popup-first with redirect fallback. Native uses `@capacitor-firebase/authentication` with `skipNativeAuth: true`, then exchanges the Google ID/access token for a Firebase JS credential, matching the proven storefront integration.

- [ ] **Step 4: Implement local-first synchronization**

Signed-in data paths are `plantAppUsers/{uid}/locations`, `/plants`, `/tasks`, and `/plants/{plantId}/events`. Merge by stable ID; for mutable records choose the later `updatedAt`; events are append-only. Enable persistent Firestore cache and expose `syncState: 'local' | 'syncing' | 'synced' | 'error'`.

- [ ] **Step 5: Add private Firestore rules**

```text
match /plantAppUsers/{uid} {
  allow read, write: if isSignedIn() && request.auth.uid == uid;
  match /{document=**} {
    allow read, write: if isSignedIn() && request.auth.uid == uid;
  }
}
```

Later Task 7 narrows `rosaryImports` and `entitlements` to server-only writes.

- [ ] **Step 6: Run tests and build**

Run: `npm.cmd test -- src/data src/features/auth`

Run: `npm.cmd run build`

Expected: guest merge, auth fallback, and build PASS without requiring real credentials.

- [ ] **Step 7: Commit**

```powershell
git add plant-care-app firestore.rules
git commit -m "feat: sync signed-in plant gardens"
```

---

### Task 5: India weather adapter and seasonal fallback

**Files:**
- Create: `plant-care-app/src/integrations/weather/WeatherProvider.ts`
- Create: `plant-care-app/src/integrations/weather/openMeteoProvider.ts`
- Create: `plant-care-app/src/integrations/weather/seasonalFallback.ts`
- Create: `plant-care-app/src/integrations/weather/weatherCache.ts`
- Modify: `plant-care-app/src/features/garden/GardenService.ts`
- Modify: `plant-care-app/src/features/today/TodayPage.tsx`
- Test: `plant-care-app/src/integrations/weather/openMeteoProvider.test.ts`
- Test: `plant-care-app/src/integrations/weather/weatherCache.test.ts`

**Interfaces:**
- Consumes: selected city/coarse coordinates and care engine `WeatherSnapshot`.
- Produces: `WeatherProvider.searchIndianCities`, `WeatherProvider.getDailyWeather`, cached snapshots, and explicit fallback state.

- [ ] **Step 1: Write failing normalization and fallback tests**

```ts
expect(normalizeForecast(apiResponse)).toEqual(expect.objectContaining({
  source: 'open-meteo',
  precipitationMm: 12,
  fetchedAt: expect.any(String),
}));

await expect(provider.getDailyWeather(city)).resolves.toEqual(expect.objectContaining({
  availability: 'seasonal-fallback',
}));
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm.cmd test -- src/integrations/weather`

Expected: FAIL because provider modules do not exist.

- [ ] **Step 3: Implement the adapter**

Use Open-Meteo geocoding with `countryCode=IN`. Normalize daily min/max temperature, humidity, precipitation, precipitation probability, and sunshine/shortwave data. Wrap all fetches with an eight-second timeout. Do not expose provider-specific response shapes outside the adapter.

- [ ] **Step 4: Add city/day caching and graceful fallback**

Cache keys are `weather:${cityId}:${YYYY-MM-DD}` with a six-hour TTL. On timeout, non-2xx, invalid JSON, or stale data, return seasonal fallback rather than throwing into the care UI. Today shows `Weather adjusted` or `Season based` beside each explanation.

- [ ] **Step 5: Run tests and verify tasks adapt**

Run: `npm.cmd test -- src/integrations/weather src/care`

Expected: provider and fallback tests PASS; care-engine tests remain deterministic.

- [ ] **Step 6: Commit**

```powershell
git add plant-care-app/src/integrations/weather plant-care-app/src/features plant-care-app/src/care
git commit -m "feat: adapt care checks to Indian weather"
```

---

### Task 6: Local notifications, PWA installation, and Android shell

**Files:**
- Create: `plant-care-app/src/integrations/notifications/NotificationScheduler.ts`
- Create: `plant-care-app/src/integrations/notifications/capacitorNotificationScheduler.ts`
- Create: `plant-care-app/src/integrations/notifications/webNotificationScheduler.ts`
- Create: `plant-care-app/capacitor.config.ts`
- Modify: `plant-care-app/vite.config.ts`
- Modify: `plant-care-app/src/features/profile/ProfilePage.tsx`
- Test: `plant-care-app/src/integrations/notifications/NotificationScheduler.test.ts`

**Interfaces:**
- Consumes: open `CareTask[]` and preferred local reminder hour.
- Produces: `requestPermissionAfterFirstTask()`, `reconcileNotifications(tasks)`, `cancelTaskNotification(taskId)`.

- [ ] **Step 1: Write failing scheduler tests**

```ts
it('uses inspection copy and stable notification IDs', async () => {
  await reconcileNotifications([task], fakeDriver);
  expect(fakeDriver.scheduled[0]).toEqual(expect.objectContaining({
    id: stableNotificationId(task.id),
    title: 'Time to check Aloe vera',
    body: expect.stringMatching(/check/i),
  }));
  expect(fakeDriver.scheduled[0].body).not.toMatch(/^water\b/i);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm.cmd test -- src/integrations/notifications`

Expected: FAIL with missing scheduler.

- [ ] **Step 3: Implement driver-based scheduling**

The domain scheduler accepts a driver with `permission`, `requestPermission`, `schedule`, and `cancel`. Capacitor uses `@capacitor/local-notifications`; web uses the Notifications API when supported. Denial returns `disabled` and never blocks garden operations.

- [ ] **Step 4: Configure PWA and Capacitor**

PWA manifest name is `Rosary Plant Care`, short name `Plant Care`, theme color `#244b3a`, background `#f5f1e8`, display `standalone`, and start URL `/`. Capacitor app ID is `com.rosaryplants.care`; app name is `Rosary Plant Care`; `webDir` is `dist`.

- [ ] **Step 5: Generate and sync Android project**

Run: `npx.cmd cap add android` in `plant-care-app/`.

Run: `npm.cmd run android:sync` in `plant-care-app/`.

Expected: Android project exists and web assets sync. Keep `android/app/google-services.json` local-only and provide an example file/documentation if native Google sign-in is enabled.

- [ ] **Step 6: Run unit tests and Android debug build**

Run: `npm.cmd test -- src/integrations/notifications`

Run: `npm.cmd run android:debug`

Expected: notification tests PASS and `android/app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 7: Commit**

```powershell
git add plant-care-app
git commit -m "feat: add installable care reminders"
```

---

### Task 7: Server-verified Rosary imports and entitlements

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/index.ts`
- Create: `functions/src/rosaryBenefits.ts`
- Create: `functions/test/rosaryBenefits.test.ts`
- Create: `plant-care-app/src/integrations/rosary/rosaryFunctions.ts`
- Create: `plant-care-app/src/features/rosary/RosaryImportsPage.tsx`
- Create: `plant-care-app/src/domain/entitlements.ts`
- Modify: `plant-care-app/src/features/profile/ProfilePage.tsx`
- Modify: `firestore.rules`
- Modify: `firebase.json`
- Test: `plant-care-app/src/domain/entitlements.test.ts`

**Interfaces:**
- Consumes: authenticated UID, `orders`, `plantCareProductLinks`, and user garden collections.
- Produces: callable `syncRosaryBenefits`, callable `acceptRosaryImport`, `getPlanAccess(entitlements, now)`.

- [ ] **Step 1: Write failing pure benefit tests**

```ts
it('creates imports only for eligible mapped items', () => {
  expect(buildImportSuggestions(orders, links)).toEqual([
    expect.objectContaining({ id: 'order-1_0', speciesId: 'rph-1', status: 'available' }),
  ]);
});

it('grants ninety days for delivered orders and caps future balance at 365 days', () => {
  expect(buildEntitlement(deliveredOrder, existing, now).expiresAt)
    .toEqual(addDays(now, 365));
});
```

- [ ] **Step 2: Run tests and verify missing implementations**

Run: `npm.cmd test` in `functions/`.

Run: `npm.cmd test -- src/domain/entitlements.test.ts` in `plant-care-app/`.

Expected: FAIL before benefit functions exist.

- [ ] **Step 3: Implement callable sync**

`syncRosaryBenefits` requires `request.auth.uid`, queries `orders` where `customer.userId == uid`, accepts statuses `confirmed | processing | shipped | delivered | completed`, reads product mappings, and upserts idempotent imports keyed by `${orderId}_${lineIndex}`. Only `delivered | completed` grant a ninety-day entitlement. Use `updatedAt` as the delivery transition time in the current order schema.

- [ ] **Step 4: Implement callable import acceptance**

`acceptRosaryImport({ importId, locationId })` validates ownership, available status, product mapping, and location; then creates a verified plant plus `plant_created` event and first care task. The transaction marks the import accepted. Calling it twice returns the existing plant ID.

- [ ] **Step 5: Narrow security rules**

```text
match /plantAppUsers/{uid}/rosaryImports/{importId} {
  allow read: if isSignedIn() && request.auth.uid == uid;
  allow write: if false;
}
match /plantAppUsers/{uid}/entitlements/{entitlementId} {
  allow read: if isSignedIn() && request.auth.uid == uid;
  allow write: if false;
}
```

User-created plant writes must reject `provenance.kind == 'rosary'`; only Admin SDK writes from `acceptRosaryImport` can create that provenance.

- [ ] **Step 6: Configure Functions and emulator tests**

Add `functions.source = "functions"` to `firebase.json` and emulator ports for Functions and Firestore. Tests use Firebase Admin against an isolated emulator project; never contact production.

- [ ] **Step 7: Run benefit, app, and storefront tests**

Run: `npm.cmd test` in `functions/`.

Run: `npm.cmd test -- src/domain/entitlements.test.ts src/features/rosary` in `plant-care-app/`.

Run: `npm.cmd test` at repository root.

Expected: benefit tests PASS and all 142+ storefront tests remain green.

- [ ] **Step 8: Commit**

```powershell
git add functions firebase.json firestore.rules plant-care-app
git commit -m "feat: link verified Rosary plant benefits"
```

---

### Task 8: Private photo journal and offline synchronization hardening

**Files:**
- Create: `storage.rules`
- Create: `plant-care-app/src/features/journal/JournalPage.tsx`
- Create: `plant-care-app/src/features/journal/photoService.ts`
- Create: `plant-care-app/src/features/journal/imageCompression.ts`
- Create: `plant-care-app/src/features/journal/JournalPage.test.tsx`
- Create: `plant-care-app/src/features/journal/photoService.test.ts`
- Modify: `plant-care-app/src/data/indexedDbGardenRepository.ts`
- Modify: `plant-care-app/src/data/firebaseGardenSync.ts`
- Modify: `plant-care-app/src/features/garden/PlantDetailPage.tsx`
- Modify: `firebase.json`

**Interfaces:**
- Consumes: plant ID, selected image, authenticated UID when present.
- Produces: `compressPlantPhoto(file): Promise<Blob>`, `savePlantPhoto(input): Promise<CareEvent>`, private Storage objects and offline local photo records.

- [ ] **Step 1: Write failing compression and journal tests**

```ts
expect(await compressPlantPhoto(largeJpeg)).toEqual(expect.objectContaining({
  type: 'image/webp',
}));
expect(result.size).toBeLessThanOrEqual(1_500_000);
expect(screen.getByRole('button', { name: /add progress photo/i })).toBeVisible();
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm.cmd test -- src/features/journal`

Expected: FAIL with missing journal modules.

- [ ] **Step 3: Implement compression and guest photo storage**

Resize the longest edge to 1600 pixels and encode WebP at 0.82 quality. Reject non-image files and source files larger than 15 MB. Guests store blobs in IndexedDB; signed-in uploads use `plantAppUsers/{uid}/plants/{plantId}/{photoId}.webp`.

- [ ] **Step 4: Add private Storage rules**

```text
match /plantAppUsers/{uid}/plants/{plantId}/{fileName} {
  allow read, write: if request.auth != null
    && request.auth.uid == uid
    && request.resource.size < 2 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

Configure `storage.rules` in `firebase.json`. Firestore stores Storage paths, not permanently public download URLs.

- [ ] **Step 5: Harden sync state and retry behavior**

Persist pending operation records with attempt count, last error code, and `nextAttemptAt`. Retry network failures with bounded exponential backoff up to five minutes. Permission errors stop automatic retries and surface an actionable message. Never erase unsynced guest data on sign-out without explicit confirmation.

- [ ] **Step 6: Run tests and offline browser smoke**

Run: `npm.cmd test -- src/features/journal src/data`

Browser smoke: add a photo, disable network, complete a task, reload, confirm both remain visible, re-enable network, and confirm sync state becomes `synced`.

- [ ] **Step 7: Commit**

```powershell
git add storage.rules firebase.json plant-care-app/src
git commit -m "feat: add private plant progress journal"
```

---

### Task 9: Security, accessibility, documentation, and release verification

**Files:**
- Create: `plant-care-app/playwright.config.ts`
- Create: `plant-care-app/e2e/care-loop.spec.ts`
- Create: `plant-care-app/README.md`
- Create: `plant-care-app/android/app/google-services.example.json`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-14-plant-care-companion-design.md`
- Test: `plant-care-app/e2e/care-loop.spec.ts`

**Interfaces:**
- Consumes: completed Release 1 application.
- Produces: reproducible build/test instructions, environment contract, Android smoke path, and a verified end-to-end care loop.

- [ ] **Step 1: Add end-to-end care-loop test**

```ts
test('guest completes a check-first care loop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Add' }).click();
  await page.getByRole('textbox', { name: /search plants/i }).fill('Sempervivum');
  await page.getByRole('button', { name: /add sempervivum/i }).click();
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByText(/check.*soil/i)).toBeVisible();
  await page.getByRole('button', { name: /soil is still moist/i }).click();
  await expect(page.getByText(/next check/i)).toBeVisible();
});
```

- [ ] **Step 2: Run E2E and fix only Release 1 failures**

Run: `npm.cmd run e2e` in `plant-care-app/`.

Expected: guest care loop PASS at a mobile viewport and desktop Chromium.

- [ ] **Step 3: Document setup and operational boundaries**

`plant-care-app/README.md` must include: independent install/build commands, Firebase env variables, guest versus signed-in behavior, catalogue generation, local weather licensing warning, Functions emulator commands, PWA preview, Android prerequisites, local-only `google-services.json`, and Release 1 exclusions.

- [ ] **Step 4: Run static safety scans**

Run: `rg -n "Water now|guarantee|diagnos|pesticide|AIza|sk-" plant-care-app functions storage.rules firestore.rules`

Expected: no unconditional watering copy, no Release 2 diagnosis UI, and no committed credentials. Legitimate design/test language must be reviewed manually.

- [ ] **Step 5: Run complete verification**

Run in `plant-care-app/`:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run e2e
npm.cmd audit --omit=dev
```

Run in `functions/`:

```powershell
npm.cmd test
npm.cmd run build
```

Run at repository root:

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Expected: all feature tests, Functions tests, E2E tests, independent builds, 142+ storefront tests, and diff checks PASS. Report dependency-audit findings rather than applying breaking automatic fixes.

- [ ] **Step 6: Build and inspect Android APK**

Run: `npm.cmd run android:debug` in `plant-care-app/`.

Verify: APK exists, installs on a physical Android device, launches offline, creates a guest plant, schedules an inspection reminder after permission, and retains the plant after process restart.

- [ ] **Step 7: Commit final Release 1 verification**

```powershell
git add .gitignore README.md docs plant-care-app functions firebase.json firestore.rules storage.rules
git commit -m "docs: verify plant care release one"
```

---

## Completion criteria

Release 1 is complete only when:

- The new application is independently installable and buildable.
- A guest can add a plant, receive an inspection task, log an outcome, and see a rescheduled check after reload.
- A signed-in user can merge guest data and synchronize private garden data.
- Missing weather falls back to labeled seasonal guidance.
- Notification denial does not block care.
- Verified Rosary status and entitlements cannot be created by client writes.
- Eligible Rosary orders produce idempotent imports; pending/cancelled orders do not.
- Photos are private and offline changes survive a reload.
- PWA, Android debug, Functions, and storefront verification gates pass.
- No existing untracked browser/output artifacts are added to commits.
