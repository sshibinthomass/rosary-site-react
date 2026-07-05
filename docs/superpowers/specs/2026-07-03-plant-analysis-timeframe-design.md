# Plant Analysis Timeframe Switcher Design

Date: 2026-07-03
Page: `src/pages/AdminPlantAnalysis.jsx`

## Goal

Extend the existing plant analysis admin page so an admin can switch the current analysis between `Overall`, `Monthly`, `Weekly`, and `Daily` without leaving the page.

## Existing Behavior

- The page loads all orders through `getAllOrders()`.
- A multi-select order status filter controls which orders are included.
- The screen aggregates plant sales into summary cards and a ranked plant table.
- There is no time-based filtering today.

## Approved UX

- Keep the current status multi-select filter unchanged.
- Add a second pill-style switcher for timeframes with four options:
  - `Overall`
  - `Monthly`
  - `Weekly`
  - `Daily`
- The timeframe switcher updates the same summary cards and the same plant table.
- The active timeframe and active statuses are combined, so both filters apply at the same time.

## Timeframe Rules

- `Overall`: include all orders that match the selected statuses.
- `Monthly`: include orders created during the current calendar month.
- `Weekly`: include orders created during the current calendar week.
- `Daily`: include orders created during the current calendar day.
- Order dates should come from `order.createdAt`.
- Firestore timestamps and plain date values must both be handled safely.
- Orders with missing or invalid `createdAt` values should be excluded from non-overall timeframes.

## Data Flow

- Keep fetching orders in the page component.
- Add a selected timeframe state, defaulting to `overall`.
- Normalize `createdAt` into a `Date` before applying timeframe logic.
- Build a filtered order list in this order:
  1. status filter
  2. timeframe filter
- Derive plant aggregation from the filtered order list so every visible metric stays consistent.

## UI Changes

- Add a new card section near the existing status filter for the timeframe pills.
- Reuse the current pill visual style so the control feels native to the admin page.
- Update summary labels or helper text so the current period is clear.
- Keep the current table structure unless data is empty.
- Empty-state copy should mention the selected period, for example:
  - `No plants found for the selected statuses in this period.`

## Error Handling

- Preserve the current loading and error states.
- If orders fail to load, the new timeframe UI should not introduce extra failure paths.
- Invalid order dates should not crash the page.

## Testing Strategy

- Add focused tests for the timeframe filtering and aggregation behavior before production edits.
- Cover:
  - overall includes all matching statuses
  - monthly only includes current-month orders
  - weekly only includes current-week orders
  - daily only includes current-day orders
  - orders with invalid dates are ignored for non-overall filters
  - aggregation totals stay aligned with the filtered orders

## Implementation Notes

- Extract pure helper logic for date normalization, timeframe matching, and plant aggregation so it can be tested outside the component.
- Keep the component responsible mainly for loading data, storing filter state, and rendering.
- Follow the existing admin styling and avoid introducing a separate route or separate analysis sections.
