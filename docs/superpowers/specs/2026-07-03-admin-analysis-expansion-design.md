# Admin Analysis Expansion Design

## Goal

Add seven new admin analysis types to the existing `/admin/analysis` page:

- Revenue analysis
- Product demand analysis
- User analysis
- Location analysis
- Stock/sales analysis
- Order status analysis
- Customer value analysis

## Approved Approach

Use the existing tabbed `Analysis type` surface and keep each new analysis as a focused tab. Use shared analytics helpers for calculations so the tabs do not duplicate business rules.

## Data Sources

- Orders from `getAllOrders()`
- Users from `getAllUsers()`
- Cart and wishlist entries from each user's `cart` and `wishlist` subcollections
- Product catalog from existing product and limited-product services

## Definitions

- Revenue uses final paid amount: `totalAmount + deliveryCharge - manualDiscount`.
- Product demand combines sold quantity, active cart quantity, and wishlist saves.
- Customer value groups orders by `customer.userId`, with guest/unknown users grouped by name, phone, or email when available.

## UI

Each tab shows compact summary cards and a table. The table is configured per analysis type, but the layout stays consistent with the existing admin cards and tables.
