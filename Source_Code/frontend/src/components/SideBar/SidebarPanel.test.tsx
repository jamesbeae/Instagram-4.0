import "@testing-library/jest-dom";
import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import sideBarSlice from "../../lib/redux/sideBarSlice";
import NavigationList from "./NavigationList";
import NotificationsModal from "./Notifications";
import SearchModal from "./Search";

const http = {};
vi.mock("../../hooks/usePrivateHttp", () => ({ default: () => http }));

function Location() {
    return <output>{useLocation().pathname}</output>;
}

afterEach(cleanup);

it("uses shared panels for Search and Notifications and keeps More as a popup", () => {
    const store = configureStore({
        reducer: { sideBarSlice: sideBarSlice.reducer, authSlice: () => ({ userInfo: null }) },
    });
    render(
        <Provider store={store}>
            <MemoryRouter>
                <NavigationList />
                <SearchModal />
                <NotificationsModal notifications={[]} />
                <Location />
            </MemoryRouter>
        </Provider>,
    );

    const search = screen.getByRole("button", { name: "Search" });
    const notifications = screen.getByRole("button", { name: "Notifications" });
    const more = screen.getByRole("button", { name: "More" });

    fireEvent.click(search);
    expect(screen.getByRole("complementary", { name: "Search" })).toHaveClass("sidebar-panel");
    expect(screen.getByPlaceholderText("Search accounts or posts")).toHaveFocus();

    fireEvent.click(notifications);
    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("complementary", { name: "Search" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Notifications" })).toHaveClass("sidebar-panel");
    const closeNotifications = screen.getByRole("button", { name: "Close notifications" });
    expect(closeNotifications).toHaveFocus();
    fireEvent.keyDown(closeNotifications, { key: "Escape" });
    expect(notifications).toHaveFocus();

    fireEvent.click(more);
    expect(screen.getByRole("group", { name: "More options" })).toHaveClass("sidebar-more-popup");
    expect(screen.queryByRole("complementary", { name: "More" })).not.toBeInTheDocument();
    fireEvent.keyDown(more, { key: "Escape" });
    expect(more).toHaveFocus();
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    fireEvent.pointerDown(document.body);
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    fireEvent.click(screen.getByRole("button", { name: "Account settings" }));
    expect(screen.queryByRole("group", { name: "More options" })).not.toBeInTheDocument();
    expect(screen.getByText("/settings")).toBeVisible();
});
