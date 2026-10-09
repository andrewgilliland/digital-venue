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

    const center = polygonCenter(section.polygon);
    const radial = normalize({
      x: center.x - venue.center.x,
      y: center.y - venue.center.y,
    });
    const tangent = { x: -radial.y, y: radial.x };
    const radialDistances = section.polygon.map((point) =>
      projection(point, venue.center, radial),
    );
    const innerDistance = Math.min(...radialDistances);
    const outerDistance = Math.max(...radialDistances);

    return section.rows.flatMap((row, rowIndex) => {
      const rowProgress = (rowIndex + 1) / (section.rows.length + 1);
      const rowDistance =
        innerDistance + (outerDistance - innerDistance) * rowProgress;
      const intersections = linePolygonIntersections(
        section.polygon,
        venue.center,
        radial,
        tangent,
        rowDistance,
      );
      const start = Math.min(...intersections);
      const end = Math.max(...intersections);
      const margin = Math.min(4, (end - start) * 0.08);

      return Array.from({ length: row.seatCount }, (_, index) => {
        const number = index + 1;
        const progress =
          row.seatCount === 1 ? 0.5 : index / (row.seatCount - 1);
        const tangentDistance =
          start + margin + (end - start - margin * 2) * progress;

        return {
          id: `${row.id}-seat-${number}`,
          number,
          position: {
            x:
              venue.center.x +
              radial.x * rowDistance +
              tangent.x * tangentDistance,
            y:
              venue.center.y +
              radial.y * rowDistance +
              tangent.y * tangentDistance,
          },
          deckId: deck.id,
          deckName: deck.name,
          sectionId: section.id,
          sectionName: section.name,
          rowId: row.id,
          rowName: row.name,
        };
      });
    });
  }

  return [];
}

export function generateVenueSeats(venue: Venue): VenueSeat[] {
  return venue.decks.flatMap((deck) =>
    deck.sections.flatMap((section) => generateSectionSeats(venue, section.id)),
  );
}

function linePolygonIntersections(
  polygon: { x: number; y: number }[],
  origin: { x: number; y: number },
  radial: { x: number; y: number },
  tangent: { x: number; y: number },
  rowDistance: number,
) {
  const intersections: number[] = [];
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    if (!next) return;
    const startDistance = projection(point, origin, radial);
    const endDistance = projection(next, origin, radial);
    if (
      rowDistance < Math.min(startDistance, endDistance) ||
      rowDistance > Math.max(startDistance, endDistance) ||
      Math.abs(endDistance - startDistance) < 0.0001
    ) {
      return;
    }
    const progress =
      (rowDistance - startDistance) / (endDistance - startDistance);
    const intersection = {
      x: point.x + (next.x - point.x) * progress,
      y: point.y + (next.y - point.y) * progress,
    };
    intersections.push(projection(intersection, origin, tangent));
  });
  if (intersections.length < 2) {
    throw new Error(
      "A seat row could not be placed inside its section polygon.",
    );
  }
  return intersections;
}

function projection(
  point: { x: number; y: number },
  origin: { x: number; y: number },
  axis: { x: number; y: number },
) {
  return (point.x - origin.x) * axis.x + (point.y - origin.y) * axis.y;
}

function normalize(vector: { x: number; y: number }) {
  const length = Math.hypot(vector.x, vector.y);
  return { x: vector.x / length, y: vector.y / length };
}

function polygonCenter(points: { x: number; y: number }[]) {
  const sum = points.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}
