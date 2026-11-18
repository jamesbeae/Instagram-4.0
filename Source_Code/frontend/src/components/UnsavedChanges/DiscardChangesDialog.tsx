import { useEffect, useId, useRef } from "react";
import Button from "../UI/Button/Button";
import Card from "../UI/Card";
import "./DiscardChangesDialog.css";

export default function DiscardChangesDialog({ onKeep, onDiscard }: {
    onKeep: () => void;
    onDiscard: () => void;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const keepRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const messageId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        keepRef.current?.focus();
        return () => dialog?.close();
    }, []);

    return (
        <dialog ref={dialogRef} className="discard-changes-dialog" role="alertdialog" aria-modal="true"
            aria-labelledby={titleId} aria-describedby={messageId}
            onCancel={event => { event.preventDefault(); onKeep(); }}>
            <Card className="discard-changes-card">
                <h2 id={titleId}>Discard changes?</h2>
                <p id={messageId}>If you leave now, your unsaved changes will be lost.</p>
                <div className="discard-changes-actions">
                    <Button ref={keepRef} onClick={onKeep}>Keep editing</Button>
                    <Button className="discard-changes-danger" onClick={onDiscard}>Discard changes</Button>
                </div>
            </Card>
        </dialog>
    );
}
