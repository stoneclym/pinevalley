import type { ReactNode } from "react";

/** Full-viewport screen with the designed wood-and-cream background. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="screen">
      <div className="screen-bg" />
      <div className="screen-wash" />
      <div className={`screen-content ${className ?? ""}`}>{children}</div>
    </div>
  );
}
