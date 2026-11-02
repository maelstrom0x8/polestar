import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "polestar-theme";

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.dataset.theme;
  return attr === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage may be blocked in private-browsing or sandboxed iframes */
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
