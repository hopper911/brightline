import { redirect } from "next/navigation";
import { getWorkBySlug, workItems } from "../../lib/work";

export function generateStaticParams() {
  return workItems.map((item) => ({ slug: item.slug }));
}

export default function WorkDetailPage({ params }: { params: { slug: string } }) {
  const work = getWorkBySlug(params.slug);
  if (!work) {
    redirect("/portfolio");
  }

  redirect(`/portfolio/${work.categorySlug}/${work.slug}`);
}
