import { describe, expect, it } from "vitest";
import { createSoldierFieldVenue } from "../data/venues/soldierField";
import { VenueSchema } from "./venue";

describe("VenueSchema", () => {
  it("accepts the local Soldier Field overview data", () => {
    const result = VenueSchema.safeParse(createSoldierFieldVenue());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decks).toHaveLength(4);
      expect(result.data.decks.flatMap((deck) => deck.sections)).toHaveLength(
        166,
      );
      expect(result.data.decks[0]?.sections[0]).toMatchObject({
        id: "section-101",
        name: "101",
      });
    }
  });

  it("rejects venue data with invalid geometry", () => {
    const venueData = createSoldierFieldVenue();
    const result = VenueSchema.safeParse({
      ...venueData,
      decks: [
        {
          ...venueData.decks[0],
          sections: venueData.decks[0]?.sections.map((section, index) =>
            index === 0
              ? { ...section, polygon: section.polygon.slice(0, 2) }
              : section,
          ),
        },
        ...venueData.decks.slice(1),
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate row identifiers", () => {
    const venueData = structuredClone(createSoldierFieldVenue());
    const detailedSections = venueData.decks
      .flatMap((deck) => deck.sections)
      .filter((section) => section.rows.length > 0);

    const firstRow = detailedSections[0]?.rows?.[0];
    const secondRow = detailedSections[1]?.rows?.[0];
    expect(firstRow).toBeDefined();
    expect(secondRow).toBeDefined();
    if (!firstRow || !secondRow) return;
    secondRow.id = firstRow.id;

    expect(VenueSchema.safeParse(venueData).success).toBe(false);
  });

  it("rejects a section polygon that does not enclose an area", () => {
    const venueData = structuredClone(createSoldierFieldVenue());
    const section = venueData.decks[0]?.sections[0];
    expect(section).toBeDefined();
    if (!section) return;
    section.polygon = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];

    const result = VenueSchema.safeParse(venueData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([expect.stringContaining("enclose an area")]),
      );
    }
  });
});
