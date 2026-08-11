# Receivd

**Receivd – TCG Order Tracker** is a Chrome extension for reconciling TCGplayer orders with what actually arrives in the mail. It adds lightweight delivery controls to TCGplayer order pages and provides an attention-first popup dashboard.

Receivd has no account, backend, database, OAuth flow, or access to TCGplayer credentials. The user signs into TCGplayer normally; the extension only reads plain order information already rendered on supported authenticated pages.

## MVP features

- Detects orders on TCGplayer order history and order detail pages.
- Adds Pending, Delivered, Partially Delivered, Missing / Never Arrived, and Refunded controls to recognized orders.
- Tracks received quantities by stable order-line identity and shows missing quantities.
- Prominently flags Pending orders after TCGplayer's estimated delivery date without declaring them Missing.
- Shows a safe outbound tracking-number link in expanded order controls and popup details when TCGplayer provides one.
- Opens popup orders on TCGplayer's order-history page and automatically submits the selected order number through the rendered order search form.
- Offers an overdue-only seller follow-up action that opens TCGplayer's captured per-order compose route and prefills a courteous status request without sending it.
- Stores optional notes, capped at 500 characters and saved with a short debounce.
- Shows counts, an action badge, attention-first orders, all requested filters, and search by order number, seller, tracking number, or card name.
- Includes popup settings with a synced, inclusive “received through” date for resolving older order history without creating a tracking record for every order.
- Handles dynamically rendered pages with a debounced `MutationObserver` and History API navigation signals—there is no polling loop.
- Preserves user tracking when TCGplayer metadata is refreshed.
- Continues working locally when Chrome Sync is disabled, offline, temporarily unavailable, or over quota.

## Development

Requirements: Node.js 20.19+ (Node 22+ recommended) and npm.

```bash
npm install
npm run dev
```

`npm run dev` performs an initial complete build and then watches the popup, content script, and service worker. Reload the unpacked extension and the TCGplayer page after a rebuild.

Useful commands:

```bash
npm run build       # production build in dist/
npm run test        # fixture and domain-logic tests
npm run test:watch  # tests in watch mode
npm run typecheck   # strict TypeScript check
npm run check       # typecheck, test, then build
npm run release:zip # check, build, and create release/receivd-v<version>.zip
```

### Load into Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose this repository's `dist/` directory.
6. Sign into TCGplayer normally and visit the order history page.

The extension never asks for or stores a TCGplayer password, cookie, authentication token, or other credential.

## Chrome Web Store submission

The repository contains a ready-to-use submission bundle:

- `release/receivd-v0.2.0.zip` — generated Web Store upload package; `manifest.json` is at the ZIP root.
- `store-assets/STORE_LISTING.md` — listing title, summary, description, URLs, and asset order.
- `store-assets/PRIVACY_TAB.md` — single-purpose statement, permission justifications, remote-code declaration, data disclosures, and Limited Use certifications.
- `store-assets/REVIEWER_INSTRUCTIONS.md` — authenticated TCGplayer test flow and selector notes.
- `store-assets/SUBMISSION_CHECKLIST.md` — remaining Developer Dashboard steps.
- `store-assets/screenshots/` — three privacy-safe 1280×800 screenshots rendered with synthetic order data.
- `store-assets/promotional/small-promo-440x280.png` — small promotional tile.
- `docs/privacy.html` — GitHub Pages-ready privacy policy.

Before submitting, enable GitHub Pages for the repository's `docs/` directory and confirm the privacy-policy URL in `store-assets/STORE_LISTING.md` is live. Start with an Unlisted release for logged-in validation, then change the distribution to Public when the beta is stable.

For an update, increase the version in both `package.json` and `public/manifest.json`, then run `npm run release:zip` again. Generated release ZIPs are intentionally ignored by Git.

## Architecture

Receivd uses three independently bundled Manifest V3 entry points:

- `src/popup/` — React popup/dashboard and order-detail editor.
- `src/content/` — safe, small-surface integration mounted beside TCGplayer order content.
- `src/background/` — sync/local reconciliation and the needs-attention action badge.
- `src/marketplaces/tcgplayer/` — every TCGplayer-specific selector and extraction assumption.
- `src/storage/` — versioned local metadata, compact synced tracking, and timestamp conflict handling.
- `src/components/` — status and quantity controls shared by the popup and page integration.

The popup, content script, and service worker are compiled separately so `content.js` is a self-contained classic script accepted by `content_scripts` in Manifest V3. No extension framework or remote runtime code is used.

### Data flow and reconciliation

```text
Authenticated TCGplayer page
        ↓ rendered plain values only
chrome.storage.local metadata cache
        +
chrome.storage.sync tracking state
        ↓
Receivd page controls + popup
```

Marketplace metadata and user statements are deliberately separate. Re-scraping an order can enrich dates, seller details, totals, tracking, or items but cannot overwrite status, quantities, or notes.

