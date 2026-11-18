import Button from '../Button/Button';
import './OptionGroup.css';

type OptionGroupProps<T extends string> = {
    label: string;
    options: readonly { id: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    variant?: 'pill' | 'underline';
};

export default function OptionGroup<T extends string>({
    label, options, value, onChange, variant = 'pill',
}: OptionGroupProps<T>) {
    return (
        <div role="group" aria-label={label} className={`option-group option-group--${variant}`}>
            {options.map(option => (
                <Button key={option.id} aria-pressed={option.id === value} onClick={() => onChange(option.id)}>
                    {option.label}
                </Button>
            ))}
        </div>
    );
}
