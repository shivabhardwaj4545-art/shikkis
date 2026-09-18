import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, productName }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const displayImages = images.length > 0 ? images : ['/placeholder.jpg'];
  const currentImage = displayImages[selectedIndex] || displayImages[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {/* ── Thumbnail Rail ──────────────────────────────────────────────── */}
      {displayImages.length > 1 && (
        <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto max-h-[560px] pb-2 lg:pb-0 scrollbar-none">
          {displayImages.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  isSelected
                    ? 'border-brand-crimson dark:border-brand-gold shadow-sm scale-105'
                    : 'border-border/60 hover:border-border opacity-70 hover:opacity-100'
                }`}
                aria-label={`View image ${idx + 1} of ${productName}`}
              >
                <img
                  src={img}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover object-top"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main Stage Image with Zoom on Hover ──────────────────────────── */}
      <div className="relative flex-1">
        <div
          ref={containerRef}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-surface-alt cursor-crosshair group"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          {/* Base image */}
          <img
            src={currentImage}
            alt={productName}
            className={`h-full w-full object-cover object-top transition-transform duration-200 ${
              isZoomed ? 'lg:opacity-0' : 'opacity-100'
            }`}
          />

          {/* High resolution desktop zoom magnification */}
          {isZoomed && (
            <div
              className="hidden lg:block absolute inset-0 bg-no-repeat pointer-events-none transition-opacity duration-150"
              style={{
                backgroundImage: `url(${currentImage})`,
                backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                backgroundSize: '240%',
              }}
            />
          )}

          {/* Zoom hint badge */}
          <div className="hidden lg:flex absolute bottom-3 right-3 items-center gap-1.5 rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-text-muted backdrop-blur-md border border-border pointer-events-none">
            <ZoomIn size={13} />
            <span>Hover to zoom</span>
          </div>

          {/* Navigation Arrows for multi-images */}
          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-text hover:bg-surface border border-border shadow-sm transition-all"
                aria-label="Previous image"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-text hover:bg-surface border border-border shadow-sm transition-all"
                aria-label="Next image"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Mobile slide dots indicator */}
          {displayImages.length > 1 && (
            <div className="lg:hidden absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
              {displayImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    selectedIndex === idx ? 'w-5 bg-brand-crimson dark:bg-brand-gold' : 'w-1.5 bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