When an existing metadata record is seen again:

- newly available scalar fields enrich the local record;
- known items are matched by stable ID and enriched;
- newly discovered items are added;
- previously cached details are retained if a less-detailed page omits them;
- user tracking is untouched because it lives in a different record namespace.

## Local storage vs Chrome Sync

### `chrome.storage.local`

Local storage contains reconstructible TCGplayer metadata: order dates/numbers, seller, total, shipping/tracking information, card names and product details, and product/order-line identifiers. It also holds a compact mirror of user tracking as an offline/no-Sync fallback.

Metadata is stored per order under versioned keys. Identical metadata is not repeatedly written, and `lastSeenAt` writes are limited to once per five minutes unless meaningful data changes.

### `chrome.storage.sync`

Sync contains only small user-created records, one per changed order:

- explicit delivery status;
- received quantity exceptions by item ID;
- note (maximum 500 characters);
- schema version and `updatedAt` timestamp.

It also contains one compact settings record. The optional received-through date acts as a default for dated marketplace orders and avoids creating hundreds of redundant Delivered records.

An unseen order has no sync record and is normally interpreted as Pending. A marketplace-confirmed full refund is interpreted locally as Refunded without creating a default sync record. Delivered can represent all quantities as received without writing every line item. Full scraped order objects, HTML, prices, card names, and other reconstructible data are never copied into sync storage.

Chrome—not Receivd—controls whether extension data syncs between browsers. A failed sync write does not block the user action: Receivd writes the local mirror first and retries reconciliation when sync is available again.

### Conflict behavior

Each user edit updates the order's `updatedAt` value. When local and synced copies differ, the newer order record wins. If two different edits have the exact same millisecond timestamp, canonicalized record content provides a deterministic lexical tie-break. This is intentionally simple last-write-wins behavior for the MVP.

## Stable item identity

Item quantity state never uses an array index.

1. A rendered TCGplayer order-line ID is preferred and stored as `line:<normalized id>`.
2. The captured TCGplayer history markup does not expose an order-line ID, so Receivd creates a deterministic FNV-1a fingerprint from product ID, condition, printing, per-line seller, and ordered quantity. If no product ID is available, normalized card name, set, and product URL become the fallback.

Reordering DOM rows therefore does not move tracking between different cards. If TCGplayer presents two truly indistinguishable lines with none of those distinguishing fields, they intentionally collapse to the same fingerprint; logged-in validation may reveal another stable line attribute that should be added to the selector adapter.

## Status and quantity behavior

- No explicit record means Pending.
- Marking Delivered treats every cached line as fully received without requiring per-card clicks.
- Marking Partial opens the card checklist; unspecified quantities begin at zero.
- Editing a Delivered order materializes its all-received quantities before applying the exception.
- Receiving every ordered quantity changes the order to Delivered.
- Receiving some but not all changes it to Partial.
- Setting all quantities to zero does not unexpectedly replace an explicit Missing decision.
- Missing is never inferred from order age.
- Pending orders past TCGplayer's rendered `est.delivery` date receive a warning and overdue-day count, and sort ahead of ordinary Pending orders.
- A captured “full refund” notice resolves the order as Refunded and removes it from Needs Attention and the action badge.
- Partial or ambiguous refund notices do not automatically resolve an order.
- An explicit user-selected Receivd status overrides a marketplace-derived Refunded default.
- A configured received-through date treats orders dated on or before it as Delivered, while full refunds remain Refunded. Older tracking records are superseded by the cutoff; an individual status changed afterward wins.

## Permissions

The production manifest requests only:

- `storage` — saves local marketplace metadata and compact user tracking in extension local/sync storage.
- `https://*.tcgplayer.com/*` host access — allows the declared content script to inspect rendered TCGplayer order pages. The adapter exits immediately outside account/order routes.

The extension has no history, cookies, identity, web request, broad tab-reading, clipboard, or unrelated host permissions. Opening a user-clicked TCGplayer link with `chrome.tabs.create` does not require the `tabs` permission.

## TCGplayer extraction assumptions

The confirmed order-history URL is `https://store.tcgplayer.com/myaccount/orderhistory`. The history adapter has been validated against a user-provided authenticated page-body capture; scripts, account/session values, addresses, and other unrelated page content were not copied into the repository. Order-detail markup still needs a separate capture or live validation.

The isolated selector table in `src/marketplaces/tcgplayer/selectors.ts` currently uses:

