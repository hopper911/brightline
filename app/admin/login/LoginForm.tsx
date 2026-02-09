"use client";

import { useFormState } from "react-dom";
import type { LoginState } from "./actions";

type LoginFormProps = {
  next?: string;
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
};

export default function LoginForm({ next, action }: LoginFormProps) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next || ""} />
      <input
        type="password"
        name="accessCode"
        placeholder="Access code"
        className="w-full rounded border border-black/20 bg-white/80 px-4 py-3 text-sm"
        required
      />
      <button
        type="submit"
        className="w-full rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.32em] text-white"
      >
        Sign in
      </button>
      {state.error ? (
        <p className="text-xs uppercase tracking-[0.3em] text-red-500">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
