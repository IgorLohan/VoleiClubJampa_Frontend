"use client";

import { useEffect, useMemo, useState } from "react";

export type CarouselImage = {
  src: string;
  alt?: string;
};

export type CarouselProps = {
  images: CarouselImage[];
  intervalMs?: number;
  title?: string;
  subtitle?: string;
};

export default function Carousel({
  images,
  intervalMs = 4500,
  title = "Pelada Vôlei Club Jampa",
  subtitle = "Fotos e informações do encontro semanal."
}: CarouselProps) {
  const safeImages = useMemo(
    () => (images?.filter(Boolean) ?? []) as CarouselImage[],
    [images]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safeImages.length <= 1) return;

    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeImages.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, safeImages.length]);

  const current = safeImages[index] || safeImages[0];

  function prev() {
    setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  }

  function next() {
    setIndex((i) => (i + 1) % safeImages.length);
  }

  const comVariasFotos = safeImages.length > 1;

  return (
    <div
      className={`carousel${comVariasFotos ? " carousel--with-nav" : ""}`}
      aria-roledescription="carrossel"
    >
      <div className="carousel-slide">
        {current ? (
          <>
            <div
              className="carousel-slide-blur"
              style={{ backgroundImage: `url(${JSON.stringify(current.src)})` }}
              aria-hidden
            />
            <img src={current.src} alt={current.alt || "Foto"} />
          </>
        ) : null}
      </div>

      <div className="carousel-overlay" />

      {comVariasFotos ? (
        <div
          className="carousel-bottom-bar"
          role="group"
          aria-label="Navegação do carrossel"
        >
          <button
            type="button"
            className="carousel-btn"
            onClick={prev}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <div className="carousel-dots">
            {safeImages.map((img, i) => (
              <button
                key={img.src}
                type="button"
                className={`dot ${i === index ? "active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Ir para foto ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="carousel-btn"
            onClick={next}
            aria-label="Próxima foto"
          >
            ›
          </button>
        </div>
      ) : null}

      {/* <div className="carousel-caption">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div> */}
    </div>
  );
}

