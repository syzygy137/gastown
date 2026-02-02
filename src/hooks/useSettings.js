import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'gastown-settings';

const DEFAULTS = {
  // Polling (milliseconds)
  terminalRefreshMs: 1500,
  dbPollMs: 2000,
  gitPollMs: 30000,

  // Theme
  theme: 'dark',
  accentColor: '#c17f24',

  // Notifications
  toastsEnabled: true,
  browserNotificationsEnabled: false,

  // Layout
  showTerminals: true,
  showActivityStrip: false,
  defaultTab: 'work',
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export default function useSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const prevPollingRef = useRef({
    terminalRefreshMs: settings.terminalRefreshMs,
    dbPollMs: settings.dbPollMs,
    gitPollMs: settings.gitPollMs,
  });

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply theme + accent to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('gastown-theme', settings.theme);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }, [settings.theme, settings.accentColor]);

  // Push polling changes to server
  useEffect(() => {
    const prev = prevPollingRef.current;
    const changed =
      prev.terminalRefreshMs !== settings.terminalRefreshMs ||
      prev.dbPollMs !== settings.dbPollMs ||
      prev.gitPollMs !== settings.gitPollMs;
    if (!changed) return;
    prevPollingRef.current = {
      terminalRefreshMs: settings.terminalRefreshMs,
      dbPollMs: settings.dbPollMs,
      gitPollMs: settings.gitPollMs,
    };
    fetch('/api/polling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terminalMs: settings.terminalRefreshMs,
        dbMs: settings.dbPollMs,
        gitMs: settings.gitPollMs,
      }),
    }).catch(() => {});
  }, [settings.terminalRefreshMs, settings.dbPollMs, settings.gitPollMs]);

  // Request browser notification permission when enabled
  useEffect(() => {
    if (settings.browserNotificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [settings.browserNotificationsEnabled]);

  const update = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULTS });
  }, []);

  return { settings, update, reset, DEFAULTS };
}
