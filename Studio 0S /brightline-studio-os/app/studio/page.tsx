import type { Metadata } from "next";
import { StudioShell } from "@/components/studio/StudioShell";
import { getMissionControl } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio | Bright Line Studio OS",
  description: "Mission control for your photography studio",
};

export default async function StudioPage() {
  const data = await getMissionControl();
  return <StudioShell data={data} />;
}
