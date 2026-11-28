import { describe, expect, it } from "vitest";
import { subsolarPoint, sunHeight, terminatorLat } from "./sun";

describe("subsolarPoint", () => {
  it("is near the equator and Greenwich at noon UTC on the March equinox", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12)));
    expect(Math.abs(p.lat)).toBeLessThan(0.6);
    expect(Math.abs(p.lon)).toBeLessThan(3);
  });
  it("is near 23.4°N at the June solstice and 23.4°S in December", () => {
    expect(subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12))).lat).toBeCloseTo(23.4, 0);
    expect(subsolarPoint(new Date(Date.UTC(2026, 11, 21, 12))).lat).toBeCloseTo(-23.4, 0);
  });
  it("moves west 15° an hour", () => {
    const a = subsolarPoint(new Date(Date.UTC(2026, 10, 27, 12)));
    const b = subsolarPoint(new Date(Date.UTC(2026, 10, 27, 13)));
    expect(a.lon - b.lon).toBeCloseTo(15, 0);
  });
});

describe("daylight", () => {
  it("Wilmington is dark at 8:29 PM EST and light at 1 PM", () => {
    const night = subsolarPoint(new Date("2026-11-28T01:29:00Z")); // 8:29 PM EST Nov 27
    const day = subsolarPoint(new Date("2026-11-27T18:00:00Z")); // 1 PM EST
    expect(sunHeight(34.2, -77.9, night)).toBeLessThan(0);
    expect(sunHeight(34.2, -77.9, day)).toBeGreaterThan(0);
  });
  it("in late November the South Pole has sun and the North Pole doesn't", () => {
    const sub = subsolarPoint(new Date("2026-11-27T12:00:00Z"));
    expect(sunHeight(-89, 0, sub)).toBeGreaterThan(0);
    expect(sunHeight(89, 0, sub)).toBeLessThan(0);
  });
  it("puts the day/night line where the sun is on the horizon", () => {
    const sub = subsolarPoint(new Date("2026-11-27T12:00:00Z"));
    for (const lon of [-120, -40, 30, 110]) {
      expect(Math.abs(sunHeight(terminatorLat(lon, sub), lon, sub))).toBeLessThan(1e-9);
    }
  });
});
