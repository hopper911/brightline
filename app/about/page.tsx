export const metadata = {
  title: "About | Bright Line Photography",
  description:
    "A commercial photography studio specializing in hospitality, real estate, and editorial work.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">
        About Bright Line
      </p>
      <h1 className="font-display text-4xl text-black">Crafted for modern brands.</h1>
      <p className="mt-4 text-base text-black/70">
        Bright Line is a commercial photography studio delivering imagery for
        hospitality, real estate, retail, and fashion teams that demand clarity
        and quiet luxury. We collaborate on creative direction, shot lists, and
        post-production to keep every channel cohesive.
      </p>
      <h2 className="mt-10 font-display text-2xl text-black">
        A focused, efficient workflow.
      </h2>
      <p className="mt-3 text-base text-black/70">
        From pre-production to final delivery, we optimize each shoot for
        timeline, budget, and usage needs. Our team works across New York, Miami,
        and destination locations to build visual systems that last.
      </p>
    </div>
  );
}
