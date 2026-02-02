import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'gastown-theme';

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export default function ThemeToggle({ theme: controlledTheme, onToggle }) {
  const [localTheme, setLocalTheme] = useState(getInitialTheme);
  const theme = controlledTheme || localTheme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    if (onToggle) {
      onToggle(next);
    } else {
      setLocalTheme(next);
    }
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '\u2600' : '\u263D'}
    </button>
  );
}
