import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface MultilineTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  allowNewlines?: boolean;
}

export function MultilineTextarea({
  className,
  value,
  onChange,
  onValueChange,
  allowNewlines = true,
  ...props
}: MultilineTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState<string>(value as string || "");

  // Update internal value when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value as string);
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(e);
    }
    
    // Call the onValueChange callback if provided
    if (onValueChange) {
      onValueChange(e.target.value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key
    if (e.key === "Enter") {
      if (allowNewlines) {
        // Allow normal behavior (new line)
        return;
      } else {
        // Prevent default behavior (form submission or new line)
        e.preventDefault();
        
        // Call props.onKeyDown if it exists
        if (props.onKeyDown) {
          props.onKeyDown(e);
        }
      }
    }
    
    // Call props.onKeyDown for other keys if it exists
    if (props.onKeyDown && e.key !== "Enter") {
      props.onKeyDown(e);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      value={internalValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}
