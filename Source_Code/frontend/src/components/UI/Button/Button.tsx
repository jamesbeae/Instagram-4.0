import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import './Button.css';

export type ButtonProps = ComponentPropsWithoutRef<'button'> & { variant?: 'default' | 'primary' };

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { type = 'button', className = '', disabled, variant = 'default', ...props }, ref,
) {
    const style = variant === 'primary' ? ' ui-button-primary' : '';
    return <button ref={ref} type={type} disabled={disabled} className={`${className}${style}${disabled ? " opacity-70" : ""}`} {...props} />;
});

export default Button;
