# Rosary Plant House

This repository contains one Rosary Plant House app for shopping and plant care. Plant Care is public at `/care`, works for guests with local private storage, and adds cloud sync plus verified-order benefits through the existing Rosary account.

## Web app

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run test:care
npm.cmd run test:e2e:care
npm.cmd run build
```

Plant Care catalogue data is generated from the verified storefront catalogue:

```powershell
npm.cmd run catalog:care
npm.cmd run test:care-catalog
```

The same build is the installable PWA. The same root project also produces the Android app:

```powershell
npm.cmd run build:android
npm.cmd run android:debug
```

## Android Firebase configuration

The single package ID is `com.rosaryplants.app`. Its real `android/app/google-services.json` is local-only and ignored by Git. Use the checked-in example file and download the matching Firebase configuration before testing native Google sign-in.

If a Google API key was previously exposed, rotate or restrict it in Google Cloud/Firebase before dismissing an alert. Removing a file from future commits does not invalidate an exposed key.
