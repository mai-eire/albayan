import { describe, expect, it } from "vitest";
import { familyName, groupFamilies } from "./families";

const kid = (id: number) => ({ id });

describe("groupFamilies", () => {
  it("puts guardians who share a child in one family", () => {
    const families = groupFamilies([
      { id: 1, name: "Ahmed Khan", gender: "male", children: [kid(10), kid(11)] },
      { id: 2, name: "Fatima Ali", gender: "female", children: [kid(10)] },
      { id: 3, name: "Sara Ali", gender: "female", children: [kid(12)] },
    ]);
    expect(families.map((f) => f.name)).toEqual(["Khan-Ali", "Sara-Ali"]);
    const khan = families[0];
    expect(khan.key).toBe(1);
    expect(khan.guardians.map((g) => g.id)).toEqual([1, 2]);
    expect(khan.children.map((c) => c.id)).toEqual([10, 11]);
  });

  it("joins households through a shared child and names the family after the first two", () => {
    const families = groupFamilies([
      { id: 5, name: "Omar Rashid", gender: "male", children: [kid(20)] },
      { id: 6, name: "Layla Osman", gender: "female", children: [kid(20), kid(21)] },
      { id: 7, name: "Yusuf Osman", gender: "male", children: [kid(21)] },
    ]);
    expect(families).toHaveLength(1);
    expect(families[0].name).toBe("Rashid-Osman");
    expect(families[0].guardians.map((g) => g.id)).toEqual([5, 6, 7]);
  });
});

describe("familyName", () => {
  it("is his surname then hers, the primary contact first when genders are unknown", () => {
    expect(
      familyName([
        { name: "Layla Osman", gender: "female" },
        { name: "Omar Rashid", gender: "male" },
      ]),
    ).toBe("Rashid-Osman");
    expect(
      familyName([
        { name: "Layla Osman", gender: null },
        { name: "Omar Rashid", gender: null, isPrimary: true },
      ]),
    ).toBe("Rashid-Osman");
  });

  it("uses first-surname for one guardian or when both surnames match", () => {
    expect(familyName([{ name: "Hana Elmi", gender: "female" }])).toBe("Hana-Elmi");
    expect(
      familyName([
        { name: "Zayd Begum", gender: "male" },
        { name: "Layla Begum", gender: "female" },
      ]),
    ).toBe("Zayd-Begum");
  });
});
