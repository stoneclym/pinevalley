import { describe, expect, it } from "vitest";
import { hasSeparators, parseGroceriesLocal } from "./parseGroceries";

describe("parseGroceriesLocal", () => {
  it("handles the spec's test sentence", () => {
    expect(parseGroceriesLocal("We need avocados, a couple limes, taco shells, and paper towels")).toEqual([
      { name: "Avocados", category: "Produce" },
      { name: "2 limes", category: "Produce" },
      { name: "Taco shells", category: "Pantry" },
      { name: "Paper towels", category: "Household" },
    ]);
  });
  it("strips lead-ins and splits on and/also", () => {
    expect(parseGroceriesLocal("can you add milk and eggs also bread").map((i) => i.name)).toEqual([
      "Milk", "Eggs", "Bread",
    ]);
  });
  it("converts quantity words", () => {
    expect(parseGroceriesLocal("pick up a dozen eggs, two lemons").map((i) => i.name)).toEqual([
      "12 eggs", "2 lemons",
    ]);
  });
  it("drops duplicates and empty pieces", () => {
    expect(parseGroceriesLocal("milk, , Milk.").map((i) => i.name)).toEqual(["Milk"]);
  });
  it("keeps names that contain 'and'", () => {
    expect(parseGroceriesLocal("half and half and mac and cheese").map((i) => i.name)).toEqual([
      "Half and half", "Mac and cheese",
    ]);
  });
  it("keeps a single item", () => {
    expect(parseGroceriesLocal("milk")).toEqual([{ name: "Milk", category: "Dairy & Eggs" }]);
  });
});

describe("hasSeparators", () => {
  it("detects lists", () => {
    expect(hasSeparators("milk")).toBe(false);
    expect(hasSeparators("peanut butter")).toBe(false);
    expect(hasSeparators("milk, eggs")).toBe(true);
    expect(hasSeparators("milk and eggs")).toBe(true);
  });
});
