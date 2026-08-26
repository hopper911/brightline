"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  BlogPost,
  BlogTravelItineraryDay,
  BlogTravelMapStop,
  BlogTravelSections,
} from "@/lib/blog-post-model";
import { blankTravel } from "@/lib/blog-post-model";
import { extractMapsUrlFromInput, itineraryDayGeocodeQuery } from "@/lib/travel-map-coords";
import TravelItineraryMap from "@/components/blog/TravelItineraryMap";

type TravelAiAction =
  | "travelHighlights"
  | "travelTips"
  | "travelItineraryDay"
  | "travelWhereStayed"
  | "travelPacking"
  | "travelCameraKit"
  | "travelEssentials"
  | "travelSeason"
  | "travelRoute"
  | "travelGenerateAll";

type Props = {
  post: BlogPost;
  onChange: (patch: Partial<BlogPost>) => void;
  onAiField?: (action: TravelAiAction, dayIndex?: number) => void;
  aiLoading?: string | null;
};

const INPUT =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white";
const TEXTAREA =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white";

function FieldLabel({
  label,
  hint,
  action,
}: {
  label: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-white/70">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-white/45">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

function AiBtn({
  busy,
  disabled,
  onClick,
}: {
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-lg border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-violet-200 disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
    >
      {busy ? "…" : "✦ AI"}
    </button>
  );
}

function newStopId() {
  return `stop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function BlogTravelPanel({ post, onChange, onAiField, aiLoading }: Props) {
  const travel: BlogTravelSections = post.travel ?? blankTravel();
  const travelRef = useRef(travel);
  useEffect(() => {
    travelRef.current = travel;
  }, [travel]);

  const [geocodeBusy, setGeocodeBusy] = useState<string | null>(null);
  const [geocodeError, setGeocodeError] = useState("");
  const [mapBusy, setMapBusy] = useState<"url" | "itinerary" | "name" | null>(null);
  const [mapStatus, setMapStatus] = useState("");

  function patchTravel(partial: Partial<BlogTravelSections>) {
    // Send only changed fields — parent merges onto latest travel (never replaces itinerary).
    onChange({ travel: partial as BlogTravelSections });
  }

  /** Always mutate itinerary from the latest ref so async map work can't drop days. */
  function patchItinerary(updater: (days: BlogTravelItineraryDay[]) => BlogTravelItineraryDay[]) {
    const latest = travelRef.current;
    const itinerary = updater(latest.itinerary ?? []);
    travelRef.current = { ...latest, itinerary };
    patchTravel({ itinerary });
  }

  function updateDay(index: number, partial: Partial<BlogTravelItineraryDay>) {
    patchItinerary((days) => days.map((day, i) => (i === index ? { ...day, ...partial } : day)));
  }

  function addDay() {
    patchItinerary((days) => {
      if (days.length >= 14) return days;
      return [
        ...days,
        {
          dayLabel: `Day ${days.length + 1}`,
          title: "",
          body: "",
          place: "",
        },
      ];
    });
  }

  function removeDay(index: number) {
    patchItinerary((days) => days.filter((_, i) => i !== index));
  }

  function updateStop(index: number, partial: Partial<BlogTravelMapStop>) {
    const mapStops = travel.mapStops.map((stop, i) =>
      i === index ? { ...stop, ...partial } : stop
    );
    patchTravel({ mapStops });
  }

  function addStop() {
    if (travel.mapStops.length >= 24) return;
    patchTravel({
      mapStops: [
        ...travel.mapStops,
        {
          id: newStopId(),
          label: `Stop ${travel.mapStops.length + 1}`,
          placeName: "",
          dayLabel: "",
          lat: 0,
          lng: 0,
          note: "",
        },
      ],
    });
  }

  function removeStop(index: number) {
    patchTravel({ mapStops: travel.mapStops.filter((_, i) => i !== index) });
  }

  function moveStop(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= travel.mapStops.length) return;
    const mapStops = [...travel.mapStops];
    [mapStops[index], mapStops[next]] = [mapStops[next]!, mapStops[index]!];
    patchTravel({ mapStops });
  }

  async function lookupPlace(index: number) {
    const stop = travel.mapStops[index];
    if (!stop) return;
    // Prefer the Name field — Full Location often still holds a previous city's label.
    const query = (stop.label || stop.placeName || "").trim();
    if (!query) {
      setGeocodeError("Add a place name, label, or lat, lng before looking up.");
      return;
    }
    setGeocodeBusy(stop.id);
    setGeocodeError("");
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        results?: Array<{ lat: number; lng: number; label: string }>;
      };
      if (!res.ok || !json.ok || !json.results?.length) {
        throw new Error(json.error || "No results for that place.");
      }
      const hit = json.results[0]!;
      updateStop(index, {
        lat: hit.lat,
        lng: hit.lng,
        placeName: hit.label,
        label: stop.label.trim() || hit.label.split(",")[0]?.trim() || stop.label,
      });
      setMapStatus(`Updated coordinates for “${stop.label || hit.label}”.`);
    } catch (err) {
      setGeocodeError(err instanceof Error ? err.message : "Geocode failed.");
    } finally {
      setGeocodeBusy(null);
    }
  }

  async function resolveMapUrlToStops(rawUrl?: string) {
    const url = (rawUrl ?? travel.mapUrl).trim();
    if (!url) {
      setGeocodeError("Paste a Google Maps link or iframe embed first.");
      return;
    }
    setMapBusy("url");
    setGeocodeError("");
    setMapStatus("");
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapsUrl: url }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        results?: Array<{ lat: number; lng: number; label: string }>;
        resolvedUrl?: string | null;
        embedUrl?: string | null;
      };
      if (!res.ok || !json.ok || !json.results?.length) {
        throw new Error(json.error || "Could not read that map link.");
      }
      const nextStops: BlogTravelMapStop[] = json.results.map((hit, i) => ({
        id: newStopId() + `_${i}`,
        label: hit.label.split(",")[0]?.trim() || `Stop ${i + 1}`,
        placeName: hit.label,
        dayLabel: "",
        lat: hit.lat,
        lng: hit.lng,
        note: "",
      }));
      const cleanedUrl =
        json.embedUrl ||
        extractMapsUrlFromInput(json.resolvedUrl || url) ||
        extractMapsUrlFromInput(url);
      // Replace — appending stacked duplicate Lisbon pins from an old link.
      patchTravel({
        mapStops: nextStops.slice(0, 24),
        mapEnabled: true,
        mapUrl: cleanedUrl,
        locationLabel:
          travel.locationLabel.trim() ||
          nextStops[0]?.label ||
          travel.locationLabel,
      });
      setMapStatus(`Set ${nextStops.length} stop(s) from Google Maps (replaced previous pins).`);
    } catch (err) {
      setGeocodeError(err instanceof Error ? err.message : "Could not resolve map URL.");
    } finally {
      setMapBusy(null);
    }
  }

  /**
   * Pin a place name on the map.
   * Explicit button click replaces existing pins; blur auto-pin only fills when empty.
   */
  async function autoPinFromPlaceName(name: string, opts?: { replace?: boolean }) {
    const q = name.trim();
    if (q.length < 2) return;
    const replace = opts?.replace === true;
    if (!replace && travel.mapStops.some((s) => s.lat && s.lng)) {
      return;
    }
    setMapBusy("name");
    setGeocodeError("");
    setMapStatus("");
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        results?: Array<{ lat: number; lng: number; label: string }>;
        embedUrl?: string | null;
      };
      if (!res.ok || !json.ok || !json.results?.length) {
        throw new Error(json.error || `Could not find “${q}” on the map.`);
      }
      const hit = json.results[0]!;
      const stop: BlogTravelMapStop = {
        id: newStopId(),
        label: q,
        placeName: hit.label,
        dayLabel: "",
        lat: hit.lat,
        lng: hit.lng,
        note: "",
      };
      patchTravel({
        mapStops: [stop],
        mapEnabled: true,
        locationLabel: q,
        mapUrl:
          json.embedUrl ||
          `https://www.google.com/maps?q=${hit.lat},${hit.lng}&z=12&output=embed`,
      });
      setMapStatus(`Pinned “${q}” (${hit.lat.toFixed(4)}, ${hit.lng.toFixed(4)}).`);
    } catch (err) {
      setGeocodeError(err instanceof Error ? err.message : "Could not pin that place.");
    } finally {
      setMapBusy(null);
    }
  }

  function onMapUrlChange(value: string) {
    const looksLikeEmbed =
      value.includes("<iframe") || value.includes("maps/embed") || value.includes("pb=");
    const cleaned = extractMapsUrlFromInput(value);
    patchTravel({ mapUrl: cleaned || value });
    if (looksLikeEmbed && cleaned && travel.mapStops.length === 0) {
      void resolveMapUrlToStops(cleaned);
    }
  }

  async function buildMapFromItinerary() {
    // Snapshot from ref so we use the latest itinerary, and we never write itinerary back.
    const latest = travelRef.current;
    const itinerarySnapshot = (latest.itinerary ?? []).map((d) => ({ ...d }));
    const tripFallback =
      latest.locationLabel.trim() || latest.destination.trim() || "";
    const routePlaces = latest.routeSummary
      .split(/\s*→\s*|\s*->\s*|\s*>\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && s.length <= 48 && !/^day\s*\d+$/i.test(s) && !/\s{2,}/.test(s));

    if (itinerarySnapshot.length === 0 && routePlaces.length === 0 && !tripFallback) {
      setGeocodeError(
        "Add itinerary days first (Add day), fill each day’s Place, then build the map."
      );
      return;
    }

    setMapBusy("itinerary");
    setGeocodeError("");
    setMapStatus("");
    const created: BlogTravelMapStop[] = [];
    const errors: string[] = [];
    let geocodeCalls = 0;

    async function geocodeQuery(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
      if (geocodeCalls > 0) await new Promise((r) => setTimeout(r, 1100));
      geocodeCalls += 1;
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        results?: Array<{ lat: number; lng: number; label: string }>;
      };
      if (!res.ok || !json.ok || !json.results?.length) return null;
      return json.results[0]!;
    }

    try {
      const days =
        itinerarySnapshot.length > 0
          ? itinerarySnapshot
          : routePlaces.map((place, i) => ({
              dayLabel: `Day ${i + 1}`,
              title: "",
              body: "",
              place,
            }));

      for (let i = 0; i < days.length; i++) {
        const day = days[i]!;
        const dayName = day.dayLabel || day.place || day.title || `Day ${i + 1}`;
        const query =
          itineraryDayGeocodeQuery({
            place: day.place,
            title: day.title,
            dayLabel: day.dayLabel,
            destination: tripFallback,
            region: latest.region,
          }) ||
          (routePlaces[i]
            ? itineraryDayGeocodeQuery({ place: routePlaces[i], region: latest.region })
            : null);

        if (!query) {
          errors.push(`${dayName} (add Place, e.g. Madrid or Toledo)`);
          continue;
        }

        try {
          const hit = await geocodeQuery(query);
          if (!hit) {
            errors.push(`${dayName} (“${query}”)`);
            continue;
          }
          created.push({
            id: newStopId() + `_${i}`,
            label:
              day.place.trim() ||
              query.split(",")[0]?.trim() ||
              hit.label.split(",")[0]?.trim() ||
              `Day ${i + 1}`,
            placeName: hit.label,
            dayLabel: day.dayLabel.trim() || `Day ${i + 1}`,
            lat: hit.lat,
            lng: hit.lng,
            note: day.title.trim() || "",
          });
        } catch {
          errors.push(`${dayName} (“${query}”)`);
        }
      }

      if (created.length === 0) {
        throw new Error(
          errors.length
            ? `Could not locate: ${errors.join("; ")}. Put a city/area in each day’s Place field.`
            : "No itinerary places could be geocoded."
        );
      }

      // Map fields ONLY — itinerary days are intentionally omitted from this patch.
      patchTravel({
        mapStops: created.slice(0, 24),
        mapEnabled: true,
        mapUrl: `https://www.google.com/maps?q=${created[0]!.lat},${created[0]!.lng}&z=12&output=embed`,
        locationLabel: latest.locationLabel.trim() || created[0]?.label || latest.locationLabel,
      });

      const dayCount = itinerarySnapshot.length;
      const uniquePlaces = new Set(created.map((s) => `${s.lat.toFixed(3)},${s.lng.toFixed(3)}`));
      if (dayCount <= 1) {
        setMapStatus(
          `Mapped ${created.length} stop from ${dayCount} itinerary day. Add Day 2+ with a Place, then build again for a multi-stop route.`
        );
      } else if (errors.length) {
        setGeocodeError(
          `Mapped ${created.length}/${dayCount} days. Could not locate: ${errors.join("; ")}`
        );
      } else if (uniquePlaces.size === 1 && created.length > 1) {
        setMapStatus(
          `Mapped all ${created.length} days (same city). Set different Places per day for a path.`
        );
      } else {
        setMapStatus(`Mapped ${created.length} stops from ${dayCount} itinerary days.`);
      }
    } catch (err) {
      setGeocodeError(err instanceof Error ? err.message : "Could not build map from itinerary.");
    } finally {
      setMapBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Travel details</p>
          <p className="mt-1 text-sm text-white/65">
            Fill destination basics, then use ✦ AI on any field — or generate everything at once.
          </p>
        </div>
        {onAiField ? (
          <button
            type="button"
            className="btn btn-primary text-xs"
            disabled={aiLoading !== null}
            onClick={() => onAiField("travelGenerateAll")}
          >
            {aiLoading === "travelGenerateAll" ? "Generating…" : "✦ Generate all sections"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel label="Destination" hint="Primary place name" />
          <input
            className={INPUT}
            value={travel.destination}
            onChange={(e) => patchTravel({ destination: e.target.value })}
            onBlur={(e) => {
              const dest = e.target.value.trim();
              if (dest && !travel.locationLabel.trim() && travel.mapStops.length === 0) {
                patchTravel({ locationLabel: dest });
                void autoPinFromPlaceName(dest);
              }
            }}
            placeholder="e.g. Lisbon"
          />
        </div>
        <div>
          <FieldLabel label="Region / country" />
          <input
            className={INPUT}
            value={travel.region}
            onChange={(e) => patchTravel({ region: e.target.value })}
            placeholder="e.g. Portugal"
          />
        </div>
        <div>
          <FieldLabel label="Dates label" hint='Display string, e.g. "March 2024"' />
          <input
            className={INPUT}
            value={travel.datesLabel}
            onChange={(e) => patchTravel({ datesLabel: e.target.value })}
            placeholder="March 2024"
          />
        </div>
        <div>
          <FieldLabel label="Trip style" />
          <input
            className={INPUT}
            value={travel.tripStyle}
            onChange={(e) => patchTravel({ tripStyle: e.target.value })}
            placeholder="Road trip · City · Resort"
          />
        </div>
        <div>
          <FieldLabel
            label="Season / light"
            hint="e.g. Late spring · soft evening light"
            action={
              onAiField ? (
                <AiBtn
                  busy={aiLoading === "travelSeason"}
                  disabled={aiLoading !== null}
                  onClick={() => onAiField("travelSeason")}
                />
              ) : null
            }
          />
          <input
            className={INPUT}
            value={travel.season}
            onChange={(e) => patchTravel({ season: e.target.value })}
            placeholder="Late spring · golden hour"
          />
        </div>
        <div>
          <FieldLabel
            label="Route summary"
            hint="One-line path"
            action={
              onAiField ? (
                <AiBtn
                  busy={aiLoading === "travelRoute"}
                  disabled={aiLoading !== null}
                  onClick={() => onAiField("travelRoute")}
                />
              ) : null
            }
          />
          <input
            className={INPUT}
            value={travel.routeSummary}
            onChange={(e) => patchTravel({ routeSummary: e.target.value })}
            placeholder="Lisbon → Sintra → Cascais"
          />
        </div>
        <div>
          <FieldLabel label="Start date" hint="Opens a calendar picker" />
          <input
            type="date"
            className={`${INPUT} [color-scheme:dark]`}
            value={travel.startDate?.slice(0, 10) || ""}
            onChange={(e) => {
              const startDate = e.target.value;
              const patch: Partial<BlogTravelSections> = { startDate };
              if (travel.endDate && startDate && travel.endDate < startDate) {
                patch.endDate = startDate;
              }
              patchTravel(patch);
            }}
          />
        </div>
        <div>
          <FieldLabel label="End date" hint="Opens a calendar picker" />
          <input
            type="date"
            className={`${INPUT} [color-scheme:dark]`}
            value={travel.endDate?.slice(0, 10) || ""}
            min={travel.startDate?.slice(0, 10) || undefined}
            onChange={(e) => patchTravel({ endDate: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel label="Travelers" />
          <input
            className={INPUT}
            value={travel.travelers}
            onChange={(e) => patchTravel({ travelers: e.target.value })}
            placeholder="Who was on the trip"
          />
        </div>
      </div>

      <div>
        <FieldLabel
          label="Highlights"
          hint="Key moments — one idea per paragraph"
          action={
            onAiField ? (
              <AiBtn
                busy={aiLoading === "travelHighlights"}
                disabled={aiLoading !== null}
                onClick={() => onAiField("travelHighlights")}
              />
            ) : null
          }
        />
        <textarea
          className={TEXTAREA}
          rows={5}
          value={travel.highlights}
          onChange={(e) => patchTravel({ highlights: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white/70">
            Itinerary{" "}
            <span className="text-white/40">({travel.itinerary.length} day{travel.itinerary.length === 1 ? "" : "s"})</span>
          </p>
          <button type="button" className="btn btn-ghost text-xs" onClick={addDay}>
            Add day
          </button>
        </div>
        {travel.itinerary.length === 0 ? (
          <p className="text-xs text-white/45">No days yet — add a day for the trip outline.</p>
        ) : (
          travel.itinerary.map((day, index) => (
            <div key={`day-${index}`} className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
                  Day {index + 1}
                </p>
                <div className="flex gap-2">
                  {onAiField ? (
                    <AiBtn
                      busy={
                        aiLoading === "travelItineraryDay" ||
                        aiLoading === `travelItineraryDay:${index}`
                      }
                      disabled={aiLoading !== null}
                      onClick={() => onAiField("travelItineraryDay", index)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => removeDay(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <input
                className={INPUT}
                value={day.dayLabel}
                onChange={(e) => updateDay(index, { dayLabel: e.target.value })}
                placeholder="Day label"
              />
              <input
                className={INPUT}
                value={day.title}
                onChange={(e) => updateDay(index, { title: e.target.value })}
                placeholder="Day title"
              />
              <input
                className={INPUT}
                value={day.place || ""}
                onChange={(e) => updateDay(index, { place: e.target.value })}
                placeholder="Place for this day (used for the itinerary map)"
              />
              <textarea
                className={TEXTAREA}
                rows={3}
                value={day.body}
                onChange={(e) => updateDay(index, { body: e.target.value })}
                placeholder="What happened that day"
              />
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">Itinerary map</p>
            <p className="mt-0.5 text-xs text-white/45">
              Build updates <span className="text-white/70">map pins only</span> — it never deletes
              itinerary days. For a multi-stop path, each day needs its own Place (Madrid, Toledo, …).
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={travel.mapEnabled !== false}
              onChange={(e) => patchTravel({ mapEnabled: e.target.checked })}
            />
            Show map on post
          </label>
        </div>

        {travel.mapEnabled !== false &&
        (travel.mapStops.some((s) => Number(s.lat) && Number(s.lng)) || travel.mapUrl.trim()) ? (
          <TravelItineraryMap
            stops={travel.mapStops}
            routeSummary={travel.routeSummary}
            mapUrl={travel.mapUrl}
            locationLabel={travel.locationLabel || travel.destination}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel
              label="Location / place name"
              hint="Auto-generates map pins when you leave this field"
            />
            <input
              className={INPUT}
              value={travel.locationLabel}
              onChange={(e) => patchTravel({ locationLabel: e.target.value })}
              onBlur={(e) => void autoPinFromPlaceName(e.target.value, { replace: false })}
              placeholder="e.g. Lisbon"
            />
          </div>
          <div>
            <FieldLabel
              label="Google Maps link or iframe"
              hint="Paste share link or full iframe embed — replaces pins when resolved"
            />
            <input
              className={INPUT}
              value={travel.mapUrl}
              onChange={(e) => onMapUrlChange(e.target.value)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (
                  v &&
                  (v.includes("http") || v.includes("iframe") || v.includes("pb=")) &&
                  travel.mapStops.length === 0
                ) {
                  void resolveMapUrlToStops(v);
                }
              }}
              placeholder="https://maps.app.goo.gl/… or <iframe src=…>"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary text-xs"
            disabled={mapBusy !== null || geocodeBusy !== null || !travel.locationLabel.trim()}
            onClick={() => void autoPinFromPlaceName(travel.locationLabel, { replace: true })}
          >
            {mapBusy === "name" ? "Pinning…" : "Pin location on map"}
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={mapBusy !== null || geocodeBusy !== null}
            onClick={() => void resolveMapUrlToStops()}
          >
            {mapBusy === "url" ? "Resolving…" : "Resolve Google link"}
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={mapBusy !== null || geocodeBusy !== null}
            onClick={() => void buildMapFromItinerary()}
          >
            {mapBusy === "itinerary" ? "Building…" : "Build from itinerary days"}
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={addStop}>
            Add stop manually
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">
            Stops ({travel.mapStops.length})
            {travel.mapStops.some((s) => s.lat && s.lng) ? " · ready to show on post" : ""}
          </p>
        </div>

        {mapStatus ? <p className="text-xs text-emerald-300/90">{mapStatus}</p> : null}
        {geocodeError ? <p className="text-xs text-red-300">{geocodeError}</p> : null}

        {travel.mapStops.length === 0 ? (
          <p className="text-xs text-white/45">
            No pins yet. Enter Lisbon (or any place) above and tab out — or paste a Google Maps
            iframe/link.
          </p>
        ) : (
          travel.mapStops.map((stop, index) => (
            <div
              key={stop.id}
              className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
                  Stop {index + 1}
                  {stop.lat && stop.lng ? (
                    <span className="ml-2 text-emerald-300/80">· pinned</span>
                  ) : (
                    <span className="ml-2 text-amber-200/70">· needs coords</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={index === 0}
                    onClick={() => moveStop(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={index >= travel.mapStops.length - 1}
                    onClick={() => moveStop(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={geocodeBusy !== null || mapBusy !== null}
                    onClick={() => void lookupPlace(index)}
                  >
                    {geocodeBusy === stop.id ? "Looking up…" : "Lookup place"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => removeStop(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={INPUT}
                  value={stop.label}
                  onChange={(e) => updateStop(index, { label: e.target.value })}
                  placeholder="Stop label"
                />
                <input
                  className={INPUT}
                  value={stop.placeName}
                  onChange={(e) => updateStop(index, { placeName: e.target.value })}
                  placeholder="Place name or lat, lng"
                />
                <input
                  className={INPUT}
                  value={stop.dayLabel}
                  onChange={(e) => updateStop(index, { dayLabel: e.target.value })}
                  placeholder="Day label (e.g. Day 1)"
                />
                <input
                  className={INPUT}
                  value={stop.note}
                  onChange={(e) => updateStop(index, { note: e.target.value })}
                  placeholder="Short note"
                />
                <input
                  className={INPUT}
                  value={Number.isFinite(stop.lat) && stop.lat !== 0 ? String(stop.lat) : ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    updateStop(index, { lat: Number.isFinite(n) ? n : 0 });
                  }}
                  placeholder="Latitude"
                />
                <input
                  className={INPUT}
                  value={Number.isFinite(stop.lng) && stop.lng !== 0 ? String(stop.lng) : ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    updateStop(index, { lng: Number.isFinite(n) ? n : 0 });
                  }}
                  placeholder="Longitude"
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <FieldLabel
          label="Where we stayed"
          action={
            onAiField ? (
              <AiBtn
                busy={aiLoading === "travelWhereStayed"}
                disabled={aiLoading !== null}
                onClick={() => onAiField("travelWhereStayed")}
              />
            ) : null
          }
        />
        <textarea
          className={TEXTAREA}
          rows={3}
          value={travel.whereWeStayed}
          onChange={(e) => patchTravel({ whereWeStayed: e.target.value })}
        />
      </div>

      <div>
        <FieldLabel
          label="Tips"
          action={
            onAiField ? (
              <AiBtn
                busy={aiLoading === "travelTips"}
                disabled={aiLoading !== null}
                onClick={() => onAiField("travelTips")}
              />
            ) : null
          }
        />
        <textarea
          className={TEXTAREA}
          rows={4}
          value={travel.tips}
          onChange={(e) => patchTravel({ tips: e.target.value })}
        />
      </div>

      <div>
        <FieldLabel
          label="Packing notes"
          action={
            onAiField ? (
              <AiBtn
                busy={aiLoading === "travelPacking"}
                disabled={aiLoading !== null}
                onClick={() => onAiField("travelPacking")}
              />
            ) : null
          }
        />
        <textarea
          className={TEXTAREA}
          rows={3}
          value={travel.packingNotes}
          onChange={(e) => patchTravel({ packingNotes: e.target.value })}
        />
      </div>

      <div>
        <FieldLabel
          label="Camera kit"
          hint="Gear and approach notes for photographers"
          action={
            onAiField ? (
              <AiBtn
                busy={aiLoading === "travelCameraKit"}
                disabled={aiLoading !== null}
                onClick={() => onAiField("travelCameraKit")}
              />
            ) : null
          }
        />
        <textarea
          className={TEXTAREA}
          rows={3}
          value={travel.cameraKit}
          onChange={(e) => patchTravel({ cameraKit: e.target.value })}
          placeholder="Bodies, lenses, approach…"
        />
      </div>

      <div>
        <FieldLabel
          label="Essentials"
          hint="Transit, timing, practical notes"
          action={
            onAiField ? (
              <AiBtn
                busy={aiLoading === "travelEssentials"}
                disabled={aiLoading !== null}
                onClick={() => onAiField("travelEssentials")}
              />
            ) : null
          }
        />
        <textarea
          className={TEXTAREA}
          rows={3}
          value={travel.essentials}
          onChange={(e) => patchTravel({ essentials: e.target.value })}
        />
      </div>
    </section>
  );
}
