# Rosary Plant House

This repository contains two related applications:

- The root React/Vite project is the Rosary Plant House ecommerce storefront.
- `plant-care-app/` is Rosary Plant Care, a separate public PWA and Android companion app with additional verified-customer benefits.

The applications have independent packages, builds, and tests. The companion app consumes the storefront's verified catalogue at build time but does not share its runtime bundle.

## Storefront

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

## Plant Care companion

```powershell
cd plant-care-app
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run build
npm.cmd run e2e
```

See `plant-care-app/README.md` for Firebase sync, Functions, PWA, Android, privacy, and release-boundary details.

## Android Firebase configuration

The storefront package ID is `com.rosaryplants.app`; the companion package ID is `com.rosaryplants.care`. Their real `google-services.json` files are local-only and ignored by Git. Use each app's checked-in example file and download the corresponding Firebase configuration before testing native Google sign-in.

If a Google API key was previously exposed, rotate or restrict it in Google Cloud/Firebase before dismissing an alert. Removing a file from future commits does not invalidate an exposed key.
