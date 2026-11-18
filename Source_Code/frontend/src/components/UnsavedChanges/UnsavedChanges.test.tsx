import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import UnsavedChangesProvider, { DraftScope, useConfirmDiscard, useUnsavedChanges } from ".";

const NativeRequest = Request;

beforeEach(() => {
    // Node's Request rejects the AbortSignal supplied by jsdom's router.
    vi.stubGlobal("Request", class extends NativeRequest {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
            super(input, { ...init, signal: undefined });
        }
    });
    if (!HTMLDialogElement.prototype.showModal) {
        Object.defineProperties(HTMLDialogElement.prototype, {
            showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
            close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
        });
    }
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function Editor() {
    const [draft, setDraft] = useState("");
    const { markSaved, requestExit } = useUnsavedChanges(draft !== "", () => setDraft(""));
    return <>
        <textarea aria-label="Draft" value={draft} onChange={event => setDraft(event.target.value)} />
        <button onClick={() => requestExit(() => setDraft(""))}>Cancel editor</button>
        <button onClick={() => { markSaved(); setDraft(""); }}>Save editor</button>
    </>;
}

function Page({ onClose }: { onClose: () => void }) {
    const confirmDiscard = useConfirmDiscard();
    return <>
        <DraftScope.Provider value="popup"><Editor /></DraftScope.Provider>
        <button onClick={() => confirmDiscard(onClose, "popup")}>Close popup</button>
        <Link to="/other">Other page</Link>
    </>;
}

function mount(onClose = vi.fn()) {
    const router = createMemoryRouter([{ element: <UnsavedChangesProvider />, children: [
        { path: "/", element: <Page onClose={onClose} /> },
        { path: "/other", element: <h1>Other destination</h1> },
    ] }]);
    render(<RouterProvider router={router} />);
    return onClose;
}
const warning = () => screen.queryByRole("alertdialog", { name: "Discard changes?" });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
function typeDraft() {
    fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), { target: { value: "Unsaved caption" } });
}
function beforeUnload() {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
}

it("closes clean editors immediately and warns before discarding a dirty one", () => {
    const onClose = mount();
    click("Close popup");
    expect(onClose).toHaveBeenCalledOnce();
    typeDraft();
    click("Cancel editor");
    expect(warning()).toBeVisible();
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
    click("Keep editing");
    expect(warning()).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Unsaved caption");

    click("Close popup");
    expect(onClose).toHaveBeenCalledOnce();
    click("Discard changes");
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("textbox")).toHaveValue("");
});

it("blocks in-app navigation and native unload only while there are unsaved changes", async () => {
    mount();
    expect(beforeUnload()).toBe(false);
    typeDraft();
    expect(beforeUnload()).toBe(true);
    fireEvent.click(screen.getByRole("link", { name: "Other page" }));
    expect(warning()).toBeVisible();
    click("Keep editing");
    expect(screen.getByRole("textbox")).toHaveValue("Unsaved caption");
    fireEvent.click(screen.getByRole("link", { name: "Other page" }));
    click("Discard changes");
    expect(await screen.findByText("Other destination")).toBeVisible();
    expect(beforeUnload()).toBe(false);
});

it("does not warn after saving successfully", () => {
    mount();
    typeDraft();
    click("Save editor");
    expect(beforeUnload()).toBe(false);
    click("Close popup");
    expect(warning()).not.toBeInTheDocument();
});
