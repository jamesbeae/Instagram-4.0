import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import ChatUserList from ".";

const http = { get: vi.fn() };
vi.mock("../../../hooks/usePrivateHttp", () => ({ default: () => http }));

afterEach(() => {
    cleanup();
    http.get.mockReset();
});

it("starts a conversation with an account that is absent from the inbox", async () => {
    http.get.mockResolvedValue({
        data: {
            users: [
                { _id: "me", fullName: "My account", username: "account_self" },
                { _id: "new", fullName: "Another account", username: "account_other" },
            ],
            pagination: { totalPages: 1 },
        },
    });
    render(
        <MemoryRouter initialEntries={["/message"]}>
            <Routes>
                <Route path="/message" element={<ChatUserList users={[]} unread={[]} online={[]} currentUserId="me" loadError={false} />} />
                <Route path="/message/new" element={<h1>New conversation</h1>} />
            </Routes>
        </MemoryRouter>,
    );
    expect(screen.getByText("No conversations yet.")).toBeVisible();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "account" } });
    const recipient = await screen.findByRole("link", { name: /Another account/ });
    expect(screen.queryByRole("link", { name: /My account/ })).not.toBeInTheDocument();
    expect(http.get).toHaveBeenCalledWith("/search", expect.objectContaining({
        params: { q: "account", scope: "users", page: 1, limit: 20 },
    }));
    fireEvent.click(recipient);
    expect(screen.getByRole("heading", { name: "New conversation" })).toBeVisible();
});
