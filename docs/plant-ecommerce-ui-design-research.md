# Rosary Plant House E-commerce UI Design Research

Date: 2026-06-27

Note: I interpreted "e-commerce plan sites" as plant e-commerce sites because this app is a plant catalog and WhatsApp-ordering storefront.

## Goal

Make Rosary Plant House feel like a premium, fast, easy plant-shopping experience while keeping the current business model intact:

- Customers browse live plants, limited plants, succulents, cacti, and combos.
- Customers build a cart and complete the order through WhatsApp.
- Shipping, availability, delivery charge, and final confirmation still happen manually.
- The UI must feel simpler, more confident, more modern, and faster on mobile.

## Sites And Research Reviewed

Plant e-commerce benchmarks:

- Ugaoo: https://www.ugaoo.com/
- Ugaoo beginner-friendly plants: https://www.ugaoo.com/collections/beginner-friendly-plants
- Ugaoo pet-friendly plants: https://www.ugaoo.com/collections/pet-friendly-plants
- Nurserylive: https://nurserylive.com/
- The Sill: https://www.thesill.com/
- Bloomscape: https://bloomscape.com/
- Bloomscape guarantee: https://support.bloomscape.com/the-bloomscape-guarantee
- Patch Plants: https://www.patchplants.com/
- Patch indoor plants: https://www.patchplants.com/collections/plants-indoor-all/
- Lively Root plant quiz: https://www.livelyroot.com/pages/plant-quiz
- Lively Root: https://www.livelyroot.com/
- Leon & George: https://www.leonandgeorge.com/
- Leon & George guarantee: https://www.leonandgeorge.com/guarantee
- House Plant Shop: https://houseplantshop.com/

UX and performance research:

- Baymard product list and filtering UX: https://baymard.com/blog/current-state-product-list-and-filtering
- Baymard applied filters: https://baymard.com/blog/how-to-design-applied-filters
- Baymard e-commerce search UX: https://baymard.com/blog/ecommerce-search-query-types
- Baymard no-results pages: https://baymard.com/blog/no-results-page
- Baymard product page UX: https://baymard.com/blog/current-state-ecommerce-product-page-ux
- Web.dev Core Web Vitals: https://web.dev/articles/vitals
- Web.dev LCP optimization: https://web.dev/articles/optimize-lcp
- Web.dev browser image lazy loading: https://web.dev/articles/browser-level-image-lazy-loading
- Web.dev long task optimization: https://web.dev/articles/optimize-long-tasks
- Web.dev fetch priority: https://web.dev/articles/fetch-priority

## Current App Observations

Strong existing foundations:

- React/Vite app with lazy-loaded routes.
- Home page already batches visible products at 24 items and hydrates full catalog later.
- Firestore has a timeout fallback to local product JSON.
- Product cards already show price, category, size, wishlist, quantity, add-to-cart, and care attributes.
- Cart already supports stock refresh, promo codes, optional checkout details, pincode lookup, and WhatsApp order creation.
- Mobile bottom navigation exists.
- Build passes successfully.

Current UX friction:

- The first viewport feels more like a landing page than a shopping surface. A plant buyer should reach products, search, category intent, and cart quickly.
- Filters are useful but visually busy: category chips, three select boxes, two price boxes, sort, details text, and result text compete for attention.
- Horizontal category/filter controls can hide important options on mobile.
- Product cards expose too much interaction at once. Quantity steppers on every card add visual weight before the user has decided to buy.
- Hover-only quick view is weak on touch devices.
- Shipping/replacement confidence appears in several places but is not structured around purchase anxiety.
- Product images in `products.json` point to raw GitHub URLs, which is not ideal for fast image delivery, caching, or responsive sizes.
- `public/sale_plants` and `src/assets/salePlants` duplicate 312 images each, about 6 MB per folder.
- The build output shows large vendor chunks: Firestore, React, PDF libraries, and product JSON. The current split is workable, but the first shopping route should avoid pulling admin/review/PDF work into the initial experience.
- Some source text appears mojibaked, including currency and icon strings. Visual text should be cleaned during implementation.

## Research Takeaways

What leading plant shops do well:

