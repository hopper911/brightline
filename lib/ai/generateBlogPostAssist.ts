import { BLOG_POST_ASSIST } from "@/lib/ai/prompts";
import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient, resolveOpenAiChatModel } from "@/lib/ai/runtime";

export type BlogAssistAction =
  | "suggest"
  | "polish"
  | "fix"
  | "excerpt"
  | "seo"
  | "format"
  | "title"
  | "body"
  | "tags"
  | "coverAlt"
  | "seoTitle"
  | "seoDescription"
  | "galleryAlts"
  | "caseBrief"
  | "caseProblem"
  | "caseSolution"
  | "caseVideoCaption"
  | "caseVideoPrompt"
  | "socialCaptions"
  | "travelHighlights"
  | "travelTips"
  | "travelItineraryDay"
  | "travelWhereStayed"
  | "travelPacking"
  | "travelCameraKit"
  | "travelEssentials"
  | "travelSeason"
  | "travelRoute"
  | "travelGenerateAll"
  | "pullQuote"
  | "keyTakeaways"
  | "photoCredits"
  | "imageMeta";

export type BlogPostDraft = {
  title?: string;
  excerpt?: string;
  body?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  coverImageAlt?: string;
  galleryImageCount?: number;
  galleryImageAlts?: string[];
  caseBrief?: string;
  caseProblem?: string;
  caseSolution?: string;
  caseVideoCaption?: string;
  caseVideoPrompt?: string;
  travelDestination?: string;
  travelRegion?: string;
  travelDatesLabel?: string;
  travelHighlights?: string;
  travelTips?: string;
  travelWhereStayed?: string;
  travelPacking?: string;
  travelCameraKit?: string;
  travelEssentials?: string;
  travelSeason?: string;
  travelRoute?: string;
  travelTripStyle?: string;
  travelTravelers?: string;
  travelItineraryDay?: { dayLabel?: string; title?: string; body?: string; place?: string };
  pullQuote?: string;
  keyTakeaways?: string;
  photoCredits?: string;
  format?: "journal" | "travel";
};

export type BlogFormatResult = {
  title?: string;
  excerpt: string;
  body: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
};

export type BlogSuggestResult = {
  suggestions: string[];
  improvedTitle?: string;
  improvedExcerpt?: string;
  improvedBody?: string;
  improvedSeoTitle?: string;
  improvedSeoDescription?: string;
  suggestedTags?: string[];
};

function cleanString(value: unknown, max = 12_000): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function stringList(value: unknown, max = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned invalid JSON.");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : value.slice(0, max - 1).trimEnd();
}

