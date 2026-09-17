import { forwardRef, type ComponentProps } from "react";

export type InputProps = ComponentProps<"input">;

/** A calm, roomy form control for survey answers and account details. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={["ui-input", className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  },
);
