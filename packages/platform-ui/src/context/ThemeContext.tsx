'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** Resolved appearance applied to the document. */
export type Theme = 'light' | 'dark';

/** User preference — includes following the OS. */
export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  /** Effective theme after resolving `system`. */
  theme: Theme;
  /** Stored preference. */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /** Cycles light ↔ dark (ignores system). Kept for existing callers. */
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme-mode';

const getSystemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const resolveTheme = (mode: ThemeMode): Theme => (mode === 'system' ? getSystemTheme() : mode);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [theme, setTheme] = useState<Theme>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const legacy = localStorage.getItem('theme') as Theme | null;
    const initialMode: ThemeMode =
      saved === 'light' || saved === 'dark' || saved === 'system'
        ? saved
        : legacy === 'dark' || legacy === 'light'
          ? legacy
          : 'light';

    setThemeModeState(initialMode);
    setTheme(resolveTheme(initialMode));
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const apply = (mode: ThemeMode) => {
      const next = resolveTheme(mode);
      setTheme(next);
      localStorage.setItem(STORAGE_KEY, mode);
      localStorage.setItem('theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };

    apply(themeMode);

    if (themeMode !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themeMode, isInitialized]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const current = prev === 'system' ? resolveTheme('system') : prev;
      return current === 'light' ? 'dark' : 'light';
    });
  }, []);

  const value = useMemo(
    () => ({ theme, themeMode, setThemeMode, toggleTheme }),
    [theme, themeMode, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
