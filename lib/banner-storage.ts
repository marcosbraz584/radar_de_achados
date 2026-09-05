import { createHash } from "node:crypto";

const MAX_BANNER_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Upload de imagens ainda não está configurado. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET na Hostinger."
    );
  }

  return { cloudName, apiKey, apiSecret };
}

export function isBannerFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function uploadBannerImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_BANNER_FILE_SIZE) {
    throw new Error("A imagem deve ter no máximo 4 MB.");
  }

  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "shilmastore/banners";
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: "POST", body }
  );

  const result = (await response.json()) as { secure_url?: string; error?: { message?: string } };

  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message || "Não foi possível enviar a imagem do banner.");
  }

  return result.secure_url;
}
