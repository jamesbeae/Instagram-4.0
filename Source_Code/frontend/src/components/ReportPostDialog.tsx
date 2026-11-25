import { useEffect, useId, useRef, useState } from "react";
import usePrivateHttp from "../hooks/usePrivateHttp";
import { useUnsavedChanges } from "./UnsavedChanges";
import Button from "./UI/Button/Button";
import Card from "./UI/Card";

type ReportPostDialogProps = {
    postId?: string;
    targetUserId?: string;
    onClose: () => void;
    onSubmitted: (duplicate?: boolean) => void;
};

export default function ReportPostDialog({ postId, targetUserId, onClose, onSubmitted }: ReportPostDialogProps) {
    const http = usePrivateHttp();
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const [reason, setReason] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const { requestExit, markSaved } = useUnsavedChanges(reason !== "", onClose);

    useEffect(() => {
        const modal = dialog.current;
        modal?.showModal();
        return () => modal?.close();
    }, []);

    function close() {
        if (!sending) requestExit(onClose);
    }

    async function submit() {
        if (sending || reason.trim().length < 5) return;
        setSending(true);
        setError("");
        try {
            const response = await http.post("/reports", { ...(postId ? { postId } : { targetUserId }), reason: reason.trim() });
            markSaved();
            onSubmitted(Boolean(response.data.duplicate));
            onClose();
        } catch {
            setError("Unable to submit report");
        } finally {
            setSending(false);
        }
    }

    return (
        <dialog ref={dialog} aria-labelledby={titleId} className="w-11/12 max-w-md bg-transparent p-0 text-foreground backdrop:bg-black/75"
            onCancel={event => { event.preventDefault(); close(); }}
            onClick={event => { if (event.target === event.currentTarget) close(); }}>
            <Card className="p-5">
                <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
                    <h2 className="text-xl font-semibold" id={titleId}>{targetUserId ? 'Report account' : 'Report post'}</h2>
                    <div className="grid gap-2">
                        <label className="grid gap-2 text-sm">
                            {targetUserId ? 'Why are you reporting this account?' : 'Why are you reporting this post?'}
                            <textarea autoFocus className="w-full rounded-xl border border-lightSecondDark bg-dark p-3" rows={4}
                                value={reason} minLength={5} maxLength={2000} disabled={sending}
                                onChange={event => setReason(event.target.value)} />
                        </label>
                        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-3">
                            <Button disabled={sending} className="rounded-xl bg-lightSecondDark px-4 py-2" onClick={close}>Cancel</Button>
                            <Button type="submit" className="rounded-xl bg-blue text-white px-4 py-2 font-semibold" disabled={sending || reason.trim().length < 5}>
                                {sending ? "Sending…" : "Submit report"}
                            </Button>
                    </div>
                </form>
            </Card>
        </dialog>
    );
}
