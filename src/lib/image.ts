// Cense Decode. Created with Claude Code.

/**
 * Get a screenshot or photo ready to send.
 *
 * Phone photos are routinely 4 to 8 MB, over the API's 5 MB limit, and the
 * old behaviour was to reject them and ask for "a smaller screenshot", which
 * is not something most people know how to produce. So anything large is
 * scaled down here instead. 1568px on the long edge is the size the model
 * reads images at, so nothing legible is lost.
 */

export type SendableType = "image/png" | "image/jpeg" | "image/webp";

export interface PreparedImage {
  dataBase64: string;
  mediaType: SendableType;
  preview: string;
  name: string;
}

const LONG_EDGE = 1568;
const PASS_THROUGH_BYTES = 1.5 * 1024 * 1024;
const SENDABLE: string[] = ["image/png", "image/jpeg", "image/webp"];

export class ImageError extends Error {}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new ImageError(
      "That file is not an image. Use a screenshot or a photo, or paste the text instead."
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError(
      "We could not open that image. Try taking a screenshot of it instead."
    );
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const small = file.size <= PASS_THROUGH_BYTES && longest <= LONG_EDGE * 1.5;

  if (small && SENDABLE.includes(file.type)) {
    bitmap.close();
    return {
      dataBase64: await blobToBase64(file),
      mediaType: file.type as SendableType,
      preview: URL.createObjectURL(file),
      name: file.name || "Pasted image",
    };
  }

  const scale = Math.min(1, LONG_EDGE / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new ImageError("We could not read that image on this device.");
  }
  // White behind transparent PNGs, so dark text does not vanish into black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88)
  );
  if (!blob) {
    throw new ImageError("We could not read that image on this device.");
  }

  return {
    dataBase64: await blobToBase64(blob),
    mediaType: "image/jpeg",
    preview: URL.createObjectURL(blob),
    name: file.name || "Pasted image",
  };
}
