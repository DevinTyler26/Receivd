import { useEffect, useRef, useState } from "react";
import { OrderItemChecklist } from "../../components/OrderItemChecklist";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { OrderStatusMenu } from "../../components/OrderStatusMenu";
import { buildTcgplayerOrderSearchUrl } from "../../marketplaces/tcgplayer/orderHistorySearch";
import { buildSellerMessageUrl } from "../../marketplaces/tcgplayer/sellerMessage";
import { setItemReceivedQuantity, setOrderNote, setOrderStatus } from "../../storage/tracking";
import { NOTE_MAX_LENGTH, type DisplayOrder, type OrderStatus } from "../../types";
import {
  formatOrderDate,
  formatUpdatedAt,
  orderAgeLabel,
  pastEstimateLabel
} from "../../utils/dates";
import { orderDaysPastEstimate } from "../../utils/orders";
import { missingLineCount, totalMissingQuantity } from "../../utils/quantities";
import { safeExternalUrl } from "../../utils/urls";

export function OrderDetail({ order, onBack }: { order: DisplayOrder; onBack: () => void }) {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(order.tracking?.note ?? "");
  const lastSavedNote = useRef(order.tracking?.note ?? "");
  const currentNote = useRef(order.tracking?.note ?? "");
  const metadata = order.metadata;
  const missingCards = metadata ? totalMissingQuantity(metadata.items, order.tracking) : 0;
  const missingLines = metadata ? missingLineCount(metadata.items, order.tracking) : 0;
  const overdueDays = orderDaysPastEstimate(order);
  const trackingUrl = safeExternalUrl(metadata?.trackingUrl);
  const sellerMessageUrl = overdueDays && metadata ? buildSellerMessageUrl(metadata) : undefined;

  useEffect(() => {
    setNote(order.tracking?.note ?? "");
    currentNote.current = order.tracking?.note ?? "";
    lastSavedNote.current = order.tracking?.note ?? "";
  }, [order.orderNumber]);

  useEffect(
    () => () => {
      if (currentNote.current.trim() !== lastSavedNote.current.trim()) {
        void setOrderNote(order.orderNumber, currentNote.current);
      }
    },
    [order.orderNumber]
  );

  useEffect(() => {
    if (note === lastSavedNote.current) return;
    const timer = window.setTimeout(() => {
      void setOrderNote(order.orderNumber, note).then(() => {
        lastSavedNote.current = note.trim();
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [note, order.orderNumber]);

  const changeStatus = async (status: OrderStatus) => {
    setSaving(true);
    try {
      await setOrderStatus(order.orderNumber, status);
    } finally {
      setSaving(false);
    }
  };

  const changeQuantity = async (itemId: string, quantity: number) => {
    if (!metadata) return;
    setSaving(true);
    try {
      await setItemReceivedQuantity(order.orderNumber, itemId, quantity, metadata);
    } finally {
      setSaving(false);
    }
  };

  const openTcgplayerOrder = () => {
    void chrome.tabs.create({ url: buildTcgplayerOrderSearchUrl(order.orderNumber) });
  };

  return (
    <main className="popup-shell detail-shell">
      <header className="detail-header">
        <button aria-label="Back to orders" className="icon-button" onClick={onBack} type="button">←</button>
        <div>
          <span>TCGplayer order</span>
          <h1>#{order.orderNumber}</h1>
        </div>
        <OrderStatusBadge compact status={order.status} />
      </header>

      {!metadata && (
        <section className="metadata-notice">
          <strong>Metadata not yet loaded on this device</strong>
          <p>Visit this order on TCGplayer to add its seller, date, and card checklist. Your Receivd status and note are already available.</p>
        </section>
      )}

      <section className="detail-card status-card">
        <OrderStatusMenu disabled={saving} onChange={changeStatus} value={order.status} />
        {metadata?.orderedAt && <p>{orderAgeLabel(metadata.orderedAt)} · {formatOrderDate(metadata.orderedAt)}</p>}
        {order.status === "partial" && metadata && (
          <div className="missing-callout">
            <strong>{missingCards} card{missingCards === 1 ? "" : "s"} missing</strong>
            <span>across {missingLines} line item{missingLines === 1 ? "" : "s"}</span>
          </div>
        )}
        {order.status === "refunded" && metadata?.refund && (
          <div className="refund-callout">
            <strong>{metadata.refund.kind === "full" ? "Full refund" : "Refund recorded"}</strong>
            <span>
              {[
                metadata.refund.amount !== undefined
                  ? new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: metadata.currency ?? "USD"
                    }).format(metadata.refund.amount)
                  : undefined,
                formatOrderDate(metadata.refund.issuedAt)
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}
        {overdueDays && metadata?.estimatedDeliveryAt && (
          <div className="overdue-callout">
            <strong>Past estimated delivery</strong>
            <span>
              {pastEstimateLabel(overdueDays)} · Estimated {formatOrderDate(metadata.estimatedDeliveryAt)}
            </span>
          </div>
        )}
        {sellerMessageUrl && (
          <button
            className="overdue-message-button"
            onClick={() => void chrome.tabs.create({ url: sellerMessageUrl })}
            type="button"
          >
            Ask seller for an update ↗
          </button>
        )}
      </section>

      {metadata && (
        <section className="detail-card order-facts">
          <h2>Order details</h2>
          <dl>
            {metadata.seller && <><dt>Seller</dt><dd>{metadata.seller}</dd></>}
            {metadata.total !== undefined && (
              <><dt>Total</dt><dd>{new Intl.NumberFormat(undefined, { style: "currency", currency: metadata.currency ?? "USD" }).format(metadata.total)}</dd></>
            )}
            {metadata.shippingStatus && <><dt>Shipping</dt><dd>{metadata.shippingStatus}</dd></>}
            {metadata.estimatedDeliveryAt && (
              <><dt>Est. delivery</dt><dd>{formatOrderDate(metadata.estimatedDeliveryAt)}</dd></>
            )}
            {(metadata.trackingNumber || trackingUrl) && (
              <>
                <dt>Tracking</dt>
                <dd>
                  {trackingUrl ? (
                    <a href={trackingUrl} rel="noopener noreferrer" target="_blank">
                      {metadata.trackingNumber ?? "Track shipment"} ↗
                    </a>
                  ) : metadata.trackingNumber}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      <section className="detail-card checklist-card">
        <div className="section-heading">
          <div><h2>Card checklist</h2><p>Quantity received / ordered</p></div>
          {metadata && <span>{metadata.items.length} line{metadata.items.length === 1 ? "" : "s"}</span>}
        </div>
        <OrderItemChecklist
          disabled={saving || order.status === "refunded"}
          items={metadata?.items ?? []}
          onQuantityChange={changeQuantity}
          status={order.status}
          tracking={order.tracking}
        />
      </section>

      <section className="detail-card note-card">
        <div className="section-heading"><div><h2>Note</h2><p>Saved automatically</p></div><span>{note.length}/{NOTE_MAX_LENGTH}</span></div>
        <textarea
          aria-label="Order note"
          maxLength={NOTE_MAX_LENGTH}
          onChange={(event) => {
            currentNote.current = event.target.value;
            setNote(event.target.value);
          }}
          placeholder="Replacement details, damaged envelope, missing card…"
          rows={3}
          value={note}
        />
        {order.tracking?.updatedAt ? <small>Last updated {formatUpdatedAt(order.tracking.updatedAt)}</small> : null}
      </section>

      <button className="secondary-button" onClick={openTcgplayerOrder} type="button">Open on TCGplayer ↗</button>
    </main>
  );
}
