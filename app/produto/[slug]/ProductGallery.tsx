"use client";

import { useState } from "react";

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const safeImages = images.filter(Boolean);
  const [selected, setSelected] = useState(safeImages[0] || "");

  if (!safeImages.length) {
    return <div style={{ color: "#777" }}>Imagem indisponível</div>;
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={selected} alt={name} style={{ maxWidth: "100%", maxHeight: 440, objectFit: "contain" }} />
      </div>

      {safeImages.length > 1 ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {safeImages.slice(0, 6).map((image, index) => {
            const active = image === selected;
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setSelected(image)}
                aria-label={`Ver imagem ${index + 1} de ${name}`}
                style={{
                  width: 96,
                  height: 78,
                  borderRadius: 10,
                  border: active ? "2px solid #3483fa" : "1px solid #d1d5db",
                  background: "white",
                  padding: 5,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <img src={image} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
