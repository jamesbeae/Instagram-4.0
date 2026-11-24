import type { RefObject } from "react";
import { faArrowLeft, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../UI/Button/Button";

export default function Heading({ id, titleRef, onClose, onBack, busy, title = "Create new post" }: {
    id: string;
    titleRef: RefObject<HTMLHeadingElement>;
    onClose: () => void;
    onBack?: () => void;
    busy: boolean;
    title?: string;
}) {
    return (
        <header className="create-post-header">
            {onBack && <Button className="create-post-close" aria-label="Go back" disabled={busy} onClick={onBack}>
                <FontAwesomeIcon icon={faArrowLeft} />
            </Button>}
            <h2 id={id} ref={titleRef} tabIndex={-1} className="min-w-0 flex-1 text-xl font-semibold focus:outline-none sm:text-2xl">
                {title}
            </h2>
            <Button className="create-post-close" aria-label="Close create post" disabled={busy} onClick={onClose}>
                <FontAwesomeIcon icon={faXmark} />
            </Button>
        </header>
    );
}
