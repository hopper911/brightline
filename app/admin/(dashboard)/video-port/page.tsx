import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video Port · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default function AdminVideoPortPage() {
  redirect(
    "/admin/r2?vault=brightline&view=brightline-all-media&kind=video&mode=encode&upload=1&root=portfolio&quality=web_video"
  );
}
