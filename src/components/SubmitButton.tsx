"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  confirmMessage?: string;
  className?: string;
};

// A submit button that disables itself while the form is being sent (so a
// double click cannot book twice) and can ask "are you sure?" first.
export default function SubmitButton({ children, pendingLabel = "Please wait...", confirmMessage, className = "" }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={`rounded-lg px-5 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
