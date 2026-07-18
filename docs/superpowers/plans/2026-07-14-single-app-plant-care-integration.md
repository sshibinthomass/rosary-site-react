# Single-App Plant Care Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the completed Plant Care feature into the existing Rosary Plant House React, PWA, and Capacitor application so customers install and use one app.

**Architecture:** The root Vite application owns routing, authentication, Firebase initialization, global navigation, PWA installation, and Android packaging. Tested care modules move beneath `src/features/plantCare/`; a scoped provider bridges them to the existing Rosary user and Firebase services. The independent `plant-care-app/` runtime is removed only after equivalent root tests and browser flows pass.

**Tech Stack:** React 19, React Router 7, TypeScript 7 for the care boundary, Vite 7, Tailwind CSS 4, Firebase 12, IndexedDB via `idb`, Vitest 4, Testing Library, vite-plugin-pwa, Playwright, Capacitor 8, and Firebase Functions 7.

## Global constraints

- Keep the root Android package ID `com.rosaryplants.app` and app name `Rosary Plants`.
- Expose Plant Care publicly under `/care/*`; authentication is optional until cloud sync or Rosary benefits are requested.
- Use the existing root `AuthProvider`, Firebase app, Firestore, Storage, and Google sign-in flow.
- Preserve Firestore paths beneath `plantAppUsers/{uid}` and the existing Functions API.
- Mobile global navigation must be Home, Shop, Plant Care, Cart, Account.
- Wishlist must remain available from Account and the side menu.
- Do not add a second fixed navigation bar inside Plant Care.
- Scope migrated care CSS beneath `.plant-care-surface`.
- Preserve the check-first care language and never issue unconditional watering instructions.
- Do not remove `plant-care-app/` until root unit, build, and browser equivalents pass.
- Never stage existing `.playwright-cli/`, `.playwright-mcp/`, `output/`, or screenshot artifacts.

---

### Task 1: Root care toolchain and verified catalogue

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.js`
- Create: `tsconfig.care.json`
- Create: `src/features/plantCare/test/setup.ts`
- Create: `scripts/plant-care/build-species-catalog.mjs`
- Create: `scripts/plant-care/build-species-catalog.test.mjs`
- Create: `src/features/plantCare/data/speciesCatalog.ts`
- Create: `src/features/plantCare/data/species.generated.json`
- Create: `src/features/plantCare/domain/models.ts`
- Create: `src/features/plantCare/domain/entitlements.ts`
- Create: `src/features/plantCare/domain/entitlements.test.ts`
- Create: `src/features/plantCare/care/careEngine.ts`
- Create: `src/features/plantCare/care/careEngine.test.ts`
- Create: `src/features/plantCare/care/profiles.ts`
- Create: `src/features/plantCare/care/season.ts`
- Create: `src/features/plantCare/care/season.test.ts`

**Interfaces:**
- Consumes: verified `src/data/products.json`.
- Produces: `SpeciesProfile`, `PlantCategory`, `generateCareTasks(input)`, `rescheduleAfterOutcome(input)`, `getIndianSeason(date, zone)`, and `getPlanAccess(entitlement, now)`.

- [ ] **Step 1: Add failing root catalogue and care test commands**

Update scripts and dependencies so root commands are explicit:

```json
{
  "scripts": {
    "catalog:care": "node scripts/plant-care/build-species-catalog.mjs",
    "test:care-catalog": "node --test scripts/plant-care/build-species-catalog.test.mjs",
    "test:care": "vitest run --config vite.config.js",
    "typecheck:care": "tsc -p tsconfig.care.json --noEmit"
  },
  "dependencies": {
    "@capacitor/local-notifications": "^8.2.0",
    "idb": "^8.0.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "fake-indexeddb": "^6.2.5",
    "jsdom": "^29.1.1",
    "typescript": "^7.0.2",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^4.1.10"
  }
}
```

Run: `npm.cmd install`

- [ ] **Step 2: Configure care-only type-checking and Vitest**

Create `tsconfig.care.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src/features/plantCare/**/*.ts", "src/features/plantCare/**/*.tsx"]
}
```

Extend `vite.config.js` with a `test` block that includes only `src/features/plantCare/**/*.test.{ts,tsx}`, uses `jsdom`, and loads `src/features/plantCare/test/setup.ts`.

- [ ] **Step 3: Run missing-module tests to verify red state**

Run: `npm.cmd run test:care-catalog`

Expected: FAIL because the root catalogue builder does not exist.

Run: `npm.cmd run test:care`

Expected: FAIL because the migrated care tests do not exist or cannot resolve modules.

- [ ] **Step 4: Move the tested pure modules and catalogue builder**

Copy the tested implementations from `plant-care-app/src/{care,domain,data/speciesCatalog.ts}` and `plant-care-app/scripts/build-species-catalog*` into the paths above. Change the catalogue builder output to:

```js
const outputPath = resolve(repoRoot, 'src/features/plantCare/data/species.generated.json');
```

Keep stable IDs in the form `rph-${product.id}` and include only published, identity-verified products with care metadata.

- [ ] **Step 5: Run green domain gates**

Run: `npm.cmd run test:care-catalog`

Expected: 2 tests PASS and 313 profiles generated.

Run: `npm.cmd run test:care`

Expected: care engine, season, and entitlement tests PASS.

Run: `npm.cmd run typecheck:care`

Expected: exit 0.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json vite.config.js tsconfig.care.json scripts/plant-care src/features/plantCare/care src/features/plantCare/data src/features/plantCare/domain src/features/plantCare/test
git commit -m "feat: move plant care core into Rosary app"
```

