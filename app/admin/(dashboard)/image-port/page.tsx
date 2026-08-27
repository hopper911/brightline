import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Image Port · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default function AdminImagePortPage() {
  redirect(
    "/admin/r2?vault=brightline&view=brightline-all-media&kind=image&upload=1&root=portfolio&quality=web_full"
  );
}
