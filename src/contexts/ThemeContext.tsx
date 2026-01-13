import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeColor } from '@/types';

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState<ThemeColor>('coral');

  useEffect(() => {
    const saved = localStorage.getItem('petsconnect-theme') as ThemeColor;
    if (saved) {
      setThemeColor(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove(
      'theme-coral', 'theme-teal', 'theme-amber', 
      'theme-sage', 'theme-lavender', 'theme-rose'
    );
    document.documentElement.classList.add(`theme-${themeColor}`);
    localStorage.setItem('petsconnect-theme', themeColor);
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
