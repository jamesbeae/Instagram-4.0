import "@testing-library/jest-dom";
import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import postsListSlice from "../../../lib/redux/postsListSlice";
import CreatePostModal from "./CreatePostModal";
import UnsavedChangesProvider from "../../UnsavedChanges";

const http = { get: vi.fn(), post: vi.fn() };
vi.mock("../../../hooks/usePrivateHttp", () => ({ default: () => http }));
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it("preserves the draft across steps and shares after the required options are set", async () => {
    if (!HTMLDialogElement.prototype.showModal) {
        Object.defineProperties(HTMLDialogElement.prototype, {
            showModal: {
                configurable: true,
                value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
            },
            close: {
                configurable: true,
                value(this: HTMLDialogElement) { this.removeAttribute("open"); },
            },
        });
    }

    const groupId = "11111111-1111-4111-8111-111111111111";
    const post = { _id: "test-post" };
    http.get.mockResolvedValue({ data: { groups: [{ id: groupId, name: "Friends" }] } });
    http.post.mockResolvedValue({ data: { post } });
    const store = configureStore({
        reducer: { authSlice: () => ({ userInfo: null }), postsListSlice: postsListSlice.reducer },
    });
    const onClose = vi.fn();
    const router = createMemoryRouter([{ element: <UnsavedChangesProvider />, children: [
        { path: "/", element: <CreatePostModal onClose={onClose} /> },
    ] }]);
    const { container } = render(<Provider store={store}><RouterProvider router={router} /></Provider>);

    const next = () => screen.getByRole("button", { name: "Next" });
    const share = () => screen.getByRole("button", { name: "Share" });
    expect(next()).toBeDisabled();
    expect(screen.queryByRole("textbox", { name: "Caption" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
    const image = new File(["sample"], "sample.png", { type: "image/png" });
    const fileInput = () => container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput(), { target: { files: [image] } });
    expect(await screen.findByRole("img", { name: "Photo 1" })).toBeInTheDocument();
    expect(next()).toBeEnabled();

    fireEvent.click(screen.getByRole("dialog", { name: "Create new post" }));
    expect(screen.getByRole("alertdialog", { name: "Discard changes?" })).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(next()).toBeEnabled();
    expect(screen.getByRole("img", { name: "Photo 1" })).toBeVisible();

    fireEvent.click(next());
    expect(share()).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Remove media" }));
    expect(screen.getByRole("button", { name: "Select from your device" })).toBeInTheDocument();
    fireEvent.change(fileInput(), { target: { files: [image] } });
    await screen.findByRole("img", { name: "Photo 1" });
    fireEvent.click(next());

    const caption = screen.getByRole("textbox", { name: "Caption" });
    fireEvent.change(caption, { target: { value: "Sample caption" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Audience" }), { target: { value: "group" } });
    expect(share()).toBeDisabled();
    await screen.findByRole("option", { name: "Friends" });
    fireEvent.change(screen.getByRole("combobox", { name: "Relation list" }), { target: { value: groupId } });
    expect(share()).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Back to media" }));
    expect(screen.queryByRole("textbox", { name: "Caption" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Photo 1" })).toBeInTheDocument();
    fireEvent.click(next());

    expect(screen.getByRole("textbox", { name: "Caption" })).toHaveValue("Sample caption");
    expect(screen.getByRole("combobox", { name: "Relation list" })).toHaveValue(groupId);
    expect(share()).toBeEnabled();
    fireEvent.click(share());

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(http.post).toHaveBeenCalledWith("/post/create-post", {
        caption: "Sample caption",
        kind: "POST",
        visibility: "group",
        groupId,
        photoVideoList: [{ type: "PHOTO", url: expect.stringMatching(/^data:image\/png;base64,/) }],
    });
});
