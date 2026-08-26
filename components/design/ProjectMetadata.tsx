type MetaItem = { label: string; value: string };

type Props = {
  items: MetaItem[];
  className?: string;
};

export default function ProjectMetadata({ items, className = "" }: Props) {
  const visible = items.filter((item) => item.value.trim());
  if (!visible.length) return null;

  return (
    <dl
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      aria-label="Project metadata"
    >
      {visible.map((item) => (
        <div key={item.label}>
          <dt className="text-[0.62rem] uppercase tracking-[0.25em] text-white/45">{item.label}</dt>
          <dd className="mt-1 text-sm text-white/80">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
