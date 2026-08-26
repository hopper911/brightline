import type { Metadata } from "next";
import StudioHubEditor from "@/components/admin/StudioHubEditor";

export const metadata: Metadata = {
  title: "Admin · New Studio CMS project",
  robots: { index: false, follow: false },
};

export default function NewStudioCmsProjectPage() {
  return <StudioHubEditor />;
}
