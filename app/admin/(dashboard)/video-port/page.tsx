import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video Port · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default function AdminVideoPortPage() {
  redirect("/admin/r2?mode=encode&vault=brightline&prefix=portfolio/arc/web_video/");
}
