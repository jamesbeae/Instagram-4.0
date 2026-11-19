import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Card from "../UI/Card";
import "./AuthLayout.css";

type AuthLayoutProps = {
    title: string;
    prompt: string;
    link: { to: string; label: string };
    children: ReactNode;
};

export default function AuthLayout({ title, prompt, link, children }: AuthLayoutProps) {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = title;
        return () => { document.title = previousTitle; };
    }, [title]);

    return (
        <main className="auth-page">
            <Card as="section" className="auth-card" aria-labelledby="auth-title">
                <h1 id="auth-title">{title}</h1>
                {children}
                <p className="auth-switch">
                    {prompt}{" "}<Link to={link.to}>{link.label}</Link>
                </p>
            </Card>
        </main>
    );
}
