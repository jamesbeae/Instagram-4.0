import { useEffect, useRef, type RefObject } from "react";

export default function useInfiniteScroll({
    enabled, onReach, rootRef, rootMargin,
}: {
    enabled: boolean;
    onReach?: () => void;
    rootRef?: RefObject<HTMLElement>;
    rootMargin: string;
}) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        const root = rootRef?.current ?? null;
        if (!enabled || !onReach || !sentinel || (rootRef && !root) || typeof IntersectionObserver === "undefined") return;

        let active = true;
        const observer = new IntersectionObserver(entries => {
            if (!active || !entries.some(entry => entry.isIntersecting)) return;
            active = false;
            observer.disconnect();
            onReach();
        }, { root, rootMargin });
        observer.observe(sentinel);
        return () => {
            active = false;
            observer.disconnect();
        };
    }, [enabled, onReach, rootMargin, rootRef]);

    return sentinelRef;
}
