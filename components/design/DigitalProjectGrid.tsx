import DigitalProjectCard, {
  type DigitalProjectCardModel,
} from "@/components/design/DigitalProjectCard";

type Props = {
  projects: DigitalProjectCardModel[];
  emptyMessage?: string;
};

export default function DigitalProjectGrid({
  projects,
  emptyMessage = "No published projects in this category yet.",
}: Props) {
  if (!projects.length) {
    return (
      <p className="mt-10 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-white/55">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="mt-10 grid gap-5 md:grid-cols-2">
      {projects.map((project, index) => (
        <DigitalProjectCard
          key={project.slug}
          project={project}
          variant={project.featured && index === 0 ? "featured" : "standard"}
        />
      ))}
    </div>
  );
}
