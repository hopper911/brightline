"use client";

type Props = {
  busy?: boolean;
  disabled?: boolean;
  published: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
};

export function PublishProjectButton({
  busy,
  disabled,
  published,
  onPublish,
  onUnpublish,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="btn btn-solid"
        disabled={busy || disabled || published}
        onClick={onPublish}
      >
        {busy ? "Working…" : "Publish"}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={busy || disabled || !published}
        onClick={onUnpublish}
      >
        Unpublish
      </button>
    </div>
  );
}
