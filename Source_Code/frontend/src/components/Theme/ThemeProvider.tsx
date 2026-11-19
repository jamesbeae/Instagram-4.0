import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
const storageKey = "instagram-theme";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
    theme: "dark",
    setTheme: () => {},
});

function readTheme(): Theme {
    try {
        return window.localStorage.getItem(storageKey) === "light" ? "light" : "dark";
    } catch {
        return "dark";
    }
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState(readTheme);

    useLayoutEffect(() => {
        document.documentElement.dataset.theme = theme;
        try {
            window.localStorage.setItem(storageKey, theme);
        } catch {
            // The selected theme still works while browser storage is unavailable.
        }
    }, [theme]);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
