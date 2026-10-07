import { z } from "zod";

const finiteNumber = z.number().finite();

export const VenueRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  seatCount: z.number().int().positive(),
  path: z
    .object({
      type: z.literal("arc"),
      radiusX: finiteNumber.positive(),
      radiusY: finiteNumber.positive(),
      startAngle: finiteNumber,
      endAngle: finiteNumber,
    })
    .refine((path) => path.startAngle < path.endAngle, {
      message: "Row path must have an increasing angle range.",
    }),
});

export const VenueSectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startAngle: finiteNumber,
  endAngle: finiteNumber,
  rows: z.array(VenueRowSchema).default([]),
});

export const VenueDeckSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    shortName: z.string().min(1),
    innerRadiusX: finiteNumber.positive(),
    innerRadiusY: finiteNumber.positive(),
    outerRadiusX: finiteNumber.positive(),
    outerRadiusY: finiteNumber.positive(),
    sections: z.array(VenueSectionSchema).min(1),
  })
  .superRefine((deck, context) => {
    if (
      deck.innerRadiusX >= deck.outerRadiusX ||
      deck.innerRadiusY >= deck.outerRadiusY
    ) {
      context.addIssue({
        code: "custom",
        message: "Inner radii must be smaller than outer radii.",
      });
    }

    for (const [sectionIndex, section] of deck.sections.entries()) {
      if (section.startAngle >= section.endAngle) {
        context.addIssue({
          code: "custom",
          message: `Section ${section.name} must have an increasing angle range.`,
        });
      }

      for (const [rowIndex, row] of section.rows.entries()) {
        const path = row.path;
        if (
          path.radiusX < deck.innerRadiusX ||
          path.radiusX > deck.outerRadiusX ||
          path.radiusY < deck.innerRadiusY ||
          path.radiusY > deck.outerRadiusY
        ) {
          context.addIssue({
            code: "custom",
            message: `Row ${row.name} path must remain within deck ${deck.name}.`,
            path: ["sections", sectionIndex, "rows", rowIndex, "path"],
          });
        }
        if (
          path.startAngle < section.startAngle ||
          path.endAngle > section.endAngle
        ) {
          context.addIssue({
            code: "custom",
            message: `Row ${row.name} path must remain within section ${section.name}.`,
            path: ["sections", sectionIndex, "rows", rowIndex, "path"],
          });
        }
      }
    }
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
      width: finiteNumber.positive(),
      height: finiteNumber.positive(),
    }),
    center: z.object({ x: finiteNumber, y: finiteNumber }),
    field: z.object({
      width: finiteNumber.positive(),
      height: finiteNumber.positive(),
      label: z.string().min(1),
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