---

### Task 2: Local garden provider and shared Rosary authentication

**Files:**
- Create: `src/features/plantCare/data/gardenRepository.ts`
- Create: `src/features/plantCare/data/indexedDbGardenRepository.ts`
- Create: `src/features/plantCare/data/firebaseGardenSync.ts`
- Create: `src/features/plantCare/data/firebaseGardenSync.test.ts`
- Create: `src/features/plantCare/data/syncRetryQueue.ts`
- Create: `src/features/plantCare/data/syncRetryQueue.test.ts`
- Create: `src/features/plantCare/integrations/firebase.ts`
- Create: `src/features/plantCare/PlantCareProvider.tsx`
- Create: `src/features/plantCare/services/GardenService.ts`
- Create: `src/features/plantCare/services/GardenService.test.ts`

**Interfaces:**
- Consumes: root `useAuth()`, `db`, `storage`, care engine, and domain models.
- Produces: `usePlantCare()` with locations, plants, tasks, events, photos, sync state, `addLocation`, `addPlant`, `completeTask`, and `addPhoto`.

- [ ] **Step 1: Write the failing shared-auth provider test**

Add a provider test proving the root user is passed to sync without a second auth listener:

```tsx
it('starts care sync for the existing Rosary user', async () => {
  render(<PlantCareProvider repository={repository} user={{ uid: 'u1' } as User}><Probe /></PlantCareProvider>);
  expect(await screen.findByText('synced')).toBeVisible();
  expect(startGardenSync).toHaveBeenCalledWith('u1', repository, expect.any(Function));
});
```

- [ ] **Step 2: Run provider tests to verify red state**

Run: `npm.cmd run test:care -- src/features/plantCare/PlantCareProvider.test.tsx`

Expected: FAIL because `PlantCareProvider` is missing.

- [ ] **Step 3: Move repository, sync, retry, and GardenService implementations**

Copy the tested modules from the standalone source. Replace standalone Firebase initialization with this adapter:

```ts
import app, { db } from '../../../config/firebase';
import { storage } from '../../../config/firebaseStorage';

export function getPlantCareApp() { return app; }
export function getPlantCareDb() { return db; }
export function getPlantCareStorage() { return storage; }
```

Where Firebase functions expect callable access, import the root Firebase app default from `src/config/firebase.js` and call `getFunctions(app, 'asia-south1')`.

- [ ] **Step 4: Implement one provider with an injected root user**

Use this public boundary:

```ts
export interface PlantCareProviderProps extends PropsWithChildren {
  user: User | null;
  repository?: GardenRepository;
  weatherProvider?: WeatherProvider | null;
  now?: () => Date;
}

export function usePlantCare(): PlantCareContextValue;
```

