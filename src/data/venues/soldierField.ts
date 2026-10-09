import soldierFieldMap from "../../../docs/specs/stadium-seating-map.svg?raw";
import soldierFieldPrototype from "./soldier-field.json";

interface SourceRow {
  name: string;
  seatCount: number;
}

interface SourceSection {
  name: string;
  rows?: SourceRow[];
}

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const NUMBERED_SECTION = /^\d{3}$/;
const VIEWBOX_PADDING = 28;

export function createSoldierFieldVenue() {
  const document = new DOMParser().parseFromString(
    soldierFieldMap,
    "image/svg+xml",
  );
  if (document.querySelector("parsererror")) {
    throw new Error("The Soldier Field SVG could not be parsed.");
  }

  const sourceRows = new Map<string, SourceRow[]>();
  for (const deck of soldierFieldPrototype.decks) {
    for (const section of deck.sections as SourceSection[]) {
      if (section.rows) sourceRows.set(section.name, section.rows);
    }
  }

  const labels = new Map(
    Array.from(
      document.querySelectorAll<SVGTextElement>(
        "text.im-section-label[data-id]",
      ),
    ).map((label) => [
      label.dataset.id ?? "",
      {
        x: Number(label.getAttribute("x")),
        y: Number(label.getAttribute("y")),
      },
    ]),
  );
  const sections = Array.from(
    document.querySelectorAll<SVGPolygonElement>("polygon[data-id]"),
  )
    .map((polygon) => {
      const name = polygon.dataset.id ?? "";
      const points = parsePoints(polygon.getAttribute("points") ?? "");
      const rows = sourceRows.get(name) ?? [];
      return {
        id: `section-${name}`,
        name,
        polygon: points,
        label: labels.get(name) ?? polygonCenter(points),
        rows: rows.map((row) => ({
          id: `section-${name}-row-${row.name}`,
          name: row.name,
          seatCount: row.seatCount,
        })),
      };
    })
    .filter(
      (section) =>
        NUMBERED_SECTION.test(section.name) && section.polygon.length >= 3,
    )
    .sort((left, right) => Number(left.name) - Number(right.name));

  const sectionBounds = getBounds(
    sections.flatMap((section) => section.polygon),
  );
  const northEndzone = getPolygon(document, "north_endzone");
  const southEndzone = getPolygon(document, "south_endzone");
  const northBounds = getBounds(northEndzone);
  const southBounds = getBounds(southEndzone);
  const fieldLeft = northBounds.maxX;
  const fieldRight = southBounds.minX;
  const fieldTop = Math.max(northBounds.minY, southBounds.minY);
  const fieldBottom = Math.min(northBounds.maxY, southBounds.maxY);
  const center = {
    x: (fieldLeft + fieldRight) / 2,
    y: (fieldTop + fieldBottom) / 2,
  };

  const deckDefinitions = [
    { id: "100-level", name: "100 Level", shortName: "100", prefix: "1" },
    { id: "200-level", name: "200 Level", shortName: "200", prefix: "2" },
    { id: "300-level", name: "300 Level", shortName: "300", prefix: "3" },
    { id: "400-level", name: "400 Level", shortName: "400", prefix: "4" },
  ];

  return {
    id: "soldier-field",
    name: "Soldier Field",
    location: { city: "Chicago", state: "Illinois" },
    viewBox: {
      x: sectionBounds.minX - VIEWBOX_PADDING,
      y: sectionBounds.minY - VIEWBOX_PADDING,
      width: sectionBounds.maxX - sectionBounds.minX + VIEWBOX_PADDING * 2,
      height: sectionBounds.maxY - sectionBounds.minY + VIEWBOX_PADDING * 2,
    },
    center,
    field: {
      width: fieldRight - fieldLeft,
      height: fieldBottom - fieldTop,
      offsetX: 0,
      offsetY: 0,
      label: "FIELD",
    },
    decks: deckDefinitions.map((deck) => ({
      id: deck.id,
      name: deck.name,
      shortName: deck.shortName,
      sections: sections.filter((section) =>
        section.name.startsWith(deck.prefix),
      ),
    })),
  };
}

function getPolygon(document: Document, id: string) {
  const polygon = document.querySelector<SVGPolygonElement>(
    `polygon[data-id="${id}"]`,
  );
  if (!polygon) throw new Error(`Missing SVG polygon: ${id}.`);
  return parsePoints(polygon.getAttribute("points") ?? "");
}

function parsePoints(value: string): Point[] {
  const numbers = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  const points = Array.from(
    { length: Math.floor(numbers.length / 2) },
    (_, index) => ({
      x: numbers[index * 2] ?? 0,
      y: numbers[index * 2 + 1] ?? 0,
    }),
  );
  const first = points[0];
  const last = points.at(-1);
  if (first && last && first.x === last.x && first.y === last.y) points.pop();
  return points;
}

function polygonCenter(points: Point[]) {
  const total = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: total.x / points.length, y: total.y / points.length };
}

function getBounds(points: Point[]): Bounds {
  if (points.length === 0)
    throw new Error("Cannot measure empty SVG geometry.");
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}
