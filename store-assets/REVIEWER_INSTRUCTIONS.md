# Chrome Web Store reviewer instructions

## Overview

Receivd has no developer-operated account or login. It enhances order information that TCGplayer renders after the user signs into TCGplayer normally. Receivd never requests, stores, or intercepts TCGplayer credentials, cookies, or authentication tokens.

## Prerequisite

To exercise the complete inline workflow, use a TCGplayer account that already has at least one order. TCGplayer authentication is a third-party prerequisite; no Receivd credentials exist and no TCGplayer credentials are included with this submission.

The popup and first-run experience can still be inspected without signing into TCGplayer.

## Primary test flow

1. Install the extension and click its toolbar icon.
2. With no cached orders, verify the popup shows “No orders found yet” and a button to open TCGplayer order history.
3. Sign into TCGplayer through TCGplayer's normal website flow.
4. Open `https://store.tcgplayer.com/myaccount/orderhistory`.
5. Confirm a compact status badge appears below each recognized `.orderWrap` order container.
6. Expand the Receivd control and change the status between Pending, Delivered, Partially Delivered, Missing / Never Arrived, and Refunded.
7. Confirm the panel collapses after choosing a status.
8. Choose Partially Delivered, expand the control again, and edit individual received quantities.
9. Reload the TCGplayer page and confirm the selected status and quantities remain.
10. Open the extension popup and verify the cached order appears with its current status.
11. Open the order detail inside the popup to inspect quantities, missing counts, metadata, and the optional note.
12. On an overdue Pending order, choose “Ask seller for an update” and confirm TCGplayer's compose form opens with an editable message. Receivd never submits the message.

## Important behaviors

- Orders without explicit user tracking state are interpreted as Pending without writing default records to synced storage.
- Delivered treats all cached quantities as received without writing one record per card.
- Pending orders past TCGplayer's rendered estimated-delivery date receive an orange warning but are never automatically marked Missing.
- A rendered full-refund notice can produce a local Refunded default; partial or ambiguous refunds do not.
- Re-scraping TCGplayer metadata never overwrites delivery status, received quantities, or notes.
- If Chrome Sync is unavailable, user changes remain usable through the local fallback.

## Supported page and selector notes

- Confirmed history URL: `https://store.tcgplayer.com/myaccount/orderhistory`
- Main captured order container: `.orderWrap`
- Preferred order fields: stable `data-aid` attributes rendered by TCGplayer
- The adapter also uses semantic item cells and product URLs for stable product identifiers.
- Order-detail variations may depend on TCGplayer's current authenticated markup; failures are caught and do not remove or modify TCGplayer controls.

## External links

- The “Buy me a coffee” link is user initiated and opens `https://www.paypal.com/paypalme/DevinCunningham` in a new tab.
- Receivd does not process payments and does not attach order or tracking information to the PayPal URL.
