import { useEffect, useRef, type ReactNode } from "react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAppDispatch } from "../../hooks/useStore";
import { sideBarActions, type SidebarPanelName } from "../../lib/redux/sideBarSlice";
import Button from "../UI/Button/Button";
import Card from "../UI/Card";
import "./SidebarPanel.css";

export default function SidebarPanel({ name, title, controls, children }: {
    name: SidebarPanelName;
    title: string;
    controls?: ReactNode;
    children: ReactNode;
}) {
    const dispatch = useAppDispatch();
    const header = useRef<HTMLDivElement>(null);
    const id = `sidebar-panel-${name}`;

    useEffect(() => {
        header.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
        if (!header.current?.contains(document.activeElement)) {
            header.current?.querySelector("button")?.focus({ preventScroll: true });
        }
    }, []);

    function dismiss() {
        dispatch(sideBarActions.closePanel(name));
        document.getElementById(`${id}-trigger`)?.focus({ preventScroll: true });
    }

    return (
        <Card as="aside" id={id} className="sidebar-panel" aria-labelledby={`${id}-title`}
            onKeyDown={event => {
                if (event.key !== "Escape" || event.defaultPrevented) return;
                event.preventDefault();
                dismiss();
            }}>
            <div ref={header} className="sidebar-panel-controls">
                <header className="sidebar-panel-header">
                    <h2 id={`${id}-title`}>{title}</h2>
                    <Button className="sidebar-panel-close" aria-label={`Close ${title.toLowerCase()}`} onClick={dismiss}>
                        <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                    </Button>
                </header>
                {controls}
            </div>
            <div className="sidebar-panel-body">{children}</div>
        </Card>
    );
}
