/**
 * Outline icons drawn to match the Claude Design export (24px grid, 1.7 stroke, round caps).
 * Paths for sunrise, moon, cart, sparkle, mic, stop, chevrons and check are taken from the design.
 */
import type { ReactNode } from "react";

type P = { size?: number; color?: string; strokeWidth?: number };

function Svg({ size = 24, color = "currentColor", strokeWidth = 1.7, children }: P & { children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      {children}
    </svg>
  );
}

export const Sunrise = (p: P) => (
  <Svg {...p}><path d="M3.5 18.5h17" /><path d="M7 18.5a5 5 0 0 1 10 0" /><path d="M12 5v3.5M5.3 10.3l1.8 1.6M18.7 10.3l-1.8 1.6" /></Svg>
);
export const Moon = (p: P) => <Svg {...p}><path d="M19 14.6A7.6 7.6 0 1 1 9.4 5a6.1 6.1 0 0 0 9.6 9.6z" /></Svg>;
export const Cart = (p: P) => (
  <Svg {...p}><path d="M3 4.5h2.3l2.2 10.5h10.3l2.1-7.8H6.4" /><circle cx="9.6" cy="19" r="1.3" /><circle cx="16.4" cy="19" r="1.3" /></Svg>
);
export const Door = (p: P) => (
  <Svg {...p}><path d="M6 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><path d="M3.5 20.5h17" /><circle cx="13" cy="12.5" r=".6" fill="currentColor" /></Svg>
);
export const Sparkle = (p: P) => (
  <Svg {...p}><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></Svg>
);
export const Mic = (p: P) => (
  <Svg {...p}><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></Svg>
);
export const Stop = (p: P) => <Svg {...p}><rect x="7" y="7" width="10" height="10" rx="2.5" /></Svg>;
export const ChevronLeft = (p: P) => <Svg strokeWidth={2} {...p}><path d="M14.5 5.5L8 12l6.5 6.5" /></Svg>;
export const ChevronRight = (p: P) => <Svg strokeWidth={2.2} {...p}><path d="M9.5 5.5L16 12l-6.5 6.5" /></Svg>;
export const Check = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M5.5 12.5l4.2 4.2L18.5 7.8" /></Svg>;
export const Alert = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.8v5" /><circle cx="12" cy="16.2" r=".6" fill="currentColor" /></Svg>
);

/** Closed: a panelled door fills the doorway. */
export const GarageClosed = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 20V9.5L12 4l8.5 5.5V20" />
    <path d="M6.5 20v-8h11v8" fill="currentColor" fillOpacity=".18" />
    <path d="M6.5 14.7h11M6.5 17.4h11" />
  </Svg>
);
/** Open: no door at all, just the empty doorway. */
export const GarageOpen = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 20V9.5L12 4l8.5 5.5V20" />
    <path d="M6.5 20v-8h11v8" />
  </Svg>
);

/** Scene tile icons by config name. Unknown names fall back to the sparkle. */
export function SceneIcon({ name, ...p }: P & { name: string }) {
  switch (name) {
    case "sunrise": return <Sunrise {...p} />;
    case "moon": return <Moon {...p} />;
    case "door": case "leave": case "away": return <Door {...p} />;
    default: return <Sparkle {...p} />;
  }
}

// ---- Weather glyphs: filled, like the design's date-line cloud (40px grid). ----

function Cloud({ dy = 0, scale = 1 }: { dy?: number; scale?: number }) {
  return (
    <g transform={`translate(${20 - 20 * scale} ${dy}) scale(${scale})`}>
      <circle cx="14" cy="24" r="6" /><circle cx="22" cy="19" r="8" /><circle cx="29" cy="25" r="5" />
      <rect x="14" y="24" width="15" height="6" />
    </g>
  );
}
const Drops = ({ n, y = 31 }: { n: number; y?: number }) => (
  <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    {Array.from({ length: n }, (_, i) => {
      const x = 14 + i * (16 / Math.max(1, n - 1));
      return <path key={i} d={`M${x} ${y}l-1.6 4.4`} />;
    })}
  </g>
);
const Flakes = ({ y = 33 }: { y?: number }) => (
  <g>{[14, 21, 28].map((x, i) => <circle key={x} cx={x} cy={y + (i % 2) * 2} r="1.7" />)}</g>
);
const Bolt = () => <path d="M21.5 27l-4 6.5h4l-2 5 6-7.5h-4l2.2-4z" />;
const Sun = ({ cx = 20, cy = 20, r = 6.5 }: { cx?: number; cy?: number; r?: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} />
    <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const r1 = r + 3.5, r2 = r + 6.5;
        return <line key={i} x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)} />;
      })}
    </g>
  </g>
);
const Wind = () => (
  <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M6 16h18a4 4 0 1 0-4-4" /><path d="M6 23h24a4 4 0 1 1-4 4" /><path d="M6 30h12" />
  </g>
);

/** One icon per HA weather condition. Unknown conditions return null (the line just shows the temperature). */
export function WeatherIcon({ condition, size = 38 }: { condition: string; size?: number }) {
  let body: ReactNode;
  switch (condition) {
    case "sunny": body = <Sun />; break;
    case "clear-night": body = <path d="M27 25.5A10 10 0 1 1 16.5 13a8 8 0 0 0 10.5 12.5z" />; break;
    case "partlycloudy": body = <><Sun cx={15} cy={15} r={5} /><Cloud dy={4} scale={0.9} /></>; break;
    case "cloudy": body = <Cloud dy={2} />; break;
    case "fog": body = (
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M8 14h24M6 20h28M8 26h24M12 32h16" />
      </g>
    ); break;
    case "rainy": body = <><Cloud dy={-4} /><Drops n={3} y={30} /></>; break;
    case "pouring": body = <><Cloud dy={-4} /><Drops n={4} y={30} /></>; break;
    case "snowy": body = <><Cloud dy={-4} /><Flakes y={31} /></>; break;
    case "snowy-rainy": body = <><Cloud dy={-4} /><Drops n={2} y={30} /><circle cx="21" cy="33" r="1.7" /></>; break;
    case "hail": body = <><Cloud dy={-4} /><g>{[15, 21, 27].map((x) => <circle key={x} cx={x} cy={33} r="2.2" />)}</g></>; break;
    case "lightning": body = <><Cloud dy={-5} /><Bolt /></>; break;
    case "lightning-rainy": body = <><Cloud dy={-5} /><Bolt /><Drops n={2} y={29} /></>; break;
    case "windy": body = <Wind />; break;
    case "windy-variant": body = <><Cloud dy={-6} scale={0.85} /><g transform="translate(0 6)"><Wind /></g></>; break;
    case "exceptional": body = (
      <g>
        <path d="M20 7l15 26H5z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M20 16v8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /><circle cx="20" cy="28.5" r="1.6" />
      </g>
    ); break;
    default: return null;
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 40 40" fill="currentColor" style={{ display: "block" }}>
      {body}
    </svg>
  );
}

export const WEATHER_CONDITIONS = [
  "clear-night", "cloudy", "exceptional", "fog", "hail", "lightning", "lightning-rainy", "partlycloudy",
  "pouring", "rainy", "snowy", "snowy-rainy", "sunny", "windy", "windy-variant",
];
