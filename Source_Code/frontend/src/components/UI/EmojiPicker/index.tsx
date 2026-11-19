import { useLayoutEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import Button from "../Button/Button";
import { useTheme } from "../../Theme/ThemeProvider";
import EmojiIcon from "../Icons/EmojiIcon";
import "./EmojiPicker.css";

const margin = 12;
const gap = 8;

export default function EmojiPicker({ onSelect, disabled = false }: {
    onSelect: (emoji: string) => void;
    disabled?: boolean;
}) {
    const { theme } = useTheme();
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDialogElement>(null);
    const id = useId();

    useLayoutEffect(() => {
        const button = trigger.current;
        const dialog = panel.current;
        if (!open || !button || !dialog) return;

        const viewport = window.visualViewport;
        function positionPanel() {
            if (!button || !dialog) return;
            const anchor = button.getBoundingClientRect();
            const viewportWidth = viewport?.width ?? window.innerWidth;
            const viewportHeight = viewport?.height ?? window.innerHeight;
            const leftEdge = (viewport?.offsetLeft ?? 0) + margin;
            const topEdge = (viewport?.offsetTop ?? 0) + margin;
            const width = Math.min(320, viewportWidth - margin * 2);
            const height = Math.min(340, viewportHeight - margin * 2);
            const rightEdge = leftEdge + viewportWidth - margin * 2;
            const bottomEdge = topEdge + viewportHeight - margin * 2;
            const above = anchor.top - gap - height;
            const below = anchor.bottom + gap;
            const top = above >= topEdge || below + height > bottomEdge ? above : below;

            Object.assign(dialog.style, {
                width: `${width}px`,
                height: `${height}px`,
                left: `${Math.max(leftEdge, Math.min(anchor.right - width, rightEdge - width))}px`,
                top: `${Math.max(topEdge, Math.min(top, bottomEdge - height))}px`,
            });
        }

        positionPanel();
        dialog.showModal();
        window.addEventListener("resize", positionPanel);
        viewport?.addEventListener("resize", positionPanel);
        viewport?.addEventListener("scroll", positionPanel);
        return () => {
            window.removeEventListener("resize", positionPanel);
            viewport?.removeEventListener("resize", positionPanel);
            viewport?.removeEventListener("scroll", positionPanel);
            dialog.close();
        };
    }, [open]);

    return (
        <>
            <Button ref={trigger} className="emoji-picker-trigger" aria-label="Choose emoji"
                aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
                disabled={disabled} onClick={() => setOpen(true)}>
                <EmojiIcon height={18} width={18} />
            </Button>
            {open && createPortal(
                <dialog ref={panel} id={id} className="emoji-picker-panel" aria-label="Emoji picker"
                    onClick={event => {
                        if (event.target === event.currentTarget) setOpen(false);
                    }}
                    onKeyDownCapture={event => {
                        if (event.key !== "Escape") return;
                        event.preventDefault();
                        event.stopPropagation();
                        setOpen(false);
                    }}
                    onCancel={event => {
                        event.preventDefault();
                        setOpen(false);
                    }}>
                    <Picker data={data} theme={theme} dynamicWidth autoFocus maxFrequentRows={0}
                        emojiSize={20} emojiButtonSize={32} previewPosition="none" skinTonePosition="search"
                        onEmojiSelect={(item: { native: string }) => {
                            onSelect(item.native);
                            setOpen(false);
                        }} />
                </dialog>,
                document.body,
            )}
        </>
    );
}
