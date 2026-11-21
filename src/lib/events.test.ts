import { describe, expect, it } from "vitest";
import { normalizeEvents, parseTime, todayView, weekView } from "./events";

const NOW = new Date(2026, 10, 20, 10, 0); // Fri Nov 20, 10:00 local

describe("parseTime", () => {
  it("treats a bare date as all-day local midnight", () => {
    const t = parseTime("2026-11-20");
    expect(t.allDay).toBe(true);
    expect(t.date).toEqual(new Date(2026, 10, 20));
  });
  it("accepts {date} and {dateTime}", () => {
    expect(parseTime({ date: "2026-11-21" }).allDay).toBe(true);
    expect(parseTime({ dateTime: "2026-11-20T08:30:00" }).date).toEqual(new Date(2026, 10, 20, 8, 30));
  });
  it("parses HA's space-separated local time", () => {
    expect(parseTime("2026-11-20 18:30:00").date).toEqual(new Date(2026, 10, 20, 18, 30));
  });
});

const RAW = {
  "calendar.family": {
    events: [
      { summary: "Family dinner", start: "2026-11-20 18:30:00", end: "2026-11-20 20:00:00" },
      { summary: "Early run", start: "2026-11-20 06:00:00", end: "2026-11-20 07:00:00" },
      { summary: "Trash pickup", start: "2026-11-20", end: "2026-11-21" },
      { summary: "Grandma visits", start: "2026-11-24", end: "2026-11-27" },
      { summary: "Soccer game", start: "2026-11-21 10:00:00", end: "2026-11-21 11:30:00" },
    ],
  },
  "calendar.school": {
    events: [
      { summary: "Book club", start: "2026-11-20 09:30:00", end: "2026-11-20 10:30:00", location: "Northeast Library" },
      { summary: "Dentist", start: "2026-11-20 12:30:00", end: "2026-11-20 13:15:00", location: "" },
    ],
  },
};

describe("normalizeEvents + todayView", () => {
  const events = normalizeEvents(RAW);
  it("merges and sorts every calendar", () => {
    expect(events.map((e) => e.title)).toEqual([
      "Trash pickup", "Early run", "Book club", "Dentist", "Family dinner", "Soccer game", "Grandma visits",
    ]);
  });
  it("splits today into all-day and upcoming timed events", () => {
    const v = todayView(events, NOW);
    expect(v.allDay.map((e) => e.title)).toEqual(["Trash pickup"]);
    expect(v.timed.map((e) => e.title)).toEqual(["Book club", "Dentist", "Family dinner"]);
    expect(v.next?.title).toBe("Book club"); // in progress counts as next
    expect(v.next?.location).toBe("Northeast Library");
    expect(v.timed[1].location).toBeUndefined();
  });
  it("is empty when nothing is planned", () => {
    expect(todayView([], NOW)).toEqual({ allDay: [], timed: [], next: null });
  });
});

describe("weekView", () => {
  const week = weekView(normalizeEvents(RAW), NOW);
  it("covers the next seven days", () => {
    expect(week.map((d) => d.date.getDate())).toEqual([21, 22, 23, 24, 25, 26, 27]);
  });
  it("places timed and multi-day all-day events", () => {
    expect(week[0].timed.map((e) => e.title)).toEqual(["Soccer game"]);
    expect(week[3].allDay.map((e) => e.title)).toEqual(["Grandma visits"]);
    expect(week[5].allDay.map((e) => e.title)).toEqual(["Grandma visits"]);
    expect(week[1].timed.length + week[1].allDay.length).toBe(0);
  });
  it("crosses a month boundary", () => {
    expect(weekView([], new Date(2026, 10, 28)).map((d) => d.date.getDate())).toEqual([29, 30, 1, 2, 3, 4, 5]);
  });
});