- They let users shop by intent, not only taxonomy. Ugaoo and Lively Root surface beginner-friendly, pet-friendly, low-light, air-purifying, hanging, and other need-based paths.
- They reduce plant anxiety. Bloomscape, Patch, The Sill, Lively Root, and Leon & George repeatedly pair product selection with care guidance, expert support, delivery reassurance, and guarantee language.
- They make guided discovery feel normal. Lively Root uses a plant quiz. Patch encourages browsing by room, light, size, and difficulty. The Sill uses location/zone relevance.
- They keep trust close to purchase. Delivery, care instructions, support, and guarantees are not hidden in only FAQ pages.
- They separate shopping filters from decorative content. Serious product-list pages favor scanning, filtering, comparison, and clear add-to-cart behavior.

What broad e-commerce UX research suggests:

- Search must be strong because many users prefer search over navigation.
- Product list filters need an applied-filter overview, quick removal, and filters that match the visible product attributes.
- No-results states should help users recover with suggestions, adjacent categories, typo help, and popular products.
- Product pages should clarify price, availability, delivery, visual details, variants, return/replacement terms, and support before asking the user to buy.
- Performance should target good Core Web Vitals: LCP 2.5s or less, INP 200ms or less, and CLS 0.1 or less.

## Design Strategy

Positioning:

Rosary should not try to look like a generic Shopify theme. It should feel like a specialist nursery: warm, direct, trustworthy, quick, and plant-literate.

Core idea:

"Find the right plant fast, understand whether it will survive your home and transit, add it confidently, confirm on WhatsApp."

Design principles:

- Catalog-first, not hero-first.
- Product imagery should do the visual selling.
- Care and transit data should be glanceable.
- Filters should feel like helpful guidance, not a form.
- Every high-friction purchase question should be answered before checkout: stock, price, care, transit risk, delivery discussion, replacement policy, and WhatsApp next step.
- Keep the interface calm. Use fewer gradients, fewer large rounded panels, fewer decorative elements, and more clean spacing.
- Preserve trust and personality without making the UI noisy.

## Proposed Experience

### 1. First View: Shop Immediately

Replace the current large hero with a compact shopping header:

- Top sticky header: logo, search trigger/input, wishlist, cart count, menu.
- Thin announcement strip: "Ships Mon/Wed from Coonoor. WhatsApp confirmation after checkout."
- Compact brand shelf under the header:
  - Real nursery/product image, not abstract decoration.
  - Short line: "Rare succulents, cacti, and indoor plants from Coonoor."
  - Two actions: "Shop Limited" and "Chat on WhatsApp."
- Immediately show intent chips and product grid above the fold.

Primary intent chips:

- Easy care
- Low water
- Low light
- Transit safe
- Under Rs. 99
- Limited
- Pet safe, if data is available later
- Desk plants, balcony plants, hanging plants, gift combos

### 2. Search And Discovery

Upgrade search from a simple input to a discovery control:

- Sticky search bar on catalog pages.
- Autocomplete suggestions after 2 characters:
  - Product names
  - Categories
  - Common synonyms: cactus/cacti, jade/crassula, aloe/aloe vera, hanging/trailing
  - Intent terms: low water, indoor, balcony, combo
- Recent searches stored locally.
- Popular quick searches shown when input is focused and empty.
- Search result state: show applied query, count, clear control, and suggested related terms.

No-results state:

- Show "Try cactus, jade, aloe, indoor, hanging, combo."
- Show available limited plants or popular low-care plants.
- Offer "Clear filters" and "Chat on WhatsApp for availability."

### 3. Filter System

Desktop:

- Use a left filter rail or compact filter panel for medium/large screens.
- Keep category/intent chips above product grid as promoted filters.
- Use checkbox groups for non-mutually-exclusive filters where possible.
- Show applied filters as removable chips above the grid.

Mobile:

- Replace multiple visible selects with a single sticky "Filter" button and bottom sheet.
- Bottom sheet groups:
  - Plant type
  - Care: water, sunlight
  - Transit risk
  - Price
  - Size
  - Collection: Limited, Combo, Indoor, Hanging
- The bottom sheet should show result count and "Show plants" as the primary action.
- Keep 3-5 promoted chips visible outside the sheet.

Sorting:

- Keep "Recommended" as default, but define it as a useful mixed ranking:
  - Limited/restocked first
  - In-stock only
  - Lower transit risk
  - Popular categories mixed for variety
  - Then numeric product ID/newness
- Keep price low/high and newest.
- Add "Easy care" sort only if care data is consistent.

### 4. Product Card

Make product cards calmer and easier to scan.

Recommended card layout:

