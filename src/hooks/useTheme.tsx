import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Default to system so UI follows device theme.
    // If an older install stored "light", migrate to "system" (auto like other apps).
    const stored = (localStorage.getItem('profit-pilot-theme') as Theme) || 'system';
    return stored === 'dark' ? 'dark' : 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = ((localStorage.getItem('profit-pilot-theme') as Theme) || 'system') === 'dark'
      ? 'dark'
      : 'system';
    if (savedTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return savedTheme;
  });

  // Initialize theme on mount
  useEffect(() => {
    const raw = (localStorage.getItem('profit-pilot-theme') as Theme) || 'system';
    const savedTheme: Theme = raw === 'dark' ? 'dark' : 'system';
    let initialTheme: 'light' | 'dark';
    
    if (savedTheme === 'system') {
      initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      initialTheme = savedTheme;
    }

    // Persist migration so subsequent loads are consistent
    if (raw !== savedTheme) {
      localStorage.setItem('profit-pilot-theme', savedTheme);
      setThemeState(savedTheme);
    }
    
    const root = document.documentElement;
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('profit-pilot-theme', theme);
    
    // Determine the actual theme to apply
    let actualTheme: 'light' | 'dark';
    if (theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = theme;
    }
    
    setResolvedTheme(actualTheme);

    // Apply theme class to document root
    const root = document.documentElement;
    if (actualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        setResolvedTheme('dark');
      } else {
        root.classList.remove('dark');
        setResolvedTheme('light');
      }
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
