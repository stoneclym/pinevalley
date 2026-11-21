import type { ReactNode } from "react";

/**
 * Full-viewport screen with the designed background. Home uses the richer wood-and-cream
 * mix; Calendar and Groceries use the design's lighter, calmer version.
 */
export function Screen({ children, className, calm }: { children: ReactNode; className?: string; calm?: boolean }) {
  return (
    <div className={`screen ${calm ? "screen-calm" : ""}`}>
      <div className="screen-bg" />
      <div className="screen-wash" />
      <div className={`screen-content ${className ?? ""}`}>{children}</div>
    </div>
  );
}
