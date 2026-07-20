# Checkout Tracking Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure a safe preview environment and prove every required checkout-tracking, admin, security, and regression scenario before requesting production approval.

**Architecture:** The existing Firebase project remains the shared data/auth backend, while Vercel Preview runs the feature branch and its `/api/checkout-attempts` function. Configuration changes use the existing production service account only in process memory or an exact temporary file; no secret enters the repository or browser bundle. Deterministic failure/security cases run in automated tests and the Firestore emulator, while successful customer/admin flows run against the deployed preview.

**Tech Stack:** React 19, Vite 7, Firebase Auth/Firestore, Firebase Admin, Firebase CLI, Firestore Emulator, Vercel CLI, Node test runner, Codex in-app browser.

## Global Constraints

- Customer name remains optional; display the recorded name when present and `N/A` when omitted.
- Order cost must come from the verified checkout total and appear in Admin Checkout Tracking.
- Never print, commit, or expose Firebase Admin credentials or ID tokens.
- Do not deploy with `vercel --prod`, merge to `main`, or push production web changes during this plan.
- Production promotion is blocked until every required preview scenario passes and the user explicitly approves it.
- Reuse `rosary-plant-house` as the Firebase project and `codex/checkout-attempt-tracking` as the preview branch.

---

### Task 1: Enable Diagnostic Authentication and Preview Secrets

**Files:**
- Verify only: `README.md`
- Verify only: `src/services/checkoutDiagnosticWriterAuth.js`
- Verify only: `api/firebase-admin.js`

**Interfaces:**
- Consumes: Vercel Production variable `FIREBASE_SERVICE_ACCOUNT_BASE64`; Firebase project `rosary-plant-house`.
- Produces: Firebase anonymous sign-in enabled; the same encrypted server credential present in Vercel Preview and Development.

- [ ] **Step 1: Record the pre-change state without printing values**

Run:

```powershell
vercel whoami
vercel env ls --cwd 'D:\Projects\Website\rosary-site-react'
```

Expected: the authenticated Vercel account is shown; `FIREBASE_SERVICE_ACCOUNT_BASE64` exists only for Production before this task.

- [ ] **Step 2: Reproduce the disabled anonymous-provider result**

Run the Identity Toolkit anonymous signup probe using `VITE_FIREBASE_API_KEY` from `D:\Projects\Website\rosary-site-react\.env.local`. Capture only the HTTP status and Firebase error code:

```powershell
$line=Get-Content -LiteralPath 'D:\Projects\Website\rosary-site-react\.env.local' | Where-Object {$_ -match '^VITE_FIREBASE_API_KEY='} | Select-Object -First 1
$apiKey=($line -split '=',2)[1].Trim().Trim('"').Trim("'")
try {
  Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey" -ContentType 'application/json' -Body '{"returnSecureToken":true}' -TimeoutSec 15 | Out-Null
  Write-Output 'ANON_AUTH_UNEXPECTEDLY_ENABLED'
  exit 1
} catch {
  $status=[int]$_.Exception.Response.StatusCode
  $reader=New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $payload=($reader.ReadToEnd() | ConvertFrom-Json)
  $reader.Close()
  Write-Output "ANON_AUTH_HTTP=$status"
  Write-Output "ANON_AUTH_ERROR=$($payload.error.message)"
}
```

Expected before the change: HTTP `400` with `ADMIN_ONLY_OPERATION`.

- [ ] **Step 3: Enable anonymous authentication through the Identity Toolkit Admin API**

Run from the linked main checkout so Vercel injects the production credential only into the child process:

