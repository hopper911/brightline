/** Pixel crop rect from react-easy-crop `onCropComplete` (`croppedAreaPixels`). */
export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image")));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

/**
 * Rasterizes `pixelCrop` from `imageSrc` to a JPEG blob (for upload).
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  quality = 0.92
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const sx = Math.round(pixelCrop.x);
  const sy = Math.round(pixelCrop.y);
  const sw = Math.max(1, Math.round(pixelCrop.width));
  const sh = Math.max(1, Math.round(pixelCrop.height));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode image"));
    }, "image/jpeg", quality);
  });
}
