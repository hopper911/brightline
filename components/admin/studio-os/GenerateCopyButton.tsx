"use client";

type Props = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
};

export function GenerateCopyButton({
  loading,
  disabled,
  onClick,
  label = "Generate with AI",
}: Props) {
  return (
    <button
      type="button"
      className="btn btn-ghost text-sm"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? "Generating…" : label}
    </button>
  );
}