export function parseBlogAssistInput(body: unknown):
  | { ok: true; data: { action: BlogAssistAction; draft: BlogPostDraft } }
  | { ok: false; status: number; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }
  const obj = body as Record<string, unknown>;
  const action = obj.action;
  const allowed: BlogAssistAction[] = [
    "suggest",
    "polish",
    "fix",
    "excerpt",
    "seo",
    "format",
    "title",
    "body",
    "tags",
    "coverAlt",
    "seoTitle",
    "seoDescription",
    "galleryAlts",
    "caseBrief",
    "caseProblem",
    "caseSolution",
    "caseVideoCaption",
    "caseVideoPrompt",
    "socialCaptions",
    "travelHighlights",
    "travelTips",
    "travelItineraryDay",
    "travelWhereStayed",
    "travelPacking",
    "travelCameraKit",
    "travelEssentials",
    "travelSeason",
    "travelRoute",
    "travelGenerateAll",
    "pullQuote",
    "keyTakeaways",
    "photoCredits",
    "imageMeta",
  ];
  if (typeof action !== "string" || !allowed.includes(action as BlogAssistAction)) {
    return { ok: false, status: 400, error: "Invalid action." };
  }
  const rawDraft =
    obj.draft && typeof obj.draft === "object" && !Array.isArray(obj.draft)
      ? (obj.draft as Record<string, unknown>)
      : {};

  const itineraryRaw =
    rawDraft.travelItineraryDay &&
    typeof rawDraft.travelItineraryDay === "object" &&
    !Array.isArray(rawDraft.travelItineraryDay)
      ? (rawDraft.travelItineraryDay as Record<string, unknown>)
      : null;

  return {
    ok: true,
    data: {
      action: action as BlogAssistAction,
      draft: {
        title: cleanString(rawDraft.title, 200),
        excerpt: cleanString(rawDraft.excerpt, 1_000),
        body: cleanString(rawDraft.body, 40_000),
        tags: stringList(rawDraft.tags, 12),
        seoTitle: cleanString(rawDraft.seoTitle, 120),
        seoDescription: cleanString(rawDraft.seoDescription, 320),
        galleryImageCount:
          typeof rawDraft.galleryImageCount === "number" && Number.isFinite(rawDraft.galleryImageCount)
            ? Math.max(0, Math.trunc(rawDraft.galleryImageCount))
            : undefined,
        coverImageAlt: cleanString(rawDraft.coverImageAlt),
        galleryImageAlts: stringList(rawDraft.galleryImageAlts, 120),
        caseBrief: cleanString(rawDraft.caseBrief),
        caseProblem: cleanString(rawDraft.caseProblem),
        caseSolution: cleanString(rawDraft.caseSolution),
        caseVideoCaption: cleanString(rawDraft.caseVideoCaption),
        caseVideoPrompt: cleanString(rawDraft.caseVideoPrompt),
        travelDestination: cleanString(rawDraft.travelDestination),
        travelRegion: cleanString(rawDraft.travelRegion),
        travelDatesLabel: cleanString(rawDraft.travelDatesLabel),
        travelHighlights: cleanString(rawDraft.travelHighlights),
        travelTips: cleanString(rawDraft.travelTips),
        travelWhereStayed: cleanString(rawDraft.travelWhereStayed),
        travelPacking: cleanString(rawDraft.travelPacking),
        travelCameraKit: cleanString(rawDraft.travelCameraKit),
        travelEssentials: cleanString(rawDraft.travelEssentials),
        travelSeason: cleanString(rawDraft.travelSeason),
        travelRoute: cleanString(rawDraft.travelRoute),
        travelTripStyle: cleanString(rawDraft.travelTripStyle),
        travelTravelers: cleanString(rawDraft.travelTravelers),
        travelItineraryDay: itineraryRaw
          ? {
              dayLabel: cleanString(itineraryRaw.dayLabel),
              title: cleanString(itineraryRaw.title),
              body: cleanString(itineraryRaw.body),
              place: cleanString(itineraryRaw.place),
            }
          : undefined,
        pullQuote: cleanString(rawDraft.pullQuote),
        keyTakeaways: cleanString(rawDraft.keyTakeaways),
        photoCredits: cleanString(rawDraft.photoCredits),
        format: rawDraft.format === "travel" ? "travel" : "journal",
      },
    },
  };
}

