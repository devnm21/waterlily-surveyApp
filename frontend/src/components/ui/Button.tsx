import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
};

/** A survey-friendly action button with clear primary and supporting states. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "primary", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={["ui-button", `ui-button--${variant}`, className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
  },
);
