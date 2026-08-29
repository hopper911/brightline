import { redirect } from "next/navigation";
import { BRAND } from "@/lib/config/brand";
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from "@/lib/public-page-cache";

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: `Private Gallery · ${BRAND.name}`,
    description: "Private BRIGHTLINE client galleries require an access code.",
    alternates: { canonical: "/galleries" },
    openGraph: {
      title: `Private Gallery · ${BRAND.name}`,
      description: "Private BRIGHTLINE client galleries require an access code.",
      url: `/galleries/${slug}`,
    },
    robots: { index: false, follow: false },
  };
}

export default function GalleryDetailPage() {
  redirect("/galleries");
}
