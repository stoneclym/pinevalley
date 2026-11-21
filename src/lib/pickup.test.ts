import { describe, expect, it } from "vitest";
import { pickupsOn, type PickupConfig, reminderFor, todayInNewYork } from "./pickup";

const CFG: PickupConfig = {
  trash: { weekday: "friday", everyWeeks: 1 },
  recycling: { weekday: "friday", everyWeeks: 2, anchor: "2026-11-27" },
  remindDayBefore: true,
  overrides: [],
};

describe("reminderFor (spec cases)", () => {
  it("Thu Nov 26 2026: trash and recycling", () => expect(reminderFor("2026-11-26", CFG)).toEqual(["trash", "recycling"]));
  it("Thu Dec 3: trash only", () => expect(reminderFor("2026-12-03", CFG)).toEqual(["trash"]));
  it("Thu Dec 10: trash and recycling", () => expect(reminderFor("2026-12-10", CFG)).toEqual(["trash", "recycling"]));
  it("a pickup moved to Saturday reminds on Friday instead of Thursday", () => {
    const moved = { ...CFG, overrides: [{ date: "2026-11-27", moveTo: "2026-11-28" }] };
    expect(reminderFor("2026-11-26", moved)).toEqual([]);
    expect(reminderFor("2026-11-27", moved)).toEqual(["trash", "recycling"]);
  });
});

describe("pickupsOn", () => {
  it("is empty on other days", () => {
    expect(pickupsOn("2026-11-26", CFG)).toEqual([]);
    expect(reminderFor("2026-11-21", CFG)).toEqual([]);
  });
  it("skips a cancelled pickup", () => {
    const skip = { ...CFG, overrides: [{ date: "2026-12-04", skip: true }] };
    expect(pickupsOn("2026-12-04", skip)).toEqual([]);
    expect(reminderFor("2026-12-03", skip)).toEqual([]);
  });
  it("counts recycling weeks before the anchor too", () => {
    expect(pickupsOn("2026-11-13", CFG)).toEqual(["trash", "recycling"]);
    expect(pickupsOn("2026-11-20", CFG)).toEqual(["trash"]);
  });
  it("can turn reminders off", () => {
    expect(reminderFor("2026-11-26", { ...CFG, remindDayBefore: false })).toEqual([]);
  });
});

describe("todayInNewYork", () => {
  it("uses New York's date, not UTC's", () => {
    // 02:00 UTC on Nov 27 is still 9 PM on Nov 26 in New York.
    expect(todayInNewYork(new Date("2026-11-27T02:00:00Z"))).toBe("2026-11-26");
  });
});
