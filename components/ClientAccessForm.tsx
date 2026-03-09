"use client";

import { useFormState, useFormStatus } from "react-dom";
import { clientAccessAction, type ClientAccessState } from "@/app/client/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "Loading..." : "View gallery"}
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
    >
      <input
        className="w-full rounded-full border border-black/20 bg-white/70 px-6 py-3 text-sm text-black/80"
        placeholder="Access code"
        name="code"
        required
      />
      <SubmitButton />
      {state.error ? (
        <p className="text-xs uppercase tracking-[0.3em] text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
