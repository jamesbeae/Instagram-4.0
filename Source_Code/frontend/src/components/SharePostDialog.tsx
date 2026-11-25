import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { faLink, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import usePrivateHttp from "../hooks/usePrivateHttp";
import type { Post } from "../models/Post";
import { socket } from "../socket/socket";
import { useMessageInbox, type InboxUser } from "./RootLayout/MessageInboxProvider";
import Avatar from "./UI/Avatar/Avatar";
import Button from "./UI/Button/Button";
import Card from "./UI/Card";
import Input from "./UI/Input/Input";
import Loading from "./UI/Loading";
import "./SharePostDialog.css";

export default function SharePostDialog({ post, onClose, onSent }: {
    post: Post;
    onClose: () => void;
    onSent: (recipientName: string) => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const recipientGroup = useId();
    const attemptIds = useRef(new Map<string, string>());
    const pending = useRef(false);
    const http = usePrivateHttp();
    const { inbox, failed } = useMessageInbox();
    const [query, setQuery] = useState("");
    const [recipientId, setRecipientId] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const contacts = inbox?.contacts ?? [];
    const normalized = query.trim().toLowerCase();
    const filtered = contacts.filter(contact => `${contact.fullName || ""} ${contact.username || ""}`.toLowerCase().includes(normalized));
    const recipient = filtered.find(contact => contact._id === recipientId);
    const url = `${window.location.origin}/post/${post._id}`;

    useEffect(() => {
        const modal = dialog.current;
        modal?.showModal();
        return () => modal?.close();
    }, []);

    function close() {
        if (!pending.current) onClose();
    }

    function recordShare() {
        void http.post(`/post/${post._id}/interaction`, { type: "SHARE" }).catch(() => {});
    }

    async function copyLink() {
        setError("");
        setNotice("");
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            setError("Unable to copy the link. Please try again.");
            return;
        }
        setNotice("Link copied.");
        recordShare();
    }

    function send() {
        if (!recipient || pending.current) return;
        setNotice("");
        setError("");
        if (!socket.connected) {
            setError("Chat is offline. Reconnect and try again.");
            return;
        }

        const messageId = attemptIds.current.get(recipient._id) ?? crypto.randomUUID();
        attemptIds.current.set(recipient._id, messageId);
        pending.current = true;
        setSending(true);
        socket.timeout(10000).emit("sendMessage", { receiverId: recipient._id, contents: url, messageId },
            (reason: Error | null, result?: { ok: boolean; message?: string }) => {
                pending.current = false;
                setSending(false);
                if (reason || !result?.ok) {
                    setError(typeof result?.message === "string" ? result.message : "Unable to send this post. Please try again.");
                    return;
                }
                recordShare();
                onSent(contactName(recipient));
            });
    }

    return createPortal(
        <dialog ref={dialog} className="share-post-dialog" aria-labelledby={titleId}
            onCancel={event => { event.preventDefault(); close(); }}
            onKeyDown={event => { if (event.key === "Escape") event.stopPropagation(); }}
            onClick={event => {
                event.stopPropagation();
                if (event.target === event.currentTarget) close();
            }}>
            <Card className="share-post-card">
                <header className="share-post-heading">
                    <h2 id={titleId}>Share post</h2>
                    <Button autoFocus className="share-post-close" aria-label="Close share dialog" disabled={sending} onClick={close}>
                        <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                    </Button>
                </header>
                <label className="share-post-search">
                    <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
                    <Input type="search" aria-label="Search conversations" placeholder="Search conversations" disabled={sending} getInputValueHandler={setQuery} />
                </label>
                <fieldset className="share-post-contacts" disabled={sending}>
                    <legend className="sr-only">Choose a conversation</legend>
                    {!inbox && !failed && <Loading message="Loading conversations…" />}
                    {failed && <p role="alert" className="share-post-empty">Unable to refresh conversations.</p>}
                    {inbox && filtered.length === 0 && <p className="share-post-empty">
                        {contacts.length ? "No matching conversations." : "Start a conversation in Messages to share posts here."}
                    </p>}
                    {filtered.map(contact => (
                        <label key={contact._id} className="share-post-contact">
                            <Avatar className="h-10 w-10 shrink-0" avatarUrl={contact.avatar} username={contactName(contact)} />
                            <span className="share-post-contact-name">
                                <strong>{contactName(contact)}</strong>
                                {contact.fullName && contact.username && <small>@{contact.username}</small>}
                            </span>
                            <input type="radio" name={recipientGroup} checked={contact._id === recipientId}
                                onChange={() => { setRecipientId(contact._id); setError(""); }} />
                        </label>
                    ))}
                </fieldset>
                {post.visibility && post.visibility !== "public" &&
                    <p className="share-post-empty">Only people with access to the post can open it.</p>}
                <footer className="share-post-footer">
                    {error && <p role="alert" className="share-post-feedback text-errorText">{error}</p>}
                    {notice && <p role="status" className="share-post-feedback">{notice}</p>}
                    <Button className="share-post-copy" disabled={sending} onClick={() => void copyLink()}>
                        <FontAwesomeIcon icon={faLink} aria-hidden="true" /> Copy link
                    </Button>
                    <Button className="share-post-send" disabled={!recipient || sending} onClick={send}>
                        {sending ? "Sending…" : "Send"}
                    </Button>
                </footer>
            </Card>
        </dialog>, document.body,
    );
}

function contactName(contact: InboxUser) {
    return contact.fullName || contact.username || "Conversation";
}
