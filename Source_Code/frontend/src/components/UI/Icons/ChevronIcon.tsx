import type { SVGProps } from "react";

export default function ChevronIcon({
    width = 18, height = 18, ...props
}: SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} width={width} height={height} viewBox="0 0 24 24"
            aria-hidden="true" focusable="false" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}
