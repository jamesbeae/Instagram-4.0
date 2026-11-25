import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import MessageBubble from "./MessageBubble";

afterEach(cleanup);

it("renders web links while preserving line breaks and punctuation in messages", () => {
    const text = "Xem (https://example.com/wiki/Foo_(bar)), nhé.\nHoặc www.example.org/path?x=1&y=2!";
    const { container } = render(<MessageBubble isOwn message={{ _id: "one", contents: text, createdAt: new Date() }} />);

    expect(container.querySelector(".message-bubble")?.textContent).toBe(text);
    const [first, second] = screen.getAllByRole("link");
    expect(first).toHaveAttribute("href", "https://example.com/wiki/Foo_(bar)");
    expect(second).toHaveAttribute("href", "https://www.example.org/path?x=1&y=2");
    expect(first).toHaveAttribute("target", "_blank");
    expect(first).toHaveAttribute("rel", "noopener noreferrer");
});

it("keeps unsupported schemes, malformed links and markup as text", () => {
    const text = 'hello@www.example.com javascript:alert(1) ftp://example.net https:///broken <b>text</b>';
    const { container } = render(<MessageBubble isOwn={false} message={{ _id: "two", contents: text, createdAt: new Date() }} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector(".message-bubble")?.textContent).toBe(text);
    expect(container.querySelector("b")).toBeNull();
});
