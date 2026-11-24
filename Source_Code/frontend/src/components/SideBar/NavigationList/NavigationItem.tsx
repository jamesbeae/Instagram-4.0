import type { ReactNode } from "react";
import { useAppSelector } from "../../../hooks/useStore";
import type { SidebarPanelName } from "../../../lib/redux/sideBarSlice";
import Button from "../../UI/Button/Button";

export default function NavigationItem({ icon, title, onClick, panel, accessibleLabel = title }: {
    icon: ReactNode;
    title: string;
    accessibleLabel?: string;
    onClick: () => void;
    panel?: SidebarPanelName;
}) {
    const { openedModal, currentPage } = useAppSelector(state => state.sideBarSlice);
    const isOpen = panel !== undefined && openedModal === panel;
    const isCurrent = currentPage === title.toLowerCase();

    return (
        <Button id={panel ? `sidebar-panel-${panel}-trigger` : undefined}
            aria-label={accessibleLabel} aria-expanded={panel ? isOpen : undefined}
            aria-controls={isOpen ? `sidebar-panel-${panel}` : undefined}
            aria-current={isCurrent ? "page" : undefined}
            className={`sidebar-nav-item group mt-0.5 flex w-full items-center gap-4 rounded-[14px] border py-3 hover:bg-lightSecondDark ${isCurrent ? "bg-lightDark" : ""} ${isOpen ? "border-foreground" : "border-transparent"}`}
            onClick={onClick}>
            <span className="transition-transform group-hover:scale-105">{icon}</span>
            <span className="navigation-label text-base font-normal">{title}</span>
        </Button>
    );
}
