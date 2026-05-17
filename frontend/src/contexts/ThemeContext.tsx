"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ThemeDefinition } from "@/themes/types";
import { BUILT_IN_THEMES } from "@/themes/built-in";

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string) => void;
  allThemes: ThemeDefinition[];
  customThemes: ThemeDefinition[];
  addCustomTheme: (t: ThemeDefinition) => void;
  updateCustomTheme: (id: string, t: ThemeDefinition) => void;
  removeCustomTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function loadCustomThemes(): ThemeDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("custom-themes") ?? "[]");
  } catch {
    return [];
  }
}

function loadThemeId(customThemes: ThemeDefinition[]): string {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("theme-id");
  if (saved) return saved;
  // Migrate old "theme" key
  const legacy = localStorage.getItem("theme");
  if (legacy === "light") return "light";
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>(loadCustomThemes);
  const [themeId, setThemeIdRaw] = useState<string>(() => loadThemeId([]));

  const allThemes = [...BUILT_IN_THEMES, ...customThemes];

  useEffect(() => {
    const theme = allThemes.find((t) => t.id === themeId) ?? BUILT_IN_THEMES[0];
    const root = document.documentElement;
    Object.entries(theme.variables).forEach(([k, v]) => {
      root.style.setProperty(`--${k}`, v);
    });
    root.classList.toggle("dark", theme.isDark);
    root.classList.toggle("light", !theme.isDark);
    localStorage.setItem("theme-id", theme.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, customThemes]);

  function setThemeId(id: string) {
    setThemeIdRaw(id);
  }

  function addCustomTheme(t: ThemeDefinition) {
    const updated = [...customThemes, t];
    setCustomThemes(updated);
    localStorage.setItem("custom-themes", JSON.stringify(updated));
  }

  function updateCustomTheme(id: string, t: ThemeDefinition) {
    const updated = customThemes.map((c) => (c.id === id ? { ...t, id } : c));
    setCustomThemes(updated);
    localStorage.setItem("custom-themes", JSON.stringify(updated));
  }

  function removeCustomTheme(id: string) {
    const updated = customThemes.filter((t) => t.id !== id);
    setCustomThemes(updated);
    localStorage.setItem("custom-themes", JSON.stringify(updated));
    if (themeId === id) setThemeIdRaw("dark");
  }

  return (
    <ThemeContext.Provider
      value={{ themeId, setThemeId, allThemes, customThemes, addCustomTheme, updateCustomTheme, removeCustomTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
