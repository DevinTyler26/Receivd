/**
 * TCGplayer does not publish a DOM contract for authenticated order pages.
 * Keep every assumption here so it can be corrected after logged-in validation.
 * Data attributes and semantic links are intentionally preferred over CSS classes.
 */
export const selectors = {
  orderContainers: [
    ".orderWrap",
    "[data-order-number]",
    "[data-order-id]",
    '[data-testid="order-summary"]',
    '[data-testid="order-card"]',
    '[data-testid="order-history-item"]'
  ],
  orderLinks: [
    'a[href*="/Order/Details/"]',
    'a[href*="/order/details/"]',
    'a[href*="/orderdetails/"]',
    'a[href*="orderNumber="]'
  ],
  orderNumber: [
    '[data-aid^="btn-ratetransaction-transactionnumber_"]',
    "[data-order-number]",
    '[data-testid="order-number"]',
    '[aria-label*="Order number" i]',
    '[aria-label*="Order #" i]'
  ],
  orderDate: [
    '[data-aid="spn-sellerorderwidget-orderdate"]',
    "[data-order-date]",
    '[data-testid="order-date"]',
    "time[datetime]",
    '[aria-label*="Order date" i]'
  ],
  seller: [
    '[data-aid="spn-sellerorderwidget-vendorname"]',
    "[data-seller-name]",
    '[data-testid="seller-name"]',
    '[aria-label*="Seller" i]'
  ],
  total: [
    "[data-order-total]",
    '[data-testid="order-total"]',
    '[aria-label*="Order total" i]'
  ],
  tracking: [
    '[data-aid="spn-sellerorderwidget-trackingnumber"]',
    "[data-tracking-number]",
    '[data-testid="tracking-number"]',
    '[aria-label*="Tracking" i]'
  ],
  contactSeller: [
    '[data-aid="btn-sellerorderwidget-contact"]',
    'a[href*="/myaccount/messagecenter/create/"]',
    '[data-contact-url]'
  ],
  shippingStatus: [
    '[data-aid="spn-sellerorderwidget-trackingnumber"]',
    "[data-shipping-status]",
    '[data-testid="shipping-status"]',
    '[aria-label*="Shipping status" i]'
  ],
  itemContainers: [
    '[data-aid="tbl-sellerorderwidget-ordertable"] tbody tr',
    "[data-order-line-id]",
    "[data-product-id]",
    "[data-receivd-fixture-item]",
    '[data-testid="order-item"]',
    '[data-testid="order-line-item"]'
  ],
  itemName: [
    "td.orderHistoryItems a.nocontext",
    "td.orderHistoryItems img[alt]",
    "[data-product-name]",
    '[data-testid="product-name"]',
    '[itemprop="name"]',
    'a[href*="/product/"]'
  ],
  itemQuantity: [
    "td.orderHistoryQuantity",
    "[data-quantity]",
    '[data-testid="quantity"]',
    '[aria-label*="Quantity" i]'
  ],
  itemSet: ["[data-set-name]", '[data-testid="set-name"]'],
  itemCondition: ["[data-condition]", '[data-testid="condition"]'],
  itemPrinting: ["[data-printing]", '[data-testid="printing"]'],
  itemDetails: ["td.orderHistoryDetail"],
  itemPrice: ["td.orderHistoryPrice"],
  itemSeller: [".orderSoldby a"],
  itemProductLink: ["td.orderHistoryItems a.nocontext", 'a[href*="/product/"]'],
  itemThumbnail: ["td.orderHistoryItems img[src]"],
  orderSummary: ['[data-aid="tbl-sellerorderwidget-productsinorder"]'],
  refundNotice: ['[data-aid="div-sellerorderwidget-singlerefund"]', '[data-aid*="refund" i]'],
  orderHistorySearchInput: [
    '[data-aid="txb-orderhistorysearch-searchstring"]',
    '#SearchString',
    'input[name="SearchString"]',
    'input[title="Order History Search"]'
  ],
  orderHistorySearchSubmit: [
    '[data-aid="btn-orderhistorysearch-search"]',
    '#OrderHistoryFilterForm input[type="submit"]',
    'input[type="submit"][title="Search Submit"]'
  ],
  orderHistoryDateRange: [
    '[data-aid*="orderhistory" i][data-aid*="daterange" i]',
    "select#DateRange",
    'select[name="DateRange"]'
  ],
  sellerMessageSubject: [
    'select#Subject',
    'select[name="Subject"]',
    '[data-aid*="subject" i] input',
    'input[data-aid*="subject" i]',
    '#Subject',
    'input[name*="subject" i]',
    'input[title*="subject" i]'
  ],
  sellerMessageBody: [
    'textarea#Body',
    'textarea[name="Body"]',
    '[data-aid*="message" i] textarea',
    'textarea[data-aid*="message" i]',
    '#Message',
    'textarea[name*="message" i]',
    'textarea[aria-label*="message" i]',
    'textarea'
  ]
} as const;
