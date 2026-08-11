import { useEffect, useMemo, useState } from "react";
import { setReceivedThroughDate } from "../../storage/settings";
import type { DisplayOrder, ReceivdSettings } from "../../types";
import { isOrderWithinReceivedThroughDate } from "../../utils/orders";

interface SettingsProps {
  settings: ReceivdSettings;
  orders: DisplayOrder[];
  onBack: () => void;
  onSettingsChanged: (settings: ReceivdSettings) => void;
}

export function Settings({ settings, orders, onBack, onSettingsChanged }: SettingsProps) {
  const [date, setDate] = useState(settings.receivedThroughDate ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    setDate(settings.receivedThroughDate ?? "");
  }, [settings.receivedThroughDate]);

  const affectedCount = useMemo(
    () => orders.filter((order) => isOrderWithinReceivedThroughDate(order.metadata, date)).length,
    [date, orders]
  );
  const unchanged = date === (settings.receivedThroughDate ?? "");

  const save = async (nextDate: string) => {
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const next = await setReceivedThroughDate(nextDate || undefined);
      onSettingsChanged(next);
      setMessage(
        nextDate
          ? `${affectedCount} cached order${affectedCount === 1 ? " is" : "s are"} now covered.`
          : "Received-through date cleared."
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this setting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="popup-shell settings-shell">
      <header className="detail-header settings-header">
        <button aria-label="Back to orders" className="icon-button" onClick={onBack} type="button">←</button>
        <div>
          <span>Receivd</span>
          <h1>Settings</h1>
        </div>
      </header>

      <section className="detail-card settings-card">
        <div className="settings-section-heading">
          <div>
            <span className="settings-kicker">Order history</span>
            <h2>Received through date</h2>
          </div>
          {settings.receivedThroughDate && <span className="setting-active-badge">Active</span>}
        </div>
        <p className="settings-copy">
          Treat orders placed on or before this date as Delivered. TCGplayer-confirmed full refunds
          remain Refunded; partial refunds are treated as Delivered.
        </p>
        <label className="settings-date-field">
          <span>I had received everything through</span>
          <input
            disabled={saving}
            max="9999-12-31"
            onChange={(event) => {
              setDate(event.target.value);
              setMessage(undefined);
              setError(undefined);
            }}
            type="date"
            value={date}
          />
        </label>
        {date && (
          <div className="settings-preview">
            <strong>{affectedCount}</strong>
            <span>cached order{affectedCount === 1 ? "" : "s"} on this device will be covered</span>
          </div>
        )}
        <p className="settings-help">
          This is an inclusive default, not a destructive bulk edit. Changing an individual order
          afterward overrides the setting, and newly discovered older orders are covered automatically.
        </p>
        {message && <p className="settings-message is-success" role="status">✓ {message}</p>}
        {error && <p className="settings-message is-error" role="alert">{error}</p>}
        <div className="settings-actions">
          <button
            className="primary-button"
            disabled={saving || !date || unchanged}
            onClick={() => void save(date)}
            type="button"
          >
            {saving ? "Saving…" : "Save date"}
          </button>
          {settings.receivedThroughDate && (
            <button
              className="text-button"
              disabled={saving}
              onClick={() => {
                setDate("");
                void save("");
              }}
              type="button"
            >
              Clear date
            </button>
          )}
        </div>
      </section>

      <section className="detail-card settings-card compact-settings-card">
        <span className="settings-kicker">Sync and privacy</span>
        <h2>Your data stays in your browser</h2>
        <p className="settings-copy">
          This preference and your compact tracking changes can follow you when your browser's sync is
          enabled. Reconstructible TCGplayer order details remain local to each device.
        </p>
      </section>
    </main>
  );
}
