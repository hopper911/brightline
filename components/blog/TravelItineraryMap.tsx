"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BlogTravelMapStop } from "@/lib/blog-post-model";
import {
  googleMapsDirectionsUrl,
  parseMapsUrlPoints,
  safeExternalMapsHref,
} from "@/lib/travel-map-coords";

type Props = {
  stops: BlogTravelMapStop[];
  routeSummary?: string;
  mapUrl?: string;
  locationLabel?: string;
  className?: string;
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clearLeafletContainer(el: HTMLElement) {
  const leafletEl = el as HTMLElement & { _leaflet_id?: number };
  if (leafletEl._leaflet_id) {
    delete leafletEl._leaflet_id;
  }
  el.innerHTML = "";
}

function isValidStopCoord(s: Pick<BlogTravelMapStop, "lat" | "lng">) {
  return (
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lng) &&
    !(s.lat === 0 && s.lng === 0) &&
    s.lat >= -90 &&
    s.lat <= 90 &&
    s.lng >= -180 &&
    s.lng <= 180
  );
}

function stopsFromMapsUrl(mapUrl: string | undefined, locationLabel: string | undefined): BlogTravelMapStop[] {
  if (!mapUrl?.trim()) return [];
  const points = parseMapsUrlPoints(mapUrl);
  return points.map((p, i) => ({
    id: `url-pin-${i}-${p.lat.toFixed(5)}-${p.lng.toFixed(5)}`,
    label: p.label || locationLabel?.trim() || `Stop ${i + 1}`,
    placeName: locationLabel?.trim() || "",
    dayLabel: "",
    lat: p.lat,
    lng: p.lng,
    note: "",
  }));
}

/**
 * Dark interactive itinerary map (Leaflet + CARTO dark tiles).
 * Resolves Maps URLs / place labels to pins so URL-only posts match travel styling
 * (never falls back to a light Google Maps iframe).
 */
