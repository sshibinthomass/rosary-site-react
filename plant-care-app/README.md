# Rosary Plant Care

Rosary Plant Care is a separate public companion app for plant lovers in India. It runs as an installable PWA and a Capacitor Android app. Anyone can use the check-first care loop; verified Rosary customers receive additional imports and entitlements after signing in.

## Release 1 features

- Local-first guest garden with up to 10 non-Rosary plants.
- One indoor and one balcony growing place.
- 313 verified profiles generated from the storefront catalogue.
- Conservative India-season care windows with optional Open-Meteo adjustment.
- Observation outcomes: watered after checking, still moist, postpone, or problem noted.
- Private photo journal with browser-side WebP compression.
- PWA offline shell and IndexedDB persistence.
- Optional Android/web inspection reminders.
- Google sign-in and private Firestore sync.
- Server-verified Rosary order imports, unlimited verified Rosary plants, and delivered-order entitlements.

The app does not identify plants with AI, diagnose disease, prescribe pesticides, provide a public community, or sell subscriptions in Release 1.

## Local setup

Use Node.js 22 or newer.

```powershell
cd plant-care-app
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5176
```

The app is independent from the storefront package. Its test and release commands are:

```powershell
npm.cmd run test:catalog
npm.cmd test
npm.cmd run build
npm.cmd run e2e
```

`npm.cmd run e2e` builds the production PWA, starts a preview server, and checks the full guest care/photo/offline flow in mobile and desktop Chromium.

## Firebase and account sync

Copy `.env.example` to `.env.local` and set the six `VITE_FIREBASE_*` values for the same Firebase project as the storefront. Without them, the public guest experience remains fully available and the Profile screen explains that account sync is disabled.

Guest locations, plants, tasks, events, and photos are stored in IndexedDB. Signed-in gardens use private `plantAppUsers/{uid}` collections. Firestore and Storage rules are in the repository root. Rosary import and entitlement documents are server-written only.

Functions setup:

```powershell
cd ..\functions
npm.cmd install
npm.cmd test
npm.cmd run build
cd ..
npx.cmd firebase-tools emulators:start --only firestore,functions
```

The Functions build generates a trusted product-to-species map from the published app catalogue. `syncRosaryBenefits` reads orders attached to the authenticated UID; `acceptRosaryImport` transactionally creates the verified garden plant.

## Catalogue and weather

`npm.cmd run catalog` regenerates `src/data/species.generated.json` from the root storefront's `src/data/products.json`. Only published, identity-verified products with care guides are included.

Open-Meteo geocoding is restricted to country code `IN`. Forecast calls use an eight-second timeout and a six-hour local cache. Provider failure returns labeled seasonal guidance instead of blocking care. Review Open-Meteo's current attribution and commercial-use terms before production launch.

## PWA and Android

To inspect the production PWA:

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 5177
```

Android uses package ID `com.rosaryplants.care`:

```powershell
npm.cmd run android:sync
npm.cmd run android:debug
```

The script locates Android Studio's bundled Java runtime and the default Android SDK on Windows. The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

Native Google sign-in requires a Firebase Android app registered for `com.rosaryplants.care`. Copy `android/app/google-services.example.json` to `android/app/google-services.json`, replace the placeholders with the downloaded Firebase configuration, and add the signing certificate fingerprints in Firebase. The real file is ignored by Git.

## Privacy and operational boundaries

- Location is city/coarse-coordinate based; continuous GPS is not requested.
- Guest photos never leave the device. After sign-in, local photos migrate to the user's private Storage path.
- Web notifications are best-effort while the PWA is active. Android local notifications are the durable reminder surface.
- A care task always asks for an observation before watering.
- Deploy Functions and security rules before enabling Rosary benefits in a production build.
