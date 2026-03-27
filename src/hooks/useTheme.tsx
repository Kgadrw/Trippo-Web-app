import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Dark mode disabled: always run the app in light theme.
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme on mount
  useEffect(() => {
    // Force persisted preference to light so it can't flip back.
    localStorage.setItem('profit-pilot-theme', 'light');
    setThemeState('light');
    setResolvedTheme('light');

    const root = document.documentElement;
    root.classList.remove('dark');
  }, []);

  useEffect(() => {
    // Regardless of caller, enforce light mode.
    if (theme !== 'light') {
      localStorage.setItem('profit-pilot-theme', 'light');
      setThemeState('light');
    } else {
      localStorage.setItem('profit-pilot-theme', 'light');
    }

    setResolvedTheme('light');

    const root = document.documentElement;
    root.classList.remove('dark');
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    // Dark mode disabled: ignore system changes.
    return;
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    // Dark mode disabled: callers can't change theme away from light.
    setThemeState('light');
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
