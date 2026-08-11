# Chrome Web Store Privacy tab answers

These answers are written to match Receivd version 0.2.0. Re-check them whenever the extension's permissions or data practices change.

## Single purpose

Receivd enhances authenticated TCGplayer order pages so collectors can track whether orders and individual card quantities arrived and review orders that still need attention.

## Permission justification: `storage`

Receivd uses browser extension storage to keep reconstructible TCGplayer order metadata locally and compact user-created tracking state and preferences such as status, received quantities, notes, cutoff date, identifiers, and update timestamps. Synced storage is best effort; a local mirror lets the extension continue working when browser sync is disabled, offline, unavailable, or over quota.

## Host permission justification: `https://*.tcgplayer.com/*`

Receivd needs access to TCGplayer pages to inspect order information already rendered for the signed-in user and add delivery-tracking controls beside recognized orders. The content adapter exits immediately outside TCGplayer account/order routes. Receivd does not read authentication cookies or tokens and does not bypass TCGplayer authentication.

## Remote code

Select: **No, I am not using remote code.**

All React, storage, parsing, content-script, and service-worker code is compiled into the submitted package. Receivd does not download or execute JavaScript or WebAssembly from remote sources.

## Data types handled

Use conservative disclosures. Select:

- **Website content:** Yes. Receivd reads order information rendered on supported TCGplayer pages.
- **Financial and payment information:** Yes. Receivd caches marketplace order totals and item prices. It does not handle card numbers, bank details, or payment credentials.
- **Personally identifiable information:** Yes. Receivd stores order numbers and may store shipment tracking numbers, which are transaction-specific identifiers. It does not extract the user's name, address, email address, or TCGplayer credentials.
- **User-generated content:** Yes, if the dashboard presents this category. Receivd stores user-created notes, statuses, and received quantities.

Do not select:

- Health information
- Authentication information
- Personal communications
- Location
- Web history
- User activity unrelated to the extension's order-tracking purpose

## Data-use certifications

Certify all applicable Limited Use statements:

- Receivd does not sell or transfer user data to third parties outside the allowed purposes.
- Receivd does not use or transfer user data for purposes unrelated to its single purpose.
- Receivd does not use or transfer user data to determine creditworthiness or for lending.
- The developer does not receive or permit humans to read users' cached orders, tracking state, or notes.
- Receivd only handles the minimum information needed for its prominently described features.

## Privacy policy URL

https://devintyler26.github.io/Receivd/privacy.html

The URL becomes live after GitHub Pages is enabled for the repository's `docs/` directory.
