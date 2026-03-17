import type { Metadata } from "next";
import { StudioShell } from "@/components/studio/StudioShell";
import { MOCK_ROOMS, MOCK_SUMMARY } from "@/lib/studio/mockData";

export const metadata: Metadata = {
  title: "Studio | Bright Line Studio OS",
  description: "Mission control for your photography studio",
};

export default function StudioPage() {
  return (
    <StudioShell rooms={MOCK_ROOMS} summaryMetrics={MOCK_SUMMARY} />
  );
}
