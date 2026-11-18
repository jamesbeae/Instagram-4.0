import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

export type ButtonProps = ComponentPropsWithoutRef<'button'>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { type = 'button', className = '', disabled, ...props }, ref,
) {
    return <button ref={ref} type={type} disabled={disabled} className={`${className}${disabled ? " opacity-70" : ""}`} {...props} />;
});

export default Button;
