import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
const DEFAULT_THEME = 'light';
const VALID_THEMES = new Set(['light', 'dark']);

function normalizeTheme(theme) {
  return VALID_THEMES.has(theme) ? theme : DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeValue] = useState(() => {
    if (typeof window !== 'undefined') {
      return normalizeTheme(localStorage.getItem('theme'));
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const nextTheme = normalizeTheme(theme);

    root.classList.remove('light', 'dark');
    root.classList.add(nextTheme);
    localStorage.setItem('theme', nextTheme);
  }, [theme]);

  const setTheme = (nextTheme) => {
    setThemeValue((currentTheme) => {
      const resolvedTheme = typeof nextTheme === 'function' ? nextTheme(currentTheme) : nextTheme;
      return normalizeTheme(resolvedTheme);
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
