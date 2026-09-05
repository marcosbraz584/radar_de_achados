"use client";

import { useEffect, useState } from "react";

type Banner = {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  target_url: string | null;
};

export default function StoreBannerCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = window.setInterval(() => {
      setCurrent((index) => (index + 1) % banners.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  function previous() {
    setCurrent((index) => (index - 1 + banners.length) % banners.length);
  }

  function next() {
    setCurrent((index) => (index + 1) % banners.length);
  }

  return (
    <div className="sh-banner-wrap" style={{ position: "relative", width: "100%", height: "clamp(180px,24vw,330px)", overflow: "hidden" }}>
      {banners.map((banner, index) => (
        <a
          className="sh-banner"
          key={banner.id}
          href={banner.target_url || "#ofertas"}
          target={banner.target_url ? "_blank" : undefined}
          rel={banner.target_url ? "noopener noreferrer" : undefined}
          aria-hidden={index !== current}
          style={{
            display: "block",
            opacity: index === current ? 1 : 0,
            zIndex: index === current ? 2 : 1,
            pointerEvents: index === current ? "auto" : "none",
            transition: "opacity .45s ease",
          }}
        >
          <img
            src={banner.image_url}
            alt={banner.title || "Oferta SHILMASTORE"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </a>
      ))}

      {banners.length > 1 ? (
        <>
          <button className="sh-banner-arrow sh-banner-arrow-left" type="button" onClick={previous} aria-label="Banner anterior">
            ‹
          </button>
          <button className="sh-banner-arrow sh-banner-arrow-right" type="button" onClick={next} aria-label="Próximo banner">
            ›
          </button>

          <div className="sh-banner-dots" aria-label="Selecionar banner">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Mostrar banner ${index + 1}`}
                aria-current={index === current ? "true" : undefined}
                className={index === current ? "is-active" : ""}
                onClick={() => setCurrent(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
