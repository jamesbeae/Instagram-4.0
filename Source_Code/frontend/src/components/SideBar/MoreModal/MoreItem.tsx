import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../UI/Button/Button";

type MoreItemProps = {
    icon: IconDefinition;
    title: string;
    onClick: () => void;
    danger?: boolean;
};

export default function MoreItem({ icon, title, onClick, danger = false }: MoreItemProps) {
    return (
        <Button className={`sidebar-more-item${danger ? " sidebar-more-item-danger" : ""}`} onClick={onClick}>
            <FontAwesomeIcon icon={icon} aria-hidden="true" />
            {title}
        </Button>
    );
}
