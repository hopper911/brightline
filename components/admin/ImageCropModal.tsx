"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import { getCroppedImageBlob, type PixelCrop } from "@/lib/admin/getCroppedImageBlob";

type Props = {
  title: string;
  imageSrc: string;
  /** Width / height; omit with responsive `cropSize` for a variable-aspect framing control. */
  aspect?: number;
  /** Fixed crop window (pixels); used when `aspect` is omitted. */
  cropSize?: { width: number; height: number };
  onClose: () => void;
  onApply: (blob: Blob) => void | Promise<void>;
};

export default function ImageCropModal({
  title,
  imageSrc,
  aspect,
  cropSize: cropSizeProp,
  onClose,
  onApply,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [freeCropSize, setFreeCropSize] = useState<{ width: number; height: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (aspect !== undefined || cropSizeProp != null) return;
    const el = containerRef.current;
    if (!el) return;

    function measure() {
      const r = el!.getBoundingClientRect();
      const w = Math.min(r.width * 0.88, 560);
      const h = Math.min(r.height * 0.72, w * 0.62);
      setFreeCropSize({
        width: Math.max(140, Math.round(w)),
        height: Math.max(120, Math.round(h)),
      });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, cropSizeProp]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels({
      x: pixels.x,
      y: pixels.y,
      width: pixels.width,
      height: pixels.height,
    });
  }, []);

  const resolvedCropSize = cropSizeProp ?? (aspect === undefined ? freeCropSize : undefined);

  async function handleApply() {
    if (!croppedAreaPixels || !imageSrc) return;
    setApplying(true);
    setError("");
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      await onApply(blob);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setApplying(false);
    }
  }

  if (!imageSrc) return null;

  const cropperAspect = aspect ?? 16 / 9;
  const readyForFreeCrop = aspect !== undefined || cropSizeProp != null || freeCropSize !== null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg text-black">{title}</h2>
          <button type="button" className="btn btn-ghost shrink-0 text-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="mt-2 text-xs text-black/55">
          Drag to reposition. Use the slider to zoom.
          {title.toLowerCase().includes("hero")
            ? " Applied crop replaces the current hero image in place — it does not add a gallery item."
            : " Applied image is saved as a new JPEG upload."}
        </p>

        {error ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div ref={containerRef} className="relative mt-4 h-[min(52vh,440px)] w-full bg-black">
          {readyForFreeCrop ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={0}
              aspect={cropperAspect}
              cropSize={resolvedCropSize ?? undefined}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              objectFit="contain"
              restrictPosition
              style={{}}
              classes={{}}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/60">Loading cropper…</div>
          )}
        </div>

        <label className="mt-4 flex items-center gap-3 text-xs text-black/70">
          <span className="w-12 shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost text-sm" onClick={onClose} disabled={applying}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={applying || !croppedAreaPixels}
            onClick={() => void handleApply()}
          >
            {applying ? "Applying…" : "Apply crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
