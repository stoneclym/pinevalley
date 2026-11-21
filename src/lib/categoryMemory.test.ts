import { describe, expect, it } from "vitest";
import { categoryFor, rememberCategories } from "./categoryMemory";

describe("categoryFor", () => {
  it("falls back to the keyword map", () => {
    expect(categoryFor("Avocados")).toBe("Produce");
    expect(categoryFor("Cotija")).toBe("Other");
  });
  it("uses the category the review sheet showed", () => {
    rememberCategories([{ name: "Cotija", category: "Dairy & Eggs" }]);
    expect(categoryFor("cotija")).toBe("Dairy & Eggs");
    expect(categoryFor("  Cotija ")).toBe("Dairy & Eggs");
  });
  it("ignores unknown categories", () => {
    rememberCategories([{ name: "Mystery", category: "Garden" as never }]);
    expect(categoryFor("Mystery")).toBe("Other");
  });
});