function actionInstructions(action: BlogAssistAction) {
  switch (action) {
    case "suggest":
      return {
        task: "Review the draft and suggest concrete improvements.",
        responseShape: {
          suggestions: ["Short actionable bullet points"],
          improvedTitle: "Optional stronger title",
          improvedExcerpt: "Optional improved excerpt",
          improvedBody: "Optional improved body when clearly better",
          improvedSeoTitle: "Optional SEO title under 60 chars",
          improvedSeoDescription: "Optional meta description ~140-160 chars",
          suggestedTags: ["tag1", "tag2"],
        },
      };
    case "polish":
      return {
        task: "Rewrite the body for clarity, rhythm, and Bright Line editorial voice. Keep facts and meaning; improve flow.",
        responseShape: { body: "Polished full body text with paragraph breaks." },
      };
    case "fix":
      return {
        task: "Fix grammar, spelling, and awkward phrasing with minimal changes. Do not restructure unless necessary.",
        responseShape: { body: "Corrected body text." },
      };
    case "excerpt":
      return {
        task: "Write a compelling 1-2 sentence excerpt for the blog index card.",
        responseShape: { excerpt: "Short excerpt, roughly 120-220 characters." },
      };
    case "seo":
      return {
        task: "Write SEO title and meta description for this post.",
        responseShape: {
          seoTitle: "Under 60 characters when possible",
          seoDescription: "Around 140-160 characters",
        },
      };
    case "format":
      return {
        task: `Reformat this draft into a BRIGHTLINE Journal post — same editorial style as a studio note or project story (calm paragraphs, no ALL CAPS section headers, no portfolio landing-page tone). Use blank lines between paragraphs. If the body is empty or very short but gallery images exist, write 2-4 paragraphs that introduce the work using only facts from the draft. Keep the title accurate; refine only when clearly awkward.`,
        responseShape: {
          title: "Refined title when needed, otherwise keep the draft title",
          excerpt: "1-2 sentence card summary, roughly 120-200 characters",
          body: "Full journal body with paragraph breaks (\\n\\n). No bullet lists unless essential.",
          tags: ["up to 4 lowercase-friendly topic tags"],
          seoTitle: "Under 60 characters",
          seoDescription: "Around 140-160 characters",
        },
      };
    case "title":
      return {
        task: "Write a clear, editorial journal title that matches the draft. Keep proper nouns and project names accurate.",
        responseShape: { title: "Journal post title under 90 characters." },
      };
    case "body":
      return {
        task: "Rewrite the full journal body in BRIGHTLINE editorial voice — calm paragraphs, specific detail, no hype. Use blank lines between paragraphs. Keep facts from the draft; do not invent clients or projects.",
        responseShape: { body: "Full body with paragraph breaks (\\n\\n)." },
      };
    case "tags":
      return {
        task: "Suggest up to 4 concise topic tags for this journal post.",
        responseShape: { tags: ["tag1", "tag2"] },
      };
    case "coverAlt":
      return {
        task: "Write accessible cover image alt text for this journal post (describe the visual, not the article).",
        responseShape: { coverImageAlt: "Short descriptive alt text under 125 characters." },
      };
    case "seoTitle":
      return {
        task: "Write an SEO title for this journal post.",
        responseShape: { seoTitle: "Under 60 characters when possible." },
      };
    case "seoDescription":
      return {
        task: "Write an SEO meta description for this journal post.",
        responseShape: { seoDescription: "Around 140-160 characters." },
      };
    case "galleryAlts":
      return {
        task: "Write accessible alt text for each gallery image in order. Describe visuals specifically; vary wording across images. Return one alt string per image.",
        responseShape: { galleryAlts: ["alt for image 1", "alt for image 2"] },
      };
    case "caseBrief":
      return {
        task: "Write a Brief project description for a photography case study: what the project was, who it was for, and the scope in a few calm sentences. Use only facts from the draft (title, excerpt, body, existing case-study fields). Do not invent clients or locations.",
        responseShape: { caseBrief: "2-4 sentences for the Brief section." },
      };
    case "caseProblem":
      return {
        task: "Write the Problem section for a photography case study: what needed solving — constraints, goals, or visual challenge. Use only facts from the draft. Do not invent clients or locations.",
        responseShape: { caseProblem: "2-4 sentences for the Problem section." },
      };
    case "caseSolution":
      return {
        task: "Write the Solution section for a photography case study: how the work was approached — lighting, direction, delivery, or process. Use only facts from the draft. Do not invent clients or locations.",
        responseShape: { caseSolution: "2-4 sentences for the Solution section." },
      };
    case "caseVideoCaption":
      return {
        task: "Write a short optional video caption line for a photography case study video — one calm sentence under the player. Use only facts from the draft.",
        responseShape: { caseVideoCaption: "One short caption line under 140 characters." },
      };
    case "caseVideoPrompt":
      return {
        task: "Write a short motion prompt for image-to-video AI (photography still → subtle cinematic clip). Describe camera move, light, and atmosphere only. One or two sentences, no brand slogans, no people names unless in the draft.",
        responseShape: {
          caseVideoPrompt:
            "Motion prompt under 220 characters, e.g. gentle push-in, soft daylight, calm architectural atmosphere.",
        },
      };
    case "socialCaptions":
      return {
        task: "Write platform-ready social captions for Instagram, YouTube, and TikTok from this journal draft. No emoji spam. Include a soft CTA.",
        responseShape: {
          instagram: "Caption with hashtags",
          youtube: "Description with title energy",
          tiktok: "Short caption with hashtags",
        },
      };
    case "travelHighlights":
      return {
        task: "Write Highlights for a BRIGHTLINE Travel post: 2-4 short paragraphs about key photographic moments from the trip. Use only destinations and facts present in the draft. Do not invent places, hotels, or events.",
        responseShape: {
          travelHighlights: "Highlights text with paragraph breaks (\\n\\n).",
        },
      };
    case "travelTips":
      return {
        task: "Write practical Tips for a BRIGHTLINE Travel post — calm, useful notes for a photographer traveling this destination. Use only facts from the draft; do not invent logistics.",
        responseShape: { travelTips: "Tips text with paragraph breaks (\\n\\n)." },
      };
    case "travelItineraryDay":
      return {
        task: "Refine one itinerary day for a BRIGHTLINE Travel post. Keep dayLabel, title, and body calm and specific. Use only facts from the draft day and trip context; do not invent activities.",
        responseShape: {
          travelItineraryDay: {
            dayLabel: "e.g. Day 1",
            title: "Short day title",
            body: "1-3 paragraphs about that day",
            place: "Optional place name",
          },
        },
      };
    case "travelWhereStayed":
      return {
        task: "Write Where we stayed for a BRIGHTLINE Travel post — calm notes about lodging atmosphere. Use only facts from the draft; do not invent hotel names.",
        responseShape: { travelWhereStayed: "2-4 sentences with paragraph breaks if needed." },
      };
    case "travelPacking":
      return {
        task: "Write Packing notes for a photographer on this trip. Practical and brief. Use only destination/season facts from the draft.",
        responseShape: { travelPacking: "Short packing notes." },
      };
    case "travelCameraKit":
      return {
        task: "Write Camera kit notes — gear and approach for this trip's light and places. Suggest typical travel photography kit only as general guidance unless the draft lists specific gear.",
        responseShape: { travelCameraKit: "Gear and approach notes." },
      };
    case "travelEssentials":
      return {
        task: "Write Essentials — transit, timing, practical notes for this destination. Do not invent visas or specific ticket costs.",
        responseShape: { travelEssentials: "Practical essentials." },
      };
    case "travelSeason":
      return {
        task: "Write a short Season / light line for the trip (e.g. Late spring · soft evening light). One short phrase.",
        responseShape: { travelSeason: "Short season/light label." },
      };
    case "travelRoute":
      return {
        task: "Write a one-line route summary (e.g. Lisbon → Sintra → Cascais) from destination/region/itinerary facts in the draft. Do not invent places.",
        responseShape: { travelRoute: "Place → Place → Place" },
      };
    case "travelGenerateAll":
      return {
        task: `Fill a complete BRIGHTLINE Travel post package from the draft (title, destination, region, dates, image alt texts). Calm photographic voice. Do not invent hotels, restaurants, or events not implied by the draft or image alts. Return all fields.`,
        responseShape: {
          excerpt: "1-2 sentence card summary",
          body: "2-4 narrative paragraphs with \\n\\n breaks",
          tags: ["up to 4 tags"],
          seoTitle: "Under 60 chars",
          seoDescription: "140-160 chars",
          pullQuote: "One strong line",
          keyTakeaways: "3 short lines separated by \\n",
          photoCredits: "Short credit line",
          travelSeason: "Season / light",
          travelRoute: "Route summary",
          travelHighlights: "Highlights paragraphs",
          travelTips: "Tips paragraphs",
          travelWhereStayed: "Where we stayed",
          travelPacking: "Packing notes",
          travelCameraKit: "Camera kit",
          travelEssentials: "Essentials",
          travelItinerary: [
            { dayLabel: "Day 1", title: "Title", place: "Place", body: "What happened" },
          ],
        },
      };
    case "pullQuote":
      return {
        task: "Write one editorial pull quote line from this draft — calm, specific, no hype.",
        responseShape: { pullQuote: "One sentence under 160 characters." },
      };
    case "keyTakeaways":
      return {
        task: "Write 3 short key takeaways (one per line) for this photography post.",
        responseShape: { keyTakeaways: "Line1\\nLine2\\nLine3" },
      };
    case "photoCredits":
      return {
        task: "Write a short photo credit line for BRIGHTLINE Photography.",
        responseShape: { photoCredits: "Photographs © BRIGHTLINE Photography" },
      };
    case "imageMeta":
      return {
        task: "From the title and image alt descriptions, write SEO-ready meta and a short description for this post. Use only what the alts and title support — do not invent locations.",
        responseShape: {
          excerpt: "1-2 sentence summary grounded in the images",
          tags: ["up to 4 tags from visual themes"],
          seoTitle: "Under 60 characters",
          seoDescription: "140-160 characters",
          coverImageAlt: "Optional refined cover alt if cover alt was empty",
          pullQuote: "Optional one-line pull quote",
          keyTakeaways: "2-3 short lines from the images",
        },
      };
  }
}

