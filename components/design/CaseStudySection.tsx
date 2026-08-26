type Props = {
  title: string;
  children: React.ReactNode;
  id?: string;
};

export default function CaseStudySection({ title, children, id }: Props) {
  return (
    <section id={id} className="scroll-mt-28 py-10 md:py-14">
      <h2 className="font-display text-2xl text-white md:text-3xl">{title}</h2>
      <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-white/75 md:text-lg">
        {children}
      </div>
    </section>
  );
}
