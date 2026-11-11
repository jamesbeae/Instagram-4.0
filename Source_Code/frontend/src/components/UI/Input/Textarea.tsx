import React, { useEffect, useState, useRef } from "react";
const Textarea: React.FC<{
    name: string;
    id: string;
    placeholder?: string;
    getTextareaValueHandler: Function;
    handleEnterKey?: Function;
    addedEmojis?: string[];
    className: string;
    clear?: boolean;
}> = ({ name, id, placeholder, addedEmojis, getTextareaValueHandler, handleEnterKey, className, clear, }) => {
    const [value, setValue] = useState<string>("");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const textareaHandler = (value: string) => {
        setValue(value);
    };
    // Auto resize textarea:
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "18px";
            const height = textarea.scrollHeight;
            textarea.style.height = height + "px";
        }
    }, [value]);
    useEffect(() => {
        addedEmojis &&
            addedEmojis.length > 0 &&
            setValue((pre) => pre + addedEmojis[addedEmojis.length - 1]);
    }, [addedEmojis]);
    useEffect(() => {
        getTextareaValueHandler(value);
    }, [value]);
    // Clear textarea when click submit:
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.value = "";
            setValue("");
        }
    }, [clear]);
    return (<textarea ref={textareaRef} value={value} onChange={(e) => {
            textareaHandler(e.target.value);
        }} name={name} id={id} placeholder={placeholder} cols={30} rows={10} className={className +
            "max-h-28 scrollbar-hide resize-none overscroll-contain"} onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleEnterKey && handleEnterKey(value);
            }
        }}></textarea>);
};
export default Textarea;
