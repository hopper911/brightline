/** Shared edge fades so section / page backgrounds blend into the site canvas. */

export function SectionBlendBottom() {
  return <div className="section-blend-bottom" aria-hidden />;
}

export function SectionBlendTop() {
  return <div className="section-blend-top" aria-hidden />;
}

export type SectionMediaFade = "none" | "bottom" | "edges";

export function sectionMediaFadeClass(fade: SectionMediaFade) {
  if (fade === "bottom") return "section-bg-media-fade-bottom";
  if (fade === "edges") return "section-bg-media-fade-edges";
  return "";
}
