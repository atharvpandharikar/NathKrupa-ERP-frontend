import { LogOut, Monitor, Moon, Sun, User as UserIcon, Laptop, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function AppSidebarFooter() {
  const { logout } = useAuth();
  const { setTheme, theme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const themeBtnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Inject minimal CSS for popover positioning once
  useEffect(() => {
    const id = "nk-theme-popover-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `.nk-theme-popover{position:fixed;top:var(--nk-theme-popover-top,0px);left:var(--nk-theme-popover-left,0px);}`;
    document.head.appendChild(style);
  }, []);

  const updatePosition = () => {
    const btn = themeBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 8;
    const estimatedWidth = 224; // ~ w-56
    const estimatedHeight = 120; // approximate height for 3 items
    
    // Position ABOVE the button
    let left = rect.left;
    let top = rect.top - estimatedHeight - gap;

    // Ensure popup stays within viewport
    if (left + estimatedWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - estimatedWidth - 8);
    }
    
    // Fallback if top is too high (off screen), though for a footer this is unlikely unless window is tiny
    if (top < 8) {
        top = rect.bottom + gap; // Flip to bottom if no space on top
    }

    document.documentElement.style.setProperty("--nk-theme-popover-top", `${top}px`);
    document.documentElement.style.setProperty("--nk-theme-popover-left", `${left}px`);
  };

  useEffect(() => {
    if (!themeOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current && !popRef.current.contains(t) && themeBtnRef.current && !themeBtnRef.current.contains(t)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [themeOpen]);

  useLayoutEffect(() => {
    if (!themeOpen) return;
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [themeOpen]);

  return (
    <div className="space-y-2">
       {/* User section (no heading) */}
       <button className="w-full flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50" disabled>
          <UserIcon className="w-4 h-4" />
          <span>User</span>
        </button>

        {/* Theme row with popover */}
        <div className="relative">
          <button
            ref={themeBtnRef}
            className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50"
            onClick={() => setThemeOpen(v => !v)}
            aria-haspopup="menu"
          >
            <span className="flex items-center gap-2 text-sm"><Sun className="w-4 h-4" /> Theme</span>
            <span className="text-sidebar-foreground/70">•••</span>
          </button>
          
          {themeOpen && createPortal(
            <div ref={popRef} role="menu" aria-label="Select Theme" className="nk-theme-popover z-50 w-56 rounded-md border border-border bg-popover shadow-md mb-2">
              <div className="px-3 py-2 text-sm font-medium">Select Theme</div>
              <div
                role="menuitem"
                tabIndex={0}
                onClick={() => { setTheme("light"); setThemeOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme("light"); setThemeOpen(false); } }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${theme === "light" ? "bg-accent" : ""}`}
              >
                <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</span>
                {theme === "light" && <span>✓</span>}
              </div>
              <div
                role="menuitem"
                tabIndex={0}
                onClick={() => { setTheme("dark"); setThemeOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme("dark"); setThemeOpen(false); } }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${theme === "dark" ? "bg-accent" : ""}`}
              >
                <span className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</span>
                {theme === "dark" && <span>✓</span>}
              </div>
              <div
                role="menuitem"
                tabIndex={0}
                onClick={() => { setTheme("system"); setThemeOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme("system"); setThemeOpen(false); } }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${theme === "system" ? "bg-accent" : ""}`}
              >
                <span className="flex items-center gap-2"><Laptop className="w-4 h-4" /> System</span>
                {theme === "system" && <span>✓</span>}
              </div>
            </div>,
            document.body
          )}
        </div>

        <div className="border-t border-sidebar-border" />
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
    </div>
  );
}
