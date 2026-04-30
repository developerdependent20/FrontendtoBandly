"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "dark" | "light" | "colorblind";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read from local storage safely on client mount
    const saved = localStorage.getItem("clan-theme") as ThemeMode;
    if (saved) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme("dark");
    }
  }, []);

  const applyTheme = (newTheme: ThemeMode) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    
    // Clear old classes
    root.classList.remove("dark-theme", "colorblind-theme");
    
    // Set attribute (More robust)
    root.setAttribute("data-theme", newTheme);
    
    // Support legacy class-based if needed
    if (newTheme !== "light") {
      root.classList.add(`${newTheme}-theme`);
    }
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem("clan-theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div style={{ visibility: mounted ? "visible" : "hidden", transition: "background-color 0.3s ease, color 0.3s ease" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
