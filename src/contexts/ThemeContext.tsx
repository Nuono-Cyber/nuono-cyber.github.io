import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'red' | 'blue' | 'enterprise';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { value: Theme; label: string; swatch: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: { value: Theme; label: string; swatch: string }[] = [
  { value: 'red', label: 'Vermelho', swatch: 'bg-red-500' },
  { value: 'blue', label: 'Azul', swatch: 'bg-blue-500' },
  { value: 'enterprise', label: 'Empresarial', swatch: 'bg-slate-500' },
];

function normalizeTheme(value: string | null): Theme {
  if (value === 'blue' || value === 'enterprise' || value === 'red') return value;
  if (value === 'light') return 'enterprise';
  return 'red';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('app-theme');
    return normalizeTheme(stored);
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-dark', 'theme-light', 'theme-dracula', 'theme-red', 'theme-blue', 'theme-enterprise');
    
    // Add current theme class
    root.classList.add(`theme-${theme}`);
    
    // Store preference
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
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
