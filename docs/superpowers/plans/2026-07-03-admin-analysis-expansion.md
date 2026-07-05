# Admin Analysis Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seven new analysis tabs to the existing admin analysis page.

**Architecture:** Add pure analytics helpers in `src/utils/businessAnalysis.js` and test them with Node's built-in test runner. Add one reusable `AdminBusinessAnalysis.jsx` renderer that loads orders, users, cart, wishlist, and product catalog data once per tab and renders configured summary cards plus tables.

**Tech Stack:** React 19, Vite, Firebase Firestore services, Node test runner.

## Global Constraints

- Keep the existing `/admin/analysis` tab pattern.
- Do not add new dependencies.
- Use pure helpers for business calculations where possible.
- Keep all UI copy short and admin-focused.

---

### Task 1: Analytics Helpers

**Files:**
- Create: `src/utils/businessAnalysis.js`
- Create: `tests/businessAnalysis.test.mjs`

**Interfaces:**
- Produces: `buildRevenueAnalysis(orders)`, `buildProductDemandAnalysis({ orders, cartEntries, wishlistEntries })`, `buildUserAnalysis({ users, orders, cartEntries, wishlistEntries })`, `buildLocationAnalysis(orders)`, `buildStockSalesAnalysis({ products, orders, cartEntries, wishlistEntries })`, `buildOrderStatusAnalysis(orders)`, `buildCustomerValueAnalysis({ users, orders })`.

- [ ] Write failing helper tests covering every new analysis type.
- [ ] Run `node --test tests/businessAnalysis.test.mjs` and confirm failures are due to missing helpers.
- [ ] Implement the helpers.
- [ ] Run `node --test tests/businessAnalysis.test.mjs` and confirm the helper tests pass.

### Task 2: Tab Registry

**Files:**
- Modify: `src/utils/adminAnalysisTabs.js`
- Modify: `tests/adminAnalysisTabs.test.mjs`

**Interfaces:**
- Consumes: tab ids used by `AdminAnalysisPage.jsx`.

- [ ] Update tab tests to include the nine new tab ids.
- [ ] Run `node --test tests/adminAnalysisTabs.test.mjs` and confirm failure.
- [ ] Add the tab metadata.
- [ ] Re-run the tab tests and confirm pass.

### Task 3: Reusable Admin Panel

**Files:**
- Create: `src/pages/AdminBusinessAnalysis.jsx`
- Modify: `src/pages/AdminAnalysisPage.jsx`

**Interfaces:**
- Consumes: helpers from `src/utils/businessAnalysis.js`.
- Produces: a panel accepting `type` and `embedded`.

- [ ] Implement a reusable panel with summary cards, loading/error/empty states, and configured table columns.
- [ ] Wire the nine new tab ids to the reusable panel.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run targeted eslint on touched files.
