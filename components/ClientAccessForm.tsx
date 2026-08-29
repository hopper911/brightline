"use client";

import { useFormState, useFormStatus } from "react-dom";
import { clientAccessAction, type ClientAccessState } from "@/app/client/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Loading…" : "View gallery"}
    </button>
  );
}

export default function ClientAccessForm() {
  const [state, formAction] = useFormState<ClientAccessState, FormData>(
    clientAccessAction,
    {}
  );

  return (
    <form
      action={formAction}
      className="mt-8 flex w-full max-w-md flex-col gap-3"
      aria-label="Client gallery access"
    >
      <label htmlFor="client-access-code" className="sr-only">
        Gallery access code
      </label>
      <input
        id="client-access-code"
        className="w-full rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm text-white placeholder:text-white/40"
        placeholder="Access code"
        name="code"
        type="text"
        required
        autoComplete="one-time-code"
        aria-required="true"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "client-access-error" : undefined}
      />
      <SubmitButton />
      {state.error ? (
        <p
          id="client-access-error"
          className="text-xs uppercase tracking-[0.3em] text-red-400"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
