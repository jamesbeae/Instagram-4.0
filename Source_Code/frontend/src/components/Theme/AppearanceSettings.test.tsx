import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AppearanceSettings from "./AppearanceSettings";
import ThemeProvider from "./ThemeProvider";

afterEach(() => {
    localStorage.removeItem("instagram-theme");
    delete document.documentElement.dataset.theme;
});

it("applies the chosen appearance and restores it when the app mounts again", () => {
    const mount = () => render(<ThemeProvider><AppearanceSettings /></ThemeProvider>);
    const initial = mount();
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    initial.unmount();

    mount();
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("instagram-theme")).toBe("dark");
});
