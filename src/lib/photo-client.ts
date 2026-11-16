"use client";

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 320;
const MAX_DATA_URL_LENGTH = 230_000; // Stays safely under Firestore 250,000 char rule limit
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the selected image file."));
    };
    img.src = url;
  });
}

export async function compressDoctorPhotoFile(file: File): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Doctor photo must be a PNG, JPEG, WebP, or GIF image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Doctor photo must be smaller than 5 MB.");
  }

  const img = await loadImageFromFile(file);
  const longest = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1);
  const scale = Math.min(1, MAX_DIMENSION / longest);
  const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Browser canvas is unavailable to resize this image.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const attempts: Array<[string, number]> = [
    ["image/webp", 0.82],
    ["image/jpeg", 0.8],
    ["image/webp", 0.65],
    ["image/jpeg", 0.62],
  ];

  for (const [mime, quality] of attempts) {
    const encoded = canvas.toDataURL(mime, quality);
    if (encoded.startsWith("data:image/") && encoded.length <= MAX_DATA_URL_LENGTH) {
      return encoded;
    }
  }

  throw new Error("Image could not be compressed small enough. Please choose a smaller portrait or paste an HTTPS URL.");
}
