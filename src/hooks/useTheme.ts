import { useEffect } from "react";

export function useTheme() {
  useEffect(() => {
    const saved = (localStorage.getItem("nk:theme") || "light") as "light" | "dark";
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("nk:theme", isDark ? "dark" : "light");
  };

  return { toggle };
}