```powershell
vercel env run -e production -- node --input-type=module -e "import { cert } from 'firebase-admin/app'; const raw=Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,'base64').toString('utf8'); const credential=cert(JSON.parse(raw)); const token=await credential.getAccessToken(); const name='projects/rosary-plant-house/config'; const response=await fetch('https://identitytoolkit.googleapis.com/admin/v2/'+name+'?updateMask=signIn.anonymous.enabled',{method:'PATCH',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({name,signIn:{anonymous:{enabled:true}}})}); if(!response.ok) throw new Error('Identity config update failed with HTTP '+response.status); const config=await response.json(); if(config.signIn?.anonymous?.enabled!==true) throw new Error('Anonymous authentication was not enabled'); console.log('ANONYMOUS_AUTH=ENABLED');"
```

Expected: `ANONYMOUS_AUTH=ENABLED`; no token or credential is printed.

- [ ] **Step 4: Verify anonymous sign-in and clean up the probe user**

Run:

```powershell
$line=Get-Content -LiteralPath 'D:\Projects\Website\rosary-site-react\.env.local' | Where-Object {$_ -match '^VITE_FIREBASE_API_KEY='} | Select-Object -First 1
$apiKey=($line -split '=',2)[1].Trim().Trim('"').Trim("'")
$signup=Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey" -ContentType 'application/json' -Body '{"returnSecureToken":true}' -TimeoutSec 15
$created=[bool]$signup.idToken
if($created){
  $deleteBody=@{idToken=$signup.idToken} | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:delete?key=$apiKey" -ContentType 'application/json' -Body $deleteBody -TimeoutSec 15 | Out-Null
}
Write-Output "ANON_AUTH_CREATED=$created"
Write-Output "ANON_AUTH_CLEANED=$created"
```

The command must print only:

```text
ANON_AUTH_CREATED=True
ANON_AUTH_CLEANED=True
```

Expected: both values are `True`.

- [ ] **Step 5: Copy the server credential to Preview and Development through stdin**

Run from `D:\Projects\Website\rosary-site-react`:

```powershell
vercel env run -e production -- powershell -NoProfile -Command '[Console]::Out.Write($env:FIREBASE_SERVICE_ACCOUNT_BASE64)' | vercel env add FIREBASE_SERVICE_ACCOUNT_BASE64 preview
vercel env run -e production -- powershell -NoProfile -Command '[Console]::Out.Write($env:FIREBASE_SERVICE_ACCOUNT_BASE64)' | vercel env add FIREBASE_SERVICE_ACCOUNT_BASE64 development
```

Expected: Vercel reports the encrypted variable added to each environment and never echoes its value.

- [ ] **Step 6: Verify environment coverage**

Run:

```powershell
vercel env ls --cwd 'D:\Projects\Website\rosary-site-react'
```

Expected: `FIREBASE_SERVICE_ACCOUNT_BASE64` is listed for Production, Preview, and Development.

### Task 2: Prove and Deploy Firestore Security Configuration

**Files:**
- Verify: `firebase.json`
- Verify: `firestore.rules`
- Verify: `firestore.indexes.json`
- Test: `tests/firestoreRules.emulator.mjs`

**Interfaces:**
- Consumes: Task 1 production service credential and Firebase project `rosary-plant-house`.
- Produces: passing emulator matrix; deployed rules/indexes; active or creating TTL policy on `checkoutAttempts.expiresAt`.

- [ ] **Step 1: Run the Firestore emulator matrix using the bundled Android Studio Java runtime**

