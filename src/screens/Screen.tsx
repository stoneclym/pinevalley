import type { ReactNode } from "react";

/**
 * A full-canvas screen. It is transparent: the background is drawn by full-screen layers
 * behind the canvas (see theme.css), so it reaches the screen edges on the iPad.
 * `calm` switches those layers to the lighter version used by Calendar and Groceries.
 */
export function Screen({ children, className }: { children: ReactNode; className?: string; calm?: boolean }) {
  return (
    <div className="screen">
      <div className={`screen-content ${className ?? ""}`}>{children}</div>
    </div>
  );
}