- Image ratio: 4:5 on mobile, 1:1 or 4:3 on desktop depending on image quality.
- Top-left: product ID.
- Top-right: wishlist icon.
- Bottom image badge: Limited, Restocked, or Discount only when meaningful.
- Below image:
  - Product name, max 2 lines.
  - Price and original price if discounted.
  - Size pill if available.
  - Three compact care chips: water, light, transit.
  - Stock urgency if low stock is known.
- Primary action:
  - Default: "Add" button.
  - Quantity stepper appears only after Add or inside cart, not on every card by default.
  - If already in cart, show "In cart" with a small quantity/edit affordance.
- Secondary action:
  - Tap card opens product detail/modal.

Touch behavior:

- Remove hover-only quick view as a core feature.
- On mobile, tapping image/title opens product detail; tapping Add directly adds.
- Use subtle pressed states and immediate toast feedback.

### 5. Product Detail

Make the product page the confidence layer.

Structure:

- Image gallery first, with stable dimensions and thumbnails.
- Sticky mobile buy bar with price, quantity, Add to Cart, and Wishlist.
- Product title, ID, price, stock, and category.
- "Will this suit me?" care panel:
  - Water
  - Light
  - Transit risk
  - Best for: desk, balcony, indoor, beginner, gift if data exists.
- Delivery and order confidence panel:
  - "Order confirmed on WhatsApp"
  - "Delivery charge shared after pincode check"
  - "Ships Mon/Wed"
  - "Transit replacement support"
- Pincode check near the buy action, not only in cart.
- Description in collapsible sections:
  - About
  - Care
  - Shipping notes
  - What you receive
- Related products:
  - Similar category
  - Lower transit risk alternatives
  - Same price range

### 6. Cart And WhatsApp Checkout

Keep the business model but make the process feel intentional.

Cart layout:

- Cart items grouped with image, name, ID, quantity, item total, and remove.
- Out-of-stock items stay visible but clearly separated with one-tap remove.
- Sticky mobile summary at bottom:
  - Item count
  - Total
  - Checkout on WhatsApp

Checkout details:

- Use a stepper or sections:
  1. Cart
  2. Delivery details
  3. WhatsApp confirmation
- Make optional fields feel optional, but encourage pincode:
  - Pincode first, because it determines delivery feasibility.
  - Name, phone, WhatsApp, address after pincode.
- Show "Same as phone" as a clean checkbox.
- Use inline validation and focus invalid fields.
- After checkout, show a confirmation screen before opening WhatsApp:
  - "Your order message is ready."
  - "You can confirm stock, delivery charge, and ETA on WhatsApp."

### 7. Trust And Social Proof

Homepage:

- Keep a compact review strip, not a heavy carousel.
- Show 3 trust statements:
  - Packed safely
  - Replacement support for transit issues
  - Loved by plant collectors since 2020, if accurate

Reviews page:

- Keep text reviews lightweight.
- Instagram story reviews should remain route-lazy and not affect home page.
- Use thumbnail grid with lazy loading and optional lightbox.

Product page:

- Add a small "Customers mention: healthy plants, packing, safe arrival" summary if review data supports it.

### 8. Visual Direction

Tone:

- Premium nursery, not generic luxury.
- Quiet, natural, confident.
- Actual plants should provide richness; the UI should stay restrained.

Palette:

- Primary: deep forest green.
- Surface: warm white, but less cream-heavy than the current app.
- Text: near-black green/charcoal for better readability.
- Accent: terracotta for limited/offers.
- Supporting accent: muted sage or cool blue-gray for information states.
- Success: natural green.
- Warning/error: clear red/amber, used sparingly.

Avoid:

- Large gradient hero blocks.
- Decorative orbs/blobs.
- Overuse of emoji as UI icons.
- Product-card nesting.
- Too many rounded-pill controls at once.
- Purple-blue gradient styling.

Shape and spacing:

- Cards: 8px radius.
- Buttons: 10-12px radius.
- Icon buttons: square/circle with 44px touch target.
- Product grid gap: compact but breathable.
- Use fixed image aspect ratios to prevent layout shift.

Typography:

- Keep Outfit if brand-approved.
- Use a tighter type scale:
  - Page heading: 28-32px desktop, 22-24px mobile.
  - Product card title: 14-16px.
  - Product price: 16-18px.
  - Microcopy: 12-13px.
- No viewport-width font scaling.
- Letter spacing should stay 0 except tiny uppercase labels if absolutely needed.

Icons:

