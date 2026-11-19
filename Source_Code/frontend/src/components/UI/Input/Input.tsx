import { useState, type ComponentPropsWithoutRef } from "react";

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "value" | "onChange" | "defaultValue"> & {
    defaultValue?: string;
    getInputValueHandler?: (value: string) => void;
};

export default function Input({ defaultValue = "", getInputValueHandler, ...props }: InputProps) {
    const [value, setValue] = useState(defaultValue);

    return (
        <input {...props} value={value} onChange={event => {
            const next = event.currentTarget.value;
            setValue(next);
            getInputValueHandler?.(next);
        }} />
    );
}
