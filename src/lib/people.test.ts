import { describe, expect, it } from "vitest";
import { displayTitle, peopleFor, type Person } from "./people";

const PEOPLE: Person[] = [
  { name: "Steve", color: "red", keywords: ["Steve"] },
  { name: "Greyson", color: "blue", keywords: ["Greyson"] },
  { name: "Denise", color: "pink", keywords: ["Denise"] },
];
const names = (title: string, cal?: string) => peopleFor(title, cal, PEOPLE).map((p) => p.name);

describe("displayTitle + peopleFor (spec cases)", () => {
  it.each([
    ["Greyson visiting Hannah and Vince", "Visiting Hannah and Vince", ["Greyson"]],
    ["Greyson's birthday party", "Birthday party", ["Greyson"]],
    ["Steve & Denise dinner", "Dinner", ["Steve", "Denise"]],
    ["Steve: dentist", "Dentist", ["Steve"]],
    ["Dinner with Greyson", "Dinner with Greyson", ["Greyson"]],
    ["Steve", "Steve", ["Steve"]],
  ])("%s → %s", (title, shown, who) => {
    expect(displayTitle(title, PEOPLE)).toBe(shown);
    expect(names(title)).toEqual(who);
  });
});

describe("more stripping", () => {
  it("handles and, +, commas, dashes and curly apostrophes", () => {
    expect(displayTitle("Steve and Denise - anniversary", PEOPLE)).toBe("Anniversary");
    expect(displayTitle("Steve + Greyson: golf", PEOPLE)).toBe("Golf");
    expect(displayTitle("Steve, Denise, Greyson – beach day", PEOPLE)).toBe("Beach day");
    expect(displayTitle("Denise’s book club", PEOPLE)).toBe("Book club");
  });
  it("is case-insensitive and needs whole words", () => {
    expect(displayTitle("greyson: haircut", PEOPLE)).toBe("Haircut");
    expect(names("Stevens Creek hike")).toEqual([]);
    expect(displayTitle("Stevens Creek hike", PEOPLE)).toBe("Stevens Creek hike");
  });
  it("leaves titles without leading names alone", () => {
    expect(displayTitle("Trash pickup", PEOPLE)).toBe("Trash pickup");
    expect(names("Trash pickup")).toEqual([]);
  });
});

describe("calendar mapping", () => {
  const withCal: Person[] = [...PEOPLE.slice(0, 2), { ...PEOPLE[2], calendar: "calendar.denise" }];
  it("wins over title matching", () => {
    expect(peopleFor("Steve's party", "calendar.denise", withCal).map((p) => p.name)).toEqual(["Denise"]);
  });
  it("falls back to titles for other calendars", () => {
    expect(peopleFor("Steve's party", "calendar.family", withCal).map((p) => p.name)).toEqual(["Steve"]);
  });
});

describe("Family", () => {
  const WITH_FAMILY: Person[] = [...PEOPLE, { name: "Family", color: "green", keywords: ["Family"] }];
  const who = (t: string) => peopleFor(t, undefined, WITH_FAMILY).map((p) => p.name);
  it("strips a leading Family and colors the event green", () => {
    expect(displayTitle("Family dinner", WITH_FAMILY)).toBe("Dinner");
    expect(who("Family dinner")).toEqual(["Family"]);
    expect(displayTitle("Family: beach day", WITH_FAMILY)).toBe("Beach day");
  });
  it("combines with a person", () => {
    expect(displayTitle("Family & Steve - movie night", WITH_FAMILY)).toBe("Movie night");
    expect(who("Family & Steve - movie night")).toEqual(["Steve", "Family"]);
  });
  it("leaves a lone Family as is", () => {
    expect(displayTitle("Family", WITH_FAMILY)).toBe("Family");
  });
});
