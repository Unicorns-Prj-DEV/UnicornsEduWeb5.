"use client";

import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  type AppThemeId,
  isAppThemeId,
  THEME_STORAGE_KEY,
} from "@/dtos/theme.dto";

type ThemeContextValue = {
  theme: AppThemeId;
  setTheme: (t: AppThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_CHANGE_EVENT = "unicorns-theme-change";
const DEFAULT_THEME: AppThemeId = "light";
let memoryTheme: AppThemeId | null = null;

function readStoredTheme(): AppThemeId | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v && isAppThemeId(v)) return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function applyThemeToDocument(theme: AppThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function resolveThemeFromStoredValue(value: string | null): AppThemeId {
  return value && isAppThemeId(value) ? value : DEFAULT_THEME;
}

function getThemeSnapshot(): AppThemeId {
  return memoryTheme ?? readStoredTheme() ?? DEFAULT_THEME;
}

function subscribeThemeChange(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleThemeChange = () => {
    memoryTheme = readStoredTheme() ?? memoryTheme ?? DEFAULT_THEME;
    onStoreChange();
  };
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    memoryTheme = resolveThemeFromStoredValue(event.newValue);
    onStoreChange();
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeThemeChange,
    getThemeSnapshot,
    () => DEFAULT_THEME,
  );

  useLayoutEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((t: AppThemeId) => {
    memoryTheme = t;
    applyThemeToDocument(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
