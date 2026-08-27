import MirotechMediaCommandCenter from "@/components/admin/MirotechMediaCommandCenter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mirotech media · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default function MirotechMediaPage() {
  return <MirotechMediaCommandCenter />;
}
