import {
    createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState,
    type ReactNode,
} from "react";
import { Outlet, unstable_useBlocker, type unstable_BlockerFunction } from "react-router-dom";
import DiscardChangesDialog from "./DiscardChangesDialog";

type Draft = { scope?: string; discard?: () => void };
type ExitAction = () => void;

type DraftRegistry = {
    register: (id: symbol, draft: Draft) => () => void;
    remove: (id: symbol) => void;
    confirm: (action: ExitAction) => void;
    leaveScope: (action: ExitAction, scope?: string) => void;
};

const RegistryContext = createContext<DraftRegistry | null>(null);
export const DraftScope = createContext<string | undefined>(undefined);

export default function UnsavedChangesProvider() {
    return <DraftRegistryProvider><Outlet /></DraftRegistryProvider>;
}

function DraftRegistryProvider({ children }: { children: ReactNode }) {
    const drafts = useRef(new Map<symbol, Draft>());
    const [pendingExit, setPendingExit] = useState<{ action: ExitAction } | null>(null);

    const warnBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
        if (drafts.current.size === 0) return;
        event.preventDefault();
        event.returnValue = true;
    }, []);

    const remove = useCallback((id: symbol) => {
        drafts.current.delete(id);
        if (!drafts.current.size) window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [warnBeforeUnload]);

    const register = useCallback((id: symbol, draft: Draft) => {
        if (!drafts.current.size) window.addEventListener("beforeunload", warnBeforeUnload);
        drafts.current.set(id, draft);
        return () => remove(id);
    }, [remove, warnBeforeUnload]);

    const collect = useCallback((scope?: string) => (
        Array.from(drafts.current.entries()).filter(([, draft]) => scope === undefined || draft.scope === scope)
    ), []);

    const discardDrafts = useCallback((scope?: string) => {
        for (const [id, draft] of collect(scope)) {
            remove(id);
            draft.discard?.();
        }
    }, [collect, remove]);

    const confirm = useCallback((action: ExitAction) => {
        setPendingExit(current => current ?? { action });
    }, []);

    const leaveScope = useCallback((action: ExitAction, scope?: string) => {
        if (collect(scope).length) {
            confirm(() => {
                discardDrafts(scope);
                action();
            });
        } else {
            action();
        }
    }, [collect, confirm, discardDrafts]);

    const registry = useMemo(() => ({ register, remove, confirm, leaveScope }), [register, remove, confirm, leaveScope]);
    const blocker = unstable_useBlocker(useCallback<unstable_BlockerFunction>(({ currentLocation, nextLocation }) => (
        drafts.current.size > 0 && (
            currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search
        )
    ), []));

    function keepEditing() {
        setPendingExit(null);
        if (blocker.state === "blocked") blocker.reset();
    }

    function discardChanges() {
        if (pendingExit) {
            setPendingExit(null);
            if (blocker.state === "blocked") blocker.reset();
            pendingExit.action();
        } else if (blocker.state === "blocked") {
            discardDrafts();
            blocker.proceed();
        }
    }

    return (
        <RegistryContext.Provider value={registry}>
            {children}
            {(pendingExit || blocker.state === "blocked") &&
                <DiscardChangesDialog onKeep={keepEditing} onDiscard={discardChanges} />}
        </RegistryContext.Provider>
    );
}

export function useUnsavedChanges(dirty: boolean, onDiscard?: ExitAction) {
    const registry = useContext(RegistryContext);
    const scope = useContext(DraftScope);
    const id = useRef(Symbol("draft"));
    const discardRef = useRef(onDiscard);

    useLayoutEffect(() => {
        discardRef.current = onDiscard;
    }, [onDiscard]);

    useLayoutEffect(() => {
        if (dirty) return registry?.register(id.current, { scope, discard: () => discardRef.current?.() });
    }, [dirty, registry, scope]);

    const markSaved = useCallback(() => registry?.remove(id.current), [registry]);
    const requestExit = useCallback((action: ExitAction) => {
        if (dirty && registry) {
            registry.confirm(() => {
                markSaved();
                action();
            });
        } else {
            action();
        }
    }, [dirty, markSaved, registry]);

    return { markSaved, requestExit };
}

export function useConfirmDiscard() {
    const registry = useContext(RegistryContext);
    return useCallback((action: ExitAction, scope?: string) => {
        if (registry) registry.leaveScope(action, scope);
        else action();
    }, [registry]);
}
