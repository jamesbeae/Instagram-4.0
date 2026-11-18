type LoadingProps = {
    message?: string;
    className?: string;
    align?: 'center' | 'start';
};

export default function Loading({
    message = 'Loading…',
    className = '',
    align = 'center',
}: LoadingProps) {
    return (
        <div role="status" className={`flex items-center gap-2 text-sm ${align === 'start' ? 'justify-start' : 'justify-center'} ${className}`}>
            <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
            />
            <span>{message}</span>
        </div>
    );
}
