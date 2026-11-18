import type { HTMLAttributes } from 'react';
import './Card.css';

type CardProps = HTMLAttributes<HTMLElement> & { as?: 'div' | 'article' | 'aside' | 'section' };

export default function Card({ as: Element = 'div', className = '', ...props }: CardProps) {
    return <Element className={`ui-card ${className}`} {...props} />;
}
