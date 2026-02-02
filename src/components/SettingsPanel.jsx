import React from 'react';

const ACCENT_PRESETS = [
  { color: '#c17f24', label: 'Brass' },
  { color: '#d4a017', label: 'Gold' },
  { color: '#5a9e3e', label: 'Green' },
  { color: '#4d9e8a', label: 'Teal' },
  { color: '#7b5ea7', label: 'Purple' },
  { color: '#b5442e', label: 'Red' },
  { color: '#cc6a2e', label: 'Orange' },
  { color: '#3a7cc4', label: 'Blue' },
];

const TAB_OPTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'agents', label: 'Agents' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'issues', label: 'Issues' },
  { id: 'merge-queue', label: 'Merge Queue' },
  { id: 'mail', label: 'Mail' },
  { id: 'events', label: 'Events' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'health', label: 'Health' },
  { id: 'controls', label: 'Controls' },
  { id: 'overview', label: 'Map' },
];

function SliderSetting({ label, value, min, max, step, unit, onChange }) {
  const display = unit === 's' ? (value / 1000).toFixed(1) + 's' : value + unit;
  return (
    <div className="settings-slider">
      <div className="settings-slider__header">
        <span className="settings-slider__label">{label}</span>
        <span className="settings-slider__value">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="settings-range"
      />
    </div>
  );
}

function ToggleSetting({ label, description, checked, onChange }) {
  return (
    <label className="settings-toggle">
      <div className="settings-toggle__text">
        <span className="settings-toggle__label">{label}</span>
        {description && <span className="settings-toggle__desc">{description}</span>}
      </div>
      <div className={`settings-switch ${checked ? 'settings-switch--on' : ''}`} onClick={() => onChange(!checked)}>
        <div className="settings-switch__thumb" />
      </div>
    </label>
  );
}

export default function SettingsPanel({ settings, onUpdate, onReset, defaults }) {
  return (
    <div className="settings-panel">
      {/* Polling Intervals */}
      <section className="settings-section">
        <h3 className="settings-section__title">{'\u23F1'} Polling Intervals</h3>
        <p className="settings-section__desc">Control how frequently the dashboard fetches data.</p>
        <SliderSetting
          label="Terminal refresh"
          value={settings.terminalRefreshMs}
          min={500}
          max={5000}
          step={100}
          unit="s"
          onChange={v => onUpdate('terminalRefreshMs', v)}
        />
        <SliderSetting
          label="Database poll"
          value={settings.dbPollMs}
          min={1000}
          max={10000}
          step={500}
          unit="s"
          onChange={v => onUpdate('dbPollMs', v)}
        />
        <SliderSetting
          label="Git poll"
          value={settings.gitPollMs}
          min={10000}
          max={60000}
          step={1000}
          unit="s"
          onChange={v => onUpdate('gitPollMs', v)}
        />
      </section>

      {/* Theme */}
      <section className="settings-section">
        <h3 className="settings-section__title">{'\u2699'} Theme</h3>
        <ToggleSetting
          label="Dark mode"
          description="Toggle between dark and light theme"
          checked={settings.theme === 'dark'}
          onChange={dark => onUpdate('theme', dark ? 'dark' : 'light')}
        />
        <div className="settings-accent">
          <span className="settings-accent__label">Accent color</span>
          <div className="settings-accent__presets">
            {ACCENT_PRESETS.map(p => (
              <button
                key={p.color}
                className={`settings-accent__swatch ${settings.accentColor === p.color ? 'settings-accent__swatch--active' : ''}`}
                style={{ background: p.color }}
                title={p.label}
                onClick={() => onUpdate('accentColor', p.color)}
              />
            ))}
            <input
              type="color"
              value={settings.accentColor}
              onChange={e => onUpdate('accentColor', e.target.value)}
              className="settings-accent__picker"
              title="Custom color"
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="settings-section">
        <h3 className="settings-section__title">{'\u2709'} Notifications</h3>
        <ToggleSetting
          label="Toast notifications"
          description="Show in-app toast popups for events"
          checked={settings.toastsEnabled}
          onChange={v => onUpdate('toastsEnabled', v)}
        />
        <ToggleSetting
          label="Browser notifications"
          description="Show OS-level notifications (requires permission)"
          checked={settings.browserNotificationsEnabled}
          onChange={v => onUpdate('browserNotificationsEnabled', v)}
        />
        {settings.browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'denied' && (
          <div className="settings-warning">Browser notifications are blocked. Enable them in your browser settings.</div>
        )}
      </section>

      {/* Layout */}
      <section className="settings-section">
        <h3 className="settings-section__title">{'\u2630'} Layout</h3>
        <ToggleSetting
          label="Activity strip"
          description="Show agent activity sidebar"
          checked={settings.showActivityStrip}
          onChange={v => onUpdate('showActivityStrip', v)}
        />
        <ToggleSetting
          label="Terminal overview"
          description="Show live terminal grid panel"
          checked={settings.showTerminals}
          onChange={v => onUpdate('showTerminals', v)}
        />
        <div className="settings-select">
          <span className="settings-select__label">Default tab</span>
          <select
            value={settings.defaultTab}
            onChange={e => onUpdate('defaultTab', e.target.value)}
            className="settings-select__input"
          >
            {TAB_OPTIONS.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Reset */}
      <div className="settings-footer">
        <button className="settings-reset" onClick={onReset}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