Run:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npx firebase-tools emulators:exec --only firestore --project rosary-plant-house "node --test tests/firestoreRules.emulator.mjs"
```

Expected: public create/update/get/list/delete denial, admin read/list/constrained update success, forbidden lifecycle/delete denial, and protected order delete all pass.

- [ ] **Step 2: Deploy rules and indexes with an exact temporary credential file**

Run from the linked main checkout:

```powershell
vercel env run -e production -- powershell -NoProfile -Command '$temp=Join-Path ([IO.Path]::GetTempPath()) ("rosary-firebase-"+[guid]::NewGuid().ToString("N")+".json"); try {[IO.File]::WriteAllBytes($temp,[Convert]::FromBase64String($env:FIREBASE_SERVICE_ACCOUNT_BASE64)); $env:GOOGLE_APPLICATION_CREDENTIALS=$temp; $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; $env:Path="$env:JAVA_HOME\bin;$env:Path"; npx firebase-tools deploy --only firestore --project rosary-plant-house --non-interactive; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}} finally {Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}'
```

Expected: Firestore rules and indexes deploy successfully; the temporary JSON file is removed in `finally`.

- [ ] **Step 3: Verify deployed indexes and TTL state**

Run from the linked main checkout:

```powershell
vercel env run -e production -- powershell -NoProfile -Command '$temp=Join-Path ([IO.Path]::GetTempPath()) ("rosary-firebase-"+[guid]::NewGuid().ToString("N")+".json"); try {[IO.File]::WriteAllBytes($temp,[Convert]::FromBase64String($env:FIREBASE_SERVICE_ACCOUNT_BASE64)); $env:GOOGLE_APPLICATION_CREDENTIALS=$temp; npx firebase-tools firestore:indexes --project rosary-plant-house; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}} finally {Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}'
```

Then use an OAuth token from `firebase-admin` to GET:

```powershell
vercel env run -e production -- node --input-type=module -e "import { cert } from 'firebase-admin/app'; const raw=Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,'base64').toString('utf8'); const credential=cert(JSON.parse(raw)); const token=await credential.getAccessToken(); const url='https://firestore.googleapis.com/v1/projects/rosary-plant-house/databases/(default)/collectionGroups/checkoutAttempts/fields/expiresAt'; const response=await fetch(url,{headers:{Authorization:'Bearer '+token.access_token}}); if(!response.ok) throw new Error('TTL lookup failed with HTTP '+response.status); const field=await response.json(); const state=field.ttlConfig?.state; if(state!=='ACTIVE'&&state!=='CREATING') throw new Error('Unexpected TTL state: '+String(state)); console.log('CHECKOUT_TTL='+state);"
```

Expected: the field response contains a TTL configuration whose state is `ACTIVE` or `CREATING`. If it is `CREATING`, wait for the remote operation rather than changing the schema again.

- [ ] **Step 4: Re-run the anonymous/public authorization probe**

Create a disposable anonymous identity, attempt a direct Firestore document write with its ID token, require HTTP `403`, and delete the disposable identity:

```powershell
$line=Get-Content -LiteralPath 'D:\Projects\Website\rosary-site-react\.env.local' | Where-Object {$_ -match '^VITE_FIREBASE_API_KEY='} | Select-Object -First 1
$apiKey=($line -split '=',2)[1].Trim().Trim('"').Trim("'")
$signup=Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey" -ContentType 'application/json' -Body '{"returnSecureToken":true}' -TimeoutSec 15
$denied=$false
try {
  $headers=@{Authorization="Bearer $($signup.idToken)"}
  Invoke-RestMethod -Method Patch -Uri 'https://firestore.googleapis.com/v1/projects/rosary-plant-house/databases/(default)/documents/checkoutAttempts/direct-probe' -Headers $headers -ContentType 'application/json' -Body '{"fields":{"result":{"stringValue":"failed"}}}' -TimeoutSec 15 | Out-Null
} catch {
  $denied=([int]$_.Exception.Response.StatusCode -eq 403)
} finally {
  $deleteBody=@{idToken=$signup.idToken} | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:delete?key=$apiKey" -ContentType 'application/json' -Body $deleteBody -TimeoutSec 15 | Out-Null
}
Write-Output "DIRECT_FIRESTORE_DENIED=$denied"
if(-not $denied){exit 1}
```

Expected: all direct Firestore access is denied; diagnostic writes are accepted only through `/api/checkout-attempts` after the preview deploy.

### Task 3: Deploy a Non-Production Vercel Preview

**Files:**
- Verify: `vercel.json`
- Verify: `api/checkout-attempts.js`
- Verify: `api/checkout-attempts-core.js`
- Verify: `api/checkout-attempts-firebase.js`
- Verify: `api/firebase-admin.js`

**Interfaces:**
- Consumes: Task 1 Preview environment and Task 2 Firebase configuration.
- Produces: one Vercel Preview URL for the exact `codex/checkout-attempt-tracking` commit.

- [ ] **Step 1: Link the feature worktree to the existing Vercel project**

Run:

```powershell
vercel link --yes --project rosary-site-react
```

Expected: `.vercel/project.json` points to the existing `rosary-site-react` project and remains ignored by Git.

- [ ] **Step 2: Run pre-deploy verification with Preview variables**

Run:

```powershell
vercel env run -e preview -- npm test
vercel env run -e preview -- npx vite build
git diff --check
git status --short
```

Expected: all 305 or more tests pass, Vite builds successfully, diff check exits `0`, and the worktree is clean.

- [ ] **Step 3: Deploy without the production flag**

Run:

```powershell
vercel deploy --yes
```

Expected: Vercel returns a Preview URL. Reject any command or prompt that includes `--prod`.

- [ ] **Step 4: Verify the preview function boundary**

Against the returned Preview URL:

- `GET /api/checkout-attempts` returns the stable method-not-allowed response.
- `POST /api/checkout-attempts` without `Authorization` returns the stable authentication error.
- No response contains a service-account value, ID token, stack trace, or raw Firebase error object.

Expected: the endpoint is the Vercel function, not the SPA HTML fallback.

### Task 4: Execute Every Preview Scenario

**Files:**
- Verify: `src/pages/CartPage.jsx`
- Verify: `src/pages/AdminCheckoutTrackingPage.jsx`
- Verify: `src/pages/AdminOrdersPage.jsx`
- Verify: `src/services/verifiedCheckout.js`
- Verify: `src/services/checkoutAttemptService.js`
- Verify: `src/utils/checkoutAttemptOutbox.js`
- Test: `tests/*.test.mjs`
- Test: `tests/firestoreRules.emulator.mjs`

**Interfaces:**
- Consumes: Task 3 Preview URL and the authorized admin account `sshibinthomass@gmail.com`.
- Produces: evidence for every scenario in the approved design; no unresolved regression.

- [ ] **Step 1: Run deterministic automated failure scenarios**

Run:

```powershell
node --test tests/verifiedCheckout.test.mjs tests/checkoutTrackingIntegration.test.mjs tests/checkoutAttemptRetry.test.mjs tests/checkoutAttemptOutbox.test.mjs tests/checkoutAttemptsApi.test.mjs tests/checkoutAttemptRules.test.mjs
```

Expected: order-create failure, verification failure, blocked popup, successful retry, timeout, offline replay, writer mismatch/conflict, sanitization, idempotency, and rule-shape cases all pass.

- [ ] **Step 2: Create one named successful preview attempt**

In the in-app browser, add one low-cost item, enter the test name `Codex Preview Test`, leave other optional delivery fields blank unless the UI requires them, and submit once.

Expected: one order is saved, WhatsApp handoff is truthful, the confirmation shows a support code, and Admin Checkout Tracking shows the test name, INR cost, items, order ID, completed timeline, and successful result.

- [ ] **Step 3: Create one nameless successful preview attempt**

Repeat with the name field empty and a single low-cost item.

Expected: checkout remains allowed, Admin displays `N/A`, and the cost/items/support code/timeline remain correct.

- [ ] **Step 4: Exercise search, filters, timeline, and links**

Using the two preview attempts:

- Search by support code and order ID.
- Search the named attempt by `Codex Preview Test`.
- Filter by successful result, completed stage, open status, resolved status, and date range.
- Expand the attempt and verify chronological events and sanitized error fields.
- Follow the attempt-to-order link and the Admin Orders `Checkout issues` link back to the same attempt.

Expected: each operation resolves to the exact intended record and canonical order ID.

- [ ] **Step 5: Exercise admin notes and every resolution transition**

On the named attempt:

1. Save notes while status remains Open.
2. Mark Investigating.
3. Mark Resolved and record the displayed resolution time.
4. Edit notes while Resolved and confirm the resolution time does not change.
5. Reopen and confirm the resolution time clears.
6. Resolve again and confirm a new server timestamp appears.

Expected: notes and status updates persist after reload and no lifecycle/event field is modified.

- [ ] **Step 6: Verify desktop, mobile, and existing-site regression paths**

At desktop and a 390×844 mobile viewport, verify homepage, shop/search, product view, wishlist, cart, account, public order view, Admin home, Admin Orders, and Checkout Tracking.

Expected: no horizontal overflow, inaccessible controls, new console errors, broken routes, or changed cart/order totals.

- [ ] **Step 7: Inspect diagnostic privacy**

Read the two `checkoutAttempts` records as admin.

Expected: records contain approved name/contact/item/cost fields and immutable writer ID, but no email, address, pincode, district, state, ID token, API key, stack trace, or serialized error object.

If any Task 4 scenario fails, stop the scenario matrix, invoke `superpowers:systematic-debugging` and `superpowers:test-driven-development`, add one exact failing regression test for the owning boundary, apply the smallest fix, commit it independently, redeploy Preview, and repeat the affected scenario before continuing.

### Task 5: Produce the Promotion Report and Stop Before Production

**Files:**
- Create: `docs/superpowers/reports/2026-07-20-checkout-tracking-preview-verification.md`

**Interfaces:**
- Consumes: all Task 1–4 command outputs and browser evidence.
- Produces: one auditable go/no-go report for explicit production approval.

- [ ] **Step 1: Run final fresh verification**

Run:

```powershell
npm test
npx vite build
npx eslint api/checkout-attempts-core.js api/checkout-attempts-firebase.js api/checkout-attempts.js api/firebase-admin.js src/pages/AdminCheckoutTrackingPage.jsx src/services/checkoutAttemptService.js src/services/checkoutDiagnosticWriterAuth.js src/services/verifiedCheckout.js src/services/whatsappCheckout.js src/utils/checkoutAttemptModel.js src/utils/checkoutAttemptOutbox.js src/utils/checkoutAttemptTransport.js src/utils/externalNavigation.js
git diff --check
git status --short
```

Expected: full tests and build pass; scoped lint has zero errors; diff check exits `0`; only the intentional report or isolated fixes are uncommitted.

- [ ] **Step 2: Write the verification report**

Include:

- exact preview URL and commit SHA;
- anonymous-auth, Vercel env, Firestore deploy, index, and TTL evidence;
- automated test counts and emulator matrix result;
- every browser scenario with pass/fail evidence;
- console, responsive, privacy, and security results;
- test order IDs, support codes, diagnostic record IDs, and cleanup/status disposition;
- existing repository lint warnings separated from feature-scoped results;
- explicit `GO` or `NO-GO` with every unresolved blocker.

- [ ] **Step 3: Self-review the report against the approved design**

Run:

```powershell
rg -n "TBD|TODO|PLACEHOLDER|NOT TESTED|FAIL|NO-GO" docs/superpowers/reports/2026-07-20-checkout-tracking-preview-verification.md
```

Expected: no placeholders. Any `NOT TESTED`, `FAIL`, or `NO-GO` is a production blocker and must remain explicit.

- [ ] **Step 4: Commit the report**

```powershell
git add -- docs/superpowers/reports/2026-07-20-checkout-tracking-preview-verification.md
git commit -m "docs: record checkout tracking preview verification"
```

- [ ] **Step 5: Request explicit production approval**

Report results to the user and stop. Do not merge, push a production branch, deploy with `--prod`, or change production web traffic until the user explicitly approves the verified promotion.