- Prefer `lucide-react` icons for search, filter, cart, user, heart, chevrons, plus/minus, truck, package, leaf, sun, droplet.
- Keep plant-specific pictorial hints minimal and consistent.

## Performance Plan

Targets:

- LCP: 2.5s or less on real mobile networks.
- INP: 200ms or less.
- CLS: 0.1 or less.
- Home initial JS should stay lean. Admin, PDF, export, and heavy review image work must stay out of the initial customer shopping route.

Image delivery:

- Stop using raw GitHub image URLs for customer product cards.
- Prefer one canonical image source:
  - `/sale_plants/...` for static catalog fallback, or
  - Firebase Storage/CDN URLs for admin-managed images.
- Generate responsive image sizes:
  - thumbnail: 320px wide WebP/AVIF
  - card: 480px wide WebP/AVIF
  - detail: 900-1200px wide WebP/AVIF
- Use `srcset` and `sizes`.
- Set `width` and `height` or stable aspect-ratio wrappers for every product image.
- Use `fetchpriority="high"` only for the likely LCP image, not for many images.
- Lazy-load below-the-fold images.

JavaScript:

- Keep admin pages lazy.
- Keep PDF libraries lazy and admin/export-only.
- Confirm home page does not eagerly import Instagram screenshots.
- Memoize filtered/sorted products.
- Debounce search input lightly, around 100-150ms.
- If product count grows beyond a few thousand, move search indexing/filtering to a small worker or precomputed index.

CSS and rendering:

- Reduce expensive hover transforms on large product grids.
- Respect `prefers-reduced-motion`.
- Avoid animating layout properties.
- Keep skeletons stable in size.
- Avoid nested cards and large backdrop blur areas in scroll-heavy views.

Data:

- Keep first page fetch small.
- Cache product pages per category.
- Add explicit product metadata for future filters:
  - isBeginnerFriendly
  - isPetSafe
  - bestLocation
  - stockUrgency
  - transitRegionNotes

## Accessibility And Interaction Requirements

- All controls need visible focus states.
- Filter bottom sheet must trap focus and close on Escape.
- Buttons and icon controls need accessible labels.
- Product card Add button should not steal card navigation unexpectedly.
- Color should not be the only signal for stock, discounts, or invalid input.
- Touch targets should be at least 44px.
- Toasts should be polite and not block checkout.
- Use semantic headings and landmarks.
- Preserve keyboard navigation through search, filters, cards, cart, and checkout.

## Proposed Implementation Phases

### Phase 1: Catalog Redesign

- Replace large hero with compact shopping header and trust strip.
- Redesign product card.
- Add promoted intent chips.
- Replace visible mobile filter selects with filter bottom sheet.
- Add applied filter chips.
- Clean product-list empty states.

### Phase 2: Product Detail And Cart

- Redesign product detail confidence layout.
- Add sticky mobile buy bar.
- Add pincode/shipping confidence near product actions.
- Simplify cart summary and checkout sequence.
- Improve WhatsApp confirmation copy.

### Phase 3: Performance

- Normalize image URLs.
- Add responsive image helper.
- Generate WebP/AVIF variants.
- Audit route chunks after redesign.
- Keep review screenshots and PDF/admin libraries lazy.
- Measure Lighthouse/PageSpeed and Vercel Speed Insights.

### Phase 4: Polish And QA

- Accessibility pass.
- Mobile viewport pass at 360px, 390px, 430px.
- Desktop pass at 1280px and 1440px.
- Cart/checkout regression tests.
- Visual interaction pass: Add, remove, wishlist, filters, search, no results, out-of-stock.

## Approval Checklist

Please approve or reject these direction choices before implementation:

- Catalog-first first viewport instead of large hero.
- Mobile filter bottom sheet instead of many always-visible selects.
- Product card quantity stepper hidden until Add/in-cart state.
- Real product/nursery imagery as the primary visual identity.
- 8px product-card radius and calmer premium surfaces.
- Intent chips such as Easy care, Low water, Low light, Transit safe, Under Rs. 99, Limited.
- Product detail page as the main confidence layer for care, transit, delivery, and WhatsApp order flow.
- Image delivery cleanup as part of the redesign, not a separate later task.

## Recommendation

Approve the full direction, but implement it in phases. The biggest customer-facing gains will come from Phase 1 and Phase 2. The biggest speed gains will come from image delivery cleanup and keeping heavy routes lazy.

The UI should feel less like "a site explaining the shop" and more like "a shop that instantly helps me find the right plant."
