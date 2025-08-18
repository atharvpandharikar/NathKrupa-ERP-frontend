import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("light");

  // Initialize from storage
  useEffect(() => {
    const saved = (localStorage.getItem("nk:theme") || "light") as ThemeMode;
    setMode(saved);
  }, []);

  // Apply mode and keep in sync with system preference when needed
  useEffect(() => {
    const apply = () => {
      const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldDark = mode === "dark" || (mode === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", shouldDark);
    };

    apply();
    localStorage.setItem("nk:theme", mode);

    if (mode === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => apply();
      mq.addEventListener?.("change", listener);
      // Fallback for older browsers
      if (typeof mq.addListener === "function") {
        mq.addListener(listener);
      }
      return () => {
        mq.removeEventListener?.("change", listener);
        if (typeof mq.removeListener === "function") {
          mq.removeListener(listener);
        }
      };
    }
  }, [mode]);

  const isDark = useMemo(() => {
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return mode === "dark" || (mode === "system" && prefersDark);
  }, [mode]);

  const setTheme = (m: ThemeMode) => setMode(m);

  const toggle = () => setMode(prev => (prev === "dark" ? "light" : "dark"));

  return { toggle, setTheme, theme: mode, isDark };
}