export default function TravelItineraryMap({
  stops,
  routeSummary,
  mapUrl,
  locationLabel,
  className = "",
}: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const [activeId, setActiveId] = useState(stops[0]?.id ?? "");
  const [leafletReady, setLeafletReady] = useState(false);
  const [resolvedStops, setResolvedStops] = useState<BlogTravelMapStop[]>([]);
  const [resolveError, setResolveError] = useState("");
  const [resolving, setResolving] = useState(false);
  const focusFromListRef = useRef(false);

  const propStops = useMemo(() => stops.filter(isValidStopCoord), [stops]);

  const urlStops = useMemo(
    () => stopsFromMapsUrl(mapUrl, locationLabel),
    [mapUrl, locationLabel]
  );

  const validStops = useMemo(() => {
    if (propStops.length > 0) return propStops;
    if (urlStops.length > 0) return urlStops;
    return resolvedStops;
  }, [propStops, urlStops, resolvedStops]);

  const stopsKey = useMemo(
    () =>
      validStops
        .map((s) => `${s.id}:${s.lat.toFixed(5)},${s.lng.toFixed(5)}`)
        .join("|"),
    [validStops]
  );

  const needsResolve =
    propStops.length === 0 &&
    urlStops.length === 0 &&
    Boolean(mapUrl?.trim() || locationLabel?.trim());

  useEffect(() => {
    if (!needsResolve) {
      setResolvedStops([]);
      setResolveError("");
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);
    setResolveError("");

    void (async () => {
      try {
        const res = await fetch("/api/maps/resolve-point", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mapsUrl: mapUrl?.trim() || "",
            query: locationLabel?.trim() || "",
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok || !Array.isArray(data.results) || data.results.length === 0) {
          throw new Error(data.error || "Could not place this location on the map.");
        }
        const next: BlogTravelMapStop[] = data.results.map(
          (hit: { lat: number; lng: number; label?: string }, i: number) => ({
            id: `resolved-${i}-${Number(hit.lat).toFixed(5)}-${Number(hit.lng).toFixed(5)}`,
            label: (hit.label || locationLabel || "Location").trim(),
            placeName: (locationLabel || hit.label || "").trim(),
            dayLabel: "",
            lat: Number(hit.lat),
            lng: Number(hit.lng),
            note: "",
          })
        );
        setResolvedStops(next.filter(isValidStopCoord));
      } catch (err) {
        if (!cancelled) {
          setResolvedStops([]);
          setResolveError(err instanceof Error ? err.message : "Map resolve failed.");
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsResolve, mapUrl, locationLabel]);

  const openMapHref = useMemo(() => {
    const directions = googleMapsDirectionsUrl(validStops);
    if (directions) return directions;
    if (mapUrl && !mapUrl.includes("<iframe")) {
      const cleaned = safeExternalMapsHref(mapUrl);
      if (cleaned) return cleaned;
    }
    if (locationLabel?.trim()) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel.trim())}`;
    }
    return "";
  }, [validStops, mapUrl, locationLabel]);

  useEffect(() => {
    if (validStops.length === 0) {
      setLeafletReady(false);
      return;
    }

    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const invalidateTimers: ReturnType<typeof setTimeout>[] = [];

    void (async () => {
      try {
        const [{ default: L }] = await Promise.all([
          import("leaflet"),
          import("leaflet/dist/leaflet.css"),
        ]);

        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (cancelled) return;

        const el = containerRef.current;
        if (!el) {
          console.error("TRAVEL_MAP_MOUNT_ERROR", "map container missing");
          return;
        }

        clearLeafletContainer(el);

        map = L.map(el, {
          scrollWheelZoom: false,
          dragging: !L.Browser.mobile,
          tapTolerance: 15,
          zoomControl: true,
          attributionControl: true,
        });
        mapRef.current = map;

        if (cancelled) {
          map.remove();
          map = null;
          mapRef.current = null;
          return;
        }

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);

        const bounds = L.latLngBounds([]);
        const markers = new Map<string, import("leaflet").Marker>();

        validStops.forEach((stop, index) => {
          const icon = L.divIcon({
            className: "brightline-map-pin",
            html: `<span class="brightline-map-pin__dot">${index + 1}</span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map!);
          const popupBits = [
            stop.label,
            stop.placeName && stop.placeName !== stop.label ? stop.placeName : "",
            stop.dayLabel,
            stop.note,
          ].filter(Boolean);
          marker.bindPopup(
            `<div class="brightline-map-popup">${popupBits
              .map((b, i) =>
                i === 0
                  ? `<div class="brightline-map-popup__title">${escapeHtml(b)}</div>`
                  : `<div class="brightline-map-popup__meta">${escapeHtml(b)}</div>`
              )
              .join("")}</div>`
          );
          marker.on("click", () => setActiveId(stop.id));
          markers.set(stop.id, marker);
          bounds.extend([stop.lat, stop.lng]);
        });
        markersRef.current = markers;

        if (validStops.length > 1) {
          const latlngs = validStops.map((s) => [s.lat, s.lng] as [number, number]);
          L.polyline(latlngs, {
            color: "rgba(255,255,255,0.12)",
            weight: 6,
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
          }).addTo(map);
          L.polyline(latlngs, {
            color: "rgba(245,240,230,0.72)",
            weight: 1.75,
            dashArray: "5 9",
            lineCap: "round",
            lineJoin: "round",
            opacity: 1,
          }).addTo(map);
          map.fitBounds(bounds.pad(0.22));
        } else {
          map.setView([validStops[0]!.lat, validStops[0]!.lng], 14);
        }

        const invalidate = () => {
          if (!map || cancelled) return;
          map.invalidateSize({ animate: false });
        };
        invalidateTimers.push(
          setTimeout(invalidate, 50),
          setTimeout(invalidate, 250),
          setTimeout(invalidate, 600)
        );
        resizeObserver = new ResizeObserver(() => invalidate());
        resizeObserver.observe(el);

        if (!cancelled) {
          invalidate();
          setLeafletReady(true);
        }
      } catch (err) {
        console.error("TRAVEL_MAP_MOUNT_ERROR", err);
        if (!cancelled) setLeafletReady(false);
      }
    })();

    return () => {
      cancelled = true;
      invalidateTimers.forEach(clearTimeout);
      resizeObserver?.disconnect();
      markersRef.current.clear();
      if (map) {
        map.remove();
        map = null;
      } else if (mapRef.current) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      if (containerRef.current) clearLeafletContainer(containerRef.current);
      setLeafletReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, mapId]);

  useEffect(() => {
    if (validStops.length && !validStops.some((s) => s.id === activeId)) {
      setActiveId(validStops[0]!.id);
    }
  }, [validStops, activeId]);

  useEffect(() => {
    if (!focusFromListRef.current || !leafletReady) return;
    focusFromListRef.current = false;
    const map = mapRef.current;
    const marker = markersRef.current.get(activeId);
    const stop = validStops.find((s) => s.id === activeId);
    if (!map || !stop) return;
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), validStops.length === 1 ? 14 : 11), {
      duration: 0.55,
    });
    marker?.openPopup();
  }, [activeId, leafletReady, validStops]);

  if (validStops.length === 0 && !needsResolve && !resolving) return null;

  const active = validStops.find((s) => s.id === activeId) ?? validStops[0];
  const dayCount = new Set(validStops.map((s) => s.dayLabel.trim()).filter(Boolean)).size;
  const showMapStage = validStops.length > 0 || needsResolve || resolving;

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Itinerary map</p>
          {routeSummary ? (
            <p className="mt-2 font-display text-lg text-white/90">{routeSummary}</p>
          ) : validStops.length > 0 ? (
            <p className="mt-2 text-sm text-white/65">
              {`${validStops.length} stop${validStops.length === 1 ? "" : "s"}${
                dayCount > 0 ? ` · ${dayCount} day${dayCount === 1 ? "" : "s"}` : ""
              } on this route`}
            </p>
          ) : (
            <p className="mt-2 text-sm text-white/65">{locationLabel || "Trip location"}</p>
          )}
        </div>
        {openMapHref ? (
          <a
            href={openMapHref}
            target="_blank"
            rel="noreferrer"
            className="text-[0.65rem] uppercase tracking-[0.2em] text-white/50 transition hover:text-white"
          >
            Open in Google Maps →
          </a>
        ) : null}
      </div>

      {showMapStage ? (
        <div
          className="travel-map-stage relative isolate w-full shrink-0 overflow-hidden bg-[#0a0a0a]"
          style={{ height: 360, maxHeight: 360 }}
        >
          {validStops.length > 0 ? (
            <div
              ref={containerRef}
              id={`travel-map-${mapId}`}
              className={`travel-itinerary-map absolute inset-0 z-[1] h-full w-full overflow-hidden ${
                leafletReady ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-label="Trip itinerary map"
              aria-hidden={!leafletReady}
            />
          ) : null}

          {!leafletReady ? (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-[#0a0a0a] px-6 text-center text-xs uppercase tracking-[0.2em] text-white/50">
              {resolveError
                ? resolveError
                : resolving || needsResolve
                  ? "Loading map…"
                  : "Loading map…"}
            </div>
          ) : null}
        </div>
      ) : null}

      {validStops.length > 0 ? (
        <ol className="relative z-10 divide-y divide-white/10 border-t border-white/10 bg-[#0b0e12]">
          {validStops.map((stop, index) => {
            const isActive = active ? stop.id === active.id : index === 0;
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  onClick={() => {
                    focusFromListRef.current = true;
                    setActiveId(stop.id);
                  }}
                  className={`flex w-full gap-4 px-5 py-4 text-left transition sm:px-6 ${
                    isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-medium ${
                      isActive ? "bg-white text-black" : "border border-white/20 text-white/70"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-base text-white">{stop.label}</span>
                      {stop.dayLabel ? (
                        <span className="text-[0.62rem] uppercase tracking-[0.2em] text-white/40">
                          {stop.dayLabel}
                        </span>
                      ) : null}
                    </span>
                    {stop.placeName ? (
                      <span className="mt-1 block text-xs text-white/50">{stop.placeName}</span>
                    ) : null}
                    {stop.note ? (
                      <span className="mt-1 block text-xs leading-relaxed text-white/45">{stop.note}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
