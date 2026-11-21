import type { ReactNode } from "react";
import { ChevronLeft } from "./icons";

/** `‹ Home` glass pill, serif title, small secondary text beside it. */
export function BackHeader({ title, detail, onBack }: { title: string; detail?: ReactNode; onBack: () => void }) {
  return (
    <header className="back-header">
      <button type="button" className="glass back-pill" onClick={onBack}>
        <ChevronLeft size={26} />
        Home
      </button>
      <div className="back-title">
        <h1>{title}</h1>
        {detail ? <span>{detail}</span> : null}
      </div>
    </header>
  );
}
