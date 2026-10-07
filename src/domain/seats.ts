import type { Venue } from "./venue";

export interface VenueSeat {
  id: string;
  number: number;
  position: { x: number; y: number };
  deckId: string;
  deckName: string;
  sectionId: string;
  sectionName: string;
  rowId: string;
  rowName: string;
}

export function generateSectionSeats(
  venue: Venue,
  sectionId: string,
): VenueSeat[] {
  for (const deck of venue.decks) {
    const section = deck.sections.find(
      (candidate) => candidate.id === sectionId,
    );
    if (!section) continue;

    return section.rows.flatMap((row) =>
      Array.from({ length: row.seatCount }, (_, index) => {
        const number = index + 1;
        const progress =
          row.seatCount === 1 ? 0.5 : index / (row.seatCount - 1);
        const angle =
          row.path.startAngle +
          (row.path.endAngle - row.path.startAngle) * progress;

        return {
          id: `${row.id}-seat-${number}`,
          number,
          position: {
            x: venue.center.x + Math.cos(angle) * row.path.radiusX,
            y: venue.center.y + Math.sin(angle) * row.path.radiusY,
          },
          deckId: deck.id,
          deckName: deck.name,
          sectionId: section.id,
          sectionName: section.name,
          rowId: row.id,
          rowName: row.name,
        };
      }),
    );
  }

  return [];
}

export function generateVenueSeats(venue: Venue): VenueSeat[] {
  return venue.decks.flatMap((deck) =>
    deck.sections.flatMap((section) => generateSectionSeats(venue, section.id)),
  );
}
