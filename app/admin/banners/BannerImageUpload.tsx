"use client";

import { useState } from "react";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  defaultUrl?: string;
  label?: string;
  helper?: string;
};

type SignatureResponse = {
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  folder?: string;
  signature?: string;
  error?: string;
};

export default function BannerImageUpload({
  defaultUrl = "",
  label = "Imagem do computador — 936 × 260 px",
  helper = "JPG, PNG ou WEBP. Máximo 4 MB.",
}: Props) {
  const [imageUrl, setImageUrl] = useState(defaultUrl);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setStatus("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus("A imagem deve ter no máximo 4 MB.");
      return;
    }

    setUploading(true);
    setStatus("Enviando imagem...");

    try {
      const signatureResponse = await fetch("/api/admin/banners/cloudinary-signature", {
        method: "POST",
      });
      const signatureData = (await signatureResponse.json()) as SignatureResponse;

      if (
        !signatureResponse.ok ||
        !signatureData.cloudName ||
        !signatureData.apiKey ||
        !signatureData.timestamp ||
        !signatureData.folder ||
        !signatureData.signature
      ) {
        throw new Error(signatureData.error || "Não foi possível preparar o envio da imagem.");
      }

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signatureData.apiKey);
      body.append("timestamp", String(signatureData.timestamp));
      body.append("folder", signatureData.folder);
      body.append("signature", signatureData.signature);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(signatureData.cloudName)}/image/upload`,
        { method: "POST", body }
      );
      const uploadData = (await uploadResponse.json()) as {
        secure_url?: string;
        error?: { message?: string };
      };

      if (!uploadResponse.ok || !uploadData.secure_url) {
        throw new Error(uploadData.error?.message || "Não foi possível enviar a imagem.");
      }

      setImageUrl(uploadData.secure_url);
      setStatus("✓ Imagem enviada com sucesso. Agora clique em Criar banner.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <label className="field field-full">
        <span>{label}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <small>{helper}</small>
        {status ? (
          <small style={{ color: status.startsWith("✓") ? "#166534" : uploading ? "#1e3a8a" : "#991b1b", fontWeight: 700 }}>
            {status}
          </small>
        ) : null}
      </label>

      <label className="field field-full">
        <span>Ou use uma URL da imagem</span>
        <input
          name="image_url"
          type="url"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://..."
        />
        <small>Ao escolher um arquivo, a imagem é enviada diretamente ao Cloudinary e esta URL é preenchida automaticamente.</small>
      </label>
    </>
  );
}