export async function generateBlogPostAssist(
  action: BlogAssistAction,
  draft: BlogPostDraft
): Promise<Record<string, unknown>> {
  if (
    !draft.body?.trim() &&
    action !== "suggest" &&
    action !== "seo" &&
    action !== "format" &&
    action !== "title" &&
    action !== "tags" &&
    action !== "coverAlt" &&
    action !== "seoTitle" &&
    action !== "seoDescription" &&
    action !== "galleryAlts" &&
    action !== "caseBrief" &&
    action !== "caseProblem" &&
    action !== "caseSolution" &&
    action !== "caseVideoCaption" &&
    action !== "caseVideoPrompt" &&
    action !== "socialCaptions" &&
    action !== "travelHighlights" &&
    action !== "travelTips" &&
    action !== "travelItineraryDay" &&
    action !== "travelWhereStayed" &&
    action !== "travelPacking" &&
    action !== "travelCameraKit" &&
    action !== "travelEssentials" &&
    action !== "travelSeason" &&
    action !== "travelRoute" &&
    action !== "travelGenerateAll" &&
    action !== "pullQuote" &&
    action !== "keyTakeaways" &&
    action !== "photoCredits" &&
    action !== "imageMeta" &&
    action !== "excerpt"
  ) {
    throw Object.assign(new Error("Add some body copy before using AI assist."), { status: 400 });
  }

  if (
    (action === "caseBrief" ||
      action === "caseProblem" ||
      action === "caseSolution" ||
      action === "caseVideoCaption" ||
      action === "caseVideoPrompt") &&
    !draft.title?.trim() &&
    !draft.excerpt?.trim() &&
    !draft.body?.trim() &&
    !draft.caseBrief?.trim() &&
    !draft.caseProblem?.trim() &&
    !draft.caseSolution?.trim()
  ) {
    throw Object.assign(
      new Error("Add a title, excerpt, body, or case-study notes before generating this section."),
      { status: 400 }
    );
  }

  if (
    (action === "travelHighlights" ||
      action === "travelTips" ||
      action === "travelItineraryDay" ||
      action === "travelWhereStayed" ||
      action === "travelPacking" ||
      action === "travelCameraKit" ||
      action === "travelEssentials" ||
      action === "travelSeason" ||
      action === "travelRoute" ||
      action === "travelGenerateAll" ||
      action === "imageMeta" ||
      action === "pullQuote" ||
      action === "keyTakeaways") &&
    !draft.title?.trim() &&
    !draft.excerpt?.trim() &&
    !draft.body?.trim() &&
    !draft.travelDestination?.trim() &&
    !(draft.galleryImageAlts && draft.galleryImageAlts.length > 0) &&
    !draft.coverImageAlt?.trim()
  ) {
    throw Object.assign(
      new Error("Add a title, destination, or images before generating this section."),
      { status: 400 }
    );
  }

  const openai = createOpenAiClient();
  const model = resolveOpenAiChatModel();
  const instructions = actionInstructions(action);
  if (!instructions) {
    throw Object.assign(new Error("Unsupported assist action."), { status: 400 });
  }

  const completion = await runAiChatCompletion(
    openai,
    {
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BLOG_POST_ASSIST.systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            action,
            ...instructions,
            draft,
          }),
        },
      ],
    },
    {
      taskType: `blog_post.${action}`,
      promptId: BLOG_POST_ASSIST.id,
      promptVersion: BLOG_POST_ASSIST.version,
      projectId: null,
      createdBy: "admin",
      inputSummary: { action, hasBody: !!draft.body?.trim() },
    }
  );

  const raw = parseJsonObject(completion.choices[0]?.message?.content ?? "");

  if (action === "suggest") {
    const result: BlogSuggestResult = {
      suggestions: stringList(raw.suggestions, 10),
      ...(cleanString(raw.improvedTitle) ? { improvedTitle: truncate(cleanString(raw.improvedTitle)!, 120) } : {}),
      ...(cleanString(raw.improvedExcerpt) ? { improvedExcerpt: truncate(cleanString(raw.improvedExcerpt)!, 280) } : {}),
      ...(cleanString(raw.improvedBody) ? { improvedBody: cleanString(raw.improvedBody) } : {}),
      ...(cleanString(raw.improvedSeoTitle) ? { improvedSeoTitle: truncate(cleanString(raw.improvedSeoTitle)!, 70) } : {}),
      ...(cleanString(raw.improvedSeoDescription)
        ? { improvedSeoDescription: truncate(cleanString(raw.improvedSeoDescription)!, 180) }
        : {}),
      ...(stringList(raw.suggestedTags, 12).length ? { suggestedTags: stringList(raw.suggestedTags, 12) } : {}),
    };
    return result;
  }

  if (action === "polish" || action === "fix") {
    const body = cleanString(raw.body);
    if (!body) throw new Error("AI did not return revised body text.");
    return { body };
  }

  if (action === "format") {
    const excerpt = cleanString(raw.excerpt);
    const body = cleanString(raw.body);
    const seoTitle = cleanString(raw.seoTitle);
    const seoDescription = cleanString(raw.seoDescription);
    if (!excerpt || !body || !seoTitle || !seoDescription) {
      throw new Error("AI did not return a complete formatted post.");
    }
    const result: BlogFormatResult = {
      ...(cleanString(raw.title) ? { title: truncate(cleanString(raw.title)!, 120) } : {}),
      excerpt: truncate(excerpt, 280),
      body,
      tags: stringList(raw.tags, 8),
      seoTitle: truncate(seoTitle, 70),
      seoDescription: truncate(seoDescription, 180),
    };
    return result;
  }

  if (action === "title") {
    const title = cleanString(raw.title);
    if (!title) throw new Error("AI did not return a title.");
    return { title: truncate(title, 120) };
  }

  if (action === "body") {
    const body = cleanString(raw.body);
    if (!body) throw new Error("AI did not return body text.");
    return { body };
  }

  if (action === "tags") {
    const tags = stringList(raw.tags, 8);
    if (!tags.length) throw new Error("AI did not return tags.");
    return { tags };
  }

  if (action === "coverAlt") {
    const coverImageAlt = cleanString(raw.coverImageAlt);
    if (!coverImageAlt) throw new Error("AI did not return cover alt text.");
    return { coverImageAlt: truncate(coverImageAlt, 125) };
  }

  if (action === "seoTitle") {
    const seoTitle = cleanString(raw.seoTitle);
    if (!seoTitle) throw new Error("AI did not return an SEO title.");
    return { seoTitle: truncate(seoTitle, 70) };
  }

  if (action === "seoDescription") {
    const seoDescription = cleanString(raw.seoDescription);
    if (!seoDescription) throw new Error("AI did not return an SEO description.");
    return { seoDescription: truncate(seoDescription, 180) };
  }

  if (action === "galleryAlts") {
    const galleryAlts = stringList(raw.galleryAlts, 120);
    if (!galleryAlts.length) throw new Error("AI did not return gallery alt text.");
    return { galleryAlts: galleryAlts.map((alt) => truncate(alt, 125)) };
  }

  if (action === "caseBrief") {
    const caseBrief = cleanString(raw.caseBrief);
    if (!caseBrief) throw new Error("AI did not return a brief.");
    return { caseBrief: truncate(caseBrief, 900) };
  }

  if (action === "caseProblem") {
    const caseProblem = cleanString(raw.caseProblem);
    if (!caseProblem) throw new Error("AI did not return a problem section.");
    return { caseProblem: truncate(caseProblem, 900) };
  }

  if (action === "caseSolution") {
    const caseSolution = cleanString(raw.caseSolution);
    if (!caseSolution) throw new Error("AI did not return a solution section.");
    return { caseSolution: truncate(caseSolution, 900) };
  }

  if (action === "caseVideoCaption") {
    const caseVideoCaption = cleanString(raw.caseVideoCaption);
    if (!caseVideoCaption) throw new Error("AI did not return a video caption.");
    return { caseVideoCaption: truncate(caseVideoCaption, 160) };
  }

  if (action === "caseVideoPrompt") {
    const caseVideoPrompt = cleanString(raw.caseVideoPrompt);
    if (!caseVideoPrompt) throw new Error("AI did not return a motion prompt.");
    return { caseVideoPrompt: truncate(caseVideoPrompt, 280) };
  }

  if (action === "socialCaptions") {
    return {
      instagram: truncate(cleanString(raw.instagram) || "", 2200),
      youtube: truncate(cleanString(raw.youtube) || "", 2200),
      tiktok: truncate(cleanString(raw.tiktok) || "", 1200),
    };
  }

  if (action === "travelHighlights") {
    const travelHighlights = cleanString(raw.travelHighlights);
    if (!travelHighlights) throw new Error("AI did not return travel highlights.");
    return { travelHighlights: truncate(travelHighlights, 4000) };
  }

  if (action === "travelTips") {
    const travelTips = cleanString(raw.travelTips);
    if (!travelTips) throw new Error("AI did not return travel tips.");
    return { travelTips: truncate(travelTips, 4000) };
  }

  if (action === "travelItineraryDay") {
    const dayRaw =
      raw.travelItineraryDay && typeof raw.travelItineraryDay === "object"
        ? (raw.travelItineraryDay as Record<string, unknown>)
        : raw;
    const dayLabel = cleanString(dayRaw.dayLabel) || "";
    const title = cleanString(dayRaw.title) || "";
    const body = cleanString(dayRaw.body) || "";
    const place = cleanString(dayRaw.place) || "";
    if (!title && !body) throw new Error("AI did not return an itinerary day.");
    return {
      travelItineraryDay: {
        dayLabel: truncate(dayLabel, 40),
        title: truncate(title, 120),
        body: truncate(body, 2000),
        place: truncate(place, 120),
      },
    };
  }

  const travelTextFields: Array<{
    action: BlogAssistAction;
    key: string;
    max: number;
    label: string;
  }> = [
    { action: "travelWhereStayed", key: "travelWhereStayed", max: 3000, label: "where we stayed" },
    { action: "travelPacking", key: "travelPacking", max: 3000, label: "packing notes" },
    { action: "travelCameraKit", key: "travelCameraKit", max: 3000, label: "camera kit" },
    { action: "travelEssentials", key: "travelEssentials", max: 3000, label: "essentials" },
    { action: "travelSeason", key: "travelSeason", max: 120, label: "season" },
    { action: "travelRoute", key: "travelRoute", max: 200, label: "route" },
    { action: "pullQuote", key: "pullQuote", max: 200, label: "pull quote" },
    { action: "keyTakeaways", key: "keyTakeaways", max: 1200, label: "key takeaways" },
    { action: "photoCredits", key: "photoCredits", max: 200, label: "photo credits" },
  ];
  for (const field of travelTextFields) {
    if (action === field.action) {
      const value = cleanString(raw[field.key]);
      if (!value) throw new Error(`AI did not return ${field.label}.`);
      return { [field.key]: truncate(value, field.max) };
    }
  }

  if (action === "travelGenerateAll") {
    const itineraryRaw = Array.isArray(raw.travelItinerary) ? raw.travelItinerary : [];
    const travelItinerary = itineraryRaw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const day = item as Record<string, unknown>;
        return {
          dayLabel: truncate(cleanString(day.dayLabel) || "", 40),
          title: truncate(cleanString(day.title) || "", 120),
          body: truncate(cleanString(day.body) || "", 2000),
          place: truncate(cleanString(day.place) || "", 120),
        };
      })
      .filter((d): d is { dayLabel: string; title: string; body: string; place: string } =>
        Boolean(d && (d.title || d.body))
      )
      .slice(0, 14);
    return {
      excerpt: truncate(cleanString(raw.excerpt) || "", 280),
      body: cleanString(raw.body) || "",
      tags: stringList(raw.tags, 8),
      seoTitle: truncate(cleanString(raw.seoTitle) || "", 70),
      seoDescription: truncate(cleanString(raw.seoDescription) || "", 180),
      pullQuote: truncate(cleanString(raw.pullQuote) || "", 200),
      keyTakeaways: truncate(cleanString(raw.keyTakeaways) || "", 1200),
      photoCredits: truncate(cleanString(raw.photoCredits) || "", 200),
      travelSeason: truncate(cleanString(raw.travelSeason) || "", 120),
      travelRoute: truncate(cleanString(raw.travelRoute) || "", 200),
      travelHighlights: truncate(cleanString(raw.travelHighlights) || "", 4000),
      travelTips: truncate(cleanString(raw.travelTips) || "", 4000),
      travelWhereStayed: truncate(cleanString(raw.travelWhereStayed) || "", 3000),
      travelPacking: truncate(cleanString(raw.travelPacking) || "", 3000),
      travelCameraKit: truncate(cleanString(raw.travelCameraKit) || "", 3000),
      travelEssentials: truncate(cleanString(raw.travelEssentials) || "", 3000),
      travelItinerary,
    };
  }

  if (action === "imageMeta") {
    return {
      excerpt: truncate(cleanString(raw.excerpt) || "", 280),
      tags: stringList(raw.tags, 8),
      seoTitle: truncate(cleanString(raw.seoTitle) || "", 70),
      seoDescription: truncate(cleanString(raw.seoDescription) || "", 180),
      ...(cleanString(raw.coverImageAlt)
        ? { coverImageAlt: truncate(cleanString(raw.coverImageAlt)!, 125) }
        : {}),
      ...(cleanString(raw.pullQuote) ? { pullQuote: truncate(cleanString(raw.pullQuote)!, 200) } : {}),
      ...(cleanString(raw.keyTakeaways)
        ? { keyTakeaways: truncate(cleanString(raw.keyTakeaways)!, 1200) }
        : {}),
    };
  }

  if (action === "excerpt") {
    const excerpt = cleanString(raw.excerpt);
    if (!excerpt) throw new Error("AI did not return an excerpt.");
    return { excerpt: truncate(excerpt, 280) };
  }

  const seoTitle = cleanString(raw.seoTitle);
  const seoDescription = cleanString(raw.seoDescription);
  if (!seoTitle && !seoDescription) {
    throw new Error("AI did not return SEO fields.");
  }
  return {
    ...(seoTitle ? { seoTitle: truncate(seoTitle, 70) } : {}),
    ...(seoDescription ? { seoDescription: truncate(seoDescription, 180) } : {}),
  };
}
