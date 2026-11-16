const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function inferImageMime(file: { type?: string; name?: string }): string | null {
  const rawType = (file.type ?? "").toLowerCase().trim();
  if (rawType === "image/jpg") return "image/jpeg";
  if (ALLOWED_MIME.has(rawType)) return rawType;

  const ext = (file.name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  return null;
}

export async function readUploadedDoctorPhoto(
  fileEntry: FormDataEntryValue | null,
): Promise<{ ok: true; dataUrl?: string } | { ok: false; error: string }> {
  if (!fileEntry || typeof fileEntry === "string") {
    return { ok: true, dataUrl: undefined };
  }

  const file = fileEntry as File;
  if (typeof file.size !== "number" || file.size === 0 || typeof file.arrayBuffer !== "function") {
    return { ok: true, dataUrl: undefined };
  }

  const mime = inferImageMime(file);
  if (!mime) {
    return { ok: false, error: "Doctor photo must be a PNG, JPG, WebP, GIF, or AVIF image." };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Doctor photo must be smaller than 5 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { ok: true, dataUrl: `data:${mime};base64,${buffer.toString("base64")}` };
}
