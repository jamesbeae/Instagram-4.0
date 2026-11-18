import type { ComponentPropsWithoutRef } from "react";
import ChevronIcon from "../Icons/ChevronIcon";
import "./SelectField.css";

type SelectOption<Value extends string> = {
    value: Value;
    label: string;
    disabled?: boolean;
};

type SelectFieldProps<Value extends string> = Omit<
    ComponentPropsWithoutRef<"select">,
    "children" | "className" | "defaultValue" | "multiple" | "onChange" | "size" | "value"
> & {
    label: string;
    value: Value;
    options: readonly SelectOption<Value>[];
    onChange: (value: Value) => void;
    className?: string;
};

export default function SelectField<Value extends string>({
    label, value, options, onChange, className = "", ...props
}: SelectFieldProps<Value>) {
    return (
        <label className={`ui-select-field ${className}`}>
            <span className="ui-select-label">{label}</span>
            <span className="ui-select-input">
                <select {...props} className="ui-select-control" value={value} onChange={event => {
                    const option = options.find(item => item.value === event.currentTarget.value);
                    if (option && !option.disabled) onChange(option.value);
                }}>
                    {options.map(option => (
                        <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronIcon className="ui-select-chevron" />
            </span>
        </label>
    );
}
