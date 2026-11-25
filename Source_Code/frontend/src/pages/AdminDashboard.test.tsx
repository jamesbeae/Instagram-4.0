import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";

const http = { get: vi.fn(), patch: vi.fn() };
vi.mock("../hooks/usePrivateHttp", () => ({ default: () => http }));

afterEach(() => {
    cleanup();
    http.get.mockReset();
    http.patch.mockReset();
});

it("opens reported content, pages through filtered results and retains filters after moderation", async () => {
    const post = { _id: "post-1", caption: "Reported item", hidden: false, kind: "POST", userId: { username: "owner" }, photoVideo: [] };
    http.get.mockImplementation(async (endpoint, { params }) => {
        if (endpoint === "/admin/stats") return { data: {
            users: 12, activeUsers: 11, disabledUsers: 1, posts: 7, stories: 5, reels: 1,
            openReports: 1, resolvedReports: 0, follows: 2, likes: 5, comments: 4, saves: 1,
            behaviorEvents: 130,
        } };
        if (endpoint === "/admin/reports") return { data: { reports: [{ id: "report-1", postId: post._id, status: "open", reason: "Reported for review", createdAt: "2026-11-25T00:00:00Z" }] } };
        if (endpoint === "/admin/content") return { data: { postsList: [post], pagination: { page: params.page, totalPages: 2, total: 2 } } };
        throw new Error("Unexpected API call");
    });
    http.patch.mockImplementation(async () => { post.hidden = true; return { data: {} }; });
    const store = configureStore({ reducer: { authSlice: () => ({ userInfo: { _id: "admin", username: "admin" } }) } });
    render(<Provider store={store}><MemoryRouter><AdminDashboard /></MemoryRouter></Provider>);

    const featured = within(await screen.findByRole("region", { name: "Key metrics" }));
    for (const [label, value] of [["Total accounts", "12"], ["Posts", "7"], ["Open reports", "1"]]) {
        expect(featured.getByText(label).nextElementSibling).toHaveTextContent(value);
    }
    expect(screen.queryByText("Messages")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "reports" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByText("Resolved")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Key metrics" })).not.toBeInTheDocument();
    expect(screen.queryByText("Total accounts")).not.toBeInTheDocument();
    expect(http.get).toHaveBeenLastCalledWith("/admin/stats", expect.objectContaining({ params: { category: "reports" } }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(await screen.findByRole("region", { name: "Key metrics" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(await screen.findByText("Reported for review")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View content" }));
    expect(await screen.findByText("Reported item")).toBeVisible();
    expect(screen.getByRole("searchbox")).toHaveValue("post-1");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(http.get).toHaveBeenLastCalledWith("/admin/content", expect.objectContaining({ params: { q: "post-1", page: 2, kind: "all", status: "all" } })));
    const decisionNote = await screen.findByLabelText("Decision note");
    fireEvent.change(decisionNote, { target: { value: "Reviewed the content" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide content" }));
    expect(await screen.findByRole("button", { name: "Restore visibility" })).toBeVisible();
    expect(screen.getByText("Page 2 of 2")).toBeVisible();
    expect(http.patch).toHaveBeenCalledWith("/admin/content/post-1/moderate", { action: "hide", resolution: "Reviewed the content" });
    expect(http.get).toHaveBeenLastCalledWith("/admin/content", expect.objectContaining({ params: { q: "post-1", page: 2, kind: "all", status: "all" } }));
});
