import { describe, expect, it } from "vitest";
import soldierFieldData from "../data/venues/soldier-field.json";
import { VenueSchema } from "./venue";

describe("VenueSchema", () => {
  it("accepts the local Soldier Field overview data", () => {
    const result = VenueSchema.safeParse(soldierFieldData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decks).toHaveLength(3);
      expect(result.data.decks.flatMap((deck) => deck.sections)).toHaveLength(
        36,
      );
    }
  });

  it("rejects venue data with invalid geometry", () => {
    const result = VenueSchema.safeParse({
      ...soldierFieldData,
      decks: [
        {
          ...soldierFieldData.decks[0],
          innerRadiusX: 500,
          outerRadiusX: 400,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate row identifiers", () => {
    const venueData = structuredClone(soldierFieldData);
    const detailedSections = venueData.decks
      .flatMap((deck) => deck.sections)
      .filter((section) => "rows" in section);

    const firstRow = detailedSections[0]?.rows?.[0];
    const secondRow = detailedSections[1]?.rows?.[0];
    expect(firstRow).toBeDefined();
    expect(secondRow).toBeDefined();
    if (!firstRow || !secondRow) return;
    secondRow.id = firstRow.id;

    expect(VenueSchema.safeParse(venueData).success).toBe(false);
  });

  it("rejects row paths outside their parent section or deck", () => {
    const venueData = structuredClone(soldierFieldData);
    const deck = venueData.decks.find((candidate) =>
      candidate.sections.some((section) => "rows" in section),
    );
    const section = deck?.sections.find((candidate) => "rows" in candidate);
    const row = section && "rows" in section ? section.rows?.[0] : undefined;
    expect(deck).toBeDefined();
    expect(section).toBeDefined();
    expect(row).toBeDefined();
    if (!deck || !section || !row) return;
    row.path.radiusX = deck.outerRadiusX + 1;
    row.path.startAngle = section.startAngle - 0.1;

    const result = VenueSchema.safeParse(venueData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          expect.stringContaining("within deck"),
          expect.stringContaining("within section"),
        ]),
      );
    }
  });
});
