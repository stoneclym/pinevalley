import { describe, expect, it } from "vitest";
import { formatClock, formatShortDate, msUntilNextMinute } from "./time";

describe("formatClock", () => {
  it("uses 12-hour time with no leading zero", () => {
    expect(formatClock(new Date(2026, 10, 20, 5, 18))).toBe("5:18");
    expect(formatClock(new Date(2026, 10, 20, 17, 5))).toBe("5:05");
  });
  it("shows 12 at midnight and noon", () => {
    expect(formatClock(new Date(2026, 10, 20, 0, 0))).toBe("12:00");
    expect(formatClock(new Date(2026, 10, 20, 12, 30))).toBe("12:30");
  });
});

describe("formatShortDate", () => {
  it("matches the design", () => {
    expect(formatShortDate(new Date(2026, 10, 20))).toBe("Fri Nov 20");
  });
});

describe("msUntilNextMinute", () => {
  it("counts to the boundary", () => {
    expect(msUntilNextMinute(new Date(2026, 10, 20, 5, 18, 45, 500))).toBe(14_500);
    expect(msUntilNextMinute(new Date(2026, 10, 20, 5, 18, 0, 0))).toBe(60_000);
  });
});
