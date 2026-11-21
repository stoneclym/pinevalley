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

import { addDays, formatLongDate, formatTime, haDateTime } from "./time";

describe("formatTime", () => {
  it("formats event times", () => {
    expect(formatTime(new Date(2026, 10, 20, 8, 30))).toBe("8:30 AM");
    expect(formatTime(new Date(2026, 10, 20, 12, 30))).toBe("12:30 PM");
    expect(formatTime(new Date(2026, 10, 20, 0, 5))).toBe("12:05 AM");
    expect(formatTime(new Date(2026, 10, 20, 18, 30))).toBe("6:30 PM");
  });
});

describe("dates", () => {
  it("formats the long date", () => {
    expect(formatLongDate(new Date(2026, 10, 20))).toBe("Friday, November 20");
  });
  it("adds days across a month end", () => {
    expect(formatLongDate(addDays(new Date(2026, 10, 29), 3))).toBe("Wednesday, December 2");
  });
  it("formats HA local date-times", () => {
    expect(haDateTime(new Date(2026, 10, 20, 7, 5, 9))).toBe("2026-11-20 07:05:09");
  });
});

import { formatSince } from "./time";

describe("formatSince", () => {
  const now = new Date(2026, 10, 21, 18, 0);
  it("shows the time today", () => expect(formatSince(new Date(2026, 10, 21, 16, 12), now)).toBe("since 4:12 PM"));
  it("shows the weekday this week", () => expect(formatSince(new Date(2026, 10, 19, 7, 5), now)).toBe("since Thu 7:05 AM"));
  it("drops the time on earlier days when compact", () => expect(formatSince(new Date(2026, 10, 19, 7, 5), now, true)).toBe("since Thu"));
  it("shows the date when older", () => expect(formatSince(new Date(2026, 10, 2, 9, 0), now)).toBe("since Nov 2"));
});
