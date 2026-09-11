import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';

const MODES: { mode: ThemeMode; label: string; icon: ReactNode }[] = [
  {
    mode: 'system',
    label: 'System',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 20h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: 'light',
    label: 'Light',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export type ThemeModeSwitcherProps = {
  className?: string;
};

/** Segmented system / light / dark control for the user menu. */
export function ThemeModeSwitcher({ className }: ThemeModeSwitcherProps) {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-2 py-2 text-sm text-gray-600 dark:text-gray-300',
        className
      )}
    >
      <span className="inline-flex items-center gap-2 font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
        Theme
      </span>
      <div
        role="group"
        aria-label="Theme"
        className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800/80"
      >
        {MODES.map(({ mode, label, icon }) => {
          const active = themeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => setThemeMode(mode)}
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-md text-gray-500 transition-colors dark:text-gray-400',
                active
                  ? 'bg-brand-500 text-white shadow-sm dark:bg-brand-500 dark:text-white'
                  : 'hover:bg-white hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-white'
              )}
            >
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
