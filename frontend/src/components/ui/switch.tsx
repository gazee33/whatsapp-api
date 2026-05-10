"use client";

import { forwardRef } from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, id }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        role="switch"
        type="button"
        disabled={disabled}
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={[
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
          "border-2 border-transparent transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-input",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0",
            "transition-transform duration-200 ease-in-out",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";
