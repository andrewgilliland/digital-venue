import { z } from "zod";

const finiteNumber = z.number().finite();

export const VenuePointSchema = z.object({
  x: finiteNumber,
  y: finiteNumber,
});

export const VenueRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  seatCount: z.number().int().positive(),
});

export const VenueSectionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    polygon: z.array(VenuePointSchema).min(3),
    label: VenuePointSchema,
    rows: z.array(VenueRowSchema).default([]),
  })
  .refine((section) => Math.abs(polygonArea(section.polygon)) > 0.01, {
    message: "Section polygon must enclose an area.",
    path: ["polygon"],
  });

export const VenueDeckSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  sections: z.array(VenueSectionSchema).min(1),
});

export const VenueSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    location: z.object({
      city: z.string().min(1),
      state: z.string().min(1),
    }),
    viewBox: z.object({
      x: finiteNumber.default(0),
      y: finiteNumber.default(0),
      width: finiteNumber.positive(),
      height: finiteNumber.positive(),
    }),
    center: z.object({ x: finiteNumber, y: finiteNumber }),
    field: z.object({
      width: finiteNumber.positive(),
      height: finiteNumber.positive(),
      label: z.string().min(1),
      offsetX: finiteNumber.default(0),
      offsetY: finiteNumber.default(0),
    }),
    decks: z.array(VenueDeckSchema).min(1),
  })
  .superRefine((venue, context) => {
    const deckIds = new Set<string>();
    const rowIds = new Set<string>();
    const sectionIds = new Set<string>();

    for (const deck of venue.decks) {
      if (deckIds.has(deck.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate deck id: ${deck.id}.`,
        });
      }
      deckIds.add(deck.id);

      for (const section of deck.sections) {
        if (sectionIds.has(section.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate section id: ${section.id}.`,
          });
        }
        sectionIds.add(section.id);

        for (const row of section.rows) {
          if (rowIds.has(row.id)) {
            context.addIssue({
              code: "custom",
              message: `Duplicate row id: ${row.id}.`,
            });
          }
          rowIds.add(row.id);
        }
      }
    }
  });

export type Venue = z.infer<typeof VenueSchema>;
export type VenueDeck = z.infer<typeof VenueDeckSchema>;
export type VenueRow = z.infer<typeof VenueRowSchema>;
export type VenueSection = z.infer<typeof VenueSectionSchema>;

function polygonArea(points: { x: number; y: number }[]) {
  return (
    points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length];
      return area + point.x * (next?.y ?? 0) - (next?.x ?? 0) * point.y;
    }, 0) / 2
  );
}