Never call `onAuthStateChanged` inside Plant Care. Preserve local records on sign-out and start merge/snapshot sync only when `user?.uid` exists.

- [ ] **Step 5: Run repository and provider gates**

Run: `npm.cmd run test:care -- src/features/plantCare/data src/features/plantCare/services src/features/plantCare/PlantCareProvider.test.tsx`

Expected: all local limits, outcome rescheduling, merge, retry, and provider tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/plantCare/data src/features/plantCare/integrations/firebase.ts src/features/plantCare/services src/features/plantCare/PlantCareProvider.tsx src/features/plantCare/PlantCareProvider.test.tsx
git commit -m "feat: connect plant care to Rosary accounts"
```

---

### Task 3: Integrated care routes, pages, and scoped visual system

**Files:**
- Create: `src/features/plantCare/PlantCareLayout.tsx`
- Create: `src/features/plantCare/routes.tsx`
- Create: `src/features/plantCare/styles.css`
- Create: `src/features/plantCare/pages/TodayPage.tsx`
- Create: `src/features/plantCare/pages/GardenPage.tsx`
- Create: `src/features/plantCare/pages/AddPlantPage.tsx`
- Create: `src/features/plantCare/pages/PlantDetailPage.tsx`
- Create: `src/features/plantCare/pages/JournalPage.tsx`
- Create: `src/features/plantCare/pages/RosaryBenefitsPage.tsx`
- Create: `src/features/plantCare/pages/CareSettingsPage.tsx`
- Create: `src/features/plantCare/components/TaskSheet.tsx`
- Create: `src/features/plantCare/PlantCareRoutes.test.tsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useAuth()` and `usePlantCare()`.
- Produces: public routes `/care`, `/care/garden`, `/care/add`, `/care/journal`, `/care/rosary`, `/care/settings`, and `/care/plants/:plantId`.

- [ ] **Step 1: Write failing route and shell tests**

```tsx
it('renders care inside the Rosary shell without a second bottom bar', async () => {
  renderCareRoute('/care');
  expect(await screen.findByRole('heading', { name: 'Today' })).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Plant Care sections' })).toBeVisible();
  expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run route test to verify red state**

Run: `npm.cmd run test:care -- src/features/plantCare/PlantCareRoutes.test.tsx`

Expected: FAIL because integrated routes are missing.

- [ ] **Step 3: Move pages and convert links to `/care/*`**

Use a nested route component:

```tsx
export default function PlantCareRoutes() {
  const { user } = useAuth();
  return (
    <PlantCareProvider user={user}>
      <Routes>
        <Route element={<PlantCareLayout />}>
          <Route index element={<TodayPage />} />
          <Route path="garden" element={<GardenPage />} />
          <Route path="add" element={<AddPlantPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="rosary" element={<RosaryBenefitsPage />} />
          <Route path="settings" element={<CareSettingsPage />} />
          <Route path="plants/:plantId" element={<PlantDetailPage />} />
        </Route>
      </Routes>
    </PlantCareProvider>
  );
}
```

Lazy-load it from root `App.jsx` at `<Route path="/care/*" element={<PlantCareRoutes />} />`.

- [ ] **Step 4: Scope the care design**

Wrap all care content in `<section className="plant-care-surface">`. Prefix selectors in the migrated stylesheet and map colors through local custom properties:

```css
.plant-care-surface {
  --care-forest: var(--color-forest);
  --care-paper: var(--bg-primary);
  --care-ink: var(--text-primary);
  --care-muted: var(--text-secondary);
  color: var(--care-ink);
}
```

Use an in-content segmented navigation for Today, My Garden, Add Plant, and Journal. Do not use `position: fixed` for care navigation.

- [ ] **Step 5: Run route, page, and type gates**

Run: `npm.cmd run test:care`

Run: `npm.cmd run typecheck:care`

Run: `npm.cmd run build`

Expected: care tests and root production build PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/App.jsx src/features/plantCare
git commit -m "feat: add plant care routes to Rosary app"
```

---

### Task 4: Global navigation and Account integration

**Files:**
- Modify: `src/components/Layout.jsx`
- Modify: `src/pages/AccountPage.jsx`
- Create: `src/features/plantCare/components/PlantCareAccountCard.tsx`
- Create: `tests/plant-care-navigation.test.mjs`

**Interfaces:**
- Consumes: `/care` routes and existing cart/account state.
- Produces: global Home, Shop, Plant Care, Cart, Account navigation and Account links for Wishlist and care settings.

- [ ] **Step 1: Write failing navigation contract tests**

```js
test('mobile navigation makes Plant Care first class and moves Wishlist to Account', () => {
  const source = readFileSync('src/components/Layout.jsx', 'utf8');
  assert.match(source, /path: '\/care', label: 'Plant Care'/);
  assert.doesNotMatch(source.match(/const navItems = \[[\s\S]*?\];/)[0], /Wishlist/);
  assert.match(readFileSync('src/pages/AccountPage.jsx', 'utf8'), /Wishlist/);
});
```

- [ ] **Step 2: Run test to verify red state**

Run: `node --test tests/plant-care-navigation.test.mjs`

Expected: FAIL because Plant Care is not in global navigation.

- [ ] **Step 3: Update global navigation and active-state rules**

Add a `PlantCareIcon` and set:

```js
const navItems = [
  { path: '/', label: 'Home', Icon: HomeIcon },
  { path: '/shop', label: 'Shop', Icon: ShopIcon },
  { path: '/care', label: 'Plant Care', Icon: PlantCareIcon },
  { path: '/cart', label: 'Cart', Icon: CartIcon },
  { path: '/account', label: 'Account', Icon: UserIcon },
];
```

Treat any pathname beginning `/care` as active. Add Wishlist to the sidebar user list. Hide the floating cart button on `/care` because Cart remains globally visible.

- [ ] **Step 4: Add the Account care card**

Render `PlantCareAccountCard` inside the signed-in and guest Account areas. It links to `/care`, `/care/settings`, `/care/rosary`, and `/wishlist`; it must not create another authentication flow.

- [ ] **Step 5: Run navigation and storefront tests**

Run: `node --test tests/plant-care-navigation.test.mjs`

Run: `npm.cmd test`

Expected: navigation test and all 142+ storefront tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/Layout.jsx src/pages/AccountPage.jsx src/features/plantCare/components/PlantCareAccountCard.tsx tests/plant-care-navigation.test.mjs
git commit -m "feat: make plant care a primary Rosary feature"
```

---

### Task 5: Weather, journal, notifications, and Rosary benefits

**Files:**
- Create: `src/features/plantCare/integrations/weather/*`
- Create: `src/features/plantCare/integrations/notifications/*`
- Create: `src/features/plantCare/integrations/rosary/*`
- Create: `src/features/plantCare/journal/*`
- Modify: `capacitor.config.json`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/res/drawable/ic_stat_plant_care.xml`

**Interfaces:**
- Consumes: root Firebase app, `PlantCareProvider`, callable Functions, and open care tasks.
- Produces: weather-adjusted guidance, private journal photos, root Android inspection reminders, and verified Rosary imports.

- [ ] **Step 1: Move existing adapter tests before implementations**

Copy weather cache/provider, notification scheduler, image compression, photo service, and Rosary client tests into their root feature paths.

- [ ] **Step 2: Run adapter tests to verify red state**

Run: `npm.cmd run test:care -- src/features/plantCare/integrations src/features/plantCare/journal`

Expected: FAIL because implementations have not moved.

- [ ] **Step 3: Move adapters and bind them to root Firebase**

Preserve these contracts:

```ts
new OpenMeteoProvider({ timeoutMs: 8000, cacheTtlMs: 21_600_000 });
reconcileNotifications(tasks, plants, driver, 9);
compressPlantPhoto(file, { maxEdge: 1600, quality: 0.82, maxBytes: 1_500_000 });
syncRosaryBenefits();
acceptRosaryImport(importId, locationId);
```

Firestore stores private Storage paths only. Guest blobs stay in IndexedDB. Signed-in paths remain `plantAppUsers/{uid}/plants/{plantId}/{photoId}.webp`.

- [ ] **Step 4: Migrate Android notification configuration**

Install/sync `@capacitor/local-notifications`, retain root app ID, add the monochrome notification drawable, and configure notification permission for Android 13+ without changing the existing FirebaseAuthentication settings.

- [ ] **Step 5: Run adapter, Functions, rule, and Android sync gates**

Run: `npm.cmd run test:care`

Run: `npm.cmd test` in `functions/`

Run: `npm.cmd run build` in `functions/`

Run: `npm.cmd run build:android`

Expected: all gates PASS and root Android assets contain the combined app.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json capacitor.config.json android src/features/plantCare functions firestore.rules storage.rules
git commit -m "feat: add care services to the Rosary app"
```

---

### Task 6: One installable PWA

**Files:**
- Modify: `vite.config.js`
- Modify: `src/main.jsx`
- Modify: `public/manifest.webmanifest` if present
- Create: `public/icons/rosary-app.svg`
- Create: `tests/plant-care-pwa.test.mjs`

**Interfaces:**
- Consumes: root Vite build and combined routes.
- Produces: one service worker and manifest for Rosary Plants.

- [ ] **Step 1: Write the failing single-PWA test**

```js
test('root build owns the only PWA manifest', () => {
  const config = readFileSync('vite.config.js', 'utf8');
  assert.match(config, /VitePWA/);
  assert.match(config, /name: 'Rosary Plant House'/);
  assert.match(config, /navigateFallback: 'index.html'/);
});
```

- [ ] **Step 2: Run test to verify red state**

Run: `node --test tests/plant-care-pwa.test.mjs`

Expected: FAIL because root Vite has no service worker.

- [ ] **Step 3: Configure the root service worker and manifest**

Add `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Rosary Plant House', short_name: 'Rosary Plants', display: 'standalone', start_url: '/', scope: '/' } })`. Cache the app shell and use NetworkFirst with an eight-second timeout only for Open-Meteo endpoints.

- [ ] **Step 4: Register the service worker from root**

Use `virtual:pwa-register` in `src/main.jsx`:

```js
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });
```

- [ ] **Step 5: Run PWA test and production build**

Run: `node --test tests/plant-care-pwa.test.mjs`

Run: `npm.cmd run build`

Expected: `dist/sw.js` and `dist/manifest.webmanifest` exist and build exits 0.

- [ ] **Step 6: Commit**

```powershell
git add vite.config.js src/main.jsx public/icons tests/plant-care-pwa.test.mjs package.json package-lock.json
git commit -m "feat: make Rosary the single installable app"
```

---

### Task 7: Root browser flow and removal of the second runtime

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/plant-care-loop.spec.ts`
- Modify: `.gitignore`
- Modify: `package.json`
- Delete: `plant-care-app/`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-14-single-app-plant-care-integration-design.md`

**Interfaces:**
- Consumes: combined production build.
- Produces: browser proof that commerce and care coexist in one app and removal of the deployable second runtime.

- [ ] **Step 1: Port the production browser flow before deletion**

The Playwright test must:

```ts
await page.goto('/care');
await page.getByRole('link', { name: 'Add Plant' }).click();
await page.getByRole('textbox', { name: 'Place name' }).fill('Living room');
await page.getByRole('textbox', { name: 'City' }).fill('Bengaluru');
await page.getByRole('combobox', { name: 'Climate' }).selectOption('south');
await page.getByRole('button', { name: 'Save growing place' }).click();
await page.getByRole('textbox', { name: 'Search plants' }).fill('Aloe vera');
await page.getByRole('button', { name: 'Add Aloe Vera' }).click();
await page.getByRole('link', { name: 'Open care desk' }).click();
await page.getByRole('button', { name: 'Soil is still moist' }).click();
await page.reload();
await expect(page.getByText(/next check/i)).toBeVisible();
const imagePath = testInfo.outputPath('plant-progress.png');
await page.screenshot({ path: imagePath });
await page.getByRole('link', { name: 'Journal' }).click();
await page.getByRole('textbox', { name: 'Observation' }).fill('New leaf opening');
await page.locator('#plant-photo').setInputFiles(imagePath);
await page.getByRole('button', { name: 'Save photo' }).click();
await context.setOffline(true);
await page.reload();
await expect(page.getByRole('heading', { name: 'New leaf opening' })).toBeVisible();
await context.setOffline(false);
await page.getByRole('link', { name: 'Shop' }).click();
await expect(page).toHaveURL(/\/shop$/);
```

Run on Pixel 7 and Desktop Chrome against `npm.cmd run build && npm.cmd run preview -- --host 127.0.0.1 --port 5177`.

- [ ] **Step 2: Run E2E to verify the integrated app**

Run: `npm.cmd run e2e`

Expected: mobile and desktop scenarios PASS.

- [ ] **Step 3: Remove the independent runtime**

Delete `plant-care-app/` only after Step 2 passes. Confirm no root import references that path:

Run: `rg -n "plant-care-app|com\.rosaryplants\.care" src package.json vite.config.js capacitor.config.json android README.md`

Expected: no deploy/runtime references; historical docs may retain clearly superseded references.

- [ ] **Step 4: Update documentation**

README must describe one app, root commands, `/care`, Firebase deployment, root PWA preview, and root Android build. Remove instructions that tell users to install or run a second package.

- [ ] **Step 5: Run all non-device gates**

Run: `npm.cmd run test:care-catalog`

Run: `npm.cmd run test:care`

Run: `npm.cmd run typecheck:care`

Run: `npm.cmd test`

Run: `npm.cmd run build`

Run: `npm.cmd run e2e`

Run: `npm.cmd test` and `npm.cmd run build` in `functions/`.

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```powershell
git add .gitignore README.md package.json package-lock.json playwright.config.ts e2e docs src scripts public vite.config.js capacitor.config.json android
git add -u plant-care-app
git commit -m "refactor: remove separate plant care app"
```

---

### Task 8: Final Android and release verification

**Files:**
- Modify only if a verification failure exposes a scoped defect.

**Interfaces:**
- Consumes: completed single application.
- Produces: root APK, hashes, verification evidence, and clean Git scope.

- [ ] **Step 1: Run root Android debug build**

Run: `npm.cmd run android:debug`

Expected: `android/app/build/outputs/apk/debug/app-debug.apk` exists and Gradle reports `BUILD SUCCESSFUL`.

- [ ] **Step 2: Validate security rules in emulators**

Run with Android Studio JBR on `PATH`:

```powershell
npx.cmd --yes firebase-tools@latest emulators:exec --only firestore,storage --project demo-rosary-care "node --version"
```

Expected: both emulators start, load their rules, execute the command, and stop with exit 0.

- [ ] **Step 3: Run dependency and secret scans**

Run: `npm.cmd audit --omit=dev`

Run: `rg -n "(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9])" src functions android public`

Expected: no root production vulnerabilities and no committed credential pattern.

- [ ] **Step 4: Record APK identity**

```powershell
$apk = Get-Item android/app/build/outputs/apk/debug/app-debug.apk
Get-FileHash -Algorithm SHA256 $apk.FullName
```

Confirm the manifest/application ID resolves to `com.rosaryplants.app`.

- [ ] **Step 5: Verify Git scope and commit any release-only fixes**

Run: `git diff --check`

Run: `git status --short`

Expected: only the pre-existing untracked browser/output artifacts remain.

If verification required source changes, rerun the affected full gate before committing:

```powershell
git add src/features/plantCare src/components/Layout.jsx src/pages/AccountPage.jsx vite.config.js capacitor.config.json android tests e2e README.md
git commit -m "fix: complete single-app plant care verification"
```

## Completion criteria

- One root package, one root Vite build, one PWA, and one `com.rosaryplants.app` Android package remain.
- Storefront and Plant Care share one global layout and one Google account.
- `/care` works for guests and adds sync/benefits for signed-in Rosary customers.
- Mobile navigation is Home, Shop, Plant Care, Cart, Account.
- All care, storefront, Functions, PWA, browser, rules, and Android gates pass.
- The standalone runtime is removed only after feature-equivalent proof.