- the observed semantic `.orderWrap` element as one independently shipped order/package;
- `spn-sellerorderwidget-orderdate` and related `data-aid` values for dates, seller, summary, tracking number/link, and item tables;
- the transaction button's `data-aid` suffix as the stable order number, including TCGplayer Direct numbers;
- the labelled `Total:` summary-table row rather than assuming a fixed row index;
- `.orderHistoryItems`, `.orderHistoryDetail`, `.orderHistoryPrice`, and `.orderHistoryQuantity` cells within each observed item row;
- the numeric product ID in TCGplayer's product-thumbnail URL;
- `.orderSoldby` for per-item sellers within TCGplayer Direct packages;
- `div-sellerorderwidget-singlerefund` for full/partial refund metadata, with Canceled retained separately as shipping state;
- the rendered `est.delivery by <date>` shipping text for local estimated-delivery metadata;
- `txb-orderhistorysearch-searchstring` and `btn-orderhistorysearch-search` for the user-requested “Open on TCGplayer” order search;
- `btn-sellerorderwidget-contact` for each order's normal seller/TCGplayer Direct message route;
- the observed `select#Subject` and `textarea#Body` compose fields, plus semantic fallbacks for the canned-message prefill;
- generic data attributes, accessible labels, semantic links, and URL IDs as fallbacks for other order/detail layouts.

The observed descriptive classes are isolated in the adapter; deep nesting, generated hashes, and `nth-child` selectors are not used. Parsing failures are caught, logged, and ignored without removing or hijacking TCGplayer content. Extracted strings are rendered as React text; scraped HTML is never injected.

Fixture coverage lives in `tests/fixtures/tcgplayer-order-history.html`. It is a sanitized reproduction of the observed structure and contains no account, session, address, or real order data.

The parser was also run directly against the supplied capture and recognized all 10 order packages. Every package had an order number, date, total, and seller; every item had a product ID, condition, and price.

## Manual TCGplayer validation needed

Validated from the supplied history-page capture:

- [x] Ten order/package containers are detected.
- [x] Standard and TCGplayer Direct order numbers are extracted.
- [x] Seller, order date, labelled total, shipping state, and tracking number are extracted.
- [x] Individual cards and quantities greater than one are extracted.
- [x] Product ID, set, condition, printing, per-item Direct seller, and item price are extracted.
- [x] The supplied canceled/full-refund order is recognized as Refunded with matching refund amount and order total.
- [x] The supplied overdue order's estimated delivery date is extracted and produces the correct calendar-day warning.
- [x] Stable product-based fingerprints remain independent of DOM row order.

These checks still require running the built extension while logged in:

- [ ] Receivd controls mount in the intended location without disrupting TCGplayer controls.
- [ ] Partial quantity editing persists after a real history-page reload.
- [ ] TCGplayer Direct item checklists display the correct underlying sellers.
- [ ] Order detail page markup is detected and enriches cached history metadata.
- [ ] Client-side navigation and dynamically inserted orders trigger one debounced rescan.
- [ ] The `.orderWrap` mount location behaves correctly across desktop widths.
- [ ] Overdue Pending orders open the correct seller or TCGplayer Direct message route.
- [ ] The overdue follow-up action prefills an editable subject and message without submitting it.

When a real selector differs, update `selectors.ts` and add a sanitized HTML fixture before changing core components.

## Tests

The current suite covers:

- metadata enrichment without manual-state loss;
- four ordered / three received ⇒ one missing;
- all received ⇒ Delivered and some received ⇒ Partial;
- explicit Missing preservation at zero received;
- newer-timestamp conflict selection and deterministic ties;
- order-line and fallback item identities across display reordering and Direct sellers;
- production-shaped fixture extraction for standard and TCGplayer Direct orders, labelled totals, shipping, tracking, product IDs, sets, conditions, printings, sellers, prices, and quantities.
- full-refund parsing, marketplace-derived Refunded status, partial-refund restraint, and explicit-status override behavior.
- estimated-delivery extraction, calendar-day overdue calculations, resolved-status restraint, and overdue Pending sorting.

## Known MVP limitations

- History extraction is capture-validated, but inline mounting and order-detail extraction still require logged-in runtime validation.
- A device initially shows a synced order number/status/note without seller/card metadata until that device visits the relevant TCGplayer page.
- Last-write-wins operates on the whole order tracking record, not independent note/item fields.
- The Chrome Sync quota still bounds the total number of exceptionally large tracked orders; records are compact and per-order, but no archival UI exists yet.
- The popup links back to the cached source page, not a guaranteed canonical order-detail URL.
- There is no standalone options page, data export/import, order archive, or non-TCGplayer marketplace support; the current settings live in the popup.

## Suggested next steps

1. Load the extension against the live history page and validate the inline mount location and persistence flow.
2. Provide a sanitized order-detail capture so that route can receive the same production-shaped coverage.
3. Add browser-level extension tests using the sanitized fixtures and mocked Chrome storage areas.
4. Add compact archival controls if old Pending/Missing orders make the action badge less useful.
5. Consider a sync-quota warning only if real usage shows users approaching Chrome's limits.

Receivd intentionally remains TCGplayer-only for this MVP, but marketplace-specific code is isolated so a future adapter can be added without changing storage or shared tracking UI.
