import { describe, expect, it } from "vitest";
import soldierFieldData from "../data/venues/soldier-field.json";
import { generateSectionSeats, generateVenueSeats } from "./seats";
import { VenueSchema } from "./venue";

describe("generateSectionSeats", () => {
  it("generates stable seats from section 110 row paths", () => {
    const venue = VenueSchema.parse(soldierFieldData);

    const seats = generateSectionSeats(venue, "lower-110");

    expect(seats).toHaveLength(110);
    expect(seats[0]).toMatchObject({
      id: "lower-110-row-1-seat-1",
      deckName: "100 Level",
      number: 1,
      rowName: "1",
      sectionName: "110",
    });
    expect(seats[0]?.position.x).toBeCloseTo(793.63, 2);
    expect(seats[0]?.position.y).toBeCloseTo(397.24, 2);
    expect(generateSectionSeats(venue, "lower-110")).toEqual(seats);
  });

  it("generates unique seats for the three detailed sections", () => {
    const venue = VenueSchema.parse(soldierFieldData);

    const seats = generateVenueSeats(venue);

    expect(seats).toHaveLength(340);
    expect(new Set(seats.map((seat) => seat.id)).size).toBe(340);
    expect(new Set(seats.map((seat) => seat.sectionName))).toEqual(
      new Set(["110", "122", "430"]),
    );
  });
});
