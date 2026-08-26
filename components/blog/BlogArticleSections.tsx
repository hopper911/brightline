import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import BeforeAfterSlider from "@/components/blog/BeforeAfterSlider";
import BlogPostFooter from "@/components/blog/BlogPostFooter";
import BlogPostGallery from "@/components/blog/BlogPostGallery";
import BlogPostVideos from "@/components/blog/BlogPostVideos";
import GoogleReviewCard from "@/components/blog/GoogleReviewCard";
import TravelItineraryMap from "@/components/blog/TravelItineraryMap";
import StoryChapters from "@/components/story/StoryChapters";
import {
  blankTravel,
  hasBeforeAfter,
  hasCaseStudyBrief,
  hasCaseStudyProblem,
  hasCaseStudySolution,
  hasGoogleReview,
  hasTravelMap,
  resolveSectionOrder,
  type BlogPost,
  type BlogSectionId,
} from "@/lib/blog-post-model";
import { cleanStoryChapters } from "@/lib/story-chapters";

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function CaseStudyBlock({
  kicker,
  text,
  delay = 0.08,
}: {
  kicker: string;
  text: string;
  delay?: number;
}) {
  return (
    <Reveal className="mt-12" delay={delay}>
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">{kicker}</p>
        <div className="mt-4 space-y-4">
          {paragraphs(text).map((block) => (
            <p key={block.slice(0, 48)} className="text-base leading-relaxed text-white/82">
              {block}
            </p>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function TravelBlock({
  kicker,
  text,
  delay = 0.08,
}: {
  kicker: string;
  text: string;
  delay?: number;
}) {
  if (!text.trim()) return null;
  return (
    <Reveal className="mt-12" delay={delay}>
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">{kicker}</p>
        <div className="mt-4 space-y-4">
          {paragraphs(text).map((block) => (
            <p key={block.slice(0, 48)} className="text-base leading-relaxed text-white/82">
              {block}
            </p>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

type BlogArticleSectionsProps = {
  post: BlogPost;
  /** Skip Reveal animations in admin preview. */
  reveal?: boolean;
};

export default function BlogArticleSections({
  post,
  reveal = true,
}: BlogArticleSectionsProps) {
  const cs = post.caseStudy;
  const travel = post.travel ?? blankTravel();
  const isTravel = post.format === "travel";
  const showGallery = cs.galleryEnabled !== false && post.galleryImages.length > 0;
  const showMap = isTravel && hasTravelMap(travel);
  const bodyBlocks = paragraphs(post.body);
  const storyChapters = cleanStoryChapters(post.storyChapters);
  const useStories = storyChapters.length > 0;
  const showBeforeAfter = hasBeforeAfter(post.beforeAfter);
  const placement = post.beforeAfter.placement;
  const sectionOrder = resolveSectionOrder(post);
  const galleryPool = post.galleryImages.map((image, index) => ({
    id: image.id || `img_${index}`,
    src: image.url,
    alt: image.alt || "",
  }));

  const beforeAfterBlock = showBeforeAfter ? (
    reveal ? (
      <Reveal className="mt-12" delay={0.08}>
        <BeforeAfterSlider section={post.beforeAfter} />
      </Reveal>
    ) : (
      <div className="mt-12">
        <BeforeAfterSlider section={post.beforeAfter} />
      </div>
    )
  ) : null;

  const storiesSkip = new Set<BlogSectionId>(["cover", "takeaways", "case", "body"]);

  function renderSection(id: BlogSectionId) {
    if (useStories && storiesSkip.has(id)) return null;

    switch (id) {
      case "cover":
        if (!post.coverImageUrl) return null;
        return (
          <Reveal key={id} className="mt-10" delay={0.05}>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 image-guard-overlay">
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                fill
                priority
                draggable={false}
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover"
              />
            </div>
            {placement === "afterCover" ? beforeAfterBlock : null}
          </Reveal>
        );
      case "takeaways":
        if (!post.keyTakeaways?.trim()) return null;
        return (
          <Reveal key={id} className="mt-10" delay={0.05}>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                Key takeaways
              </p>
              <ul className="mt-4 space-y-2">
                {post.keyTakeaways
                  .split(/\n+/)
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line.slice(0, 48)} className="text-sm leading-relaxed text-white/80">
                      {line.replace(/^[-•*]\s*/, "")}
                    </li>
                  ))}
              </ul>
            </div>
          </Reveal>
        );
      case "case":
        if (isTravel) return null;
        return (
          <div key={id}>
            {hasCaseStudyBrief(cs) ? (
              <CaseStudyBlock kicker="Brief project description" text={cs.brief} delay={0.06} />
            ) : null}
            {hasCaseStudyProblem(cs) ? (
              <CaseStudyBlock kicker="Problem" text={cs.problem} delay={0.07} />
            ) : null}
            {hasCaseStudySolution(cs) ? (
              <CaseStudyBlock kicker="Solution" text={cs.solution} delay={0.08} />
            ) : null}
          </div>
        );
      case "body":
        if (!bodyBlocks.length) return null;
        return (
          <div key={id}>
            <Reveal className="mt-10 space-y-5" delay={0.08}>
              {bodyBlocks.map((block) => (
                <p key={block.slice(0, 40)} className="text-base leading-relaxed text-white/82">
                  {block}
                </p>
              ))}
            </Reveal>
            {placement === "afterBody" ? beforeAfterBlock : null}
            {isTravel ? (
              <TravelBlock kicker="Highlights" text={travel.highlights} delay={0.06} />
            ) : null}
          </div>
        );
      case "review":
        if (!hasGoogleReview(post.googleReview)) return null;
        return (
          <Reveal key={id} className="mt-12" delay={0.08}>
            <GoogleReviewCard review={post.googleReview} />
          </Reveal>
        );
      case "map":
        if (!showMap) return null;
        return (
          <Reveal key={id} className="mt-12" delay={0.08}>
            <TravelItineraryMap
              stops={travel.mapStops}
              routeSummary={travel.routeSummary}
              mapUrl={travel.mapUrl}
              locationLabel={travel.locationLabel || travel.destination}
            />
          </Reveal>
        );
      case "itinerary":
        if (!isTravel || travel.itinerary.length === 0) return null;
        return (
          <Reveal key={id} className="mt-12" delay={0.08}>
            <p className="mb-4 text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
              Itinerary
            </p>
            <div className="space-y-4">
              {travel.itinerary.map((day, i) => (
                <div
                  key={`${day.dayLabel}-${day.title}-${i}`}
                  className="rounded-2xl border border-white/10 bg-black/40 p-6"
                >
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                    {day.dayLabel || `Day ${i + 1}`}
                    {day.place ? ` · ${day.place}` : ""}
                  </p>
                  {day.title ? (
                    <h2 className="mt-2 font-display text-xl text-white">{day.title}</h2>
                  ) : null}
                  {day.body ? (
                    <div className="mt-3 space-y-3">
                      {paragraphs(day.body).map((block) => (
                        <p
                          key={block.slice(0, 40)}
                          className="text-sm leading-relaxed text-white/78"
                        >
                          {block}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Reveal>
        );
      case "travelNotes":
        if (!isTravel) return null;
        return (
          <div key={id}>
            <TravelBlock kicker="Where we stayed" text={travel.whereWeStayed} delay={0.09} />
            <TravelBlock kicker="Tips" text={travel.tips} delay={0.09} />
            <TravelBlock kicker="Packing notes" text={travel.packingNotes} delay={0.1} />
            <TravelBlock kicker="Camera kit" text={travel.cameraKit} delay={0.1} />
            <TravelBlock kicker="Essentials" text={travel.essentials} delay={0.1} />
          </div>
        );
      case "videos":
        return (
          <BlogPostVideos
            key={id}
            videos={post.videos ?? []}
            title={post.title}
            reveal={reveal}
            fallbackPosterUrl={
              post.coverImageUrl || post.galleryImages.find((img) => img.url?.trim())?.url || null
            }
          />
        );
      case "gallery":
        if (!showGallery) return null;
        return (
          <div key={id}>
            <Reveal className="mt-12 pb-2" delay={0.09}>
              <p className="mb-4 text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                Gallery
              </p>
              <BlogPostGallery
                title={post.title}
                images={post.galleryImages}
                blocks={post.galleryBlocks}
                carouselEnabled={cs.galleryCarouselEnabled === true}
              />
            </Reveal>
            {placement === "afterGallery" ? beforeAfterBlock : null}
          </div>
        );
      case "credits":
        if (!post.photoCredits?.trim()) return null;
        return (
          <Reveal key={id} className="mt-8" delay={0.09}>
            <p className="text-xs leading-relaxed text-white/45">{post.photoCredits}</p>
          </Reveal>
        );
      case "linkedWork":
        if (!post.linkedWorkSlug) return null;
        return (
          <Reveal key={id} className="mt-10" delay={0.1}>
            <Link
              href={`/work/${post.linkedWorkSlug}`}
              className="text-xs uppercase tracking-[0.28em] text-white/55 hover:text-white"
            >
              View related work →
            </Link>
          </Reveal>
        );
      default:
        return null;
    }
  }

  return (
    <>
      {useStories ? (
        <div className="mt-10">
          <StoryChapters chapters={storyChapters} pool={galleryPool} />
        </div>
      ) : null}
      {sectionOrder.map((id) => renderSection(id))}
    </>
  );
}

export function BlogArticleFooterNav({
  post,
  previous,
  next,
}: {
  post: BlogPost;
  previous: BlogPost | null;
  next: BlogPost | null;
}) {
  return <BlogPostFooter tags={post.tags} previous={previous} next={next} />;
}
