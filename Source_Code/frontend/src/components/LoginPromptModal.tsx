import { type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../pages/Login/LoginForm';

export default function LoginPromptModal({ onClose }: { onClose: () => void }) {
    function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget) onClose();
    }

    return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={closeOnBackdrop}>
        <section role="dialog" aria-modal="true" aria-labelledby="login-prompt-title" className="relative w-full max-w-md rounded-2xl border border-lightDark bg-dark p-6 text-foreground shadow-2xl">
            <button type="button" aria-label="Close login dialog" onClick={onClose} className="absolute right-4 top-3 text-2xl">×</button>
            <h2 id="login-prompt-title" className="mb-2 text-center text-xl font-semibold">Log in to continue</h2>
            <p className="mb-5 text-center text-sm text-textGray">Sign in to like, comment, save, follow, and message.</p>
            <LoginForm />
            <p className="mt-5 text-center text-sm">New here? <Link className="text-blue" to="/sign-up" onClick={onClose}>Create an account</Link></p>
        </section>
    </div>;
}
