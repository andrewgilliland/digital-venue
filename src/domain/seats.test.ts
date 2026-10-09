import { describe, expect, it } from "vitest";
import { createSoldierFieldVenue } from "../data/venues/soldierField";
import { generateSectionSeats, generateVenueSeats } from "./seats";
import { VenueSchema } from "./venue";

describe("generateSectionSeats", () => {
  it("generates stable seats inside the section 110 polygon", () => {
    const venue = VenueSchema.parse(createSoldierFieldVenue());

    const seats = generateSectionSeats(venue, "section-110");

    expect(seats).toHaveLength(110);
    expect(seats[0]).toMatchObject({
      id: "section-110-row-1-seat-1",
      deckName: "100 Level",
      number: 1,
      rowName: "1",
      sectionName: "110",
    });
    const section = venue.decks
      .flatMap((deck) => deck.sections)
      .find((candidate) => candidate.id === "section-110");
    expect(section).toBeDefined();
    expect(
      seats.every((seat) =>
        section ? pointInPolygon(seat.position, section.polygon) : false,
      ),
    ).toBe(true);
    expect(generateSectionSeats(venue, "section-110")).toEqual(seats);
  });

  it("generates unique seats for the three detailed sections", () => {
    const venue = VenueSchema.parse(createSoldierFieldVenue());

    const seats = generateVenueSeats(venue);

    expect(seats).toHaveLength(340);
    expect(new Set(seats.map((seat) => seat.id)).size).toBe(340);
    expect(new Set(seats.map((seat) => seat.sectionName))).toEqual(
      new Set(["110", "122", "430"]),
    );

    const section430 = seats.filter((seat) => seat.sectionId === "section-430");
    expect(section430.length).toBeGreaterThan(0);
    expect(section430.every((seat) => seat.position.x > venue.center.x)).toBe(
      true,
    );
    expect(section430.every((seat) => seat.position.y > venue.center.y)).toBe(
      true,
    );
  });
});

function pointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[],
) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (!currentPoint || !previousPoint) continue;
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
