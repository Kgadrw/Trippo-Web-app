import React, { useState, useEffect, createContext, useContext, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = 'profit-pilot-theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  // Default: follow the device light/dark preference.
  return 'system';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyThemeClass(actualTheme: 'light' | 'dark') {
  const root = document.documentElement;
  // Tailwind `dark:` variants use `.dark`; Untitled UI tokens use `.dark-mode`.
  root.classList.toggle('dark', actualTheme === 'dark');
  root.classList.toggle('dark-mode', actualTheme === 'dark');
  root.style.colorScheme = actualTheme;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return resolveTheme(readStoredTheme());
  });

  useEffect(() => {
    const actualTheme = resolveTheme(theme);
    setResolvedTheme(actualTheme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeClass(actualTheme);

    const themeColor = actualTheme === 'dark' ? '#0b1220' : '#ffffff';
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      el.setAttribute('content', themeColor);
    });
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      const next = event.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      applyThemeClass(next);
      const themeColor = next === 'dark' ? '#0b1220' : '#ffffff';
      document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
        el.setAttribute('content', themeColor);
      });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
